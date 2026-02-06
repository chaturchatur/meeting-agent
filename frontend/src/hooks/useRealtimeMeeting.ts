"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import type {
  TranscriptSegment,
  MeetingNote,
  MeetingTask,
  MeetingGap,
} from "@/lib/types";

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3001";

/**
 * Subscribes to Supabase Realtime for a given meeting and keeps
 * transcript, notes, tasks, and gaps in sync.
 */
export function useRealtimeMeeting(meetingId: string | null) {
  const [transcript, setTranscript] = useState<TranscriptSegment[]>([]);
  const [notes, setNotes] = useState<MeetingNote[]>([]);
  const [tasks, setTasks] = useState<MeetingTask[]>([]);
  const [gaps, setGaps] = useState<MeetingGap[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch initial data when meetingId changes
  const fetchInitial = useCallback(async (id: string) => {
    setLoading(true);
    try {
      const res = await fetch(`${BACKEND}/api/meetings/${id}`);
      if (res.ok) {
        const data = await res.json();
        setTranscript(data.transcript ?? []);
        setNotes(data.notes ?? []);
        setTasks(data.tasks ?? []);
        setGaps(data.gaps ?? []);
      }
    } catch (err) {
      console.error("Failed to fetch meeting data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Subscribe to realtime updates
  useEffect(() => {
    if (!meetingId) return;

    fetchInitial(meetingId);

    const channel = supabase
      .channel(`meeting:${meetingId}`)
      .on(
        "broadcast",
        { event: "INSERT" },
        (payload: { payload: { table: string; new: Record<string, unknown> } }) => {
          const p = payload.payload;
          switch (p.table) {
            case "transcript_segments":
              setTranscript((prev) => [...prev, p.new as unknown as TranscriptSegment]);
              break;
            case "notes":
              setNotes((prev) => [...prev, p.new as unknown as MeetingNote]);
              break;
            case "tasks":
              setTasks((prev) => [...prev, p.new as unknown as MeetingTask]);
              break;
            case "gaps":
              setGaps((prev) => [...prev, p.new as unknown as MeetingGap]);
              break;
          }
        }
      )
      .on(
        "broadcast",
        { event: "UPDATE" },
        (payload: { payload: { table: string; new: Record<string, unknown> } }) => {
          const p = payload.payload;
          // For updates (e.g. notes being replaced), just refetch
          if (p.table === "notes" || p.table === "tasks" || p.table === "gaps") {
            fetchInitial(meetingId);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [meetingId, fetchInitial]);

  const reset = useCallback(() => {
    setTranscript([]);
    setNotes([]);
    setTasks([]);
    setGaps([]);
  }, []);

  return { transcript, notes, tasks, gaps, loading, reset };
}
