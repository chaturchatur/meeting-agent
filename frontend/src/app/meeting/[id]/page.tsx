"use client";

import { use } from "react";
import { useRealtimeMeeting } from "@/hooks/useRealtimeMeeting";
import TranscriptPanel from "@/components/TranscriptPanel";
import NotesPanel from "@/components/NotesPanel";
import TasksPanel from "@/components/TasksPanel";
import GapsPanel from "@/components/GapsPanel";

export default function MeetingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { transcript, notes, tasks, gaps, loading } = useRealtimeMeeting(id);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen text-neutral-500">
        Loading meeting&hellip;
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      {/* Header */}
      <header className="border-b border-neutral-800 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Meeting Details</h1>
            <p className="text-xs text-neutral-500 mt-0.5 font-mono">{id}</p>
          </div>
          <a
            href="/"
            className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
          >
            &larr; Dashboard
          </a>
        </div>
      </header>

      {/* 4-panel grid */}
      <main className="max-w-7xl mx-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[calc(100vh-10rem)]">
          {/* Transcript — top-left */}
          <div className="rounded-xl border border-neutral-800 bg-neutral-900/30 p-4 overflow-hidden flex flex-col">
            <TranscriptPanel segments={transcript} />
          </div>

          {/* Notes — top-right */}
          <div className="rounded-xl border border-neutral-800 bg-neutral-900/30 p-4 overflow-hidden flex flex-col">
            <NotesPanel notes={notes} />
          </div>

          {/* Tasks — bottom-left */}
          <div className="rounded-xl border border-neutral-800 bg-neutral-900/30 p-4 overflow-hidden flex flex-col">
            <TasksPanel tasks={tasks} />
          </div>

          {/* Gaps — bottom-right */}
          <div className="rounded-xl border border-neutral-800 bg-neutral-900/30 p-4 overflow-hidden flex flex-col">
            <GapsPanel gaps={gaps} />
          </div>
        </div>
      </main>
    </div>
  );
}
