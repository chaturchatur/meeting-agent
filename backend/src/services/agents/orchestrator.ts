/**
 * Agentic AI Orchestrator
 *
 * Coordinates three specialised agents in parallel:
 *   1. Note Agent   – generates meeting summaries, key points, and decisions
 *   2. Task Agent   – extracts action items with assignees and deadlines
 *   3. Gap Agent    – identifies unresolved topics and suggests follow-ups
 *
 * Each agent is an independent OpenAI call. Results are written directly
 * to Supabase (which then broadcasts via Realtime triggers).
 */

import { generateNotes } from "./noteAgent.js";
import { extractTasks } from "./taskAgent.js";
import { identifyGaps } from "./gapAgent.js";

/**
 * Run all agents in parallel on the accumulated transcript.
 * Safe to call repeatedly – agents are idempotent; each run replaces
 * or appends fresh insights.
 */
export async function runAgents(
  meetingId: string,
  fullTranscript: string
): Promise<void> {
  if (!fullTranscript || fullTranscript.trim().length === 0) return;

  console.log(
    `[orchestrator] Running agents for meeting ${meetingId} (${fullTranscript.length} chars)`
  );

  const agentNames = ["noteAgent", "taskAgent", "gapAgent"];
  const results = await Promise.allSettled([
    generateNotes(meetingId, fullTranscript),
    extractTasks(meetingId, fullTranscript),
    identifyGaps(meetingId, fullTranscript),
  ]);

  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    if (r.status === "rejected") {
      console.error(`[orchestrator] ${agentNames[i]} failed:`, r.reason);
    } else {
      console.log(`[orchestrator] ${agentNames[i]} completed successfully`);
    }
  }
}
