create table if not exists public.feedback_reports (
  id uuid primary key default gen_random_uuid(),
  category text,
  message text,
  screenshot_url text,
  contact_preference text,
  submitted_by_user_id uuid,
  submitted_by_email text,
  status text default 'new',
  admin_notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.interest_signals (
  id uuid primary key default gen_random_uuid(),
  company text,
  role text,
  use_case text,
  interest_level text,
  source text,
  notes text,
  status text default 'new',
  admin_notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.feedback_reports enable row level security;
alter table public.interest_signals enable row level security;

grant select, insert, update on table public.feedback_reports to authenticated;
grant insert on table public.interest_signals to anon;
grant select, insert, update on table public.interest_signals to authenticated;

drop policy if exists "authenticated manage feedback_reports" on public.feedback_reports;
drop policy if exists "public insert interest_signals" on public.interest_signals;
drop policy if exists "authenticated manage interest_signals" on public.interest_signals;

create policy "authenticated manage feedback_reports"
on public.feedback_reports
for all
to authenticated
using (true)
with check (true);

create policy "public insert interest_signals"
on public.interest_signals
for insert
to anon
with check (true);

create policy "authenticated manage interest_signals"
on public.interest_signals
for all
to authenticated
using (true)
with check (true);
