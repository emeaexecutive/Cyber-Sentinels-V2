-- EPIC 22: Trust DNA Engine
-- Additive versioned projections over the EPIC 21 Enterprise Trust Graph.

alter table public.trust_profiles
  add column if not exists entity_id uuid,
  add column if not exists entity_type text,
  add column if not exists version integer,
  add column if not exists overall_score numeric(5,2),
  add column if not exists evidence_completeness numeric(5,2),
  add column if not exists evidence_used uuid[] not null default '{}',
  add column if not exists evidence_missing text[] not null default '{}',
  add column if not exists risk_indicators text[] not null default '{}',
  add column if not exists recommended_actions text[] not null default '{}',
  add column if not exists explanation text[] not null default '{}',
  add column if not exists previous_profile_id uuid;

alter table public.trust_profiles
  add constraint trust_profiles_entity_fk
  foreign key(tenant_id,entity_id)
  references public.trust_entities(tenant_id,id)
  on delete restrict;

alter table public.trust_profiles
  add constraint trust_profiles_previous_profile_fk
  foreign key(tenant_id,previous_profile_id)
  references public.trust_profiles(tenant_id,profile_id)
  on delete restrict;

alter table public.trust_profiles
  add constraint trust_profiles_v2_shape_ck check(
    profile_version <> 'trust-dna-v2'
    or (
      entity_id is not null
      and entity_type in (
        'HUMAN','ORGANISATION','AI_AGENT','DEVICE','IDENTITY',
        'EMAIL','PHONE','DOCUMENT','WORKFLOW','POLICY'
      )
      and version > 0
      and overall_score between 0 and 100
      and evidence_completeness between 0 and 100
    )
  );

alter table public.trust_profiles
  drop constraint trust_profiles_tenant_id_identity_id_evidence_snapshot_hash_key;

create unique index trust_profiles_v1_snapshot_uidx
  on public.trust_profiles(tenant_id,identity_id,evidence_snapshot_hash)
  where profile_version='trust-dna-v1';
create unique index trust_profiles_v2_entity_version_uidx
  on public.trust_profiles(tenant_id,entity_id,version)
  where profile_version='trust-dna-v2';
create index trust_profiles_v2_latest_idx
  on public.trust_profiles(tenant_id,entity_id,version desc,generated_at desc)
  where profile_version='trust-dna-v2';

create table public.trust_dimension_scores (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.trust_workspaces(id) on delete restrict,
  entity_id uuid not null,
  profile_id uuid not null,
  version integer not null check(version > 0),
  dimension_name text not null check(dimension_name in (
    'IDENTITY','DOCUMENTS','EMAIL','PHONE','DEVICE','LOCATION',
    'BEHAVIOUR','NETWORK','ENTERPRISE','HISTORICAL',
    'AI_BEHAVIOUR','PROVIDER_CONFIDENCE'
  )),
  score numeric(5,2) not null check(score between 0 and 100),
  confidence numeric(5,2) not null check(confidence between 0 and 100),
  weight numeric(6,4) not null check(weight > 0 and weight <= 1),
  reason text not null check(length(reason) between 1 and 2000),
  reasons text[] not null default '{}',
  last_updated timestamptz not null,
  evidence_ids uuid[] not null default '{}',
  evidence_missing boolean not null,
  risk_indicators text[] not null default '{}',
  recommended_actions text[] not null default '{}',
  created_at timestamptz not null default now(),
  foreign key(tenant_id,entity_id)
    references public.trust_entities(tenant_id,id) on delete restrict,
  foreign key(tenant_id,profile_id)
    references public.trust_profiles(tenant_id,profile_id) on delete restrict,
  unique(tenant_id,profile_id,dimension_name)
);
create index trust_dimension_scores_entity_idx
  on public.trust_dimension_scores(tenant_id,entity_id,version desc,dimension_name);

create table public.trust_score_history (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.trust_workspaces(id) on delete restrict,
  entity_id uuid not null,
  profile_id uuid not null,
  previous_profile_id uuid,
  version integer not null check(version > 0),
  overall_score numeric(5,2) not null check(overall_score between 0 and 100),
  overall_confidence numeric(5,2) not null check(overall_confidence between 0 and 100),
  evidence_completeness numeric(5,2) not null check(evidence_completeness between 0 and 100),
  score_change numeric(6,2),
  reason text not null check(length(reason) between 1 and 1000),
  evidence_used uuid[] not null default '{}',
  risk_indicators text[] not null default '{}',
  calculated_at timestamptz not null,
  created_at timestamptz not null default now(),
  foreign key(tenant_id,entity_id)
    references public.trust_entities(tenant_id,id) on delete restrict,
  foreign key(tenant_id,profile_id)
    references public.trust_profiles(tenant_id,profile_id) on delete restrict,
  foreign key(tenant_id,previous_profile_id)
    references public.trust_profiles(tenant_id,profile_id) on delete restrict,
  unique(tenant_id,entity_id,version)
);
create index trust_score_history_entity_idx
  on public.trust_score_history(tenant_id,entity_id,version desc,calculated_at desc);

alter table public.trust_dimension_scores enable row level security;
alter table public.trust_score_history enable row level security;

revoke all on public.trust_dimension_scores from anon,authenticated;
revoke all on public.trust_score_history from anon,authenticated;
grant select on public.trust_dimension_scores to authenticated;
grant select on public.trust_score_history to authenticated;

create policy "tenant reads trust dimension scores" on public.trust_dimension_scores
  for select to authenticated
  using(public.user_can_access_trust_workspace(tenant_id));
create policy "tenant reads trust score history" on public.trust_score_history
  for select to authenticated
  using(public.user_can_access_trust_workspace(tenant_id));

