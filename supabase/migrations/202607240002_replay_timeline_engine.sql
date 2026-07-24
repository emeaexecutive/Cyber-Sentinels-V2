-- EPIC 23: Replay and Trust Timeline Engine
-- Evolves the EPIC 20 replay projection without breaking legacy identity replay.

alter table public.replay_events
  add column if not exists id uuid generated always as (event_id) stored,
  add column if not exists entity_id uuid,
  add column if not exists event_time timestamptz generated always as (occurred_at) stored,
  add column if not exists actor text,
  add column if not exists provider text,
  add column if not exists risk_before numeric(5,2),
  add column if not exists risk_after numeric(5,2),
  add column if not exists trust_before numeric(5,2) generated always as (prior_trust) stored,
  add column if not exists trust_after numeric(5,2) generated always as (resulting_trust) stored,
  add column if not exists previous_event_hash text,
  add column if not exists event_hash text;

alter table public.replay_events
  add constraint replay_events_entity_fk
  foreign key(tenant_id,entity_id)
  references public.trust_entities(tenant_id,id)
  on delete restrict;
alter table public.replay_events
  add constraint replay_events_risk_before_ck
  check(risk_before is null or risk_before between 0 and 100);
alter table public.replay_events
  add constraint replay_events_risk_after_ck
  check(risk_after is null or risk_after between 0 and 100);
alter table public.replay_events
  add constraint replay_events_previous_hash_ck
  check(previous_event_hash is null or previous_event_hash ~ '^[a-f0-9]{64}$');
alter table public.replay_events
  add constraint replay_events_event_hash_ck
  check(event_hash is null or event_hash ~ '^[a-f0-9]{64}$');

alter table public.replay_events
  drop constraint replay_events_event_type_check;
alter table public.replay_events
  add constraint replay_events_event_type_check check(event_type in (
    'EVIDENCE_RECORDED','SIGNAL_RECEIVED','TRUST_UPDATED','RISK_DETECTED',
    'MANUAL_OVERRIDE','DECISION_RECORDED','PASSPORT_VERIFIED','EMAIL_VERIFIED',
    'PHONE_VERIFIED','DEVICE_OBSERVED','LOCATION_OBSERVED','VPN_DETECTED',
    'BROWSER_OBSERVED','LIVENESS_CHECKED','DEEPFAKE_ANALYZED',
    'ENTERPRISE_POLICY_CHANGED','MANUAL_REVIEW_COMPLETED',
    'TRUST_DNA_RECALCULATED','PROVIDER_RESPONSE_RECORDED','EVIDENCE_ADDED',
    'EVIDENCE_REMOVED','POLICY_CHANGED','MANUAL_APPROVAL','RISK_CHANGED'
  ));

create unique index replay_events_id_uidx on public.replay_events(id);
create index replay_events_entity_time_idx
  on public.replay_events(tenant_id,entity_id,event_time,event_id)
  where entity_id is not null;
create index replay_events_provider_idx
  on public.replay_events(tenant_id,entity_id,provider,event_time desc)
  where provider is not null;
create index replay_events_actor_idx
  on public.replay_events(tenant_id,entity_id,actor,event_time desc)
  where actor is not null;
create index replay_events_risk_idx
  on public.replay_events(tenant_id,entity_id,risk_after,event_time desc)
  where risk_after is not null;
create index replay_events_trust_idx
  on public.replay_events(tenant_id,entity_id,trust_after,event_time desc)
  where trust_after is not null;
create index replay_events_evidence_type_idx
  on public.replay_events(tenant_id,entity_id,(metadata->>'evidenceType'),event_time desc);

create or replace function public.append_replay_event_internal_v2(
  p_event jsonb
) returns public.replay_events
language plpgsql
security definer
set search_path=public
as $$
declare
  tenant uuid := (p_event->>'tenantId')::uuid;
  entity uuid := (p_event->>'entityId')::uuid;
  replay_id uuid := coalesce(nullif(p_event->>'id','')::uuid,gen_random_uuid());
  previous_hash text;
  calculated_hash text;
  event_payload jsonb;
  inserted public.replay_events;
  event_actor text := nullif(p_event->>'actor','');
  event_actor_id uuid;
begin
  if not exists(
    select 1 from public.trust_entities
    where tenant_id=tenant and id=entity and status <> 'DELETED'
  ) then
    raise exception 'Replay entity is unavailable';
  end if;
  if event_actor ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
    event_actor_id := event_actor::uuid;
  end if;

  perform pg_advisory_xact_lock(hashtextextended(tenant::text||':'||entity::text,0));
  select event_hash into previous_hash
  from public.replay_events
  where tenant_id=tenant and entity_id=entity and event_hash is not null
  order by event_time desc,event_id desc
  limit 1;

  event_payload := jsonb_build_object(
    'id',replay_id,
    'tenantId',tenant,
    'entityId',entity,
    'type',p_event->>'type',
    'eventTime',p_event->>'eventTime',
    'actor',event_actor,
    'provider',nullif(p_event->>'provider',''),
    'confidence',p_event->'confidence',
    'riskBefore',p_event->'priorRisk',
    'riskAfter',p_event->'resultingRisk',
    'trustBefore',p_event->'priorTrust',
    'trustAfter',p_event->'resultingTrust',
    'metadata',coalesce(p_event->'metadata','{}'::jsonb),
    'previousEventHash',previous_hash
  );
  calculated_hash := encode(
    digest(coalesce(previous_hash,'')||event_payload::text,'sha256'),
    'hex'
  );

  insert into public.replay_events(
    event_id,tenant_id,identity_id,entity_id,event_type,title,description,
    occurred_at,source,actor_id,actor,provider,confidence,evidence_ids,
    prior_trust,resulting_trust,risk_before,risk_after,metadata,
    previous_event_hash,event_hash
  ) values (
    replay_id,tenant,entity::text,entity,p_event->>'type',
    left(p_event->>'title',200),left(p_event->>'description',2000),
    (p_event->>'eventTime')::timestamptz,
    left(coalesce(nullif(p_event->>'source',''),'REPLAY'),256),
    event_actor_id,event_actor,left(nullif(p_event->>'provider',''),160),
    nullif(p_event->>'confidence','')::numeric,
    array(select jsonb_array_elements_text(coalesce(p_event->'evidenceIds','[]'::jsonb)))::uuid[],
    nullif(p_event->>'priorTrust','')::numeric,
    nullif(p_event->>'resultingTrust','')::numeric,
    nullif(p_event->>'priorRisk','')::numeric,
    nullif(p_event->>'resultingRisk','')::numeric,
    coalesce(p_event->'metadata','{}'::jsonb),
    previous_hash,calculated_hash
  )
  returning * into inserted;
  return inserted;
