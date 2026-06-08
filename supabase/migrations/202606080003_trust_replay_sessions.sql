-- Trust Memory & Operational Replay Layer V1
-- Replay sessions preserve generated governance memory without mutating history.

create table if not exists public.trust_replay_sessions (
  id uuid primary key default gen_random_uuid(),
  subject_type text,
  subject_id uuid,
  replay_summary text,
  generated_by text,
  created_at timestamptz default now()
);

create index if not exists trust_replay_sessions_subject_idx
  on public.trust_replay_sessions (subject_type, subject_id, created_at desc);

create index if not exists trust_replay_sessions_created_at_idx
  on public.trust_replay_sessions (created_at desc);

revoke all on table public.trust_replay_sessions from anon;
grant select, insert on table public.trust_replay_sessions to authenticated;
grant all privileges on table public.trust_replay_sessions to service_role;

alter table public.trust_replay_sessions enable row level security;

drop policy if exists "authenticated read trust_replay_sessions" on public.trust_replay_sessions;
drop policy if exists "authenticated insert trust_replay_sessions" on public.trust_replay_sessions;

create policy "authenticated read trust_replay_sessions"
  on public.trust_replay_sessions
  for select
  to authenticated
  using (true);

create policy "authenticated insert trust_replay_sessions"
  on public.trust_replay_sessions
  for insert
  to authenticated
  with check (true);
