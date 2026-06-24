create table if not exists public.launch_control_notes (
  id uuid primary key default gen_random_uuid(),
  note text,
  status text default 'open',
  created_by text,
  created_at timestamptz default now()
);

create index if not exists launch_control_notes_created_idx
on public.launch_control_notes (created_at desc);

alter table public.launch_control_notes enable row level security;

revoke all on table public.launch_control_notes from anon;
grant select, insert, update on table public.launch_control_notes to authenticated;
grant all privileges on table public.launch_control_notes to service_role;

drop policy if exists "admin manage launch control notes" on public.launch_control_notes;

create policy "admin manage launch control notes"
on public.launch_control_notes
for all
to authenticated
using (
  coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin'
)
with check (
  coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin'
);
