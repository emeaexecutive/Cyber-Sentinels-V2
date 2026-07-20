-- EPIC 17.2: Provider Consensus Engine. Forward-only and tenant-scoped.

alter table public.trust_events drop constraint if exists trust_events_v1_event_type_check;
alter table public.trust_events add constraint trust_events_v1_event_type_check check (
  schema_version is distinct from 'trust-event-v1' or event_type ~ '^(identity|device|session|authority|workflow|runtime|security|governance|provider|system|consent|consensus)\.[a-z0-9_]+(?:\.[a-z0-9_]+)*$'
) not valid;

create table public.provider_capability_versions (
  id uuid primary key default gen_random_uuid(), enterprise_id uuid references public.trust_workspaces(id) on delete cascade,
  provider_key text not null, capability_version text not null, capability_json jsonb not null,
  effective_at timestamptz not null, created_at timestamptz not null default now(),
  unique (enterprise_id,provider_key,capability_version)
);
create table public.provider_health_snapshots (
  id uuid primary key default gen_random_uuid(), enterprise_id uuid not null references public.trust_workspaces(id) on delete cascade,
  provider_key text not null, state text not null check(state in ('HEALTHY','DEGRADED','UNAVAILABLE','DISABLED','UNKNOWN','BLOCKED')),
  observed_at timestamptz not null, latency_ms numeric, error_rate numeric check(error_rate between 0 and 1), timeout_rate numeric check(timeout_rate between 0 and 1),
  signature_failures integer not null default 0, schema_failures integer not null default 0, circuit_open boolean not null default false,
  reason_codes text[] not null default '{}', created_at timestamptz not null default now()
);
create index provider_health_latest_idx on public.provider_health_snapshots(enterprise_id,provider_key,observed_at desc);
create table public.provider_observations (
  observation_id uuid primary key, enterprise_id uuid not null references public.trust_workspaces(id) on delete cascade,
  subject_id text not null, workflow_id text, provider_key text not null, signal_type text not null,
  result text not null check(result in ('PASS','FAIL','INCONCLUSIVE','UNAVAILABLE','BLOCKED','UNSUPPORTED','REVOKED')),
  assurance numeric not null check(assurance between 0 and 1), quality numeric not null check(quality between 0 and 1),
  signature_verified boolean not null default false, server_verified boolean not null default false, authoritative boolean not null default false,
  evidence_digest text not null check(evidence_digest ~ '^[a-f0-9]{64}$'), evidence_reference text not null, correlation_key text,
  occurred_at timestamptz not null, received_at timestamptz not null, expires_at timestamptz,
  supersedes_observation_id uuid references public.provider_observations(observation_id), revoked_observation_id uuid references public.provider_observations(observation_id),
  reason_codes text[] not null default '{}', created_at timestamptz not null default now(),
  unique(enterprise_id,provider_key,signal_type,evidence_digest)
);
create index provider_observations_subject_idx on public.provider_observations(enterprise_id,subject_id,occurred_at,observation_id);
create table public.consensus_policies (
  id uuid primary key default gen_random_uuid(), enterprise_id uuid references public.trust_workspaces(id) on delete cascade,
  policy_id text not null, name text not null, active boolean not null default false, current_version text not null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(enterprise_id,policy_id)
);
create table public.consensus_policy_versions (
  id uuid primary key default gen_random_uuid(), enterprise_id uuid references public.trust_workspaces(id) on delete cascade,
  policy_id text not null, version text not null, policy_json jsonb not null, valid_from timestamptz not null,
  created_by uuid, created_at timestamptz not null default now(), unique(enterprise_id,policy_id,version)
);
create table public.consensus_decisions (
  decision_id uuid primary key, enterprise_id uuid not null references public.trust_workspaces(id) on delete restrict,
  subject_id text not null, workflow_id text, policy_id text not null, policy_version text not null,
  evaluated_at timestamptz not null, state text not null check(state in ('VERIFIED','TRUSTED','CHALLENGED','INCONCLUSIVE','BLOCKED','REVOKED')),
  prior_state text check(prior_state is null or prior_state in ('VERIFIED','TRUSTED','CHALLENGED','INCONCLUSIVE','BLOCKED','REVOKED')),
  confidence integer not null check(confidence between 0 and 100), reason_codes text[] not null,
  evidence_snapshot_hash text not null check(evidence_snapshot_hash ~ '^[a-f0-9]{64}$'), idempotency_key text not null,
  thresholds jsonb not null, prior_decision_id uuid references public.consensus_decisions(decision_id), decision_hash text not null check(decision_hash ~ '^[a-f0-9]{64}$'),
  decision_json jsonb not null, simulated boolean not null default false, created_at timestamptz not null default now(),
  unique(enterprise_id,subject_id,idempotency_key,simulated)
);
create index consensus_decisions_subject_idx on public.consensus_decisions(enterprise_id,subject_id,evaluated_at desc,decision_id desc);
create table public.consensus_decision_evidence (
  id uuid primary key default gen_random_uuid(), decision_id uuid not null references public.consensus_decisions(decision_id) on delete restrict,
  enterprise_id uuid not null references public.trust_workspaces(id) on delete restrict, observation_id uuid not null references public.provider_observations(observation_id) on delete restrict,
  provider_key text not null, result text not null, included boolean not null, ignored_reason text, effective_weight numeric not null,
  freshness_multiplier numeric not null, independence_multiplier numeric not null, independence_group text, created_at timestamptz not null default now(), unique(decision_id,observation_id)
);
create table public.consensus_conflicts (
  id uuid primary key default gen_random_uuid(), conflict_id text not null, decision_id uuid not null references public.consensus_decisions(decision_id) on delete restrict,
  enterprise_id uuid not null references public.trust_workspaces(id) on delete restrict, severity text not null check(severity in ('NONE','LOW','MATERIAL','CRITICAL')),
  conflict_type text not null, observation_ids uuid[] not null, reason_code text not null, explanation text not null, created_at timestamptz not null default now(), unique(decision_id,conflict_id)
);
create table public.consensus_audit_log (
  id uuid primary key default gen_random_uuid(), enterprise_id uuid not null references public.trust_workspaces(id) on delete cascade,
  decision_id uuid references public.consensus_decisions(decision_id) on delete restrict, action text not null, actor_reference text not null,
  correlation_id uuid not null, metadata jsonb not null default '{}', created_at timestamptz not null default now()
);
create table public.subject_trust_state (
  enterprise_id uuid not null references public.trust_workspaces(id) on delete cascade, subject_id text not null, workflow_id text,
  state text not null check(state in ('VERIFIED','TRUSTED','CHALLENGED','INCONCLUSIVE','BLOCKED','REVOKED')),
  confidence integer not null check(confidence between 0 and 100), current_decision_id uuid not null references public.consensus_decisions(decision_id) on delete restrict,
  updated_at timestamptz not null default now(), primary key(enterprise_id,subject_id)
);

