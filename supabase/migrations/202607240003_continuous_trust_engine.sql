-- EPIC 24: Continuous Trust Engine.
-- Forward-only extension of the canonical Trust Event, Trust State,
-- Enterprise Trust Architecture and EPIC 19 Continuous Trust Runtime.

create extension if not exists pgcrypto;

create table public.trust_signals (
  id uuid primary key,
  tenant_id uuid not null references public.trust_workspaces(id) on delete restrict,
  entity_id text not null,
  entity_type text not null check(entity_type in (
    'HUMAN','AI_AGENT','DEVICE','ORGANISATION','CREDENTIAL','SESSION','ENTERPRISE_WORKFLOW'
  )),
  signal_type text not null check(signal_type in (
    'IDENTITY','DOCUMENT','EMAIL','PHONE','DEVICE','SESSION','BROWSER','NETWORK',
    'VPN','LOCATION','BEHAVIOUR','LIVENESS','DEEPFAKE','PROVIDER',
    'ENTERPRISE_POLICY','MANUAL_REVIEW','AI_AGENT','AUTHORITY','CREDENTIAL',
    'INTEGRATION','SYSTEM'
  )),
  source text not null check(length(source) between 1 and 160),
  provider text check(provider is null or length(provider) between 1 and 160),
  observed_at timestamptz not null,
  received_at timestamptz not null,
  severity text not null check(severity in ('INFORMATIONAL','LOW','MEDIUM','HIGH','CRITICAL')),
  confidence numeric(5,4) not null check(confidence between 0 and 1),
  status text not null check(status in (
    'POSITIVE','NEGATIVE','INCONCLUSIVE','UNAVAILABLE','REVOKED','INFORMATIONAL'
  )),
  fingerprint text not null check(fingerprint ~ '^[a-f0-9]{64}$'),
  idempotency_key_hash text not null check(idempotency_key_hash ~ '^[a-f0-9]{64}$'),
  correlation_id uuid not null,
  causation_id uuid,
  actor_id uuid not null,
  metadata jsonb not null default '{}' check(jsonb_typeof(metadata)='object'),
  created_at timestamptz not null default now(),
  unique(tenant_id,id),
  unique(tenant_id,source,idempotency_key_hash),
  check(observed_at <= received_at + interval '5 minutes'),
  check(metadata::text !~* '(access.?token|refresh.?token|authorization|api.?key|client.?secret|webhook.?secret|password|passcode|private.?key|raw.?payload|raw.?proof|document.?image|biometric|selfie|face.?image|passport.?image|precise.?location|latitude|longitude|full.?ip)')
);

create index trust_signals_entity_time_idx
  on public.trust_signals(tenant_id,entity_id,observed_at desc,id desc);
create index trust_signals_processing_source_idx
  on public.trust_signals(tenant_id,signal_type,status,received_at desc);
create index trust_signals_fingerprint_idx
  on public.trust_signals(tenant_id,entity_id,fingerprint,received_at desc);

create table public.trust_signal_processing (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.trust_workspaces(id) on delete restrict,
  signal_id uuid not null,
  status text not null default 'QUEUED' check(status in (
    'QUEUED','PROCESSING','PROCESSED','FAILED_RETRYABLE','FAILED_TERMINAL'
  )),
  attempts integer not null default 0 check(attempts between 0 and 5),
  next_attempt_at timestamptz not null default now(),
  locked_at timestamptz,
  locked_by text,
  last_error_code text,
  result jsonb not null default '{}' check(jsonb_typeof(result)='object'),
  accepted_at timestamptz not null default now(),
  processed_at timestamptz,
  updated_at timestamptz not null default now(),
  foreign key(tenant_id,signal_id)
    references public.trust_signals(tenant_id,id) on delete restrict,
  unique(tenant_id,signal_id)
);
create index trust_signal_processing_queue_idx
  on public.trust_signal_processing(status,next_attempt_at,accepted_at,signal_id)
  where status in ('QUEUED','FAILED_RETRYABLE');
create index trust_signal_processing_tenant_idx
  on public.trust_signal_processing(tenant_id,status,updated_at desc);

create table public.trust_policy_decisions (
  id uuid primary key,
  tenant_id uuid not null references public.trust_workspaces(id) on delete restrict,
  entity_id text not null,
  signal_id uuid not null,
  policy_id text not null,
  policy_version text not null,
  action text not null check(action in (
    'NO_ACTION','RECORD_ONLY','RECALCULATE','WATCH','ALERT',
    'STEP_UP_VERIFICATION','RESTRICT','SUSPEND','REVOKE',
    'REQUIRE_MANUAL_REVIEW'
  )),
  reason_codes text[] not null default '{}',
  affected_dimensions text[] not null default '{}',
  manual_review_required boolean not null default false,
  material boolean not null,
  decided_at timestamptz not null,
  created_at timestamptz not null default now(),
  foreign key(tenant_id,signal_id)
    references public.trust_signals(tenant_id,id) on delete restrict,
  unique(tenant_id,id),
  unique(tenant_id,signal_id)
);
create index trust_policy_decisions_entity_idx
  on public.trust_policy_decisions(tenant_id,entity_id,decided_at desc,id desc);

create table public.trust_processing_failures (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.trust_workspaces(id) on delete restrict,
  signal_id uuid not null,
  attempt integer not null check(attempt between 1 and 5),
  error_code text not null,
  retryable boolean not null,
  occurred_at timestamptz not null default now(),
  foreign key(tenant_id,signal_id)
    references public.trust_signals(tenant_id,id) on delete restrict
);
create index trust_processing_failures_signal_idx
  on public.trust_processing_failures(tenant_id,signal_id,occurred_at desc);

