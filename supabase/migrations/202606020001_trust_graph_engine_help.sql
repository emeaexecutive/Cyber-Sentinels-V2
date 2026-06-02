-- Trust Graph Engine V1 + Help Center V1

create table if not exists public.trust_graph_nodes (
  id uuid primary key default gen_random_uuid(),
  node_type text not null,
  source_table text,
  source_id uuid,
  label text,
  status text,
  risk_level text,
  metadata jsonb default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.trust_graph_edges (
  id uuid primary key default gen_random_uuid(),
  from_node_id uuid,
  to_node_id uuid,
  relationship_type text,
  source_table text,
  source_id uuid,
  metadata jsonb default '{}',
  created_at timestamptz default now()
);

create table if not exists public.help_questions (
  id uuid primary key default gen_random_uuid(),
  question text not null,
  answer text,
  status text default 'open',
  created_by text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

revoke all on table public.trust_graph_nodes from anon;
revoke all on table public.trust_graph_edges from anon;
revoke all on table public.help_questions from anon;

grant select, insert, update on table public.trust_graph_nodes to authenticated;
grant select, insert, update on table public.trust_graph_edges to authenticated;
grant select, insert, update on table public.help_questions to authenticated;

alter table public.trust_graph_nodes enable row level security;
alter table public.trust_graph_edges enable row level security;
alter table public.help_questions enable row level security;

drop policy if exists "authenticated manage trust_graph_nodes" on public.trust_graph_nodes;
drop policy if exists "authenticated manage trust_graph_edges" on public.trust_graph_edges;
drop policy if exists "authenticated manage help_questions" on public.help_questions;

create policy "authenticated manage trust_graph_nodes" on public.trust_graph_nodes
  for all
  to authenticated
  using (true)
  with check (true);

create policy "authenticated manage trust_graph_edges" on public.trust_graph_edges
  for all
  to authenticated
  using (true)
  with check (true);

create policy "authenticated manage help_questions" on public.help_questions
  for all
  to authenticated
  using (true)
  with check (true);