do $$ declare name text; begin foreach name in array array['provider_capability_versions','provider_health_snapshots','provider_observations','consensus_policies','consensus_policy_versions','consensus_decisions','consensus_decision_evidence','consensus_conflicts','consensus_audit_log','subject_trust_state'] loop
  execute format('alter table public.%I enable row level security',name); execute format('revoke all on public.%I from anon,authenticated',name); execute format('grant all privileges on public.%I to service_role',name);
end loop; end $$;
grant select on public.provider_capability_versions,public.provider_health_snapshots,public.provider_observations,public.consensus_policies,public.consensus_policy_versions,public.consensus_decisions,public.consensus_decision_evidence,public.consensus_conflicts,public.subject_trust_state to authenticated;

create policy "tenant reads provider capabilities" on public.provider_capability_versions for select to authenticated using(enterprise_id is null or public.user_can_access_trust_workspace(enterprise_id));
create policy "tenant reads provider health" on public.provider_health_snapshots for select to authenticated using(public.user_can_access_trust_workspace(enterprise_id));
create policy "tenant reads provider observations" on public.provider_observations for select to authenticated using(public.user_can_access_trust_workspace(enterprise_id));
create policy "tenant reads consensus policies" on public.consensus_policies for select to authenticated using(enterprise_id is null or public.user_can_access_trust_workspace(enterprise_id));
create policy "tenant reads consensus policy versions" on public.consensus_policy_versions for select to authenticated using(enterprise_id is null or public.user_can_access_trust_workspace(enterprise_id));
create policy "tenant reads consensus decisions" on public.consensus_decisions for select to authenticated using(public.user_can_access_trust_workspace(enterprise_id));
create policy "tenant reads consensus evidence" on public.consensus_decision_evidence for select to authenticated using(public.user_can_access_trust_workspace(enterprise_id));
create policy "tenant reads consensus conflicts" on public.consensus_conflicts for select to authenticated using(public.user_can_access_trust_workspace(enterprise_id));
create policy "tenant reads subject trust state" on public.subject_trust_state for select to authenticated using(public.user_can_access_trust_workspace(enterprise_id));

