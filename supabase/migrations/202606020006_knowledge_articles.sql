-- Admin Knowledge Base V1

create table if not exists public.knowledge_articles (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category text,
  summary text,
  body text not null,
  status text default 'draft',
  created_by text,
  approved_by text,
  approved_at timestamptz,
  metadata jsonb default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

revoke all on table public.knowledge_articles from anon;
grant select, insert, update on table public.knowledge_articles to authenticated;

alter table public.knowledge_articles enable row level security;

drop policy if exists "authenticated read approved knowledge_articles" on public.knowledge_articles;
drop policy if exists "admin manage knowledge_articles" on public.knowledge_articles;

create policy "authenticated read approved knowledge_articles"
  on public.knowledge_articles
  for select
  to authenticated
  using (status = 'approved');

create policy "admin manage knowledge_articles"
  on public.knowledge_articles
  for all
  to authenticated
  using (
    coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin'
  )
  with check (
    coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin'
  );
