export interface TranscriptSegment {
  id: string;
  meeting_id: string;
  speaker: string | null;
  content: string;
  start_time: number | null;
  end_time: number | null;
  confidence: number | null;
  created_at: string;
}

export interface MeetingNote {
  id: string;
  meeting_id: string;
  content: string;
  section: "summary" | "key_points" | "decisions";
  created_at: string;
}

export interface MeetingTask {
  id: string;
  meeting_id: string;
  assigned_to: string | null;
  title: string;
  description: string | null;
  due_date: string | null;
  status: string;
  priority: string;
  source_text: string | null;
  created_at: string;
}

export interface MeetingGap {
  id: string;
  meeting_id: string;
  topic: string;
  description: string | null;
  suggested_questions: string[];
  priority: string;
  created_at: string;
}

export interface Meeting {
  id: string;
  user_id: string;
  title: string;
  call_sid: string | null;
  status: string;
  start_time: string;
  end_time: string | null;
  participants: string[];
  metadata: Record<string, unknown> | null;
  created_at: string;
}
