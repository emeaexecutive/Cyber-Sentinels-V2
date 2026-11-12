-- Exact new deterministic budget journal kinds; preserves prior Replay acceptance.
-- No grant, RLS, table or historical row changes. Hosted rollout needs separate approval.
begin;
do $$
declare prior_expression text;
begin
 if to_regclass('public.operational_entity_native_replay_events') is null then raise exception 'SOC_REPLAY_PREREQUISITE_MISSING'; end if;
 select pg_get_expr(conbin,conrelid) into prior_expression from pg_constraint where conrelid='public.operational_entity_native_replay_events'::regclass and conname='operational_entity_native_replay_events_event_type_check';
 if prior_expression is null then raise exception 'SOC_REPLAY_CONSTRAINT_MISSING'; end if;
 alter table public.operational_entity_native_replay_events drop constraint operational_entity_native_replay_events_event_type_check;
 execute 'alter table public.operational_entity_native_replay_events add constraint operational_entity_native_replay_events_event_type_check check (('||prior_expression||') or event_type = any (array['
 ||quote_literal('SWARM_SOC_MODEL_BUDGET_RESERVED')||','||quote_literal('SWARM_SOC_MODEL_BUDGET_UNKNOWN')||','||quote_literal('SWARM_SOC_MODEL_BUDGET_RECONCILED')||','||quote_literal('SWARM_SOC_MODEL_BUDGET_DENIED')||']::text[]))';
end $$;
commit;
