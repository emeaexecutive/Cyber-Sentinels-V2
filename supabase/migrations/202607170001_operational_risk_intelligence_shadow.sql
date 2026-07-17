-- Epic 16 Sprint 16.1A: governed Operational Risk Intelligence shadow foundation.
-- ORI is decision support only. It cannot authorize, approve, reject, block, or verify.

create table if not exists public.ori_model_registry (
  registry_id text primary key,
  model_id text not null,
  scope text not null check (scope = 'GLOBAL_SHADOW'),
  model_name text not null,
  model_version text not null,
  algorithm_family text not null check (algorithm_family = 'LOGISTIC_REGRESSION'),
  feature_schema_version text not null,
  dataset_version text not null,
  threshold_version text not null,
  status text not null check (status in ('DRAFT', 'SHADOW', 'APPROVED', 'RETIRED', 'DISABLED')),
  artifact_reference text not null,
  artifact_hash text not null check (artifact_hash ~ '^[0-9a-f]{64}$'),
  trained_at timestamptz not null,
  approved_at timestamptz,
  approved_by text,
  limitations text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  retired_at timestamptz,
  unique (model_id, model_version)
);

create unique index if not exists ori_one_shadow_model_per_scope_idx
  on public.ori_model_registry (scope)
  where status = 'SHADOW';

