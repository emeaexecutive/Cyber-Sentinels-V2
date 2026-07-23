-- EPIC 20: Trust Intelligence Engine.
-- Forward-only and additive. Existing evidence, Trust State, consent and provider
-- ledgers remain authoritative; these tables are explainable intelligence projections.
create extension if not exists pgcrypto;

create table public.evidence_nodes (
  node_id uuid primary key,
  tenant_id uuid not null references public.trust_workspaces(id) on delete restrict,
  identity_id text not null,
  evidence_type text not null check(evidence_type in (
    'HUMAN','PASSPORT','DRIVING_LICENCE','EMAIL','PHONE','CORPORATE_DOMAIN',
    'DEVICE','LOCATION','VPN','BROWSER','BIOMETRIC','LIVENESS',
    'DEEPFAKE_ANALYSIS','AI_AGENT','ENTERPRISE_POLICY','MANUAL_REVIEW','RISK_DECISION'
  )),
  label text not null check(length(label) between 1 and 200),
  confidence numeric(5,4) not null check(confidence between 0 and 1),
  status text not null check(status in ('VALID','INCONCLUSIVE','REJECTED','EXPIRED','REVOKED')),
  source text not null,
  verifier text not null,
  observed_at timestamptz not null,
  valid_until timestamptz,
  payload_hash text not null check(payload_hash ~ '^[a-f0-9]{64}$'),
  source_evidence_id uuid references public.evidence_objects(evidence_id) on delete restrict,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  unique(tenant_id,node_id),
  unique(tenant_id,source,payload_hash),
  check(valid_until is null or valid_until >= observed_at)
);
create index evidence_nodes_identity_history_idx
  on public.evidence_nodes(tenant_id,identity_id,observed_at desc,node_id desc);
create index evidence_nodes_type_status_idx
  on public.evidence_nodes(tenant_id,evidence_type,status,observed_at desc);
create index evidence_nodes_source_evidence_idx
  on public.evidence_nodes(tenant_id,source_evidence_id)
  where source_evidence_id is not null;

create table public.evidence_relationships (
  relationship_id uuid primary key,
  tenant_id uuid not null references public.trust_workspaces(id) on delete restrict,
  from_node_id uuid not null,
  to_node_id uuid not null,
  relationship_type text not null check(relationship_type in (
    'SUPPORTS','CONTRADICTS','DERIVED_FROM','OBSERVED_BY','VERIFIED_BY',
    'APPLIES_TO','SUPERSEDES','REVOKES','RESULTED_IN'
  )),
  confidence numeric(5,4) not null check(confidence between 0 and 1),
  source text not null,
  observed_at timestamptz not null,
  created_at timestamptz not null default now(),
  foreign key(tenant_id,from_node_id)
    references public.evidence_nodes(tenant_id,node_id) on delete restrict,
  foreign key(tenant_id,to_node_id)
    references public.evidence_nodes(tenant_id,node_id) on delete restrict,
  unique(tenant_id,from_node_id,to_node_id,relationship_type,source),
  check(from_node_id <> to_node_id)
);
create index evidence_relationships_from_idx
  on public.evidence_relationships(tenant_id,from_node_id,observed_at desc);
create index evidence_relationships_to_idx
  on public.evidence_relationships(tenant_id,to_node_id,observed_at desc);

create table public.trust_profiles (
  profile_id uuid primary key,
  tenant_id uuid not null references public.trust_workspaces(id) on delete restrict,
  identity_id text not null,
  profile_version text not null default 'trust-dna-v1',
  overall_confidence numeric(5,2) not null check(overall_confidence between 0 and 100),
  risk_band text not null check(risk_band in ('LOW','MODERATE','HIGH','INSUFFICIENT_EVIDENCE')),
  vector jsonb not null,
  evidence_snapshot_hash text not null check(evidence_snapshot_hash ~ '^[a-f0-9]{64}$'),
  generated_at timestamptz not null,
  created_at timestamptz not null default now(),
  unique(tenant_id,profile_id),
  unique(tenant_id,identity_id,evidence_snapshot_hash)
);
create index trust_profiles_identity_idx
  on public.trust_profiles(tenant_id,identity_id,generated_at desc,profile_id desc);

