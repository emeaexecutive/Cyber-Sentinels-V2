-- Intent Verification Layer V1
-- Lightweight intent requests extend the existing passport/evidence/decision workflow.

create table if not exists public.intent_requests (
  id uuid primary key default gen_random_uuid(),
  intent_summary text,
  risk_level text,
  status text default 'pending_review',
  notes text,
  created_by text,
  created_at timestamptz default now()
);

revoke all on table public.intent_requests from anon;
grant select, insert, update on table public.intent_requests to authenticated;

alter table public.intent_requests enable row level security;

drop policy if exists "authenticated manage intent_requests" on public.intent_requests;

create policy "authenticated manage intent_requests" on public.intent_requests
  for all
  to authenticated
  using (true)
  with check (true);
