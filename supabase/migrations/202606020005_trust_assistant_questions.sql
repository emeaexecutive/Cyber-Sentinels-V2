-- Trust Assistant V2

create table if not exists public.trust_assistant_questions (
  id uuid primary key default gen_random_uuid(),
  question text not null,
  answer text,
  answer_source text,
  status text default 'pending_review',
  asked_by_user_id uuid,
  asked_by_email text,
  answered_by text,
  metadata jsonb default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

revoke all on table public.trust_assistant_questions from anon;
grant select, insert, update on table public.trust_assistant_questions to authenticated;

alter table public.trust_assistant_questions enable row level security;

drop policy if exists "authenticated insert trust_assistant_questions" on public.trust_assistant_questions;
drop policy if exists "authenticated own read trust_assistant_questions" on public.trust_assistant_questions;
drop policy if exists "admin manage trust_assistant_questions" on public.trust_assistant_questions;

create policy "authenticated insert trust_assistant_questions"
  on public.trust_assistant_questions
  for insert
  to authenticated
  with check (asked_by_user_id = auth.uid());

create policy "authenticated own read trust_assistant_questions"
  on public.trust_assistant_questions
  for select
  to authenticated
  using (asked_by_user_id = auth.uid());

create policy "admin manage trust_assistant_questions"
  on public.trust_assistant_questions
  for all
  to authenticated
  using (
    coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin'
    or coalesce(auth.jwt() -> 'user_metadata' ->> 'role', '') = 'admin'
  )
  with check (
    coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin'
    or coalesce(auth.jwt() -> 'user_metadata' ->> 'role', '') = 'admin'
  );
