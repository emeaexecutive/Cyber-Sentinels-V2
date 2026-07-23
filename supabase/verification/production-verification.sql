-- Cyber Sentinels production verification
-- Read-only: this file contains SELECT statements only.

select expected.table_name,
       case when existing.oid is null then 'MISSING' else 'PRESENT' end as status
from (values
  ('candidate_profiles'),
  ('interview_sessions'),
  ('consent_receipts'),
  ('trust_events'),
  ('evidence_objects'),
  ('evidence_graph_nodes'),
  ('evidence_graph_edges'),
  ('trust_memory_index'),
  ('trust_state_decisions')
) as expected(table_name)
left join pg_catalog.pg_class existing
  on existing.relname = expected.table_name
 and existing.relnamespace = 'public'::regnamespace
 and existing.relkind in ('r', 'p')
order by expected.table_name;

select c.relname as sensitive_table,
       c.relrowsecurity as rls_enabled,
       c.relforcerowsecurity as rls_forced
from pg_catalog.pg_class c
where c.relnamespace = 'public'::regnamespace
  and c.relname in (
    'candidate_profiles', 'interview_sessions', 'consent_receipts',
    'trust_events', 'evidence_objects', 'evidence_graph_nodes',
    'evidence_graph_edges', 'trust_memory_index', 'trust_state_decisions'
  )
order by c.relname;

select schemaname, tablename, policyname, roles, cmd, count(*) as duplicate_count
from pg_catalog.pg_policies
where schemaname = 'public'
group by schemaname, tablename, policyname, roles, cmd
having count(*) > 1
order by tablename, policyname;

select schemaname, tablename, indexname
from pg_catalog.pg_indexes indexes
join pg_catalog.pg_class index_class on index_class.relname = indexes.indexname
join pg_catalog.pg_index index_state on index_state.indexrelid = index_class.oid
where indexes.schemaname = 'public'
  and not index_state.indisvalid
order by tablename, indexname;

select constraint_name,
       table_name,
       referenced_table,
       validation_state
from (
  select constraint_row.conname as constraint_name,
         source_table.relname as table_name,
         target_table.relname as referenced_table,
         case when constraint_row.convalidated then 'VALID' else 'NOT VALID' end as validation_state
  from pg_catalog.pg_constraint constraint_row
  join pg_catalog.pg_class source_table on source_table.oid = constraint_row.conrelid
  join pg_catalog.pg_class target_table on target_table.oid = constraint_row.confrelid
  where constraint_row.contype = 'f'
    and source_table.relnamespace = 'public'::regnamespace
) constraints
where table_name in ('interview_sessions', 'candidate_profiles')
order by table_name, constraint_name;

select count(*) as orphaned_interview_candidate_records
from public.interview_sessions sessions
left join public.candidate_profiles candidates on candidates.id = sessions.candidate_id
where sessions.candidate_id is not null
  and candidates.id is null;

select expected.function_name,
       case when routines.oid is null then 'MISSING' else 'PRESENT' end as status
from (values
  ('uid'),
  ('user_can_access_trust_workspace'),
  ('persist_consent_change_v1'),
  ('append_trust_event_v1'),
  ('apply_trust_state_decision_v1')
) expected(function_name)
left join pg_catalog.pg_proc routines on routines.proname = expected.function_name
left join pg_catalog.pg_namespace namespaces on namespaces.oid = routines.pronamespace
where namespaces.nspname in ('auth', 'public') or routines.oid is null
order by expected.function_name;

