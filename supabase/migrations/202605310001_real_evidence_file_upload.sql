-- Real Evidence Upload V2: storage bucket and file metadata.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'evidence-files',
  'evidence-files',
  true,
  10485760,
  array[
    'application/pdf',
    'image/png',
    'image/jpeg',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

alter table public.evidence_files add column if not exists file_type text;
alter table public.evidence_files add column if not exists file_size bigint;
alter table public.evidence_files add column if not exists storage_path text;
alter table public.evidence_files add column if not exists public_url text;

drop policy if exists "Allow authenticated evidence file reads" on storage.objects;
drop policy if exists "Allow authenticated evidence file uploads" on storage.objects;
drop policy if exists "Allow authenticated evidence file updates" on storage.objects;

create policy "Allow authenticated evidence file reads" on storage.objects
  for select
  to authenticated
  using (bucket_id = 'evidence-files');

create policy "Allow authenticated evidence file uploads" on storage.objects
  for insert
  to authenticated
  with check (bucket_id = 'evidence-files');

create policy "Allow authenticated evidence file updates" on storage.objects
  for update
  to authenticated
  using (bucket_id = 'evidence-files')
  with check (bucket_id = 'evidence-files');