create table public.trust_manual_reviews (
  id uuid primary key,
  tenant_id uuid not null references public.trust_workspaces(id) on delete restrict,
  entity_id text not null,
  status text not null check(status in (
    'REQUESTED','ASSIGNED','IN_REVIEW','APPROVED','REJECTED','CANCELLED'
  )),
  requested_by uuid not null,
  assigned_to uuid,
  reason text not null check(length(reason) between 1 and 1000),
  signal_ids uuid[] not null default '{}',
  policy_decision_id uuid references public.trust_policy_decisions(id) on delete restrict,
  decision text,
  decision_reason text,
  created_at timestamptz not null,
  completed_at timestamptz,
  unique(tenant_id,id),
  check((status in ('APPROVED','REJECTED','CANCELLED')) = (completed_at is not null))
);
create index trust_manual_reviews_queue_idx
  on public.trust_manual_reviews(tenant_id,status,created_at desc,id desc);

create table public.trust_manual_review_history (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.trust_workspaces(id) on delete restrict,
  review_id uuid not null,
  previous_status text,
  new_status text not null,
  actor_id uuid not null,
  reason text not null,
  created_at timestamptz not null default now(),
  foreign key(tenant_id,review_id)
    references public.trust_manual_reviews(tenant_id,id) on delete restrict
);
create index trust_manual_review_history_idx
  on public.trust_manual_review_history(tenant_id,review_id,created_at,id);

create table public.trust_alert_history (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.trust_workspaces(id) on delete restrict,
  alert_id uuid not null references public.trust_alerts(id) on delete restrict,
  previous_status text not null,
  new_status text not null,
  actor_id uuid not null,
  note text not null,
  created_at timestamptz not null default now()
);
create index trust_alert_history_idx
  on public.trust_alert_history(tenant_id,alert_id,created_at,id);

create table public.trust_manual_overrides (
  id uuid primary key,
  tenant_id uuid not null references public.trust_workspaces(id) on delete restrict,
  entity_id text not null,
  state_decision_id uuid not null references public.trust_state_decisions(state_decision_id) on delete restrict,
  previous_state text not null,
  new_state text not null,
  reason text not null check(length(reason) between 1 and 1000),
  actor_id uuid not null,
  signal_ids uuid[] not null default '{}',
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  unique(tenant_id,id),
  unique(tenant_id,state_decision_id),
  check(expires_at is null or expires_at > created_at)
);
create index trust_manual_overrides_entity_idx
  on public.trust_manual_overrides(tenant_id,entity_id,created_at desc,id desc);

alter table public.trust_drift_findings
  alter column assessment_id drop not null,
  add column if not exists signal_id uuid references public.trust_signals(id) on delete restrict,
  add column if not exists confidence numeric(5,4),
  add column if not exists affected_dimensions text[] not null default '{}',
  add column if not exists recommended_action text,
  add column if not exists explanation text;
alter table public.trust_drift_findings
  add constraint trust_drift_findings_source_ck
  check(assessment_id is not null or signal_id is not null) not valid;
create index trust_drift_findings_signal_idx
  on public.trust_drift_findings(enterprise_id,signal_id,detected_at desc)
  where signal_id is not null;

alter table public.trust_alerts
  add column if not exists summary text,
  add column if not exists reason_codes text[] not null default '{}',
  add column if not exists signal_ids uuid[] not null default '{}',
  add column if not exists policy_decision_id uuid references public.trust_policy_decisions(id) on delete restrict;

do $$
declare table_name text;
begin
  foreach table_name in array array[
    'trust_signals','trust_signal_processing','trust_policy_decisions',
    'trust_processing_failures','trust_manual_reviews',
    'trust_manual_review_history','trust_alert_history','trust_manual_overrides'
  ] loop
    execute format('alter table public.%I enable row level security',table_name);
    execute format('revoke all on public.%I from anon,authenticated',table_name);
    execute format('grant all privileges on public.%I to service_role',table_name);
  end loop;
end $$;

grant select on public.trust_signals,public.trust_signal_processing,
  public.trust_policy_decisions,public.trust_processing_failures,
  public.trust_manual_reviews,public.trust_manual_review_history,
  public.trust_alert_history,public.trust_manual_overrides to authenticated;

create policy "tenant reads continuous trust signals" on public.trust_signals
  for select to authenticated using(public.user_can_access_trust_workspace(tenant_id));
create policy "tenant reads signal processing" on public.trust_signal_processing
  for select to authenticated using(public.user_can_access_trust_workspace(tenant_id));
create policy "tenant reads signal policy decisions" on public.trust_policy_decisions
  for select to authenticated using(public.user_can_access_trust_workspace(tenant_id));
create policy "tenant reads signal failures" on public.trust_processing_failures
  for select to authenticated using(public.user_can_access_trust_workspace(tenant_id));
create policy "tenant reads manual reviews" on public.trust_manual_reviews
  for select to authenticated using(public.user_can_access_trust_workspace(tenant_id));
create policy "tenant reads manual review history" on public.trust_manual_review_history
  for select to authenticated using(public.user_can_access_trust_workspace(tenant_id));
create policy "tenant reads alert history" on public.trust_alert_history
  for select to authenticated using(public.user_can_access_trust_workspace(tenant_id));
