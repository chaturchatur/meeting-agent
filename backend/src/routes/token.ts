import { FastifyInstance } from "fastify";
import twilio from "twilio";

export async function tokenRoutes(app: FastifyInstance) {
  /**
   * GET /api/token?identity=<user-id>
   * Returns a Twilio Access Token with a Voice grant so the browser
   * can make / receive calls via the Twilio Client SDK.
   */
  app.get<{ Querystring: { identity?: string } }>(
    "/api/token",
    async (request, reply) => {
      const identity = request.query.identity ?? "anonymous";

      const accessToken = new twilio.jwt.AccessToken(
        process.env.TWILIO_ACCOUNT_SID!,
        process.env.TWILIO_API_KEY!,
        process.env.TWILIO_API_SECRET!,
        { identity }
      );

      const voiceGrant = new twilio.jwt.AccessToken.VoiceGrant({
        outgoingApplicationSid: process.env.TWILIO_TWIML_APP_SID!,
        incomingAllow: true,
      });

      accessToken.addGrant(voiceGrant);

      return reply.send({ token: accessToken.toJwt() });
    }
  );
}
