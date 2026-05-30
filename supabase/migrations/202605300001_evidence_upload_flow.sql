-- Evidence Upload Flow V1
-- Authenticated users may register evidence URLs against verification cases.

alter table public.evidence_files add column if not exists passport_id uuid references public.passports(id) on delete set null;
alter table public.evidence_files add column if not exists evidence_type text;
alter table public.evidence_files add column if not exists file_url text;
alter table public.evidence_files add column if not exists notes text;
alter table public.evidence_files add column if not exists uploaded_by text;
alter table public.evidence_files add column if not exists status text default 'pending_review';

revoke all on table public.evidence_files from anon;
grant select, insert, update on table public.evidence_files to authenticated;

alter table public.evidence_files enable row level security;

drop policy if exists "Allow authenticated evidence_files reads" on public.evidence_files;
drop policy if exists "Allow authenticated evidence_files inserts" on public.evidence_files;
drop policy if exists "Allow authenticated evidence_files updates" on public.evidence_files;
drop policy if exists "Allow authenticated evidence reads" on public.evidence_files;

create policy "Allow authenticated evidence_files reads" on public.evidence_files
  for select
  to authenticated
  using (true);

create policy "Allow authenticated evidence_files inserts" on public.evidence_files
  for insert
  to authenticated
  with check (true);

create policy "Allow authenticated evidence_files updates" on public.evidence_files
  for update
  to authenticated
  using (true)
  with check (true);