create policy "tenant reads manual overrides" on public.trust_manual_overrides
  for select to authenticated using(public.user_can_access_trust_workspace(tenant_id));

create trigger trust_signals_append_only before update or delete on public.trust_signals
  for each row execute function public.prevent_trust_architecture_history_mutation();
create trigger trust_policy_decisions_append_only before update or delete on public.trust_policy_decisions
  for each row execute function public.prevent_trust_architecture_history_mutation();
create trigger trust_processing_failures_append_only before update or delete on public.trust_processing_failures
  for each row execute function public.prevent_trust_architecture_history_mutation();
create trigger trust_manual_review_history_append_only before update or delete on public.trust_manual_review_history
  for each row execute function public.prevent_trust_architecture_history_mutation();
create trigger trust_alert_history_append_only before update or delete on public.trust_alert_history
  for each row execute function public.prevent_trust_architecture_history_mutation();
create trigger trust_manual_overrides_append_only before update or delete on public.trust_manual_overrides
  for each row execute function public.prevent_trust_architecture_history_mutation();

create or replace function public.ingest_continuous_trust_signal_v1(
  p_signal jsonb,
  p_idempotency_key_hash text,
  p_actor_id uuid,
  p_trust_event jsonb
) returns jsonb
language plpgsql security definer set search_path=public as $$
declare
  tenant uuid := (p_signal->>'tenantId')::uuid;
  signal_id uuid := (p_signal->>'id')::uuid;
  existing public.trust_signals%rowtype;
  event_status text;
begin
  if auth.role()<>'service_role' then
    raise exception 'Continuous Trust signal service path required';
  end if;
  if p_idempotency_key_hash !~ '^[a-f0-9]{64}$'
    or (p_signal->>'fingerprint') !~ '^[a-f0-9]{64}$'
    or jsonb_typeof(p_signal->'metadata')<>'object'
    or (p_signal->'metadata')::text ~* '(access.?token|refresh.?token|authorization|api.?key|client.?secret|webhook.?secret|password|passcode|private.?key|raw.?payload|raw.?proof|document.?image|biometric|selfie|face.?image|passport.?image|precise.?location|latitude|longitude|full.?ip)'
  then
    raise exception 'Continuous Trust signal validation failed';
  end if;
  if not exists(
    select 1 from public.trust_subjects
    where enterprise_id=tenant
      and subject_id=p_signal->>'entityId'
      and retired_at is null
  ) then
    raise exception 'Continuous Trust entity is unavailable';
  end if;
  perform pg_advisory_xact_lock(
    hashtextextended(tenant::text||':'||(p_signal->>'source')||':'||p_idempotency_key_hash,61)
  );
  select * into existing from public.trust_signals
  where tenant_id=tenant
    and source=p_signal->>'source'
    and idempotency_key_hash=p_idempotency_key_hash
  for update;
  if found then
    if existing.fingerprint=p_signal->>'fingerprint' then
      return jsonb_build_object(
        'signalId',existing.id,'status','DUPLICATE','acceptedAt',existing.created_at,
        'duplicate',true,
        'processingStatus',coalesce((
          select status from public.trust_signal_processing
          where tenant_id=tenant and signal_id=existing.id
        ),'QUEUED')
      );
    end if;
    raise exception 'Idempotency key conflicts with a different signal';
  end if;

  insert into public.trust_signals(
    id,tenant_id,entity_id,entity_type,signal_type,source,provider,
    observed_at,received_at,severity,confidence,status,fingerprint,
    idempotency_key_hash,correlation_id,causation_id,actor_id,metadata,created_at
  ) values (
    signal_id,tenant,p_signal->>'entityId',p_signal->>'entityType',
    p_signal->>'signalType',p_signal->>'source',nullif(p_signal->>'provider',''),
    (p_signal->>'observedAt')::timestamptz,(p_signal->>'receivedAt')::timestamptz,
    p_signal->>'severity',(p_signal->>'confidence')::numeric,p_signal->>'status',
    p_signal->>'fingerprint',p_idempotency_key_hash,
    (p_signal->>'correlationId')::uuid,nullif(p_signal->>'causationId','')::uuid,
    p_actor_id,p_signal->'metadata',(p_signal->>'createdAt')::timestamptz
  );
  insert into public.trust_signal_processing(tenant_id,signal_id,status,accepted_at)
    values(tenant,signal_id,'QUEUED',(p_signal->>'receivedAt')::timestamptz);
  event_status:=public.append_trust_event_v1(
    p_trust_event,null,(p_signal->>'correlationId')::uuid
  );
  if event_status<>'APPENDED' then
    raise exception 'Continuous Trust signal event chain conflict';
  end if;
  insert into public.trust_architecture_audit_log(
    enterprise_id,action,actor_reference,target_type,target_id,correlation_id,metadata
  ) values (
    tenant,'CONTINUOUS_TRUST_SIGNAL_ACCEPTED','user:'||p_actor_id::text,
    'TRUST_SIGNAL',signal_id::text,(p_signal->>'correlationId')::uuid,
    jsonb_build_object(
      'signalType',p_signal->>'signalType','severity',p_signal->>'severity',
      'entityId',p_signal->>'entityId'
    )
  );
  return jsonb_build_object(
    'signalId',signal_id,'status','ACCEPTED','acceptedAt',p_signal->>'receivedAt',
    'duplicate',false,'processingStatus','QUEUED'
  );
