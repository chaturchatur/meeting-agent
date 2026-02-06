import { FastifyInstance } from "fastify";
import { supabase } from "../services/supabase.js";

export async function meetingRoutes(app: FastifyInstance) {
  /**
   * POST /api/meetings
   * Create a new meeting record.
   */
  app.post<{
    Body: { user_id: string; title: string; call_sid?: string };
  }>("/api/meetings", async (request, reply) => {
    const { user_id, title, call_sid } = request.body;

    const { data, error } = await supabase
      .from("meetings")
      .insert({ user_id, title, call_sid, status: "in_progress" })
      .select()
      .single();

    if (error) {
      app.log.error(error, "Failed to create meeting");
      return reply.status(500).send({ error: error.message });
    }

    return reply.status(201).send(data);
  });

  /**
   * GET /api/meetings/:id
   * Fetch a meeting and all its related data.
   */
  app.get<{ Params: { id: string } }>(
    "/api/meetings/:id",
    async (request, reply) => {
      const { id } = request.params;

      const [meetingRes, transcriptRes, notesRes, tasksRes, gapsRes] =
        await Promise.all([
          supabase.from("meetings").select("*").eq("id", id).single(),
          supabase
            .from("transcript_segments")
            .select("*")
            .eq("meeting_id", id)
            .order("created_at", { ascending: true }),
          supabase
            .from("notes")
            .select("*")
            .eq("meeting_id", id)
            .order("created_at", { ascending: true }),
          supabase
            .from("tasks")
            .select("*")
            .eq("meeting_id", id)
            .order("created_at", { ascending: true }),
          supabase
            .from("gaps")
            .select("*")
            .eq("meeting_id", id)
            .order("created_at", { ascending: true }),
        ]);

      if (meetingRes.error) {
        return reply.status(404).send({ error: "Meeting not found" });
      }

      return reply.send({
        meeting: meetingRes.data,
        transcript: transcriptRes.data ?? [],
        notes: notesRes.data ?? [],
        tasks: tasksRes.data ?? [],
        gaps: gapsRes.data ?? [],
      });
    }
  );

  /**
   * GET /api/meetings
   * List all meetings for a user.
   */
  app.get<{ Querystring: { user_id: string } }>(
    "/api/meetings",
    async (request, reply) => {
      const { user_id } = request.query;

      const { data, error } = await supabase
        .from("meetings")
        .select("*")
        .eq("user_id", user_id)
        .order("created_at", { ascending: false });

      if (error) {
        return reply.status(500).send({ error: error.message });
      }

      return reply.send(data);
    }
  );

  /**
   * PATCH /api/meetings/:id/end
   * Mark a meeting as completed.
   */
  app.patch<{ Params: { id: string } }>(
    "/api/meetings/:id/end",
    async (request, reply) => {
      const { id } = request.params;

      const { data, error } = await supabase
        .from("meetings")
        .update({ status: "completed", end_time: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();

      if (error) {
        return reply.status(500).send({ error: error.message });
      }

      return reply.send(data);
    }
  );
}
