/**
 * Gap Agent
 * Identifies unresolved topics and discussion gaps that should be
 * addressed in a follow-up meeting.
 */

import OpenAI from "openai";
import { supabase } from "../supabase.js";

const openai = new OpenAI();

const SYSTEM_PROMPT = `You are a meeting analysis assistant that finds gaps.
Given a meeting transcript, identify topics that were:
  - Raised but not resolved
  - Mentioned briefly without enough detail
  - Promised for follow-up but no clear next step
  - Questions that were asked but not answered

Return a JSON array of gap objects with:
  - "topic": short name for the gap
  - "description": 1-2 sentence explanation of the gap
  - "suggested_questions": array of 1-3 questions to address in the next meeting
  - "priority": "low", "medium", or "high"

Rules:
- Focus on substantive gaps, not minor details.
- If no meaningful gaps are found, return an empty array [].
- Only return the JSON array, nothing else.`;

interface IdentifiedGap {
  topic: string;
  description: string | null;
  suggested_questions: string[];
  priority: "low" | "medium" | "high";
}

export async function identifyGaps(
  meetingId: string,
  transcript: string
): Promise<void> {
  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.3,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: `Transcript:\n\n${transcript}` },
    ],
  });

  const raw = response.choices[0]?.message?.content;
  if (!raw) return;

  let gaps: IdentifiedGap[];
  try {
    const parsed = JSON.parse(raw);
    gaps = Array.isArray(parsed) ? parsed : parsed.gaps ?? [];
  } catch {
    console.error("[gapAgent] Failed to parse response:", raw);
    return;
  }

  // Replace previous gaps for this meeting
  await supabase.from("gaps").delete().eq("meeting_id", meetingId);

  if (gaps.length > 0) {
    const rows = gaps.map((g) => ({
      meeting_id: meetingId,
      topic: g.topic,
      description: g.description,
      suggested_questions: g.suggested_questions,
      priority: g.priority,
    }));
    const { error } = await supabase.from("gaps").insert(rows);
    if (error) console.error("[gapAgent] Insert error:", error);
  }
}