create table public.trust_dimensions (
  dimension_id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.trust_workspaces(id) on delete restrict,
  profile_id uuid not null,
  dimension_name text not null check(dimension_name in (
    'IDENTITY','DEVICE','BEHAVIOUR','LOCATION','DOCUMENT',
    'COMMUNICATION','ENTERPRISE','HISTORICAL','AI','HUMAN'
  )),
  score numeric(5,2) not null check(score between 0 and 100),
  confidence numeric(5,2) not null check(confidence between 0 and 100),
  weight numeric(6,4) not null check(weight >= 0 and weight <= 10),
  reasons text[] not null default '{}',
  evidence_node_ids uuid[] not null default '{}',
  created_at timestamptz not null default now(),
  foreign key(tenant_id,profile_id)
    references public.trust_profiles(tenant_id,profile_id) on delete restrict,
  unique(tenant_id,profile_id,dimension_name)
);
create index trust_dimensions_profile_idx
  on public.trust_dimensions(tenant_id,profile_id,dimension_name);

create table public.trust_history (
  history_id uuid primary key,
  tenant_id uuid not null references public.trust_workspaces(id) on delete restrict,
  identity_id text not null,
  profile_id uuid,
  event_type text not null check(event_type in (
    'PROFILE_CREATED','TRUST_INCREASED','TRUST_REDUCED','TRUST_RESTORED',
    'TRUST_REVOKED','HUMAN_OVERRIDE','DECISION_RECORDED'
  )),
  prior_vector jsonb,
  resulting_vector jsonb not null,
  reason text not null,
  evidence_node_ids uuid[] not null default '{}',
  actor_id uuid,
  occurred_at timestamptz not null,
  created_at timestamptz not null default now(),
  foreign key(tenant_id,profile_id)
    references public.trust_profiles(tenant_id,profile_id) on delete restrict
);
create index trust_history_identity_idx
  on public.trust_history(tenant_id,identity_id,occurred_at desc,history_id desc);

create table public.replay_events (
  event_id uuid primary key,
  tenant_id uuid not null references public.trust_workspaces(id) on delete restrict,
  identity_id text not null,
  event_type text not null check(event_type in (
    'EVIDENCE_RECORDED','SIGNAL_RECEIVED','TRUST_UPDATED','RISK_DETECTED',
    'MANUAL_OVERRIDE','DECISION_RECORDED'
  )),
  title text not null check(length(title) between 1 and 200),
  description text not null check(length(description) between 1 and 2000),
  occurred_at timestamptz not null,
  source text not null,
  confidence numeric(5,4) check(confidence between 0 and 1),
  evidence_ids uuid[] not null default '{}',
  prior_trust numeric(5,2) check(prior_trust between 0 and 100),
  resulting_trust numeric(5,2) check(resulting_trust between 0 and 100),
  actor_id uuid,
  source_event_id uuid references public.trust_events(id) on delete restrict,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  unique(tenant_id,event_id)
);
create index replay_events_identity_idx
  on public.replay_events(tenant_id,identity_id,occurred_at,event_id);

create table public.trust_signals (
  signal_id uuid primary key,
  tenant_id uuid not null references public.trust_workspaces(id) on delete restrict,
  identity_id text not null,
  signal_source text not null check(signal_source in (
    'IDENTITY','DEVICE','EMAIL','PHONE','PROVIDER','BROWSER',
    'LOCATION','BEHAVIOUR','ENTERPRISE_POLICY','AI_AGENT'
  )),
  signal_type text not null,
  signal_value numeric(6,2) not null check(signal_value between -100 and 100),
  confidence numeric(5,4) not null check(confidence between 0 and 1),
  observed_at timestamptz not null,
  provider text,
  evidence_node_ids uuid[] not null default '{}',
  source_event_id uuid references public.trust_events(id) on delete restrict,
  created_at timestamptz not null default now(),
  unique(tenant_id,signal_id)
);
create index trust_signals_identity_idx
  on public.trust_signals(tenant_id,identity_id,observed_at desc,signal_id desc);
