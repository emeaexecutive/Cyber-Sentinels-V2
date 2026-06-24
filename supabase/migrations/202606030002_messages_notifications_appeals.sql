-- Messaging Notifications Appeals V1

create table if not exists public.message_threads (
  id uuid primary key default gen_random_uuid(),
  subject text,
  created_by_user_id uuid,
  created_by_email text,
  status text default 'open',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.message_events (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid references public.message_threads(id) on delete cascade,
  sender_type text,
  sender_email text,
  message text,
  metadata jsonb default '{}',
  created_at timestamptz default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  title text,
  body text,
  notification_type text,
  is_read boolean default false,
  metadata jsonb default '{}',
  created_at timestamptz default now()
);

create table if not exists public.appeals (
  id uuid primary key default gen_random_uuid(),
  passport_id uuid,
  verification_case_id uuid,
  submitted_by_user_id uuid,
  submitted_by_email text,
  appeal_reason text,
  status text default 'submitted',
  reviewed_by text,
  reviewed_at timestamptz,
  resolution_notes text,
  created_at timestamptz default now()
);

revoke all on table public.message_threads from anon;
revoke all on table public.message_events from anon;
revoke all on table public.notifications from anon;
revoke all on table public.appeals from anon;

grant select, insert, update on table public.message_threads to authenticated;
grant select, insert, update on table public.message_events to authenticated;
grant select, insert, update on table public.notifications to authenticated;
grant select, insert, update on table public.appeals to authenticated;

alter table public.message_threads enable row level security;
alter table public.message_events enable row level security;
alter table public.notifications enable row level security;
alter table public.appeals enable row level security;

drop policy if exists "users manage own message_threads" on public.message_threads;
drop policy if exists "users manage own message_events" on public.message_events;
drop policy if exists "users manage own notifications" on public.notifications;
drop policy if exists "users manage own appeals" on public.appeals;
drop policy if exists "admin manage message_threads" on public.message_threads;
drop policy if exists "admin manage message_events" on public.message_events;
drop policy if exists "admin manage notifications" on public.notifications;
drop policy if exists "admin manage appeals" on public.appeals;

create policy "users manage own message_threads"
  on public.message_threads
  for all
  to authenticated
  using (created_by_user_id = auth.uid())
  with check (created_by_user_id = auth.uid());

create policy "users manage own message_events"
  on public.message_events
  for all
  to authenticated
  using (
    exists (
      select 1 from public.message_threads
      where message_threads.id = message_events.thread_id
      and message_threads.created_by_user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.message_threads
      where message_threads.id = message_events.thread_id
      and message_threads.created_by_user_id = auth.uid()
    )
  );

create policy "users manage own notifications"
  on public.notifications
  for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "users manage own appeals"
  on public.appeals
  for all
  to authenticated
  using (submitted_by_user_id = auth.uid())
  with check (submitted_by_user_id = auth.uid());

create policy "admin manage message_threads"
  on public.message_threads
  for all
  to authenticated
  using (
    coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin'
  )
  with check (
    coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin'
  );

create policy "admin manage message_events"
  on public.message_events
  for all
  to authenticated
  using (
    coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin'
  )
  with check (
    coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin'
  );

create policy "admin manage notifications"
  on public.notifications
  for all
  to authenticated
  using (
    coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin'
  )
  with check (
    coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin'
  );

create policy "admin manage appeals"
  on public.appeals
  for all
  to authenticated
  using (
    coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin'
  )
  with check (
    coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin'
  );
