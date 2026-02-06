import { FastifyInstance } from "fastify";
import { WebSocket } from "ws";
import { TwilioStreamMessage } from "../types/index.js";
import { transcribeAudioChunk, flushTranscription } from "../services/elevenlabs.js";
import { supabase } from "../services/supabase.js";
import { runAgents } from "../services/agents/orchestrator.js";

/** How often (ms) we trigger the agentic analysis pipeline while a call is live. */
const AGENT_INTERVAL_MS = 30_000;

interface StreamSession {
  callSid: string;
  streamSid: string;
  meetingId: string | null;
  transcriptBuffer: string[];
  agentTimer: ReturnType<typeof setInterval> | null;
}

/**
 * Register the /media-stream WebSocket route.
 * Twilio opens this connection when a call starts.
 */
export async function mediaStreamWs(app: FastifyInstance) {
  app.get(
    "/media-stream",
    { websocket: true },
    (socket: WebSocket, _request) => {
      const session: StreamSession = {
        callSid: "",
        streamSid: "",
        meetingId: null,
        transcriptBuffer: [],
        agentTimer: null,
      };

      app.log.info("Twilio media stream connected");

      socket.on("message", async (raw: Buffer) => {
        try {
          const msg: TwilioStreamMessage = JSON.parse(raw.toString());

          switch (msg.event) {
            case "connected":
              app.log.info("Twilio stream protocol connected");
              break;

            case "start":
              session.callSid = msg.start.callSid;
              session.streamSid = msg.streamSid;
              app.log.info(
                { callSid: session.callSid },
                "Media stream started"
              );

              // Create a meeting record for this call
              const { data: meeting } = await supabase
                .from("meetings")
                .insert({
                  title: `Call ${session.callSid.slice(-6)}`,
                  call_sid: session.callSid,
                  // For demo purposes we use a default user_id.
                  // In production this would come from the authenticated user.
                  user_id: "00000000-0000-0000-0000-000000000000",
                  status: "in_progress",
                })
                .select()
                .single();

              if (meeting) {
                session.meetingId = meeting.id;
                app.log.info({ meetingId: meeting.id }, "Meeting created");
              }

              // Start periodic agent analysis
              session.agentTimer = setInterval(async () => {
                if (session.meetingId && session.transcriptBuffer.length > 0) {
                  const fullText = session.transcriptBuffer.join(" ");
                  await runAgents(session.meetingId, fullText);
                }
              }, AGENT_INTERVAL_MS);
              break;

            case "media": {
              // Forward audio payload to ElevenLabs for transcription
              const segment = await transcribeAudioChunk(
                msg.media.payload,
                msg.media.track
              );
              if (segment && session.meetingId) {
                session.transcriptBuffer.push(segment.content);
                // Persist the transcript segment
                await supabase.from("transcript_segments").insert({
                  meeting_id: session.meetingId,
                  speaker: segment.speaker,
                  content: segment.content,
                  start_time: segment.start_time,
                  end_time: segment.end_time,
                  confidence: segment.confidence,
                });
              }
              break;
            }

            case "stop":
              app.log.info(
                { callSid: session.callSid },
                "Media stream stopped"
              );

              // Flush any remaining audio in the transcription buffer
              const remaining = await flushTranscription();
              if (remaining && session.meetingId) {
                session.transcriptBuffer.push(remaining.content);
                await supabase.from("transcript_segments").insert({
                  meeting_id: session.meetingId,
                  speaker: remaining.speaker,
                  content: remaining.content,
                  start_time: remaining.start_time,
                  end_time: remaining.end_time,
                  confidence: remaining.confidence,
                });
              }

              // Run agents one final time with the complete transcript
              if (session.meetingId && session.transcriptBuffer.length > 0) {
                const fullText = session.transcriptBuffer.join(" ");
                await runAgents(session.meetingId, fullText);
              }

              // Mark the meeting as completed
              if (session.meetingId) {
                await supabase
                  .from("meetings")
                  .update({
                    status: "completed",
                    end_time: new Date().toISOString(),
                  })
                  .eq("id", session.meetingId);
              }

              if (session.agentTimer) clearInterval(session.agentTimer);
              break;
          }
        } catch (err) {
          app.log.error(err, "Error processing media stream message");
        }
      });

      socket.on("close", () => {
        app.log.info("Twilio media stream disconnected");
        if (session.agentTimer) clearInterval(session.agentTimer);
      });
    }
  );
}
