import "dotenv/config";
import Fastify from "fastify";
import fastifyCors from "@fastify/cors";
import fastifyWebsocket from "@fastify/websocket";
import fastifyFormbody from "@fastify/formbody";

import { twilioRoutes } from "./routes/twilio.js";
import { tokenRoutes } from "./routes/token.js";
import { meetingRoutes } from "./routes/meetings.js";
import { mediaStreamWs } from "./websocket/mediaStream.js";

async function main() {
  const app = Fastify({ logger: true });

  // --- Plugins ---
  await app.register(fastifyCors, {
    origin: true, // allow all origins in dev; lock down in production
  });
  await app.register(fastifyWebsocket);
  await app.register(fastifyFormbody);

  // --- Routes ---
  await app.register(twilioRoutes);
  await app.register(tokenRoutes);
  await app.register(meetingRoutes);

  // --- WebSocket ---
  await app.register(mediaStreamWs);

  // --- Health check ---
  app.get("/health", async () => ({ status: "ok" }));

  // --- Start ---
  const port = Number(process.env.PORT ?? 3001);
  await app.listen({ port, host: "0.0.0.0" });
  app.log.info(`Server listening on http://0.0.0.0:${port}`);
}

main().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
