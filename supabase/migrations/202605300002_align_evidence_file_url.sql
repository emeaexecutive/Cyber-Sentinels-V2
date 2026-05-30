-- Align evidence URL storage on file_url.
-- Backfill any environments that briefly had evidence_url, then remove it.

alter table public.evidence_files add column if not exists file_url text;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'evidence_files'
      and column_name = 'evidence_url'
  ) then
    update public.evidence_files
    set file_url = coalesce(file_url, evidence_url)
    where evidence_url is not null;

    alter table public.evidence_files drop column evidence_url;
  end if;
end $$;
