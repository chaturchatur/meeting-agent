"use client";

import { useTwilioDevice, CallStatus } from "@/hooks/useTwilioDevice";

interface SoftphoneProps {
  identity: string;
  onCallStarted?: (callSid: string) => void;
  onCallEnded?: () => void;
}

const statusLabel: Record<CallStatus, string> = {
  idle: "Start Call",
  connecting: "Connecting…",
  connected: "End Call",
  disconnecting: "Hanging up…",
};

export default function Softphone({
  identity,
  onCallStarted,
  onCallEnded,
}: SoftphoneProps) {
  const { status, callSid, connect, disconnect } = useTwilioDevice(identity);

  const handleClick = async () => {
    if (status === "idle") {
      await connect();
    } else if (status === "connected") {
      disconnect();
      onCallEnded?.();
    }
  };

  // Notify parent when call is accepted
  if (status === "connected" && callSid) {
    onCallStarted?.(callSid);
  }

  const isActive = status === "connected";

  return (
    <div className="flex items-center gap-4">
      <button
        onClick={handleClick}
        disabled={status === "connecting" || status === "disconnecting"}
        className={`
          relative px-6 py-3 rounded-full font-semibold text-sm transition-all
          disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer
          ${
            isActive
              ? "bg-red-600 hover:bg-red-700 text-white"
              : "bg-emerald-600 hover:bg-emerald-700 text-white"
          }
        `}
      >
        {statusLabel[status]}
      </button>

      {isActive && (
        <span className="flex items-center gap-2 text-xs text-emerald-400">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
          </span>
          Live
        </span>
      )}
    </div>
  );
}