create or replace function public.prevent_consensus_history_mutation() returns trigger language plpgsql security definer set search_path=public as $$ begin raise exception 'Consensus history is append-only'; end $$;
do $$ declare name text; begin foreach name in array array['provider_capability_versions','provider_health_snapshots','provider_observations','consensus_policy_versions','consensus_decisions','consensus_decision_evidence','consensus_conflicts','consensus_audit_log'] loop execute format('create trigger %I_append_only before update or delete on public.%I for each row execute function public.prevent_consensus_history_mutation()',name,name); end loop; end $$;

create or replace function public.persist_consensus_decision_v1(p_decision jsonb,p_trust_events jsonb,p_correlation_id uuid) returns jsonb language plpgsql security definer set search_path=public as $$
declare enterprise uuid:=(p_decision->>'enterpriseId')::uuid; decision uuid:=(p_decision->>'decisionId')::uuid; existing public.consensus_decisions%rowtype; item jsonb; trust_event jsonb; trust_status text;
begin
  if auth.role()<>'service_role' then raise exception 'Trusted consensus path required'; end if;
  if (p_decision->>'decisionHash') !~ '^[a-f0-9]{64}$' or (p_decision->>'evidenceSnapshotHash') !~ '^[a-f0-9]{64}$' then raise exception 'Invalid consensus integrity metadata'; end if;
  perform pg_advisory_xact_lock(hashtextextended(enterprise::text||':'||(p_decision->>'subjectId')||':'||coalesce(p_decision->>'workflowId',''),37));
  select * into existing from public.consensus_decisions where enterprise_id=enterprise and subject_id=p_decision->>'subjectId' and idempotency_key=p_decision->>'idempotencyKey' and simulated=false for update;
  if found then return jsonb_build_object('status','DUPLICATE','decisionId',existing.decision_id,'decisionHash',existing.decision_hash,'state',existing.state,'confidence',existing.confidence); end if;
  insert into public.consensus_decisions(decision_id,enterprise_id,subject_id,workflow_id,policy_id,policy_version,evaluated_at,state,prior_state,confidence,reason_codes,evidence_snapshot_hash,idempotency_key,thresholds,prior_decision_id,decision_hash,decision_json,simulated)
  values(decision,enterprise,p_decision->>'subjectId',nullif(p_decision->>'workflowId',''),p_decision->>'policyId',p_decision->>'policyVersion',(p_decision->>'evaluatedAt')::timestamptz,p_decision->>'state',nullif(p_decision->>'priorState',''),(p_decision->>'confidence')::integer,array(select jsonb_array_elements_text(p_decision->'reasonCodes')),p_decision->>'evidenceSnapshotHash',p_decision->>'idempotencyKey',p_decision->'thresholds',nullif(p_decision->>'priorDecisionId','')::uuid,p_decision->>'decisionHash',p_decision,false);
  for item in select value from jsonb_array_elements(p_decision->'evidence') loop insert into public.consensus_decision_evidence(decision_id,enterprise_id,observation_id,provider_key,result,included,ignored_reason,effective_weight,freshness_multiplier,independence_multiplier,independence_group) values(decision,enterprise,(item->>'observationId')::uuid,item->>'providerKey',item->>'result',(item->>'included')::boolean,nullif(item->>'ignoredReason',''),(item->>'effectiveWeight')::numeric,(item->>'freshnessMultiplier')::numeric,(item->>'independenceMultiplier')::numeric,nullif(item->>'independenceGroup','')); end loop;
  for item in select value from jsonb_array_elements(p_decision->'conflicts') loop insert into public.consensus_conflicts(conflict_id,decision_id,enterprise_id,severity,conflict_type,observation_ids,reason_code,explanation) values(item->>'conflictId',decision,enterprise,item->>'severity',item->>'type',array(select value::text::uuid from jsonb_array_elements_text(item->'observationIds')),item->>'reasonCode',item->>'explanation'); end loop;
  insert into public.subject_trust_state(enterprise_id,subject_id,workflow_id,state,confidence,current_decision_id) values(enterprise,p_decision->>'subjectId',nullif(p_decision->>'workflowId',''),p_decision->>'state',(p_decision->>'confidence')::integer,decision) on conflict(enterprise_id,subject_id) do update set workflow_id=excluded.workflow_id,state=excluded.state,confidence=excluded.confidence,current_decision_id=excluded.current_decision_id,updated_at=now();
  for trust_event in select value from jsonb_array_elements(p_trust_events) loop trust_status:=public.append_trust_event_v1(trust_event,null,p_correlation_id);if trust_status<>'APPENDED' then raise exception 'Consensus Trust Event chain conflict';end if;end loop;
  insert into public.consensus_audit_log(enterprise_id,decision_id,action,actor_reference,correlation_id,metadata) values(enterprise,decision,'CONSENSUS_DECISION_CREATED','system:provider-consensus-engine',p_correlation_id,jsonb_build_object('state',p_decision->>'state','policyVersion',p_decision->>'policyVersion'));
  return jsonb_build_object('status','CREATED','decisionId',decision,'decisionHash',p_decision->>'decisionHash','state',p_decision->>'state','confidence',(p_decision->>'confidence')::integer);
