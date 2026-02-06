import { FastifyInstance } from "fastify";
import twilio from "twilio";

export async function twilioRoutes(app: FastifyInstance) {
  /**
   * POST /api/twilio/voice
   * Twilio hits this webhook when a browser call (or inbound call) connects.
   * We respond with TwiML that opens a bidirectional Media Stream to our
   * WebSocket handler so we can capture the audio for transcription.
   */
  app.post("/api/twilio/voice", async (request, reply) => {
    const twiml = new twilio.twiml.VoiceResponse();

    // Optionally greet the caller
    twiml.say("Connected to the meeting agent. Your call is being recorded and transcribed.");

    // Open a media stream to our WebSocket server
    const start = twiml.start();
    start.stream({
      url: `wss://${process.env.BACKEND_HOST}/media-stream`,
      track: "inbound_track",
    });

    // Keep the call alive while streaming (pause indefinitely)
    twiml.pause({ length: 3600 });

    reply.type("text/xml").send(twiml.toString());
  });

  /**
   * POST /api/twilio/status
   * Optional status callback so we know when calls end.
   */
  app.post("/api/twilio/status", async (request, reply) => {
    const body = request.body as Record<string, string>;
    app.log.info({ callSid: body.CallSid, status: body.CallStatus }, "Call status update");
    return reply.send({ ok: true });
  });
}
