-- The existing model evaluator emits these bounded Replay events. Preserve all prior allowed events.
do $$
declare existing_expression text;
begin
  select pg_get_expr(conbin, conrelid) into strict existing_expression
  from pg_constraint
  where conrelid = 'public.canonical_trust_transaction_events'::regclass
    and conname = 'canonical_trust_transaction_events_event_type_check';
  alter table public.canonical_trust_transaction_events
    drop constraint canonical_trust_transaction_events_event_type_check;
  execute format('alter table public.canonical_trust_transaction_events add constraint canonical_trust_transaction_events_event_type_check check ((%s) or event_type = any (%L::text[]))',
    existing_expression, array['MODEL_STATE_BASELINE_ESTABLISHED','MODEL_STATE_OBSERVED','MODEL_STATE_INTEGRITY_EVALUATED','CONSEQUENTIAL_ACTION_REQUESTED','RETROSPECTIVE_MODEL_STATE_REVIEW_OPENED']);
end $$;
