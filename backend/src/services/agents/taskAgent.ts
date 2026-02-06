/**
 * Task Agent
 * Extracts action items from the meeting transcript.
 */

import OpenAI from "openai";
import { supabase } from "../supabase.js";

const openai = new OpenAI();

const SYSTEM_PROMPT = `You are a task extraction assistant.
Given a meeting transcript, identify actionable tasks that were discussed or assigned.

Return a JSON array of task objects with these fields:
  - "title": short description of the task
  - "description": fuller context (1-2 sentences)
  - "assigned_to": name of the person responsible (or null if unclear)
  - "priority": "low", "medium", or "high"
  - "due_date": ISO date string if mentioned, or null
  - "source_text": the exact quote from the transcript that led to this task

Rules:
- Only include concrete, actionable tasks, not vague suggestions.
- If no tasks are found, return an empty array [].
- Only return the JSON array, nothing else.`;

interface ExtractedTask {
  title: string;
  description: string | null;
  assigned_to: string | null;
  priority: "low" | "medium" | "high";
  due_date: string | null;
  source_text: string | null;
}

export async function extractTasks(
  meetingId: string,
  transcript: string
): Promise<void> {
  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.2,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: `Transcript:\n\n${transcript}` },
    ],
  });

  const raw = response.choices[0]?.message?.content;
  if (!raw) return;

  let tasks: ExtractedTask[];
  try {
    const parsed = JSON.parse(raw);
    tasks = Array.isArray(parsed) ? parsed : parsed.tasks ?? [];
  } catch {
    console.error("[taskAgent] Failed to parse response:", raw);
    return;
  }

  // Replace previous tasks for this meeting
  await supabase.from("tasks").delete().eq("meeting_id", meetingId);

  if (tasks.length > 0) {
    const rows = tasks.map((t) => ({
      meeting_id: meetingId,
      title: t.title,
      description: t.description,
      assigned_to: t.assigned_to,
      priority: t.priority,
      due_date: t.due_date,
      source_text: t.source_text,
      status: "pending" as const,
    }));
    const { error } = await supabase.from("tasks").insert(rows);
    if (error) console.error("[taskAgent] Insert error:", error);
  }
}
