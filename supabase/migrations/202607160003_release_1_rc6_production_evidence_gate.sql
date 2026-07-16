-- Release 1.0 RC6 production evidence gate.
-- Retain sanitized evidence only: never payloads, secrets, identity documents,
-- biometric material or personal data.

create table if not exists public.release_validation_cases (
  case_id text primary key,
  dataset_id text not null default 'release-1-candidate',
  dataset_version text not null,
  entity_type text not null,
  workflow text not null,
  signal_type text not null,
  evidence_mode text not null default 'synthetic_fixture'
    check (evidence_mode in ('synthetic_fixture', 'provider_sandbox', 'consented_internal', 'licensed_public_benchmark')),
  provider_id text,
  ruleset_version text not null,
  input_evidence jsonb not null default '[]'::jsonb,
  expected_outcome text not null,
  actual_outcome text,
  ground_truth_label text,
  review_status text not null default 'pending'
    check (review_status in ('pending', 'reviewed', 'disputed', 'excluded', 'approved')),
  reviewer_id text,
  reviewer_role text,
  reviewed_at timestamptz,
  review_confidence numeric check (review_confidence between 0 and 1),
  source_provenance text not null,
  usage_boundary text not null,
  limitations text[] not null default '{}',
  evidence_references text[] not null default '{}',
  reviewer_rationale text,
  provider_versions jsonb not null default '{}'::jsonb,
  review_mode text not null default 'single' check (review_mode in ('single', 'dual')),
  uncertainty text,
  disagreement text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (review_status <> 'approved' or (
    ground_truth_label is not null and reviewer_id is not null and reviewer_role is not null and
    reviewed_at is not null and review_confidence is not null and reviewer_rationale is not null and
    cardinality(evidence_references) > 0
  ))
);

create table if not exists public.release_validation_reviews (
  id uuid primary key default gen_random_uuid(),
  case_id text not null references public.release_validation_cases(case_id) on delete cascade,
  previous_status text not null,
  review_status text not null check (review_status in ('pending', 'reviewed', 'disputed', 'excluded', 'approved')),
  ground_truth_label text,
  reviewer_id uuid not null,
  reviewer_role text not null,
  reviewer_confidence numeric check (reviewer_confidence between 0 and 1),
  rationale text not null,
  uncertainty text,
  disagreement text,
  evidence_references text[] not null default '{}',
  reviewed_at timestamptz not null default now()
);

create table if not exists public.webhook_event_ledger (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  event_id text not null,
  event_type text not null,
  payload_hash text not null,
  signature_status text not null check (signature_status in ('verified', 'rejected', 'not_checked')),
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  processing_status text not null default 'received'
    check (processing_status in ('received', 'processing', 'processed', 'failed', 'duplicate')),
  duplicate_of uuid references public.webhook_event_ledger(id),
  tenant_id uuid,
  workflow_id uuid,
  correlation_id text,
  error_category text,
  audit_reference text,
  retention_expires_at timestamptz not null default (now() + interval '90 days'),
  unique (provider, event_id)
);

