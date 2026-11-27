-- Add only the governed SOC / authenticated warning Replay event kinds.
-- Existing rows, grants, RLS policies, and the prior accepted kinds are preserved.
-- Apply only after full-schema reconciliation and separately approved hosted rollout.
begin;
do $$
declare prior_expression text;
begin
 if to_regclass('public.operational_entity_native_replay_events') is null then
  raise exception 'SOC_NATIVE_REPLAY_PREREQUISITE_MISSING';
 end if;
 select pg_get_expr(conbin, conrelid) into prior_expression from pg_constraint
 where conrelid='public.operational_entity_native_replay_events'::regclass
 and conname='operational_entity_native_replay_events_event_type_check';
 if prior_expression is null then raise exception 'SOC_NATIVE_REPLAY_CONSTRAINT_MISSING'; end if;
 alter table public.operational_entity_native_replay_events drop constraint operational_entity_native_replay_events_event_type_check;
 execute 'alter table public.operational_entity_native_replay_events add constraint operational_entity_native_replay_events_event_type_check check (('
 || prior_expression || ') or event_type = any (array['
 || quote_literal('SWARM_SOC_AGENT_REGISTERED') || ',' || quote_literal('SWARM_SOC_ALERT') || ',' || quote_literal('SWARM_SOC_INVESTIGATION') || ','
 || quote_literal('SWARM_SOC_MODEL_RUN') || ',' || quote_literal('SWARM_SOC_ASSESSMENT') || ','
 || quote_literal('SWARM_SOC_RESPONSE') || ',' || quote_literal('SWARM_SOC_FEEDBACK') || ','
 || quote_literal('SWARM_SOC_TRUST_MEMORY') || ',' || quote_literal('SWARM_SOC_FAILURE') || ','
 || quote_literal('SWARM_WATCHTOWER_WARNING') || ',' || quote_literal('SWARM_CHIRIVETA_REVIEW')
 || ']::text[]))';
end $$;
commit;