end $$;
revoke all on function public.persist_consensus_decision_v1(jsonb,jsonb,uuid) from public,anon,authenticated;grant execute on function public.persist_consensus_decision_v1(jsonb,jsonb,uuid) to service_role;

create or replace function public.create_consensus_policy_v1(p_enterprise_id uuid,p_actor_id uuid,p_policy jsonb,p_correlation_id uuid,p_trust_event jsonb) returns jsonb language plpgsql security definer set search_path=public as $$
declare trust_status text;
begin if auth.role()<>'service_role' then raise exception 'Trusted consensus policy path required';end if;perform pg_advisory_xact_lock(hashtextextended(p_enterprise_id::text||':consensus-policy',41));
insert into public.consensus_policies(enterprise_id,policy_id,name,active,current_version) values(p_enterprise_id,p_policy->>'policyId',p_policy->>'name',(p_policy->>'active')::boolean,p_policy->>'version') on conflict(enterprise_id,policy_id) do update set name=excluded.name,active=excluded.active,current_version=excluded.current_version,updated_at=now();
insert into public.consensus_policy_versions(enterprise_id,policy_id,version,policy_json,valid_from,created_by) values(p_enterprise_id,p_policy->>'policyId',p_policy->>'version',p_policy,(p_policy->>'validFrom')::timestamptz,p_actor_id);
trust_status:=public.append_trust_event_v1(p_trust_event,null,p_correlation_id);if trust_status<>'APPENDED' then raise exception 'Consensus policy Trust Event chain conflict';end if;
insert into public.consensus_audit_log(enterprise_id,action,actor_reference,correlation_id,metadata) values(p_enterprise_id,'CONSENSUS_POLICY_CHANGED','administrator:'||p_actor_id::text,p_correlation_id,jsonb_build_object('policyId',p_policy->>'policyId','version',p_policy->>'version'));return p_policy;end $$;
revoke all on function public.create_consensus_policy_v1(uuid,uuid,jsonb,uuid,jsonb) from public,anon,authenticated;grant execute on function public.create_consensus_policy_v1(uuid,uuid,jsonb,uuid,jsonb) to service_role;