create index trust_signals_source_idx
  on public.trust_signals(tenant_id,signal_source,observed_at desc);

create table public.trust_updates (
  update_id uuid primary key,
  tenant_id uuid not null references public.trust_workspaces(id) on delete restrict,
  identity_id text not null,
  signal_id uuid not null,
  prior_trust numeric(5,2) not null check(prior_trust between 0 and 100),
  resulting_trust numeric(5,2) not null check(resulting_trust between 0 and 100),
  delta numeric(6,2) not null check(delta between -100 and 100),
  confidence numeric(5,4) not null check(confidence between 0 and 1),
  reason text not null,
  occurred_at timestamptz not null,
  created_at timestamptz not null default now(),
  foreign key(tenant_id,signal_id)
    references public.trust_signals(tenant_id,signal_id) on delete restrict,
  unique(tenant_id,update_id),
  unique(tenant_id,signal_id)
);
create index trust_updates_identity_idx
  on public.trust_updates(tenant_id,identity_id,occurred_at desc,update_id desc);

create table public.provider_results (
  result_id uuid primary key,
  tenant_id uuid not null references public.trust_workspaces(id) on delete restrict,
  identity_id text not null,
  provider_key text not null,
  provider_reference text not null,
  evidence_type text not null,
  status text not null check(status in ('VALID','INCONCLUSIVE','REJECTED','EXPIRED','REVOKED')),
  confidence numeric(5,4) not null check(confidence between 0 and 1),
  observed_at timestamptz not null,
  expires_at timestamptz,
  latency_ms integer check(latency_ms is null or latency_ms >= 0),
  cost_amount numeric(12,4) check(cost_amount is null or cost_amount >= 0),
  cost_currency text,
  limitations text[] not null default '{}',
  attributes jsonb not null default '{}',
  source_observation_id uuid references public.provider_observations(observation_id) on delete restrict,
  created_at timestamptz not null default now(),
  unique(tenant_id,result_id),
  unique(tenant_id,provider_key,provider_reference)
);
create index provider_results_identity_idx
  on public.provider_results(tenant_id,identity_id,observed_at desc,result_id desc);
create index provider_results_health_idx
  on public.provider_results(tenant_id,provider_key,observed_at desc);

create or replace function public.project_evidence_node_v1()
returns trigger language plpgsql security definer set search_path=public as $$
declare
  mapped_type text;
  mapped_status text;
  mapped_confidence numeric;
begin
  mapped_type := case
    when new.evidence_type ~* 'driving|licen[cs]e' then 'DRIVING_LICENCE'
    when new.evidence_type ~* 'passport' then 'PASSPORT'
    when new.evidence_type ~* 'email' then 'EMAIL'
    when new.evidence_type ~* 'phone' then 'PHONE'
    when new.evidence_type ~* 'corporate|domain' then 'CORPORATE_DOMAIN'
    when new.evidence_type ~* 'device' then 'DEVICE'
    when new.evidence_type ~* 'location|geolocation' then 'LOCATION'
    when new.evidence_type ~* 'vpn|proxy|tor' then 'VPN'
    when new.evidence_type ~* 'browser' then 'BROWSER'
    when new.evidence_type ~* 'biometric|face.match' then 'BIOMETRIC'
    when new.evidence_type ~* 'liveness' then 'LIVENESS'
    when new.evidence_type ~* 'deepfake|synthetic.media' then 'DEEPFAKE_ANALYSIS'
    when new.subject_type ~* 'agent|machine' or new.evidence_type ~* 'ai.agent' then 'AI_AGENT'
    when new.evidence_type ~* 'policy' then 'ENTERPRISE_POLICY'
    when new.evidence_type ~* 'manual|review' then 'MANUAL_REVIEW'
    when new.evidence_type ~* 'risk|decision' then 'RISK_DECISION'
    else 'HUMAN'
  end;
  mapped_status := case
    when new.result='REVOKED' then 'REVOKED'
    when new.expires_at is not null and new.expires_at <= now() then 'EXPIRED'
    when new.result='POSITIVE' then 'VALID'
    when new.result='NEGATIVE' then 'REJECTED'
    else 'INCONCLUSIVE'
  end;
  mapped_confidence := case new.assurance_level
    when 'VERY_HIGH' then 0.95
    when 'HIGH' then 0.80
    when 'MEDIUM' then 0.60
    when 'LOW' then 0.35
    else 0
  end;
  insert into public.evidence_nodes(
    node_id,tenant_id,identity_id,evidence_type,label,confidence,status,source,
    verifier,observed_at,valid_until,payload_hash,source_evidence_id,metadata
  ) values (
    new.evidence_id,new.enterprise_id,new.subject_id,mapped_type,
    left(new.evidence_type,200),mapped_confidence,mapped_status,
    left(new.source_type||':'||new.source_key,256),left(new.source_key,256),
    new.observed_at,new.expires_at,new.payload_hash,new.evidence_id,
    jsonb_build_object(
      'domainKey',new.domain_key,
      'assuranceLevel',new.assurance_level,
      'serverVerified',new.server_verified,
      'cryptographicallyVerified',new.cryptographically_verified
    )
  ) on conflict(tenant_id,source,payload_hash) do nothing;
  return new;