end $$;

create or replace function public.record_continuous_trust_signal_rejection_v1(
  p_tenant_id uuid,
  p_actor_id uuid,
  p_correlation_id uuid,
  p_error_code text,
  p_trust_event jsonb
) returns jsonb
language plpgsql security definer set search_path=public as $$
declare event_status text;
begin
  if auth.role()<>'service_role' then
    raise exception 'Continuous Trust signal service path required';
  end if;
  if p_error_code !~ '^[A-Z0-9_]{3,100}$' then
    raise exception 'Continuous Trust rejection code is invalid';
  end if;
  event_status:=public.append_trust_event_v1(p_trust_event,null,p_correlation_id);
  if event_status<>'APPENDED' then
    raise exception 'Continuous Trust signal event chain conflict';
  end if;
  insert into public.trust_architecture_audit_log(
    enterprise_id,action,actor_reference,target_type,target_id,correlation_id,metadata
  ) values (
    p_tenant_id,'CONTINUOUS_TRUST_SIGNAL_REJECTED','user:'||p_actor_id::text,
    'TRUST_SIGNAL',p_trust_event->>'eventId',p_correlation_id,
    jsonb_build_object('errorCode',p_error_code)
  );
  return jsonb_build_object('status','RECORDED','eventId',p_trust_event->>'eventId');
end $$;

create or replace function public.claim_continuous_trust_signal_v1(
  p_tenant_id uuid,
  p_signal_id uuid,
  p_worker_id text
) returns jsonb
language plpgsql security definer set search_path=public as $$
declare processing public.trust_signal_processing%rowtype;
begin
  if auth.role()<>'service_role' then
    raise exception 'Continuous Trust worker service path required';
  end if;
  select * into processing from public.trust_signal_processing
  where tenant_id=p_tenant_id and signal_id=p_signal_id
  for update;
  if not found then raise exception 'Continuous Trust signal was not found'; end if;
  if processing.status='PROCESSED' then
    return jsonb_build_object('status','PROCESSED','signalId',p_signal_id);
  end if;
  if processing.status='FAILED_TERMINAL' then
    return jsonb_build_object('status','FAILED_TERMINAL','signalId',p_signal_id);
  end if;
  if processing.status='PROCESSING' and processing.locked_by=p_worker_id then
    return jsonb_build_object(
      'status','CLAIMED','signalId',p_signal_id,'attempt',processing.attempts
    );
  end if;
  if processing.status='PROCESSING'
    and processing.locked_at > now()-interval '5 minutes'
    and processing.locked_by<>p_worker_id
  then
    return jsonb_build_object('status','BUSY','signalId',p_signal_id);
  end if;
  update public.trust_signal_processing
  set status='PROCESSING',attempts=least(attempts+1,5),locked_at=now(),
      locked_by=left(p_worker_id,160),updated_at=now()
  where tenant_id=p_tenant_id and signal_id=p_signal_id
  returning * into processing;
  return jsonb_build_object(
    'status','CLAIMED','signalId',p_signal_id,'attempt',processing.attempts
  );
end $$;

create or replace function public.claim_continuous_trust_jobs_v1(
  p_limit integer,
  p_worker_id text
) returns setof public.trust_signal_processing
language plpgsql security definer set search_path=public as $$
begin
  if auth.role()<>'service_role' then
    raise exception 'Continuous Trust worker service path required';
  end if;
  return query
  with claimed as (
    select id from public.trust_signal_processing
    where status in ('QUEUED','FAILED_RETRYABLE')
      and next_attempt_at<=now()
      and attempts<5
    order by next_attempt_at,accepted_at,id
    for update skip locked
    limit least(greatest(p_limit,1),25)
  )
  update public.trust_signal_processing processing
  set status='PROCESSING',attempts=least(processing.attempts+1,5),
      locked_at=now(),locked_by=left(p_worker_id,160),updated_at=now()
  from claimed
  where processing.id=claimed.id
  returning processing.*;
end $$;

