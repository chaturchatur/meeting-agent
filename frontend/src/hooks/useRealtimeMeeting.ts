"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";
import type {
  TranscriptSegment,
  MeetingNote,
  MeetingTask,
  MeetingGap,
} from "@/lib/types";

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3001";

/** How often to poll for updates (ms) */
const POLL_INTERVAL_MS = 4_000;

/**
 * Subscribes to Supabase Realtime for a given meeting and keeps
 * transcript, notes, tasks, and gaps in sync.
 * Also polls periodically as a reliable fallback for realtime.
 */
export function useRealtimeMeeting(meetingId: string | null) {
  const [transcript, setTranscript] = useState<TranscriptSegment[]>([]);
  const [notes, setNotes] = useState<MeetingNote[]>([]);
  const [tasks, setTasks] = useState<MeetingTask[]>([]);
  const [gaps, setGaps] = useState<MeetingGap[]>([]);
  const [loading, setLoading] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Fetch data from the backend API
  const fetchData = useCallback(async (id: string, isInitial = false) => {
    if (isInitial) setLoading(true);
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
      if (isInitial) setLoading(false);
    }
  }, []);

  // Subscribe to realtime updates + poll as fallback
  useEffect(() => {
    if (!meetingId) return;

    // Initial fetch
    fetchData(meetingId, true);

    // Start polling every few seconds for reliable live updates
    pollRef.current = setInterval(() => {
      fetchData(meetingId);
    }, POLL_INTERVAL_MS);

    // Also try Supabase Realtime broadcast (works if triggers are configured)
    const channel = supabase
      .channel(`meeting:${meetingId}`)
      .on(
        "broadcast",
        { event: "INSERT" },
        () => {
          // On any broadcast, just refetch to stay in sync
          fetchData(meetingId);
        }
      )
      .on(
        "broadcast",
        { event: "UPDATE" },
        () => {
          fetchData(meetingId);
        }
      )
      .subscribe();

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      supabase.removeChannel(channel);
    };
  }, [meetingId, fetchData]);

  const reset = useCallback(() => {
    setTranscript([]);
    setNotes([]);
    setTasks([]);
    setGaps([]);
  }, []);

  return { transcript, notes, tasks, gaps, loading, reset };
}
