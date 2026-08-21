-- Extend the existing Track + Block intervention vocabulary only. Policy and
-- workforce continuity remain immutable rows in evidence_objects and are
-- projected into the one canonical transaction receipt, Evidence Graph,
-- Replay and Trust Memory. No receipt, identity registry, or decision store is
-- introduced here.

alter table public.protected_workflows
  drop constraint if exists protected_workflows_latest_intervention_check;
alter table public.protected_workflows
  add constraint protected_workflows_latest_intervention_check
  check(latest_intervention is null or latest_intervention in (
    'MONITOR','WARNING','CHALLENGE','STEP_UP_VERIFY','STEP_UP_VERIFICATION',
    'PAUSE','REVIEW','BLOCK','TERMINATE','RESUME'
  ));

alter table public.workflow_interventions
  drop constraint if exists workflow_interventions_intervention_type_check;
alter table public.workflow_interventions
  add constraint workflow_interventions_intervention_type_check
  check(intervention_type in (
    'MONITOR','WARNING','CHALLENGE','STEP_UP_VERIFY','STEP_UP_VERIFICATION',
    'PAUSE','REVIEW','BLOCK','TERMINATE','RESUME'
  ));

comment on constraint protected_workflows_latest_intervention_check on public.protected_workflows is
  'Policy-selected Track + Block response. STEP_UP_VERIFICATION and REVIEW are not fraud classifications.';
comment on constraint workflow_interventions_intervention_type_check on public.workflow_interventions is
  'Canonical transaction downstream response; evidence and vendor identity cannot directly create an intervention.';