create trigger trust_dimension_scores_append_only
  before update or delete on public.trust_dimension_scores
  for each row execute function public.prevent_trust_architecture_history_mutation();
create trigger trust_score_history_append_only
  before update or delete on public.trust_score_history
  for each row execute function public.prevent_trust_architecture_history_mutation();

create or replace function public.persist_trust_dna_v2(
  p_profile jsonb,
  p_dimensions jsonb
) returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  tenant uuid := (p_profile->>'tenantId')::uuid;
  entity uuid := (p_profile->>'entityId')::uuid;
  profile uuid := (p_profile->>'profileId')::uuid;
  requested_version integer := (p_profile->>'version')::integer;
  expected_version integer;
  previous_profile uuid;
  previous_score numeric;
  dimension jsonb;
  snapshot_hash text;
begin
  if auth.role() <> 'service_role' then
    raise exception 'Trust DNA service path required';
  end if;
  if not exists(
    select 1
    from public.trust_entities
    where tenant_id=tenant and id=entity and status <> 'DELETED'
  ) then
    raise exception 'Trust DNA entity is unavailable';
  end if;

  select profile_id,overall_score,version
  into previous_profile,previous_score,expected_version
  from public.trust_profiles
  where tenant_id=tenant and entity_id=entity and profile_version='trust-dna-v2'
  order by version desc
  limit 1
  for update;
  expected_version := coalesce(expected_version,0) + 1;
  if requested_version <> expected_version then
    raise exception 'Trust DNA version conflict';
  end if;

  snapshot_hash := encode(
    digest(coalesce((p_profile->'evidenceUsed')::text,'[]'),'sha256'),
    'hex'
  );

  insert into public.trust_profiles(
    profile_id,tenant_id,identity_id,entity_id,entity_type,profile_version,version,
    overall_score,overall_confidence,evidence_completeness,risk_band,vector,
    evidence_snapshot_hash,evidence_used,evidence_missing,risk_indicators,
    recommended_actions,explanation,previous_profile_id,generated_at
  ) values (
    profile,tenant,entity::text,entity,p_profile->>'entityType','trust-dna-v2',requested_version,
    (p_profile->>'overallScore')::numeric,(p_profile->>'overallConfidence')::numeric,
    (p_profile->>'evidenceCompleteness')::numeric,p_profile->>'riskBand',
    p_profile->'vector',snapshot_hash,
    array(select jsonb_array_elements_text(coalesce(p_profile->'evidenceUsed','[]'::jsonb)))::uuid[],
    array(select jsonb_array_elements_text(coalesce(p_profile->'evidenceMissing','[]'::jsonb))),
    array(select jsonb_array_elements_text(coalesce(p_profile->'riskIndicators','[]'::jsonb))),
    array(select jsonb_array_elements_text(coalesce(p_profile->'recommendedActions','[]'::jsonb))),
    array(select jsonb_array_elements_text(coalesce(p_profile->'explanation','[]'::jsonb))),
    previous_profile,(p_profile->>'generatedAt')::timestamptz
  );

  for dimension in select value from jsonb_array_elements(p_dimensions) loop
    insert into public.trust_dimension_scores(
      tenant_id,entity_id,profile_id,version,dimension_name,score,confidence,weight,
      reason,reasons,last_updated,evidence_ids,evidence_missing,risk_indicators,
      recommended_actions
    ) values (
      tenant,entity,profile,requested_version,dimension->>'name',
      (dimension->>'score')::numeric,(dimension->>'confidence')::numeric,
      (dimension->>'weight')::numeric,dimension->>'reason',
      array(select jsonb_array_elements_text(coalesce(dimension->'reasons','[]'::jsonb))),
      (dimension->>'lastUpdated')::timestamptz,
      array(select jsonb_array_elements_text(coalesce(dimension->'evidenceIds','[]'::jsonb)))::uuid[],
      (dimension->>'evidenceMissing')::boolean,
      array(select jsonb_array_elements_text(coalesce(dimension->'riskIndicators','[]'::jsonb))),
      array(select jsonb_array_elements_text(coalesce(dimension->'recommendedActions','[]'::jsonb)))
    );
  end loop;

  insert into public.trust_score_history(
    tenant_id,entity_id,profile_id,previous_profile_id,version,overall_score,
    overall_confidence,evidence_completeness,score_change,reason,evidence_used,
    risk_indicators,calculated_at
  ) values (
    tenant,entity,profile,previous_profile,requested_version,
    (p_profile->>'overallScore')::numeric,(p_profile->>'overallConfidence')::numeric,
    (p_profile->>'evidenceCompleteness')::numeric,
    case when previous_score is null then null
      else (p_profile->>'overallScore')::numeric-previous_score end,
    case when previous_score is null then 'Initial Trust DNA profile calculated.'
      when (p_profile->>'overallScore')::numeric=previous_score
        then 'Trust DNA recalculated with no overall score change.'
      when (p_profile->>'overallScore')::numeric>previous_score
        then 'Trust DNA score increased after evidence evaluation.'
      else 'Trust DNA score decreased after evidence evaluation.' end,
    array(select jsonb_array_elements_text(coalesce(p_profile->'evidenceUsed','[]'::jsonb)))::uuid[],
    array(select jsonb_array_elements_text(coalesce(p_profile->'riskIndicators','[]'::jsonb))),
    (p_profile->>'generatedAt')::timestamptz
  );

  return jsonb_build_object(
    'status','CREATED',
    'profileId',profile,
    'entityId',entity,
    'version',requested_version
  );
end $$;

revoke all on function public.persist_trust_dna_v2(jsonb,jsonb)
  from public,anon,authenticated;
grant execute on function public.persist_trust_dna_v2(jsonb,jsonb)
  to service_role;