create or replace function public.project_continuous_trust_signal_v1(
  p_tenant_id uuid,
  p_signal_id uuid
) returns jsonb
language plpgsql security definer set search_path=public as $$
declare signal public.trust_signals%rowtype;
declare evidence_result text;
declare assurance text;
declare domain text;
begin
  if auth.role()<>'service_role' then
    raise exception 'Continuous Trust worker service path required';
  end if;
  select * into signal from public.trust_signals
  where tenant_id=p_tenant_id and id=p_signal_id;
  if not found then raise exception 'Continuous Trust signal was not found'; end if;
  evidence_result:=case signal.status
    -- Human-authorized signal ingestion may add context and negative risk evidence,
    -- but it must never self-assert positive trust. Positive provider evidence
    -- remains the responsibility of the existing signed provider gateway.
    when 'POSITIVE' then 'INCONCLUSIVE'
    when 'NEGATIVE' then 'NEGATIVE'
    when 'UNAVAILABLE' then 'UNAVAILABLE'
    when 'REVOKED' then 'REVOKED'
    else 'INCONCLUSIVE'
  end;
  assurance:=case
    when signal.confidence>=0.9 then 'VERY_HIGH'
    when signal.confidence>=0.7 then 'HIGH'
    when signal.confidence>=0.4 then 'MEDIUM'
    when signal.confidence>0 then 'LOW'
    else 'NONE'
  end;
  domain:=case signal.entity_type
    when 'AI_AGENT' then 'AI_AGENT'
    when 'DEVICE' then 'DEVICE'
    when 'ENTERPRISE_WORKFLOW' then 'WORKFLOW'
    when 'SESSION' then 'RUNTIME'
    when 'CREDENTIAL' then 'AUTHORITY'
    else case signal.signal_type
      when 'NETWORK' then 'NETWORK'
      when 'VPN' then 'NETWORK'
      when 'AUTHORITY' then 'AUTHORITY'
      when 'ENTERPRISE_POLICY' then 'GOVERNANCE'
      else 'IDENTITY'
    end
  end;
  insert into public.evidence_objects(
    id,evidence_id,enterprise_id,provider_key,evidence_classification,
    storage_boundary,normalized_facts,occurred_at,retention_expires_at,
    domain_key,subject_id,subject_type,evidence_type,source_type,source_key,
    result,assurance_level,cryptographically_verified,server_verified,
    received_at,payload_hash,canonicalization,hash_algorithm,reason_codes
  ) values (
    signal.id,signal.id,signal.tenant_id,coalesce(signal.provider,signal.source),
    'CONTINUOUS_TRUST_SIGNAL','NORMALIZED_LEDGER',
    jsonb_build_object(
      'signalType',signal.signal_type,'status',signal.status,
      'severity',signal.severity,'confidence',signal.confidence,
      'metadata',signal.metadata
    ),signal.observed_at,signal.created_at+interval '365 days',
    domain,signal.entity_id,signal.entity_type,signal.signal_type,
    'CONTINUOUS_TRUST_SIGNAL',signal.source,evidence_result,assurance,
    false,true,signal.received_at,signal.fingerprint,'JCS','SHA-256',
    case
      when signal.status='POSITIVE'
        then array['CONTINUOUS_TRUST_POSITIVE_SIGNAL_CONTEXT_ONLY']
      else array['CONTINUOUS_TRUST_SIGNAL_ACCEPTED']
    end
  ) on conflict(evidence_id) do nothing;
  insert into public.trust_references(
    enterprise_id,source_type,source_id,ref_type,ref_id
  ) values (
    signal.tenant_id,'TRUST_SIGNAL',signal.id::text,'EVIDENCE_OBJECT',signal.id::text
  ) on conflict do nothing;
  return jsonb_build_object('signalId',signal.id,'evidenceId',signal.id,'projected',true);
end $$;

