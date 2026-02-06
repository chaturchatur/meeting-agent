-- Supabase schema for Meeting Voice Agent

-- Enable required extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";
create extension if not exists "vector";

-- Profiles table extending auth.users
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  avatar_url text,
  created_at timestamptz default now()
);

-- Meetings
create table if not exists public.meetings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id),
  title text not null,
  call_sid text unique,
  status varchar(20) default 'in_progress',
  start_time timestamptz default now(),
  end_time timestamptz,
  participants text[],
  metadata jsonb,
  created_at timestamptz default now()
);

-- Transcript segments (real-time)
create table if not exists public.transcript_segments (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references public.meetings (id) on delete cascade,
  speaker text,
  content text not null,
  start_time numeric,
  end_time numeric,
  confidence numeric,
  embedding vector(384),
  created_at timestamptz default now()
);

-- AI-generated notes
create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references public.meetings (id) on delete cascade,
  content text not null,
  section varchar(50),
  created_at timestamptz default now()
);

-- Tasks extracted from meeting
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references public.meetings (id) on delete cascade,
  assigned_to text,
  title text not null,
  description text,
  due_date timestamptz,
  status varchar(20) default 'pending',
  priority varchar(10) default 'medium',
  source_text text,
  created_at timestamptz default now()
);

-- Identified gaps/follow-ups
create table if not exists public.gaps (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references public.meetings (id) on delete cascade,
  topic text not null,
  description text,
  suggested_questions text[],
  priority varchar(10) default 'medium',
  created_at timestamptz default now()
);

-- Indexes
create index if not exists idx_meetings_user_id on public.meetings (user_id);
create index if not exists idx_transcript_segments_meeting_id on public.transcript_segments (meeting_id);
create index if not exists idx_notes_meeting_id on public.notes (meeting_id);
create index if not exists idx_tasks_meeting_id on public.tasks (meeting_id);
create index if not exists idx_gaps_meeting_id on public.gaps (meeting_id);
create index if not exists idx_transcript_segments_embedding on public.transcript_segments using ivfflat (embedding vector_cosine_ops);

-- RLS
alter table public.meetings enable row level security;
alter table public.transcript_segments enable row level security;
alter table public.notes enable row level security;
alter table public.tasks enable row level security;
alter table public.gaps enable row level security;

create policy "Users access own meetings"
  on public.meetings
  for all
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users access own transcripts"
  on public.transcript_segments
  for all
  to authenticated
  using (
    meeting_id in (
      select id from public.meetings
      where user_id = (select auth.uid())
    )
  );

create policy "Users access own notes"
  on public.notes
  for all
  to authenticated
  using (
    meeting_id in (
      select id from public.meetings
      where user_id = (select auth.uid())
    )
  );

create policy "Users access own tasks"
  on public.tasks
  for all
  to authenticated
  using (
    meeting_id in (
      select id from public.meetings
      where user_id = (select auth.uid())
    )
  );

create policy "Users access own gaps"
  on public.gaps
  for all
  to authenticated
  using (
    meeting_id in (
      select id from public.meetings
      where user_id = (select auth.uid())
    )
  );

-- Realtime broadcast helper
create or replace function public.broadcast_meeting_update()
returns trigger
language plpgsql
security definer
as $$
begin
  perform realtime.broadcast_changes(
    'meeting:' || new.meeting_id::text,
    tg_op,
    tg_op,
    tg_table_name,
    tg_table_schema,
    new,
    old
  );
  return new;
end;
$$;

create trigger broadcast_transcript
  after insert on public.transcript_segments
  for each row execute function public.broadcast_meeting_update();

create trigger broadcast_notes
  after insert or update on public.notes
  for each row execute function public.broadcast_meeting_update();

create trigger broadcast_tasks
  after insert on public.tasks
  for each row execute function public.broadcast_meeting_update();

create trigger broadcast_gaps
  after insert on public.gaps
  for each row execute function public.broadcast_meeting_update();