end $$;

create trigger evidence_objects_trust_intelligence_projection_v1
after insert on public.evidence_objects
for each row execute function public.project_evidence_node_v1();

insert into public.evidence_nodes(
  node_id,tenant_id,identity_id,evidence_type,label,confidence,status,source,
  verifier,observed_at,valid_until,payload_hash,source_evidence_id,metadata
)
select
  evidence_id,enterprise_id,subject_id,
  case
    when evidence_type ~* 'driving|licen[cs]e' then 'DRIVING_LICENCE'
    when evidence_type ~* 'passport' then 'PASSPORT'
    when evidence_type ~* 'email' then 'EMAIL'
    when evidence_type ~* 'phone' then 'PHONE'
    when evidence_type ~* 'corporate|domain' then 'CORPORATE_DOMAIN'
    when evidence_type ~* 'device' then 'DEVICE'
    when evidence_type ~* 'location|geolocation' then 'LOCATION'
    when evidence_type ~* 'vpn|proxy|tor' then 'VPN'
    when evidence_type ~* 'browser' then 'BROWSER'
    when evidence_type ~* 'biometric|face.match' then 'BIOMETRIC'
    when evidence_type ~* 'liveness' then 'LIVENESS'
    when evidence_type ~* 'deepfake|synthetic.media' then 'DEEPFAKE_ANALYSIS'
    when subject_type ~* 'agent|machine' or evidence_type ~* 'ai.agent' then 'AI_AGENT'
    when evidence_type ~* 'policy' then 'ENTERPRISE_POLICY'
    when evidence_type ~* 'manual|review' then 'MANUAL_REVIEW'
    when evidence_type ~* 'risk|decision' then 'RISK_DECISION'
    else 'HUMAN'
  end,
  left(evidence_type,200),
  case assurance_level when 'VERY_HIGH' then 0.95 when 'HIGH' then 0.80
    when 'MEDIUM' then 0.60 when 'LOW' then 0.35 else 0 end,
  case when result='REVOKED' then 'REVOKED'
    when expires_at is not null and expires_at <= now() then 'EXPIRED'
    when result='POSITIVE' then 'VALID'
    when result='NEGATIVE' then 'REJECTED'
    else 'INCONCLUSIVE' end,
  left(source_type||':'||source_key,256),left(source_key,256),observed_at,
  expires_at,payload_hash,evidence_id,
  jsonb_build_object(
    'domainKey',domain_key,'assuranceLevel',assurance_level,
    'serverVerified',server_verified,
    'cryptographicallyVerified',cryptographically_verified
  )
from public.evidence_objects
where enterprise_id is not null and evidence_id is not null
on conflict(tenant_id,source,payload_hash) do nothing;

