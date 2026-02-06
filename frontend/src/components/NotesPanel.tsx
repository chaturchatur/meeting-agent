"use client";

import type { MeetingNote } from "@/lib/types";

interface Props {
  notes: MeetingNote[];
}

const sectionLabels: Record<string, string> = {
  summary: "Summary",
  key_points: "Key Points",
  decisions: "Decisions",
};

const sectionOrder = ["summary", "key_points", "decisions"];

export default function NotesPanel({ notes }: Props) {
  // Group by section
  const grouped = sectionOrder
    .map((section) => ({
      section,
      items: notes.filter((n) => n.section === section),
    }))
    .filter((g) => g.items.length > 0);

  return (
    <section className="flex flex-col h-full">
      <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
        <svg className="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        Meeting Notes
      </h2>

      <div className="flex-1 overflow-y-auto space-y-4 pr-1">
        {grouped.length === 0 && (
          <p className="text-sm text-neutral-500 italic">
            Notes will appear here once the AI analyses the conversation.
          </p>
        )}

        {grouped.map(({ section, items }) => (
          <div key={section}>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-amber-400 mb-1.5">
              {sectionLabels[section] ?? section}
            </h3>
            {items.map((note) => (
              <div
                key={note.id}
                className="text-sm leading-relaxed whitespace-pre-wrap"
              >
                {note.content}
              </div>
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}
