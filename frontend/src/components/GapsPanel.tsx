"use client";

import type { MeetingGap } from "@/lib/types";

interface Props {
  gaps: MeetingGap[];
}

const priorityColor: Record<string, string> = {
  high: "border-red-800",
  medium: "border-amber-800",
  low: "border-emerald-800",
};

export default function GapsPanel({ gaps }: Props) {
  return (
    <section className="flex flex-col h-full">
      <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
        <svg className="w-5 h-5 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        Gaps &amp; Follow-ups
      </h2>

      <div className="flex-1 overflow-y-auto space-y-3 pr-1">
        {gaps.length === 0 && (
          <p className="text-sm text-neutral-500 italic">
            Unresolved topics and follow-ups will appear here.
          </p>
        )}

        {gaps.map((gap) => (
          <div
            key={gap.id}
            className={`rounded-lg border bg-neutral-900/50 p-3 ${
              priorityColor[gap.priority] ?? "border-neutral-800"
            }`}
          >
            <h3 className="text-sm font-medium mb-1">{gap.topic}</h3>

            {gap.description && (
              <p className="text-xs text-neutral-400 mb-2">
                {gap.description}
              </p>
            )}

            {gap.suggested_questions.length > 0 && (
              <div>
                <span className="text-[10px] uppercase tracking-wider text-neutral-500 font-semibold">
                  Suggested questions
                </span>
                <ul className="mt-1 space-y-1">
                  {gap.suggested_questions.map((q, i) => (
                    <li
                      key={i}
                      className="text-xs text-neutral-300 flex items-start gap-1.5"
                    >
                      <span className="text-rose-400 mt-0.5">?</span>
                      {q}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