create or replace function public.finalize_continuous_trust_signal_v1(
  p_tenant_id uuid,
  p_signal_id uuid,
  p_policy_decision jsonb,
  p_drift jsonb,
  p_assessment_id uuid,
  p_trust_event jsonb
) returns jsonb
language plpgsql security definer set search_path=public as $$
declare signal public.trust_signals%rowtype;
declare item jsonb;
declare policy_id uuid := (p_policy_decision->>'policyDecisionId')::uuid;
declare review_id uuid;
declare alert_id uuid;
declare event_status text;
begin
  if auth.role()<>'service_role' then
    raise exception 'Continuous Trust worker service path required';
  end if;
  select * into signal from public.trust_signals
  where tenant_id=p_tenant_id and id=p_signal_id;
  if not found then raise exception 'Continuous Trust signal was not found'; end if;
  if exists(
    select 1 from public.trust_signal_processing
    where tenant_id=p_tenant_id and signal_id=p_signal_id and status='PROCESSED'
  ) then
    return jsonb_build_object('status','DUPLICATE','signalId',p_signal_id);
  end if;
  insert into public.trust_policy_decisions(
    id,tenant_id,entity_id,signal_id,policy_id,policy_version,action,
    reason_codes,affected_dimensions,manual_review_required,material,decided_at
  ) values (
    policy_id,p_tenant_id,signal.entity_id,signal.id,
    p_policy_decision->>'policyId',p_policy_decision->>'policyVersion',
    p_policy_decision->>'action',
    array(select jsonb_array_elements_text(p_policy_decision->'reasonCodes')),
    array(select jsonb_array_elements_text(p_policy_decision->'affectedDimensions')),
    (p_policy_decision->>'manualReviewRequired')::boolean,
    (p_policy_decision->>'material')::boolean,signal.received_at
  ) on conflict(tenant_id,signal_id) do nothing;

  for item in select value from jsonb_array_elements(coalesce(p_drift,'[]'::jsonb)) loop
    insert into public.trust_drift_findings(
      drift_id,enterprise_id,assessment_id,subject_id,drift_type,severity,
      rule_id,reason_code,evidence_references,prior_value,current_value,
      detected_at,signal_id,confidence,affected_dimensions,
      recommended_action,explanation
    ) values (
      gen_random_uuid(),p_tenant_id,p_assessment_id,signal.entity_id,
      item->>'driftType',lower(item->>'severity'),
      'EPIC24-'||upper(replace(item->>'driftType','_','-')),
      coalesce(item#>>'{reasonCodes,0}','MATERIAL_TRUST_DRIFT'),
      array['signal:'||signal.id::text],item->'previousValue',item->'currentValue',
      signal.received_at,signal.id,(item->>'confidence')::numeric,
      array(select jsonb_array_elements_text(item->'affectedDimensions')),
      item->>'recommendedAction',item->>'explanation'
    ) on conflict do nothing;
  end loop;

  if (p_policy_decision->>'manualReviewRequired')::boolean then
    review_id:=gen_random_uuid();
    insert into public.trust_manual_reviews(
      id,tenant_id,entity_id,status,requested_by,reason,signal_ids,
      policy_decision_id,created_at
    ) values (
      review_id,p_tenant_id,signal.entity_id,'REQUESTED',signal.actor_id,
      'Continuous Trust policy requires accountable human review.',
      array[signal.id],policy_id,signal.received_at
    );
    insert into public.trust_manual_review_history(
      tenant_id,review_id,previous_status,new_status,actor_id,reason
    ) values (
      p_tenant_id,review_id,null,'REQUESTED',signal.actor_id,
      'Policy-required manual review created.'
    );
  end if;

  if p_policy_decision->>'action' in ('ALERT','RESTRICT','SUSPEND','REVOKE') then
    alert_id:=gen_random_uuid();
    insert into public.trust_alerts(
      id,alert_type,status,subject_type,subject_reference,enterprise_id,
      alert_title,alert_description,summary,risk_level,severity,source,
      metadata,detected_at,triggering_event_id,assessment_id,
      policy_id,policy_version,evidence_references,remediation_guidance,
      reason_codes,signal_ids,policy_decision_id
    ) values (
      alert_id,'continuous_signal_policy','open',signal.entity_type,
      signal.entity_id,p_tenant_id,'Continuous trust signal requires action',
      'A deterministic policy evaluated a material trust signal.',
      'Review the signal, affected dimensions, policy, and retained evidence.',
      lower(signal.severity),lower(signal.severity),'continuous_trust_engine',
      jsonb_build_object('action',p_policy_decision->>'action','ruleBound',true),
      signal.received_at,null,p_assessment_id,p_policy_decision->>'policyId',
      p_policy_decision->>'policyVersion',array['evidence:'||signal.id::text],
      'Review retained evidence before applying or removing access restrictions.',
      array(select jsonb_array_elements_text(p_policy_decision->'reasonCodes')),
      array[signal.id],policy_id
    ) on conflict(id) do nothing;
  end if;

  event_status:=public.append_trust_event_v1(
    p_trust_event,null,signal.correlation_id
  );
  if event_status<>'APPENDED' then
    raise exception 'Continuous Trust processing event chain conflict';
  end if;
  update public.trust_signal_processing
  set status='PROCESSED',processed_at=now(),locked_at=null,locked_by=null,
      last_error_code=null,
      result=jsonb_build_object(
        'policyDecisionId',policy_id,'assessmentId',p_assessment_id,
        'driftCount',jsonb_array_length(coalesce(p_drift,'[]'::jsonb)),
        'alertId',alert_id,'reviewId',review_id
      ),updated_at=now()
  where tenant_id=p_tenant_id and signal_id=p_signal_id;
  insert into public.trust_architecture_audit_log(
    enterprise_id,action,actor_reference,target_type,target_id,correlation_id,metadata
  ) values (
    p_tenant_id,'CONTINUOUS_TRUST_SIGNAL_PROCESSED','system:continuous-trust-engine',
    'TRUST_SIGNAL',p_signal_id::text,signal.correlation_id,
    jsonb_build_object(
      'policyDecisionId',policy_id,'action',p_policy_decision->>'action',
      'assessmentId',p_assessment_id
    )
  );
  return jsonb_build_object(
    'status','PROCESSED','signalId',p_signal_id,'policyDecisionId',policy_id,
    'assessmentId',p_assessment_id,'alertId',alert_id,'reviewId',review_id
  );
end $$;

create or replace function public.fail_continuous_trust_signal_v1(
  p_tenant_id uuid,
  p_signal_id uuid,
  p_error_code text,
  p_retryable boolean
) returns jsonb
language plpgsql security definer set search_path=public as $$
declare processing public.trust_signal_processing%rowtype;
declare terminal boolean;
begin
  if auth.role()<>'service_role' then
    raise exception 'Continuous Trust worker service path required';
  end if;
  select * into processing from public.trust_signal_processing
  where tenant_id=p_tenant_id and signal_id=p_signal_id for update;
  if not found then raise exception 'Continuous Trust signal was not found'; end if;
  terminal:=not p_retryable or processing.attempts>=5;
  insert into public.trust_processing_failures(
    tenant_id,signal_id,attempt,error_code,retryable
  ) values (
    p_tenant_id,p_signal_id,greatest(processing.attempts,1),
    left(p_error_code,160),not terminal
  );
  update public.trust_signal_processing
  set status=case when terminal then 'FAILED_TERMINAL' else 'FAILED_RETRYABLE' end,
      next_attempt_at=case when terminal then next_attempt_at
        else now()+(interval '30 seconds' * power(2,greatest(attempts-1,0))) end,
      locked_at=null,locked_by=null,last_error_code=left(p_error_code,160),
      updated_at=now()
  where tenant_id=p_tenant_id and signal_id=p_signal_id;
  return jsonb_build_object(
    'signalId',p_signal_id,
    'status',case when terminal then 'FAILED_TERMINAL' else 'FAILED_RETRYABLE' end,
    'attempt',processing.attempts
  );
end $$;

create or replace function public.transition_continuous_trust_review_v1(
  p_tenant_id uuid,
  p_review_id uuid,
  p_actor_id uuid,
  p_next_status text,
  p_reason text,
  p_decision text,
  p_trust_event jsonb,
  p_correlation_id uuid
) returns jsonb
language plpgsql security definer set search_path=public as $$
declare review public.trust_manual_reviews%rowtype;
declare event_status text;
begin
  if auth.role()<>'service_role' then
    raise exception 'Continuous Trust review service path required';
  end if;
  if p_next_status not in ('ASSIGNED','IN_REVIEW','APPROVED','REJECTED','CANCELLED')
    or length(trim(coalesce(p_reason,'')))<1
  then raise exception 'Invalid manual review transition'; end if;
  select * into review from public.trust_manual_reviews
  where tenant_id=p_tenant_id and id=p_review_id for update;
  if not found then raise exception 'Manual review not found'; end if;
  if review.status in ('APPROVED','REJECTED','CANCELLED') then
    raise exception 'Closed manual review transition denied';
  end if;
  if (review.status='REQUESTED' and p_next_status not in ('ASSIGNED','IN_REVIEW','CANCELLED'))
    or (review.status='ASSIGNED' and p_next_status not in ('IN_REVIEW','CANCELLED'))
    or (review.status='IN_REVIEW' and p_next_status not in ('APPROVED','REJECTED','CANCELLED'))
  then raise exception 'Manual review transition denied'; end if;
  update public.trust_manual_reviews
  set status=p_next_status,
      assigned_to=case when p_next_status in ('ASSIGNED','IN_REVIEW') then coalesce(assigned_to,p_actor_id) else assigned_to end,
      decision=case when p_next_status in ('APPROVED','REJECTED') then p_decision else decision end,
      decision_reason=case when p_next_status in ('APPROVED','REJECTED','CANCELLED') then left(p_reason,1000) else decision_reason end,
      completed_at=case when p_next_status in ('APPROVED','REJECTED','CANCELLED') then now() else null end
  where tenant_id=p_tenant_id and id=p_review_id;
  insert into public.trust_manual_review_history(
    tenant_id,review_id,previous_status,new_status,actor_id,reason
  ) values (
    p_tenant_id,p_review_id,review.status,p_next_status,p_actor_id,left(p_reason,1000)
  );
  insert into public.trust_architecture_audit_log(
    enterprise_id,action,actor_reference,target_type,target_id,correlation_id,metadata
  ) values (
    p_tenant_id,'CONTINUOUS_TRUST_MANUAL_REVIEW_'||p_next_status,
    'reviewer:'||p_actor_id::text,'MANUAL_REVIEW',p_review_id::text,
    p_correlation_id,jsonb_build_object('previousStatus',review.status,'decision',p_decision)
  );
  event_status:=public.append_trust_event_v1(
    p_trust_event,null,p_correlation_id
  );
  if event_status<>'APPENDED' then
    raise exception 'Manual review event chain conflict';
  end if;
  return jsonb_build_object('reviewId',p_review_id,'status',p_next_status);
end $$;

create or replace function public.apply_continuous_trust_override_v1(
  p_contract jsonb,
  p_decision jsonb,
  p_trust_event jsonb,
  p_override jsonb,
  p_correlation_id uuid
) returns jsonb
language plpgsql security definer set search_path=public as $$
declare
  tenant uuid := (p_override->>'tenantId')::uuid;
  override_id uuid := (p_override->>'id')::uuid;
  actor_id uuid := (p_override->>'actorId')::uuid;
  result jsonb;
begin
  if auth.role()<>'service_role' then
    raise exception 'Continuous Trust override service path required';
  end if;
  if length(trim(coalesce(p_override->>'reason','')))<1
    or p_override->>'previousState'<>p_decision->>'priorState'
    or p_override->>'newState'<>p_decision->>'nextState'
  then raise exception 'Invalid Continuous Trust override'; end if;
  result:=public.apply_trust_state_decision_v1(
    p_contract,p_decision,p_trust_event,p_correlation_id
  );
  insert into public.trust_manual_overrides(
    id,tenant_id,entity_id,state_decision_id,previous_state,new_state,
    reason,actor_id,signal_ids,expires_at,created_at
  ) values (
    override_id,tenant,p_override->>'entityId',
    (p_decision->>'stateDecisionId')::uuid,p_override->>'previousState',
    p_override->>'newState',left(p_override->>'reason',1000),actor_id,
    array(select value::text::uuid from jsonb_array_elements_text(
      coalesce(p_override->'signalIds','[]'::jsonb)
    )),
    nullif(p_override->>'expiresAt','')::timestamptz,
    (p_override->>'createdAt')::timestamptz
  );
  insert into public.trust_architecture_audit_log(
    enterprise_id,action,actor_reference,target_type,target_id,correlation_id,metadata
  ) values (
    tenant,'CONTINUOUS_TRUST_MANUAL_OVERRIDE_APPLIED',
    'administrator:'||actor_id::text,'TRUST_MANUAL_OVERRIDE',override_id::text,
    p_correlation_id,jsonb_build_object(
      'stateDecisionId',p_decision->>'stateDecisionId',
      'previousState',p_override->>'previousState',
      'newState',p_override->>'newState',
      'expiresAt',p_override->>'expiresAt'
    )
  );
  return result||jsonb_build_object('overrideId',override_id);
end $$;

create or replace function public.transition_continuous_trust_alert_v2(
  p_tenant_id uuid,
  p_alert_id uuid,
  p_actor_id uuid,
  p_next_state text,
  p_note text,
  p_trust_event jsonb,
  p_correlation_id uuid
) returns jsonb
language plpgsql security definer set search_path=public as $$
declare current_state text;
declare updated public.trust_alerts%rowtype;
declare event_status text;
begin
  if auth.role()<>'service_role' then
    raise exception 'Continuous Trust alert service path required';
  end if;
  if p_next_state not in ('acknowledged','investigating','resolved','dismissed')
    or length(trim(coalesce(p_note,'')))<1
  then raise exception 'Invalid alert transition'; end if;
  select status into current_state from public.trust_alerts
  where id=p_alert_id and enterprise_id=p_tenant_id for update;
  if current_state is null then raise exception 'Alert not found'; end if;
  if current_state in ('resolved','dismissed') and p_next_state<>current_state then
    raise exception 'Closed alert transition denied';
  end if;
  update public.trust_alerts
  set status=p_next_state,reviewed_by=p_actor_id::text,
      acknowledged_at=case when p_next_state in ('acknowledged','investigating')
        then coalesce(acknowledged_at,now()) else acknowledged_at end,
      resolved_at=case when p_next_state in ('resolved','dismissed')
        then coalesce(resolved_at,now()) else resolved_at end,
      metadata=metadata||jsonb_build_object('resolutionNote',left(p_note,500)),
      updated_at=now()
  where id=p_alert_id and enterprise_id=p_tenant_id returning * into updated;
  insert into public.trust_alert_history(
    tenant_id,alert_id,previous_status,new_status,actor_id,note
  ) values (
    p_tenant_id,p_alert_id,current_state,p_next_state,p_actor_id,left(p_note,500)
  );
  event_status:=public.append_trust_event_v1(
    p_trust_event,null,p_correlation_id
  );
  if event_status<>'APPENDED' then
    raise exception 'Continuous Trust alert event chain conflict';
  end if;
  insert into public.trust_architecture_audit_log(
    enterprise_id,action,actor_reference,target_type,target_id,correlation_id,metadata
  ) values (
    p_tenant_id,'CONTINUOUS_TRUST_ALERT_'||upper(p_next_state),
    'reviewer:'||p_actor_id::text,'TRUST_ALERT',p_alert_id::text,
    p_correlation_id,jsonb_build_object('previousStatus',current_state)
  );
  return jsonb_build_object(
    'id',updated.id,'status',updated.status,
    'acknowledgedAt',updated.acknowledged_at,'resolvedAt',updated.resolved_at
  );
end $$;

revoke all on function public.ingest_continuous_trust_signal_v1(jsonb,text,uuid,jsonb) from public,anon,authenticated;
revoke all on function public.record_continuous_trust_signal_rejection_v1(uuid,uuid,uuid,text,jsonb) from public,anon,authenticated;
revoke all on function public.claim_continuous_trust_signal_v1(uuid,uuid,text) from public,anon,authenticated;
revoke all on function public.claim_continuous_trust_jobs_v1(integer,text) from public,anon,authenticated;
revoke all on function public.project_continuous_trust_signal_v1(uuid,uuid) from public,anon,authenticated;
revoke all on function public.finalize_continuous_trust_signal_v1(uuid,uuid,jsonb,jsonb,uuid,jsonb) from public,anon,authenticated;
revoke all on function public.fail_continuous_trust_signal_v1(uuid,uuid,text,boolean) from public,anon,authenticated;
revoke all on function public.transition_continuous_trust_review_v1(uuid,uuid,uuid,text,text,text,jsonb,uuid) from public,anon,authenticated;
revoke all on function public.apply_continuous_trust_override_v1(jsonb,jsonb,jsonb,jsonb,uuid) from public,anon,authenticated;
revoke all on function public.transition_continuous_trust_alert_v2(uuid,uuid,uuid,text,text,jsonb,uuid) from public,anon,authenticated;
grant execute on function public.ingest_continuous_trust_signal_v1(jsonb,text,uuid,jsonb) to service_role;
grant execute on function public.record_continuous_trust_signal_rejection_v1(uuid,uuid,uuid,text,jsonb) to service_role;
grant execute on function public.claim_continuous_trust_signal_v1(uuid,uuid,text) to service_role;
grant execute on function public.claim_continuous_trust_jobs_v1(integer,text) to service_role;
grant execute on function public.project_continuous_trust_signal_v1(uuid,uuid) to service_role;
grant execute on function public.finalize_continuous_trust_signal_v1(uuid,uuid,jsonb,jsonb,uuid,jsonb) to service_role;
grant execute on function public.fail_continuous_trust_signal_v1(uuid,uuid,text,boolean) to service_role;
grant execute on function public.transition_continuous_trust_review_v1(uuid,uuid,uuid,text,text,text,jsonb,uuid) to service_role;
grant execute on function public.apply_continuous_trust_override_v1(jsonb,jsonb,jsonb,jsonb,uuid) to service_role;
grant execute on function public.transition_continuous_trust_alert_v2(uuid,uuid,uuid,text,text,jsonb,uuid) to service_role;

comment on table public.trust_signals is
  'Immutable normalized trust signals. Raw provider payloads, secrets, biometric material, document images, full IP addresses and precise location are prohibited.';
comment on table public.trust_signal_processing is
  'Durable bounded-retry outbox for serverless Continuous Trust processing; it is not an in-process worker queue.';
comment on function public.ingest_continuous_trust_signal_v1(jsonb,text,uuid,jsonb) is
  'Atomically validates entity scope, reserves idempotency, stores an immutable signal, queues processing, appends Replay and records audit.';
comment on function public.record_continuous_trust_signal_rejection_v1(uuid,uuid,uuid,text,jsonb) is
  'Persists a privacy-safe immutable Replay event and audit record for a rejected signal attempt.';
