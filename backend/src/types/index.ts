// ---- Twilio Media Stream message types ----

export interface TwilioStreamConnected {
  event: "connected";
  protocol: string;
  version: string;
}

export interface TwilioStreamStart {
  event: "start";
  sequenceNumber: string;
  start: {
    streamSid: string;
    accountSid: string;
    callSid: string;
    tracks: string[];
    mediaFormat: {
      encoding: string;
      sampleRate: number;
      channels: number;
    };
  };
  streamSid: string;
}

export interface TwilioStreamMedia {
  event: "media";
  sequenceNumber: string;
  media: {
    track: string;
    chunk: string;
    timestamp: string;
    payload: string; // base64-encoded audio
  };
  streamSid: string;
}

export interface TwilioStreamStop {
  event: "stop";
  sequenceNumber: string;
  streamSid: string;
  stop: {
    accountSid: string;
    callSid: string;
  };
}

export type TwilioStreamMessage =
  | TwilioStreamConnected
  | TwilioStreamStart
  | TwilioStreamMedia
  | TwilioStreamStop;

// ---- Application domain types ----

export interface TranscriptSegment {
  id?: string;
  meeting_id: string;
  speaker: string | null;
  content: string;
  start_time: number | null;
  end_time: number | null;
  confidence: number | null;
  created_at?: string;
}

export interface MeetingNote {
  id?: string;
  meeting_id: string;
  content: string;
  section: "summary" | "key_points" | "decisions";
  created_at?: string;
}

export interface MeetingTask {
  id?: string;
  meeting_id: string;
  assigned_to: string | null;
  title: string;
  description: string | null;
  due_date: string | null;
  status: "pending" | "in_progress" | "completed" | "cancelled";
  priority: "low" | "medium" | "high";
  source_text: string | null;
  created_at?: string;
}

export interface MeetingGap {
  id?: string;
  meeting_id: string;
  topic: string;
  description: string | null;
  suggested_questions: string[];
  priority: "low" | "medium" | "high";
  created_at?: string;
}

export interface Meeting {
  id?: string;
  user_id: string;
  title: string;
  call_sid: string | null;
  status: "in_progress" | "completed" | "cancelled";
  start_time?: string;
  end_time?: string;
  participants: string[];
  metadata?: Record<string, unknown>;
  created_at?: string;
}
