-- Back Office security hardening
-- Operational tables are authenticated-only.

revoke all on table public.decisions from anon;
revoke all on table public.audit_logs from anon;
revoke all on table public.signals from anon;
revoke all on table public.help_questions from anon;
revoke all on table public.trust_graph_nodes from anon;
revoke all on table public.trust_graph_edges from anon;

grant select, insert, update on table public.decisions to authenticated;
grant select, insert, update on table public.audit_logs to authenticated;
grant select, insert, update on table public.signals to authenticated;
grant select, insert, update on table public.help_questions to authenticated;
grant select, insert, update on table public.trust_graph_nodes to authenticated;
grant select, insert, update on table public.trust_graph_edges to authenticated;

alter table public.decisions enable row level security;
alter table public.audit_logs enable row level security;
alter table public.signals enable row level security;
alter table public.help_questions enable row level security;
alter table public.trust_graph_nodes enable row level security;
alter table public.trust_graph_edges enable row level security;

drop policy if exists "authenticated manage help_questions" on public.help_questions;
drop policy if exists "authenticated manage trust_graph_nodes" on public.trust_graph_nodes;
drop policy if exists "authenticated manage trust_graph_edges" on public.trust_graph_edges;
drop policy if exists "authenticated manage decisions" on public.decisions;
drop policy if exists "authenticated manage audit_logs" on public.audit_logs;
drop policy if exists "authenticated manage signals" on public.signals;

create policy "authenticated manage help_questions" on public.help_questions
  for all
  to authenticated
  using (true)
  with check (true);

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

create policy "authenticated manage decisions" on public.decisions
  for all
  to authenticated
  using (true)
  with check (true);

create policy "authenticated manage audit_logs" on public.audit_logs
  for all
  to authenticated
  using (true)
  with check (true);

create policy "authenticated manage signals" on public.signals
  for all
  to authenticated
  using (true)
  with check (true);