create or replace function public.project_provider_result_v1()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  insert into public.provider_results(
    result_id,tenant_id,identity_id,provider_key,provider_reference,evidence_type,
    status,confidence,observed_at,expires_at,limitations,attributes,
    source_observation_id
  ) values (
    new.observation_id,new.enterprise_id,new.subject_id,new.provider_key,
    new.observation_id::text,new.signal_type,
    case
      when new.result='REVOKED' then 'REVOKED'
      when new.expires_at is not null and new.expires_at <= now() then 'EXPIRED'
      when new.result='PASS' and new.provider_key<>'world_id' and new.server_verified then 'VALID'
      when new.result in ('FAIL','BLOCKED') then 'REJECTED'
      else 'INCONCLUSIVE'
    end,
    greatest(0,least(1,new.assurance)),new.occurred_at,new.expires_at,
    case when new.provider_key='world_id' and not new.server_verified
      then array['WORLD_ID_SERVER_VERIFICATION_NOT_IMPLEMENTED']
      else coalesce(new.reason_codes,'{}') end,
    jsonb_build_object(
      'quality',new.quality,
      'serverVerified',new.server_verified,
      'signatureVerified',new.signature_verified
    ),
    new.observation_id
  ) on conflict(tenant_id,provider_key,provider_reference) do nothing;
  return new;
end $$;

create trigger provider_observations_trust_intelligence_projection_v1
after insert on public.provider_observations
for each row execute function public.project_provider_result_v1();

insert into public.provider_results(
  result_id,tenant_id,identity_id,provider_key,provider_reference,evidence_type,
  status,confidence,observed_at,expires_at,limitations,attributes,
  source_observation_id
)
select
  observation_id,enterprise_id,subject_id,provider_key,observation_id::text,
  signal_type,
  case
    when result='REVOKED' then 'REVOKED'
    when expires_at is not null and expires_at <= now() then 'EXPIRED'
    when result='PASS' and provider_key<>'world_id' and server_verified then 'VALID'
    when result in ('FAIL','BLOCKED') then 'REJECTED'
    else 'INCONCLUSIVE'
  end,
  greatest(0,least(1,assurance)),occurred_at,expires_at,
  case when provider_key='world_id' and not server_verified
    then array['WORLD_ID_SERVER_VERIFICATION_NOT_IMPLEMENTED']
    else coalesce(reason_codes,'{}') end,
  jsonb_build_object(
    'quality',quality,'serverVerified',server_verified,
    'signatureVerified',signature_verified
  ),
  observation_id
from public.provider_observations
where enterprise_id is not null and observation_id is not null
on conflict(tenant_id,provider_key,provider_reference) do nothing;

do $$
declare table_name text;
begin
  foreach table_name in array array[
    'evidence_nodes','evidence_relationships','trust_profiles','trust_dimensions',
    'trust_history','replay_events','trust_signals','trust_updates','provider_results'
  ] loop
    execute format('alter table public.%I enable row level security',table_name);
    execute format('revoke all on public.%I from anon,authenticated',table_name);
    execute format('grant all privileges on public.%I to service_role',table_name);
    execute format('grant select on public.%I to authenticated',table_name);
  end loop;
end $$;

create policy "tenant reads evidence nodes" on public.evidence_nodes
  for select to authenticated using(public.user_can_access_trust_workspace(tenant_id));
create policy "tenant reads evidence relationships" on public.evidence_relationships
  for select to authenticated using(public.user_can_access_trust_workspace(tenant_id));
create policy "tenant reads trust profiles" on public.trust_profiles
  for select to authenticated using(public.user_can_access_trust_workspace(tenant_id));
create policy "tenant reads trust dimensions" on public.trust_dimensions
  for select to authenticated using(public.user_can_access_trust_workspace(tenant_id));
create policy "tenant reads trust history" on public.trust_history
  for select to authenticated using(public.user_can_access_trust_workspace(tenant_id));
create policy "tenant reads replay events" on public.replay_events
  for select to authenticated using(public.user_can_access_trust_workspace(tenant_id));
create policy "tenant reads trust signals" on public.trust_signals
  for select to authenticated using(public.user_can_access_trust_workspace(tenant_id));