end $$;

revoke all on function public.append_replay_event_internal_v2(jsonb)
  from public,anon,authenticated;

create or replace function public.append_replay_event_v2(
  p_event jsonb
) returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  inserted public.replay_events;
begin
  if auth.role() <> 'service_role' then
    raise exception 'Replay service path required';
  end if;
  inserted := public.append_replay_event_internal_v2(p_event);
  return to_jsonb(inserted);
end $$;

revoke all on function public.append_replay_event_v2(jsonb)
  from public,anon,authenticated;
grant execute on function public.append_replay_event_v2(jsonb)
  to service_role;

create or replace function public.capture_trust_evidence_replay_v2()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare
  mapped_type text;
begin
  mapped_type := case
    when new.evidence_type ~* 'passport' then 'PASSPORT_VERIFIED'
    when new.evidence_type ~* 'email' then 'EMAIL_VERIFIED'
    when new.evidence_type ~* 'phone|mobile|sms' then 'PHONE_VERIFIED'
    when new.evidence_type ~* 'device' then 'DEVICE_OBSERVED'
    when new.evidence_type ~* 'location|geo' then 'LOCATION_OBSERVED'
    when new.evidence_type ~* 'vpn|proxy|tor' then 'VPN_DETECTED'
    when new.evidence_type ~* 'browser' then 'BROWSER_OBSERVED'
    when new.evidence_type ~* 'liveness' then 'LIVENESS_CHECKED'
    when new.evidence_type ~* 'deepfake|synthetic' then 'DEEPFAKE_ANALYZED'
    when new.evidence_type ~* 'policy' then 'ENTERPRISE_POLICY_CHANGED'
    when new.evidence_type ~* 'manual|review' then 'MANUAL_REVIEW_COMPLETED'
    else 'PROVIDER_RESPONSE_RECORDED'
  end;
  perform public.append_replay_event_internal_v2(jsonb_build_object(
    'id',gen_random_uuid(),
    'tenantId',new.tenant_id,
    'entityId',new.entity_id,
    'type',mapped_type,
    'title',left(replace(new.evidence_type,'_',' ')||' evidence recorded',200),
    'description','Provider-neutral evidence was added to the Enterprise Trust Graph.',
    'eventTime',new.created_at,
    'source',new.source,
    'actor','provider:'||new.provider,
    'provider',new.provider,
    'confidence',new.confidence,
    'evidenceIds',jsonb_build_array(new.id),
    'metadata',jsonb_build_object(
      'evidenceType',new.evidence_type,
      'evidenceVersion',new.version
    )
  ));
  return new;
end $$;

create trigger trust_evidence_replay_capture_v2
after insert on public.trust_evidence
for each row execute function public.capture_trust_evidence_replay_v2();

create or replace function public.capture_trust_dna_replay_v2()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare
  prior_profile public.trust_profiles;
  prior_risk numeric;
  next_risk numeric;
begin
  if new.profile_version <> 'trust-dna-v2' or new.entity_id is null then
    return new;
  end if;
  if new.previous_profile_id is not null then
    select * into prior_profile
    from public.trust_profiles
    where tenant_id=new.tenant_id and profile_id=new.previous_profile_id;
  end if;
  prior_risk := case prior_profile.risk_band
    when 'LOW' then 20 when 'MODERATE' then 50 when 'HIGH' then 80
    when 'INSUFFICIENT_EVIDENCE' then 100 else null end;
  next_risk := case new.risk_band
    when 'LOW' then 20 when 'MODERATE' then 50 when 'HIGH' then 80
    when 'INSUFFICIENT_EVIDENCE' then 100 else null end;
  perform public.append_replay_event_internal_v2(jsonb_build_object(
    'id',gen_random_uuid(),
    'tenantId',new.tenant_id,
    'entityId',new.entity_id,
    'type','TRUST_DNA_RECALCULATED',
    'title','Trust DNA recalculated',
    'description','The explainable multi-dimensional trust profile was recalculated.',
    'eventTime',new.generated_at,
    'source','TRUST_DNA',
    'actor','system:trust-dna',
    'provider','TrustDNAEngine',
    'confidence',new.overall_confidence/100,
    'priorRisk',prior_risk,
    'resultingRisk',next_risk,
    'priorTrust',prior_profile.overall_score,
    'resultingTrust',new.overall_score,
    'evidenceIds',to_jsonb(new.evidence_used),
    'metadata',jsonb_build_object(
      'profileId',new.profile_id,
      'profileVersion',new.version,
      'entityType',new.entity_type
    )
  ));
  return new;
end $$;

create trigger trust_dna_replay_capture_v2
after insert on public.trust_profiles
for each row execute function public.capture_trust_dna_replay_v2();
