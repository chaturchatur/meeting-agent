"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Device, Call } from "@twilio/voice-sdk";

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3001";

export type CallStatus = "idle" | "connecting" | "connected" | "disconnecting";

/**
 * Manages a Twilio Voice Device in the browser.
 * Fetches an access token, initialises the device, and exposes
 * connect / disconnect helpers.
 */
export function useTwilioDevice(identity: string) {
  const [status, setStatus] = useState<CallStatus>("idle");
  const [callSid, setCallSid] = useState<string | null>(null);
  const deviceRef = useRef<Device | null>(null);
  const callRef = useRef<Call | null>(null);

  // Initialise the Twilio Device on mount
  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        const res = await fetch(
          `${BACKEND}/api/token?identity=${encodeURIComponent(identity)}`
        );
        const { token } = await res.json();

        if (cancelled) return;

        const device = new Device(token, {
          logLevel: 1,
          codecPreferences: [Call.Codec.Opus, Call.Codec.PCMU],
        });

        device.on("error", (err) => {
          console.error("Twilio Device error:", err);
        });

        await device.register();
        deviceRef.current = device;
      } catch (err) {
        console.error("Failed to initialise Twilio Device:", err);
      }
    }

    init();

    return () => {
      cancelled = true;
      deviceRef.current?.destroy();
      deviceRef.current = null;
    };
  }, [identity]);

  const connect = useCallback(async () => {
    const device = deviceRef.current;
    if (!device) return;

    setStatus("connecting");

    try {
      const call = await device.connect();
      callRef.current = call;

      call.on("accept", () => {
        setStatus("connected");
        setCallSid(call.parameters?.CallSid ?? null);
      });

      call.on("disconnect", () => {
        setStatus("idle");
        setCallSid(null);
        callRef.current = null;
      });

      call.on("cancel", () => {
        setStatus("idle");
        setCallSid(null);
        callRef.current = null;
      });
    } catch (err) {
      console.error("Failed to connect call:", err);
      setStatus("idle");
    }
  }, []);

  const disconnect = useCallback(() => {
    setStatus("disconnecting");
    callRef.current?.disconnect();
  }, []);

  return { status, callSid, connect, disconnect };
}