create table if not exists public.ori_feature_registry (
  feature_id text not null,
  feature_version text not null,
  schema_version text not null,
  description text not null,
  source text not null,
  data_type text not null check (data_type in ('boolean', 'integer', 'number', 'category')),
  sensitivity text not null check (sensitivity in ('PUBLIC', 'INTERNAL', 'CONFIDENTIAL', 'RESTRICTED')),
  normalization_metadata jsonb not null default '{}'::jsonb,
  missing_behavior text not null check (missing_behavior in ('REJECT', 'ABSTAIN', 'DEFAULT_SAFE')),
  active boolean not null default true,
  first_supported_model_version text not null,
  last_supported_model_version text,
  registry_hash text not null check (registry_hash ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (feature_id, feature_version, schema_version)
);

create table if not exists public.ori_model_state_audit (
  audit_id uuid primary key default gen_random_uuid(),
  registry_id text not null references public.ori_model_registry(registry_id),
  previous_status text,
  new_status text not null,
  changed_by uuid,
  reason text not null,
  changed_at timestamptz not null default now()
);

create table if not exists public.ori_inference_records (
  inference_id uuid primary key,
  tenant_id uuid not null references public.trust_workspaces(id) on delete cascade,
  trust_session_id uuid not null references public.trust_cases(id) on delete cascade,
  correlation_id text not null check (length(correlation_id) between 1 and 200),
  model_id text not null,
  model_version text not null,
  feature_schema_version text not null,
  dataset_version text not null,
  threshold_version text not null,
  score numeric not null check (score between 0 and 1),
  risk_band text not null check (risk_band in ('LOW', 'MODERATE', 'HIGH', 'UNKNOWN')),
  recommendation text not null check (recommendation in ('NO_ADDITIONAL_ACTION', 'STEP_UP', 'HUMAN_REVIEW', 'ABSTAIN')),
  abstain boolean not null,
  confidence_band text not null check (confidence_band in ('HIGH', 'MEDIUM', 'LOW', 'INSUFFICIENT_EVIDENCE')),
  explanation_summary jsonb not null default '{}'::jsonb,
  missing_feature_ids text[] not null default '{}',
  execution_duration_ms numeric not null check (execution_duration_ms >= 0),
  authoritative_decision text,
  authoritative_decision_reference text,
  comparison_category text not null check (comparison_category in (
    'AGREED_LOW_RISK', 'AGREED_REVIEW', 'ORI_MORE_CAUTIONARY', 'ORI_LESS_CAUTIONARY',
    'ORI_ABSTAINED', 'AUTHORITATIVE_DECISION_UNAVAILABLE', 'NOT_COMPARABLE'
  )),
  latest_reviewer_outcome_id uuid,
  synthetic boolean not null default false,
  inferred_at timestamptz not null,
  created_at timestamptz not null default now(),
  retention_expires_at timestamptz not null,
  unique (tenant_id, trust_session_id, correlation_id, model_id, model_version)
);

create table if not exists public.ori_reviewer_outcomes (
  outcome_id uuid primary key default gen_random_uuid(),
  inference_id uuid not null references public.ori_inference_records(inference_id) on delete restrict,
  tenant_id uuid not null references public.trust_workspaces(id) on delete cascade,
  reviewer_id uuid not null,
  outcome text not null check (outcome in ('CORRECT', 'TOO_CAUTIOUS', 'NOT_CAUTIOUS_ENOUGH', 'NOT_USEFUL')),
  usefulness text not null check (usefulness in ('USEFUL', 'PARTIALLY_USEFUL', 'NOT_USEFUL')),
  explanation_sufficiency text not null check (explanation_sufficiency in ('SUFFICIENT', 'PARTIAL', 'INSUFFICIENT')),
  caution_alignment text not null check (caution_alignment in ('APPROPRIATE', 'TOO_CAUTIOUS', 'NOT_CAUTIOUS_ENOUGH', 'NOT_COMPARABLE')),
  permitted_notes text check (permitted_notes is null or length(permitted_notes) <= 2000),
  expected_class text check (expected_class is null or expected_class in ('CAUTION', 'NO_CAUTION')),
  dataset_eligibility text not null default 'PENDING_GOVERNANCE_APPROVAL'
    check (dataset_eligibility in ('PENDING_GOVERNANCE_APPROVAL', 'APPROVED', 'EXCLUDED')),
  reviewed_at timestamptz not null default now()
);

alter table public.ori_inference_records
  drop constraint if exists ori_inference_records_latest_reviewer_outcome_fk;
alter table public.ori_inference_records
  add constraint ori_inference_records_latest_reviewer_outcome_fk
  foreign key (latest_reviewer_outcome_id) references public.ori_reviewer_outcomes(outcome_id);

create index if not exists ori_inference_tenant_session_idx
  on public.ori_inference_records (tenant_id, trust_session_id, inferred_at desc);
create index if not exists ori_inference_validation_idx
  on public.ori_inference_records (synthetic, abstain, comparison_category, inferred_at desc);
create index if not exists ori_inference_retention_idx
  on public.ori_inference_records (retention_expires_at);
create index if not exists ori_reviewer_outcome_inference_idx
  on public.ori_reviewer_outcomes (inference_id, reviewed_at desc);
create index if not exists ori_model_audit_registry_idx
  on public.ori_model_state_audit (registry_id, changed_at desc);

alter table public.ori_model_registry enable row level security;
alter table public.ori_feature_registry enable row level security;
alter table public.ori_model_state_audit enable row level security;
alter table public.ori_inference_records enable row level security;
alter table public.ori_reviewer_outcomes enable row level security;

revoke all on public.ori_model_registry from public, anon, authenticated;
revoke all on public.ori_feature_registry from public, anon, authenticated;
revoke all on public.ori_model_state_audit from public, anon, authenticated;
revoke all on public.ori_inference_records from public, anon, authenticated;
revoke all on public.ori_reviewer_outcomes from public, anon, authenticated;
grant select on public.ori_inference_records to authenticated;
grant select on public.ori_reviewer_outcomes to authenticated;
grant all privileges on public.ori_model_registry to service_role;
grant all privileges on public.ori_feature_registry to service_role;
grant all privileges on public.ori_model_state_audit to service_role;
grant all privileges on public.ori_inference_records to service_role;
grant all privileges on public.ori_reviewer_outcomes to service_role;

drop policy if exists "tenant members read ori inference records" on public.ori_inference_records;
create policy "tenant members read ori inference records" on public.ori_inference_records
  for select to authenticated using (public.user_can_access_trust_workspace(tenant_id));

drop policy if exists "tenant members read ori reviewer outcomes" on public.ori_reviewer_outcomes;
create policy "tenant members read ori reviewer outcomes" on public.ori_reviewer_outcomes
  for select to authenticated using (public.user_can_access_trust_workspace(tenant_id));

create or replace function public.audit_ori_model_state_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.status is distinct from new.status then
    insert into public.ori_model_state_audit (
      registry_id, previous_status, new_status, changed_by, reason
    ) values (
      new.registry_id, old.status, new.status, auth.uid(),
      'ORI model state changed through an authorized server-side administration path.'
    );
  end if;
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists ori_model_state_change_audit on public.ori_model_registry;
create trigger ori_model_state_change_audit
  before update on public.ori_model_registry
  for each row execute function public.audit_ori_model_state_change();
revoke all on function public.audit_ori_model_state_change() from public, anon, authenticated;
grant execute on function public.audit_ori_model_state_change() to service_role;

create or replace function public.prevent_ori_reviewer_outcome_mutation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  raise exception 'ORI reviewer outcomes are immutable; append a new attributed outcome.';
end;
$$;

drop trigger if exists ori_reviewer_outcome_immutable on public.ori_reviewer_outcomes;
create trigger ori_reviewer_outcome_immutable
  before update or delete on public.ori_reviewer_outcomes
  for each row execute function public.prevent_ori_reviewer_outcome_mutation();
revoke all on function public.prevent_ori_reviewer_outcome_mutation() from public, anon, authenticated;
grant execute on function public.prevent_ori_reviewer_outcome_mutation() to service_role;

create or replace function public.record_ori_reviewer_outcome(
  target_inference_id uuid,
  target_reviewer_id uuid,
  target_outcome text,
  target_usefulness text,
  target_explanation_sufficiency text,
  target_caution_alignment text,
  target_notes text default null,
  target_expected_class text default null
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  inference_record public.ori_inference_records%rowtype;
  new_outcome_id uuid;
begin
  select * into inference_record from public.ori_inference_records
  where inference_id = target_inference_id for update;
  if inference_record.inference_id is null then raise exception 'ORI inference not found'; end if;
  if target_reviewer_id is null then raise exception 'Reviewer identity is required'; end if;
  if target_outcome not in ('CORRECT', 'TOO_CAUTIOUS', 'NOT_CAUTIOUS_ENOUGH', 'NOT_USEFUL') then raise exception 'Unsupported ORI review outcome'; end if;
  if target_usefulness not in ('USEFUL', 'PARTIALLY_USEFUL', 'NOT_USEFUL') then raise exception 'Unsupported ORI usefulness value'; end if;
  if target_explanation_sufficiency not in ('SUFFICIENT', 'PARTIAL', 'INSUFFICIENT') then raise exception 'Unsupported explanation sufficiency value'; end if;
  if target_caution_alignment not in ('APPROPRIATE', 'TOO_CAUTIOUS', 'NOT_CAUTIOUS_ENOUGH', 'NOT_COMPARABLE') then raise exception 'Unsupported caution alignment value'; end if;
  if target_expected_class is not null and target_expected_class not in ('CAUTION', 'NO_CAUTION') then raise exception 'Unsupported expected class'; end if;
  if target_notes is not null and length(target_notes) > 2000 then raise exception 'ORI reviewer notes exceed the permitted length'; end if;

  insert into public.ori_reviewer_outcomes (
    inference_id, tenant_id, reviewer_id, outcome, usefulness,
    explanation_sufficiency, caution_alignment, permitted_notes, expected_class
  ) values (
    target_inference_id, inference_record.tenant_id, target_reviewer_id, target_outcome,
    target_usefulness, target_explanation_sufficiency, target_caution_alignment,
    nullif(trim(target_notes), ''), target_expected_class
  ) returning outcome_id into new_outcome_id;

  update public.ori_inference_records
  set latest_reviewer_outcome_id = new_outcome_id
  where inference_id = target_inference_id;
  return new_outcome_id;
end;
$$;

revoke all on function public.record_ori_reviewer_outcome(uuid,uuid,text,text,text,text,text,text) from public, anon, authenticated;
grant execute on function public.record_ori_reviewer_outcome(uuid,uuid,text,text,text,text,text,text) to service_role;

create or replace function public.prune_expired_ori_inferences()
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare deleted_count bigint;
begin
  delete from public.ori_inference_records inference
  where inference.retention_expires_at < now()
    and not exists (
      select 1 from public.ori_reviewer_outcomes outcome
      where outcome.inference_id = inference.inference_id
    );
  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;
revoke all on function public.prune_expired_ori_inferences() from public, anon, authenticated;
grant execute on function public.prune_expired_ori_inferences() to service_role;

insert into public.ori_model_registry (
  registry_id, model_id, scope, model_name, model_version, algorithm_family,
  feature_schema_version, dataset_version, threshold_version, status,
  artifact_reference, artifact_hash, trained_at, approved_at, approved_by, limitations
) values (
  'ori-operational-risk-logistic-v1:1.0.0',
  'ori-operational-risk-logistic-v1',
  'GLOBAL_SHADOW',
  'Operational Risk Intelligence Logistic Baseline',
  '1.0.0',
  'LOGISTIC_REGRESSION',
  '1.0.0',
  'ori-synthetic-v1',
  'ori-thresholds-v1',
  'SHADOW',
  'lib/operational-risk/model-artifact.ts',
  '1af58c672114a0aeccd91f3c8c750054087cc73f02a92739bf21a9fcc0596b8a',
  '2026-07-17T00:00:00.000Z',
  '2026-07-17T00:00:00.000Z',
  'sprint-16.1a-controlled-shadow-approval',
  array[
    'Controlled placeholder coefficients were not trained on production data.',
    'Synthetic validation does not establish real-world accuracy or calibration.',
    'The model does not verify identity and does not make authorization decisions.'
  ]
) on conflict (registry_id) do nothing;

insert into public.ori_feature_registry (
  feature_id, feature_version, schema_version, description, source, data_type,
  sensitivity, normalization_metadata, missing_behavior, active,
  first_supported_model_version, registry_hash
) values
  ('identity_verification_present','1.0.0','1.0.0','Normalized identity evidence was present.','Trust Decision identity evidence','boolean','INTERNAL','{"mapping":"false=0,true=1"}'::jsonb,'ABSTAIN',true,'1.0.0','9a6dc23b9aa827b2d6f730c4b8b26bc26f63617624ee0a20faffc59fc7647f1c'),
  ('identity_evidence_age_days','1.0.0','1.0.0','Whole UTC days since normalized evidence timestamp.','Trust Decision evidence timestamp','integer','INTERNAL','{"minimum":0,"maximum":365}'::jsonb,'ABSTAIN',true,'1.0.0','9a6dc23b9aa827b2d6f730c4b8b26bc26f63617624ee0a20faffc59fc7647f1c'),
  ('evidence_freshness_ratio','1.0.0','1.0.0','Bounded freshness derived from evidence age.','Normalized evidence age','number','INTERNAL','{"minimum":0,"maximum":1,"horizon_days":90}'::jsonb,'ABSTAIN',true,'1.0.0','9a6dc23b9aa827b2d6f730c4b8b26bc26f63617624ee0a20faffc59fc7647f1c'),
  ('missing_evidence_ratio','1.0.0','1.0.0','Share of approved source fields unavailable.','ORI extraction coverage','number','INTERNAL','{"minimum":0,"maximum":1}'::jsonb,'ABSTAIN',true,'1.0.0','9a6dc23b9aa827b2d6f730c4b8b26bc26f63617624ee0a20faffc59fc7647f1c'),
  ('replay_available','1.0.0','1.0.0','A retained or scheduled Replay record was reported.','Trust Workflow Executor','boolean','INTERNAL','{"mapping":"false=0,true=1"}'::jsonb,'ABSTAIN',true,'1.0.0','9a6dc23b9aa827b2d6f730c4b8b26bc26f63617624ee0a20faffc59fc7647f1c'),
  ('trust_memory_prior_review_count','1.0.0','1.0.0','Count of prior review, escalation, or blocked outcomes.','Trust Decision governance history','integer','CONFIDENTIAL','{"minimum":0,"maximum":20}'::jsonb,'ABSTAIN',true,'1.0.0','9a6dc23b9aa827b2d6f730c4b8b26bc26f63617624ee0a20faffc59fc7647f1c'),
  ('authority_scope_mismatch','1.0.0','1.0.0','Existing intent-risk scope-mismatch threshold was crossed.','Trust Decision intent-risk boundary','boolean','CONFIDENTIAL','{"threshold":"intentRisk>80"}'::jsonb,'ABSTAIN',true,'1.0.0','9a6dc23b9aa827b2d6f730c4b8b26bc26f63617624ee0a20faffc59fc7647f1c')
on conflict (feature_id, feature_version, schema_version) do nothing;

comment on table public.ori_inference_records is
  'Sanitized ORI shadow evidence only. Raw passports, biometrics, images, documents, provider payloads, email addresses, secrets, tokens, and arbitrary customer text are prohibited.';
comment on table public.ori_reviewer_outcomes is
  'Immutable attributed reviewer outcomes. Records require governance approval before future dataset eligibility and never trigger online learning.';
comment on table public.ori_model_registry is
  'Governed server-side ORI model metadata. Client model upload and public activation are prohibited.';

-- Recovery: set ML_RISK_ENABLED=false and ML_RISK_MODE=off first. Preserve reviewed
-- outcomes according to retention/legal-hold policy before dropping ORI objects.
