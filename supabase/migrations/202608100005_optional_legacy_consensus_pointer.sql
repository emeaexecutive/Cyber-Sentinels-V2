-- subject_trust_state.current_decision_id is the optional legacy Provider
-- Consensus pointer. Canonical Trust State decisions use the separate,
-- mandatory current_state_decision_id foreign key.

alter table public.subject_trust_state
  alter column current_decision_id drop not null;

comment on column public.subject_trust_state.current_decision_id is
  'Optional legacy Provider Consensus decision. Non-consensus Trust State decisions leave this null.';

comment on column public.subject_trust_state.current_state_decision_id is
  'Canonical current Trust State decision for every authoritative state transition.';