create table if not exists public.provider_execution_records (
  execution_id uuid primary key default gen_random_uuid(),
  provider_id text not null,
  environment text not null,
  runtime_mode text not null check (runtime_mode in ('Live', 'Test', 'Awaiting Credentials', 'Prototype', 'Disabled')),
  tenant_id uuid not null references public.trust_workspaces(id) on delete cascade,
  workflow_id uuid not null references public.trust_cases(id) on delete cascade,
  correlation_id uuid not null unique,
  request_created_at timestamptz not null,
  callback_received_at timestamptz,
  signature_status text not null default 'awaiting_callback',
  idempotency_status text not null default 'awaiting_callback',
  normalized_evidence_reference text,
  evidence_quality_status text,
  decision_reference text,
  replay_reference text,
  evidence_graph_reference text,
  trust_memory_reference text,
  latency_ms numeric check (latency_ms is null or latency_ms >= 0),
  reviewed_outcome_id uuid references public.release_validation_reviews(id),
  status text not null check (status in ('request_created', 'callback_verified', 'completed', 'failed', 'blocked')),
  limitations text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.hopae_webhook_events
  add column if not exists signature_status text not null default 'verified',
  add column if not exists processing_status text not null default 'processed',
  add column if not exists duplicate_status boolean not null default false,
  add column if not exists failure_reason text,
  add column if not exists processed_at timestamptz;

update public.hopae_webhook_events
set processed_at = coalesce(processed_at, received_at),
    processing_status = case when processing_outcome is null then 'received' else 'processed' end;

create table if not exists public.operational_measurements (
  measurement_id uuid primary key default gen_random_uuid(),
  tenant_id uuid,
  correlation_id text,
  workflow_type text not null default 'trust_assessment',
  stage text not null,
  duration_ms numeric not null check (duration_ms >= 0),
  status text not null check (status in ('ok', 'degraded', 'failed')),
  timeout boolean not null default false,
  retry_count integer not null default 0 check (retry_count >= 0),
  provider_id text,
  recorded_at timestamptz not null default now(),
  environment text not null,
  build_version text not null,
  operation_fingerprint text not null,
  error_category text,
  retention_until timestamptz not null default (now() + interval '90 days')
);

create table if not exists public.release_evidence_checks (
  id uuid primary key default gen_random_uuid(),
  release_version text not null default '1.0-rc6',
  category text not null check (category in ('validation', 'provider', 'security', 'performance')),
  check_name text not null,
  environment text not null,
  status text not null check (status in ('passed', 'failed', 'blocked', 'awaiting_data')),
  evidence_reference text,
  checked_at timestamptz not null default now(),
  details jsonb not null default '{}'::jsonb
);

create index if not exists release_validation_cases_scope_idx on public.release_validation_cases
  (dataset_version, workflow, signal_type, provider_id, ruleset_version, reviewed_at desc);
create index if not exists release_validation_reviews_case_idx on public.release_validation_reviews (case_id, reviewed_at desc);
create index if not exists webhook_event_ledger_tenant_idx on public.webhook_event_ledger (tenant_id, received_at desc) where tenant_id is not null;
create index if not exists webhook_event_ledger_retention_idx on public.webhook_event_ledger (retention_expires_at);
create index if not exists provider_execution_records_tenant_idx on public.provider_execution_records (tenant_id, workflow_id, created_at desc);
create index if not exists operational_measurements_scope_idx on public.operational_measurements (stage, environment, recorded_at desc);
create index if not exists operational_measurements_tenant_idx on public.operational_measurements (tenant_id, recorded_at desc) where tenant_id is not null;
create index if not exists release_evidence_checks_latest_idx on public.release_evidence_checks (release_version, category, checked_at desc);

alter table public.release_validation_cases enable row level security;
alter table public.release_validation_reviews enable row level security;
alter table public.webhook_event_ledger enable row level security;
alter table public.provider_execution_records enable row level security;
alter table public.operational_measurements enable row level security;
alter table public.release_evidence_checks enable row level security;

revoke all on public.release_validation_cases from anon, authenticated;
revoke all on public.release_validation_reviews from anon, authenticated;
revoke all on public.webhook_event_ledger from anon, authenticated;
revoke all on public.provider_execution_records from anon, authenticated;
grant select on public.provider_execution_records to authenticated;

drop policy if exists "tenant members read provider executions" on public.provider_execution_records;
create policy "tenant members read provider executions" on public.provider_execution_records
  for select to authenticated using (public.user_can_access_trust_workspace(tenant_id));
revoke all on public.operational_measurements from anon, authenticated;
revoke all on public.release_evidence_checks from anon, authenticated;

comment on table public.release_validation_cases is 'Controlled licensed non-sensitive validation metadata; approval requires attributable review.';
comment on table public.operational_measurements is 'Sanitized durable timings; raw requests, secrets, personal data, documents and biometrics are prohibited.';
comment on table public.release_evidence_checks is 'Target-environment evidence references; source inspection alone must be blocked, not passed.';
comment on table public.webhook_event_ledger is 'Sanitized provider-neutral webhook intake ledger; raw payload retention is disabled.';
comment on table public.provider_execution_records is 'Target-environment provider execution proof; Live requires a completed real record in the current environment.';

create or replace function public.review_release_validation_case(
  target_case_id text,
  target_status text,
  target_ground_truth_label text,
  target_reviewer_id uuid,
  target_reviewer_role text,
  target_confidence numeric,
  target_rationale text,
  target_uncertainty text default null,
  target_disagreement text default null
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  current_case public.release_validation_cases%rowtype;
  review_id uuid;
begin
  if target_status not in ('pending', 'reviewed', 'disputed', 'excluded', 'approved') then
    raise exception 'Unsupported validation review status';
  end if;
  if target_confidence is null or target_confidence < 0 or target_confidence > 1 then
    raise exception 'Reviewer confidence must be from 0 to 1';
  end if;
  if nullif(trim(target_rationale), '') is null then raise exception 'Reviewer rationale is required'; end if;

  select * into current_case from public.release_validation_cases where case_id = target_case_id for update;
  if current_case.case_id is null then raise exception 'Validation case not found'; end if;
  if target_status = 'approved' and (nullif(trim(target_ground_truth_label), '') is null or cardinality(current_case.evidence_references) = 0) then
    raise exception 'Approval requires a ground-truth label and retained evidence references';
  end if;
  if target_status = 'approved' and current_case.review_mode = 'dual' and not exists (
    select 1 from public.release_validation_reviews prior
    where prior.case_id = target_case_id
      and prior.review_status in ('reviewed', 'disputed')
      and prior.reviewer_id <> target_reviewer_id
  ) then
    raise exception 'Dual review requires a prior review by a different reviewer';
  end if;

  insert into public.release_validation_reviews (
    case_id, previous_status, review_status, ground_truth_label, reviewer_id,
    reviewer_role, reviewer_confidence, rationale, uncertainty, disagreement,
    evidence_references
  ) values (
    target_case_id, current_case.review_status, target_status, nullif(trim(target_ground_truth_label), ''),
    target_reviewer_id, target_reviewer_role, target_confidence, trim(target_rationale),
    nullif(trim(target_uncertainty), ''), nullif(trim(target_disagreement), ''), current_case.evidence_references
  ) returning id into review_id;

  update public.release_validation_cases set
    review_status = target_status,
    ground_truth_label = nullif(trim(target_ground_truth_label), ''),
    reviewer_id = target_reviewer_id::text,
    reviewer_role = target_reviewer_role,
    reviewed_at = now(),
    review_confidence = target_confidence,
    reviewer_rationale = trim(target_rationale),
    uncertainty = nullif(trim(target_uncertainty), ''),
    disagreement = nullif(trim(target_disagreement), ''),
    updated_at = now()
  where case_id = target_case_id;
  return review_id;
end;
$$;

revoke all on function public.review_release_validation_case(text,text,text,uuid,text,numeric,text,text,text) from public, anon, authenticated;
grant execute on function public.review_release_validation_case(text,text,text,uuid,text,numeric,text,text,text) to service_role;

create or replace function public.prune_expired_rc6_evidence()
returns table(webhook_rows_deleted bigint, measurement_rows_deleted bigint)
language plpgsql security definer set search_path = public
as $$
declare webhook_count bigint; measurement_count bigint;
begin
  delete from public.webhook_event_ledger where retention_expires_at < now();
  get diagnostics webhook_count = row_count;
  delete from public.operational_measurements where retention_until < now();
  get diagnostics measurement_count = row_count;
  return query select webhook_count, measurement_count;
end;
$$;
revoke all on function public.prune_expired_rc6_evidence() from public, anon, authenticated;
grant execute on function public.prune_expired_rc6_evidence() to service_role;

create or replace function public.export_rc6_performance_summary(target_environment text, since_time timestamptz)
returns table(stage text, sample_count bigint, average_ms numeric, timeout_count bigint, failure_count bigint, latest_sample timestamptz)
language sql security definer set search_path = public
as $$
  select stage, count(*), round(avg(duration_ms), 3), count(*) filter (where timeout),
    count(*) filter (where status = 'failed'), max(recorded_at)
  from public.operational_measurements
  where environment = target_environment and recorded_at >= since_time
  group by stage order by stage;
$$;
revoke all on function public.export_rc6_performance_summary(text,timestamptz) from public, anon, authenticated;
grant execute on function public.export_rc6_performance_summary(text,timestamptz) to service_role;

-- Recovery: disable RC6 writers before dropping functions/tables. Preserve exported
-- evidence references and provider records according to the approved retention policy.
