## Meeting Voice Agent

Agentic AI-powered meeting assistant using **Twilio** (voice + browser softphone), **ElevenLabs** (speech-to-text), and **Supabase** (database + Realtime + Auth).

It:
- Listens to calls in real time
- Transcribes the conversation
- Generates meeting notes and key points
- Extracts action items / tasks
- Highlights gaps and follow-ups for the next meeting

This repo contains:
- `backend/` – Fastify server, Twilio webhooks, WebSocket media stream handler, ElevenLabs + agent orchestration
- `frontend/` – React app with browser softphone and live transcript/notes/tasks/gaps panels
- `supabase/` – SQL schema and helper scripts

See `supabase/schema.sql` for the database structure and RLS policies.

