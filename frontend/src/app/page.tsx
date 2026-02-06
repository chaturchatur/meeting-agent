"use client";

import { useState, useCallback, useEffect } from "react";
import Softphone from "@/components/Softphone";
import TranscriptPanel from "@/components/TranscriptPanel";
import NotesPanel from "@/components/NotesPanel";
import TasksPanel from "@/components/TasksPanel";
import GapsPanel from "@/components/GapsPanel";
import { useRealtimeMeeting } from "@/hooks/useRealtimeMeeting";
import type { Meeting } from "@/lib/types";

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3001";

// For demo purposes — in production this comes from Supabase Auth
const DEMO_USER_ID = "00000000-0000-0000-0000-000000000000";

export default function Dashboard() {
  const [activeMeetingId, setActiveMeetingId] = useState<string | null>(null);
  const [pastMeetings, setPastMeetings] = useState<Meeting[]>([]);

  const { transcript, notes, tasks, gaps, reset } =
    useRealtimeMeeting(activeMeetingId);

  // Fetch past meetings on mount
  useEffect(() => {
    fetch(`${BACKEND}/api/meetings?user_id=${DEMO_USER_ID}`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setPastMeetings(data);
      })
      .catch(console.error);
  }, [activeMeetingId]);

  const handleCallStarted = useCallback(async (callSid: string) => {
    // The backend creates the meeting automatically via the media stream handler.
    // We poll until we find a meeting with this callSid.
    const poll = async () => {
      for (let i = 0; i < 15; i++) {
        await new Promise((r) => setTimeout(r, 1000));
        const res = await fetch(
          `${BACKEND}/api/meetings?user_id=${DEMO_USER_ID}`
        );
        const meetings: Meeting[] = await res.json();
        const match = meetings.find((m) => m.call_sid === callSid);
        if (match) {
          setActiveMeetingId(match.id);
          return;
        }
      }
    };
    poll();
  }, []);

  const handleCallEnded = useCallback(async () => {
    if (activeMeetingId) {
      await fetch(`${BACKEND}/api/meetings/${activeMeetingId}/end`, {
        method: "PATCH",
      });
    }
    // Keep the meeting visible so user can review
  }, [activeMeetingId]);

  const handleSelectMeeting = useCallback(
    (id: string) => {
      reset();
      setActiveMeetingId(id);
    },
    [reset]
  );

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      {/* Header */}
      <header className="border-b border-neutral-800 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <h1 className="text-xl font-bold tracking-tight">
            Meeting Agent
          </h1>
          <Softphone
            identity={DEMO_USER_ID}
            onCallStarted={handleCallStarted}
            onCallEnded={handleCallEnded}
          />
        </div>
      </header>

      <div className="max-w-7xl mx-auto flex gap-6 p-6 h-[calc(100vh-5rem)]">
        {/* Sidebar — past meetings */}
        <aside className="w-64 shrink-0 flex flex-col">
          <h2 className="text-sm font-semibold text-neutral-400 uppercase tracking-wider mb-3">
            Meetings
          </h2>
          <div className="flex-1 overflow-y-auto space-y-1.5">
            {pastMeetings.length === 0 && (
              <p className="text-xs text-neutral-600 italic">
                No meetings yet.
              </p>
            )}
            {pastMeetings.map((m) => (
              <button
                key={m.id}
                onClick={() => handleSelectMeeting(m.id)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors cursor-pointer ${
                  activeMeetingId === m.id
                    ? "bg-blue-900/30 text-blue-300 border border-blue-800"
                    : "hover:bg-neutral-800/50 text-neutral-300"
                }`}
              >
                <span className="block font-medium truncate">{m.title}</span>
                <span className="block text-[10px] text-neutral-500 mt-0.5">
                  {new Date(m.start_time).toLocaleString()} &middot;{" "}
                  {m.status}
                </span>
              </button>
            ))}
          </div>
        </aside>

        {/* Main content — 4 panels */}
        <main className="flex-1 min-w-0">
          {!activeMeetingId ? (
            <div className="flex items-center justify-center h-full text-neutral-600">
              <div className="text-center">
                <p className="text-lg mb-2">No meeting selected</p>
                <p className="text-sm">
                  Click <strong>Start Call</strong> to begin a new meeting, or
                  select a past meeting from the sidebar.
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-full">
              <div className="rounded-xl border border-neutral-800 bg-neutral-900/30 p-4 overflow-hidden flex flex-col">
                <TranscriptPanel segments={transcript} />
              </div>
              <div className="rounded-xl border border-neutral-800 bg-neutral-900/30 p-4 overflow-hidden flex flex-col">
                <NotesPanel notes={notes} />
              </div>
              <div className="rounded-xl border border-neutral-800 bg-neutral-900/30 p-4 overflow-hidden flex flex-col">
                <TasksPanel tasks={tasks} />
              </div>
              <div className="rounded-xl border border-neutral-800 bg-neutral-900/30 p-4 overflow-hidden flex flex-col">
                <GapsPanel gaps={gaps} />
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