create or replace function public.record_provider_health_v1(p_enterprise_id uuid,p_health jsonb,p_trust_event jsonb,p_correlation_id uuid) returns jsonb language plpgsql security definer set search_path=public as $$
declare trust_status text; snapshot_id uuid;
begin if auth.role()<>'service_role' then raise exception 'Trusted provider health path required';end if;perform pg_advisory_xact_lock(hashtextextended(p_enterprise_id::text||':'||(p_health->>'providerKey')||':health',43));
insert into public.provider_health_snapshots(enterprise_id,provider_key,state,observed_at,latency_ms,error_rate,timeout_rate,signature_failures,schema_failures,circuit_open,reason_codes) values(p_enterprise_id,p_health->>'providerKey',p_health->>'state',(p_health->>'observedAt')::timestamptz,nullif(p_health->>'latencyMs','')::numeric,nullif(p_health->>'errorRate','')::numeric,nullif(p_health->>'timeoutRate','')::numeric,coalesce((p_health->>'signatureFailures')::integer,0),coalesce((p_health->>'schemaFailures')::integer,0),coalesce((p_health->>'circuitOpen')::boolean,false),array(select jsonb_array_elements_text(p_health->'reasonCodes'))) returning id into snapshot_id;
trust_status:=public.append_trust_event_v1(p_trust_event,null,p_correlation_id);if trust_status<>'APPENDED' then raise exception 'Provider health Trust Event chain conflict';end if;
insert into public.consensus_audit_log(enterprise_id,action,actor_reference,correlation_id,metadata) values(p_enterprise_id,'PROVIDER_HEALTH_CHANGED','system:provider-health-monitor',p_correlation_id,jsonb_build_object('snapshotId',snapshot_id,'providerKey',p_health->>'providerKey','state',p_health->>'state'));return jsonb_build_object('snapshotId',snapshot_id,'providerKey',p_health->>'providerKey','state',p_health->>'state');end $$;
revoke all on function public.record_provider_health_v1(uuid,jsonb,jsonb,uuid) from public,anon,authenticated;grant execute on function public.record_provider_health_v1(uuid,jsonb,jsonb,uuid) to service_role;

insert into public.consensus_policies(enterprise_id,policy_id,name,active,current_version) values(null,'provider-consensus-default','Safe provider consensus',true,'2026-07-20.1');
insert into public.consensus_policy_versions(enterprise_id,policy_id,version,policy_json,valid_from) values(null,'provider-consensus-default','2026-07-20.1','{"policyId":"provider-consensus-default","version":"2026-07-20.1","name":"Safe provider consensus","active":true,"verifiedThreshold":75,"trustedThreshold":50,"blockingThreshold":0.65,"minimumIndependentGroupsVerified":2,"minimumIndependentGroupsTrusted":1,"mandatorySignals":["identity_verification"],"materialConflictOutcome":"CHALLENGED","criticalRevocationOutcome":"REVOKED","staleEvidenceMode":"ZERO","correlationPenalty":0.25,"signalMultipliers":{"identity_verification":1,"document_verification":0.85,"government_identity":1,"proof_of_personhood":0.4,"device_reputation":0.7,"authority":1},"validFrom":"2026-07-20T00:00:00.000Z"}','2026-07-20T00:00:00Z');
insert into public.provider_capability_versions(enterprise_id,provider_key,capability_version,capability_json,effective_at) values
(null,'world_id','consensus-capability-v1','{"state":"BLOCKED","baseWeight":0,"positiveEvidence":false,"reasonCodes":["WORLD_ID_SERVER_VERIFICATION_NOT_IMPLEMENTED"]}','2026-07-20T00:00:00Z'),
(null,'hopae_connect','consensus-capability-v1','{"state":"ENVIRONMENT_AWARE","baseWeight":0.9,"positiveEvidence":"ONLY_WHEN_ACTIVE_AND_SIGNED"}','2026-07-20T00:00:00Z');

comment on table public.consensus_decisions is 'Append-only canonical decision lineage; subject_trust_state is only a materialized current view.';
comment on column public.provider_observations.evidence_reference is 'Opaque normalized reference. Raw provider payloads are prohibited.';