create policy "tenant reads trust updates" on public.trust_updates
  for select to authenticated using(public.user_can_access_trust_workspace(tenant_id));
create policy "tenant reads provider results" on public.provider_results
  for select to authenticated using(public.user_can_access_trust_workspace(tenant_id));

create trigger evidence_nodes_append_only before update or delete on public.evidence_nodes
  for each row execute function public.prevent_trust_architecture_history_mutation();
create trigger evidence_relationships_append_only before update or delete on public.evidence_relationships
  for each row execute function public.prevent_trust_architecture_history_mutation();
create trigger trust_profiles_append_only before update or delete on public.trust_profiles
  for each row execute function public.prevent_trust_architecture_history_mutation();
create trigger trust_dimensions_append_only before update or delete on public.trust_dimensions
  for each row execute function public.prevent_trust_architecture_history_mutation();
create trigger trust_history_append_only before update or delete on public.trust_history
  for each row execute function public.prevent_trust_architecture_history_mutation();
create trigger replay_events_append_only before update or delete on public.replay_events
  for each row execute function public.prevent_trust_architecture_history_mutation();
create trigger trust_signals_append_only before update or delete on public.trust_signals
  for each row execute function public.prevent_trust_architecture_history_mutation();
create trigger trust_updates_append_only before update or delete on public.trust_updates
  for each row execute function public.prevent_trust_architecture_history_mutation();
create trigger provider_results_append_only before update or delete on public.provider_results
  for each row execute function public.prevent_trust_architecture_history_mutation();

create or replace function public.persist_trust_profile_v1(
  p_profile jsonb,
  p_dimensions jsonb,
  p_history jsonb
) returns jsonb
language plpgsql security definer set search_path=public as $$
declare
  tenant uuid := (p_profile->>'tenantId')::uuid;
  profile uuid := (p_profile->>'profileId')::uuid;
  dimension jsonb;
begin
  if auth.role() <> 'service_role' then
    raise exception 'Trust DNA service path required';
  end if;
  if exists(
    select 1 from public.trust_profiles
    where tenant_id=tenant and profile_id=profile
  ) then
    return jsonb_build_object('status','DUPLICATE','profileId',profile);
  end if;

  insert into public.trust_profiles(
    profile_id,tenant_id,identity_id,profile_version,overall_confidence,risk_band,
    vector,evidence_snapshot_hash,generated_at
  ) values (
    profile,tenant,p_profile->>'identityId',coalesce(p_profile->>'profileVersion','trust-dna-v1'),
    (p_profile->>'overallConfidence')::numeric,p_profile->>'riskBand',
    p_profile->'vector',p_profile->>'evidenceSnapshotHash',
    (p_profile->>'generatedAt')::timestamptz
  );

  for dimension in select value from jsonb_array_elements(p_dimensions) loop
    insert into public.trust_dimensions(
      tenant_id,profile_id,dimension_name,score,confidence,weight,reasons,evidence_node_ids
    ) values (
      tenant,profile,dimension->>'name',(dimension->>'score')::numeric,
      (dimension->>'confidence')::numeric,(dimension->>'weight')::numeric,
      array(select jsonb_array_elements_text(coalesce(dimension->'reasons','[]'::jsonb))),
      array(select jsonb_array_elements_text(coalesce(dimension->'evidenceIds','[]'::jsonb)))::uuid[]
    );
  end loop;

  insert into public.trust_history(
    history_id,tenant_id,identity_id,profile_id,event_type,resulting_vector,
    reason,evidence_node_ids,occurred_at
  ) values (
    (p_history->>'historyId')::uuid,tenant,p_profile->>'identityId',profile,
    coalesce(p_history->>'eventType','PROFILE_CREATED'),p_profile->'vector',
    p_history->>'reason',
    array(select jsonb_array_elements_text(coalesce(p_history->'evidenceIds','[]'::jsonb)))::uuid[],
    (p_profile->>'generatedAt')::timestamptz
  );
  return jsonb_build_object('status','CREATED','profileId',profile);
