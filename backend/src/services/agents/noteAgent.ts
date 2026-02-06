/**
 * Note Agent
 * Generates meeting notes broken into sections: summary, key_points, decisions.
 */

import OpenAI from "openai";
import { supabase } from "../supabase.js";

const openai = new OpenAI();

const SYSTEM_PROMPT = `You are a meeting note-taking assistant.
Given the transcript of a meeting, produce structured notes in JSON format.
Return a JSON array of objects, each with:
  - "section": one of "summary", "key_points", "decisions"
  - "content": the text for that section

Rules:
- The summary should be 2-4 sentences.
- key_points should be a bulleted list (use "- " prefixes).
- decisions should list any explicit decisions or agreements.
- If there are no decisions yet, omit that section.
- Only return the JSON array, nothing else.`;

interface NoteSection {
  section: "summary" | "key_points" | "decisions";
  content: string;
}

export async function generateNotes(
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
  if (!raw) {
    console.error("[noteAgent] No response content from OpenAI");
    return;
  }

  console.log("[noteAgent] Raw OpenAI response:", raw.slice(0, 500));

  let sections: NoteSection[];
  try {
    const parsed = JSON.parse(raw);
    // GPT may wrap the array in various keys — try them all
    sections = Array.isArray(parsed)
      ? parsed
      : parsed.notes ?? parsed.sections ?? parsed.note_sections ?? parsed.meeting_notes
        ?? Object.values(parsed).find((v) => Array.isArray(v)) as NoteSection[]
        ?? [];
  } catch {
    console.error("[noteAgent] Failed to parse response:", raw);
    return;
  }

  console.log(`[noteAgent] Parsed ${sections.length} sections`);

  // Upsert notes – delete previous notes for this meeting then insert fresh ones
  const { error: delError } = await supabase.from("notes").delete().eq("meeting_id", meetingId);
  if (delError) console.error("[noteAgent] Delete error:", delError.message);

  if (sections.length > 0) {
    const rows = sections.map((s) => ({
      meeting_id: meetingId,
      section: s.section,
      content: s.content,
    }));
    const { error } = await supabase.from("notes").insert(rows);
    if (error) {
      console.error("[noteAgent] Insert error:", error.message, error.code);
    } else {
      console.log(`[noteAgent] Inserted ${rows.length} note sections for meeting ${meetingId}`);
    }
  }
}
