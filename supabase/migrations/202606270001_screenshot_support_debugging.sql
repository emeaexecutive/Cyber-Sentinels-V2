-- Screenshot-assisted support diagnostics.
-- Screenshots are optional, private and attached only after explicit consent.

create table if not exists public.support_issues (
  id uuid primary key default gen_random_uuid(),
  submitted_by_user_id uuid not null references auth.users(id) on delete cascade,
  submitted_by_email text,
  issue_type text not null default 'ui_regression',
  summary text not null,
  details text,
  current_route text not null,
  workflow_id text,
  workflow_state text,
  replay_reference text,
  provider_state text,
  auth_state text,
  trust_posture_state text,
  session_reference text not null,
  browser_metadata jsonb not null default '{}'::jsonb,
  build_version text,
  screenshot_storage_path text,
  screenshot_file_name text,
  screenshot_content_type text,
  status text not null default 'new',
  admin_notes text,
  verification_notes text,
  reviewed_by text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint support_issues_status_check
    check (status in ('new', 'triaged', 'in_progress', 'fix_ready', 'verified', 'closed')),
  constraint support_issues_type_check
    check (issue_type in (
      'ui_regression',
      'broken_dropdown',
      'missing_button',
      'auth_rendering',
      'replay_rendering',
      'typography_layout',
      'workflow_diagnostic',
      'other'
    ))
);

alter table public.support_issues add column if not exists submitted_by_user_id uuid references auth.users(id) on delete cascade;
alter table public.support_issues add column if not exists submitted_by_email text;
alter table public.support_issues add column if not exists issue_type text default 'ui_regression';
alter table public.support_issues add column if not exists summary text;
alter table public.support_issues add column if not exists details text;
alter table public.support_issues add column if not exists current_route text;
alter table public.support_issues add column if not exists workflow_id text;
alter table public.support_issues add column if not exists workflow_state text;
alter table public.support_issues add column if not exists replay_reference text;
alter table public.support_issues add column if not exists provider_state text;
alter table public.support_issues add column if not exists auth_state text;
alter table public.support_issues add column if not exists trust_posture_state text;
alter table public.support_issues add column if not exists session_reference text;
alter table public.support_issues add column if not exists browser_metadata jsonb default '{}'::jsonb;
alter table public.support_issues add column if not exists build_version text;
alter table public.support_issues add column if not exists screenshot_storage_path text;
alter table public.support_issues add column if not exists screenshot_file_name text;
alter table public.support_issues add column if not exists screenshot_content_type text;
alter table public.support_issues add column if not exists status text default 'new';
alter table public.support_issues add column if not exists admin_notes text;
alter table public.support_issues add column if not exists verification_notes text;
alter table public.support_issues add column if not exists reviewed_by text;
alter table public.support_issues add column if not exists reviewed_at timestamptz;
alter table public.support_issues add column if not exists created_at timestamptz default now();
alter table public.support_issues add column if not exists updated_at timestamptz default now();

create index if not exists support_issues_status_created_idx
  on public.support_issues (status, created_at desc);
create index if not exists support_issues_user_created_idx
  on public.support_issues (submitted_by_user_id, created_at desc);
create index if not exists support_issues_workflow_idx
  on public.support_issues (workflow_id, created_at desc);

alter table public.support_issues enable row level security;
revoke all on table public.support_issues from anon;
grant select, insert on table public.support_issues to authenticated;
grant all privileges on table public.support_issues to service_role;

drop policy if exists "users create own support issues" on public.support_issues;
create policy "users create own support issues"
on public.support_issues
for insert
to authenticated
with check (submitted_by_user_id = auth.uid());

drop policy if exists "users read own support issues" on public.support_issues;
create policy "users read own support issues"
on public.support_issues
for select
to authenticated
using (submitted_by_user_id = auth.uid());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'support-screenshots',
  'support-screenshots',
  false,
  5242880,
  array['image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

