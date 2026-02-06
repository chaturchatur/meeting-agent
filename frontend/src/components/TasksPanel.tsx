"use client";

import type { MeetingTask } from "@/lib/types";

interface Props {
  tasks: MeetingTask[];
}

const priorityBadge: Record<string, string> = {
  high: "bg-red-900/40 text-red-300",
  medium: "bg-amber-900/40 text-amber-300",
  low: "bg-emerald-900/40 text-emerald-300",
};

export default function TasksPanel({ tasks }: Props) {
  return (
    <section className="flex flex-col h-full">
      <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
        <svg className="w-5 h-5 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
        Tasks
      </h2>

      <div className="flex-1 overflow-y-auto space-y-3 pr-1">
        {tasks.length === 0 && (
          <p className="text-sm text-neutral-500 italic">
            Action items will appear here as they are identified.
          </p>
        )}

        {tasks.map((task) => (
          <div
            key={task.id}
            className="rounded-lg border border-neutral-800 bg-neutral-900/50 p-3"
          >
            <div className="flex items-start justify-between gap-2 mb-1">
              <span className="text-sm font-medium">{task.title}</span>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                  priorityBadge[task.priority] ?? priorityBadge.medium
                }`}
              >
                {task.priority}
              </span>
            </div>

            {task.description && (
              <p className="text-xs text-neutral-400 mb-1.5">
                {task.description}
              </p>
            )}

            <div className="flex items-center gap-3 text-[11px] text-neutral-500">
              {task.assigned_to && (
                <span>Assigned to: {task.assigned_to}</span>
              )}
              {task.due_date && (
                <span>Due: {new Date(task.due_date).toLocaleDateString()}</span>
              )}
            </div>

            {task.source_text && (
              <p className="mt-2 text-[11px] text-neutral-600 italic border-l-2 border-neutral-700 pl-2">
                &ldquo;{task.source_text}&rdquo;
              </p>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