end $$;
revoke all on function public.persist_trust_profile_v1(jsonb,jsonb,jsonb)
  from public,anon,authenticated;
grant execute on function public.persist_trust_profile_v1(jsonb,jsonb,jsonb)
  to service_role;

create or replace function public.record_trust_signal_v1(
  p_signal jsonb,
  p_update jsonb,
  p_replay jsonb
) returns jsonb
language plpgsql security definer set search_path=public as $$
declare
  tenant uuid := (p_signal->>'tenantId')::uuid;
  signal uuid := (p_signal->>'id')::uuid;
begin
  if auth.role() <> 'service_role' then
    raise exception 'Continuous Trust signal service path required';
  end if;
  if p_update->>'tenantId' <> p_signal->>'tenantId'
    or p_replay->>'tenantId' <> p_signal->>'tenantId'
    or p_update->>'identityId' <> p_signal->>'identityId'
    or p_replay->>'identityId' <> p_signal->>'identityId' then
    raise exception 'Cross-tenant or cross-identity signal projection denied';
  end if;

  insert into public.trust_signals(
    signal_id,tenant_id,identity_id,signal_source,signal_type,signal_value,
    confidence,observed_at,provider,evidence_node_ids
  ) values (
    signal,tenant,p_signal->>'identityId',p_signal->>'source',p_signal->>'type',
    (p_signal->>'value')::numeric,(p_signal->>'confidence')::numeric,
    (p_signal->>'observedAt')::timestamptz,nullif(p_signal->>'provider',''),
    array(select jsonb_array_elements_text(coalesce(p_signal->'evidenceIds','[]'::jsonb)))::uuid[]
  ) on conflict(tenant_id,signal_id) do nothing;

  insert into public.trust_updates(
    update_id,tenant_id,identity_id,signal_id,prior_trust,resulting_trust,
    delta,confidence,reason,occurred_at
  ) values (
    (p_update->>'id')::uuid,tenant,p_update->>'identityId',signal,
    (p_update->>'priorTrust')::numeric,(p_update->>'resultingTrust')::numeric,
    (p_update->>'delta')::numeric,(p_update->>'confidence')::numeric,
    p_update->>'reason',(p_update->>'occurredAt')::timestamptz
  ) on conflict(tenant_id,signal_id) do nothing;

  insert into public.replay_events(
    event_id,tenant_id,identity_id,event_type,title,description,occurred_at,
    source,confidence,evidence_ids,prior_trust,resulting_trust,metadata
  ) values (
    (p_replay->>'id')::uuid,tenant,p_replay->>'identityId',p_replay->>'type',
    p_replay->>'title',p_replay->>'description',
    (p_replay->>'occurredAt')::timestamptz,p_replay->>'source',
    nullif(p_replay->>'confidence','')::numeric,
    array(select jsonb_array_elements_text(coalesce(p_replay->'evidenceIds','[]'::jsonb)))::uuid[],
    nullif(p_replay->>'priorTrust','')::numeric,
    nullif(p_replay->>'resultingTrust','')::numeric,
    coalesce(p_replay->'metadata','{}'::jsonb)
  ) on conflict(tenant_id,event_id) do nothing;

  return jsonb_build_object('status','RECORDED','signalId',signal);
end $$;
revoke all on function public.record_trust_signal_v1(jsonb,jsonb,jsonb)
  from public,anon,authenticated;
grant execute on function public.record_trust_signal_v1(jsonb,jsonb,jsonb)
  to service_role;

comment on table public.evidence_nodes is
  'Tenant-bound, normalized Evidence Graph nodes. Raw provider payloads remain in their authoritative stores.';
comment on table public.trust_profiles is
  'Immutable Trust DNA profiles. Dimensions explain trust; this table is not an authorization authority.';
comment on table public.replay_events is
  'Immutable Trust Intelligence replay chronology linked to evidence and trust updates.';
comment on function public.record_trust_signal_v1(jsonb,jsonb,jsonb) is
  'Atomically records a signal, explainable update projection and replay event; it does not mutate authoritative Trust State.';
