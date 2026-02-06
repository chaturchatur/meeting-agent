"use client";

import { useEffect, useRef } from "react";
import type { TranscriptSegment } from "@/lib/types";

interface Props {
  segments: TranscriptSegment[];
}

export default function TranscriptPanel({ segments }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new segments arrive
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [segments.length]);

  return (
    <section className="flex flex-col h-full">
      <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
        <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
        </svg>
        Transcript
      </h2>

      <div className="flex-1 overflow-y-auto space-y-3 pr-1">
        {segments.length === 0 && (
          <p className="text-sm text-neutral-500 italic">
            No transcript yet. Start a call to begin.
          </p>
        )}

        {segments.map((seg) => (
          <div key={seg.id} className="group">
            <div className="flex items-baseline gap-2 mb-0.5">
              <span className="text-xs font-medium text-blue-400">
                {seg.speaker ?? "Unknown"}
              </span>
              {seg.confidence !== null && (
                <span className="text-[10px] text-neutral-500">
                  {Math.round(seg.confidence * 100)}%
                </span>
              )}
            </div>
            <p className="text-sm leading-relaxed">{seg.content}</p>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </section>
  );
}
