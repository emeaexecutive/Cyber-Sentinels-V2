-- EPIC 28: Enterprise Trust Fabric composition records.
-- Existing identity, authority, evidence, scope, Replay, Trust Memory and incident records remain canonical.
create extension if not exists pgcrypto;

create table public.trust_contracts (
  contract_id uuid not null,
  enterprise_id uuid not null references public.trust_workspaces(id) on delete restrict,
  subject_type text not null check(subject_type in ('human','ai_agent','machine_identity','device','organization','workflow','application','API','model','document','infrastructure_resource','provider','external_system')),
  subject_id text not null,
  workflow_id text not null,
  authorized_objective text not null,
  contract jsonb not null check(jsonb_typeof(contract)='object'),
  policy_version text not null,
  revocation_state text not null check(revocation_state in ('active','revoked')),
  issued_at timestamptz not null,
  expires_at timestamptz not null,
  supersedes_contract_id uuid,
  record_hash text not null check(record_hash ~ '^[a-f0-9]{64}$'),
  correlation_id uuid not null,
  actor_id uuid not null,
  created_at timestamptz not null default now(),
  primary key(enterprise_id,contract_id),
  foreign key(enterprise_id,supersedes_contract_id) references public.trust_contracts(enterprise_id,contract_id) on delete restrict,
  check(expires_at>issued_at), check(supersedes_contract_id is null or supersedes_contract_id<>contract_id)
);
create index trust_contract_subject_idx on public.trust_contracts(enterprise_id,subject_type,subject_id,issued_at desc);
create index trust_contract_state_idx on public.trust_contracts(enterprise_id,revocation_state,expires_at);

create table public.trust_contract_evaluations (
  evaluation_id uuid not null,
  enterprise_id uuid not null references public.trust_workspaces(id) on delete restrict,
  contract_id uuid not null,
  outcome text not null check(outcome in ('satisfied','satisfied_with_degraded_evidence','review_required','paused','breached','revoked')),
  trust_state text not null check(trust_state in ('verified','degraded','contested','suspended','revoked')),
  reason_codes text[] not null default '{}',
  evidence_references jsonb not null default '[]' check(jsonb_typeof(evidence_references)='array'),
  evaluated_at timestamptz not null,
  correlation_id uuid not null,
  deterministic_digest text not null check(deterministic_digest ~ '^[a-f0-9]{64}$'),
  actor_id uuid not null,
  created_at timestamptz not null default now(),
  primary key(enterprise_id,evaluation_id),
  foreign key(enterprise_id,contract_id) references public.trust_contracts(enterprise_id,contract_id) on delete restrict
);
create index trust_contract_evaluation_idx on public.trust_contract_evaluations(enterprise_id,contract_id,evaluated_at desc);
create index trust_contract_outcome_idx on public.trust_contract_evaluations(enterprise_id,outcome,evaluated_at desc);

create table public.trust_fabric_decisions (
  decision_id uuid not null,
  enterprise_id uuid not null references public.trust_workspaces(id) on delete restrict,
  subject_type text not null,
  subject_id text not null,
  workflow_id text,
  decision_type text not null check(decision_type in ('identity','authority','environment','scope','provider','continuous_trust','incident','reviewer','regulatory_screening','legal_reference')),
  outcome text not null,
  trust_state text not null check(trust_state in ('verified','degraded','contested','suspended','revoked')),
  policy_id text not null,
  policy_version text not null,
  envelope jsonb not null check(jsonb_typeof(envelope)='object'),
  superseded_decision_id uuid,
  correlation_id uuid not null,
  deterministic_digest text not null check(deterministic_digest ~ '^[a-f0-9]{64}$'),
  created_at timestamptz not null,
  actor_id uuid not null,
  primary key(enterprise_id,decision_id),
  foreign key(enterprise_id,superseded_decision_id) references public.trust_fabric_decisions(enterprise_id,decision_id) on delete restrict,
  check(superseded_decision_id is null or superseded_decision_id<>decision_id)
);
create index trust_fabric_decision_subject_idx on public.trust_fabric_decisions(enterprise_id,subject_type,subject_id,created_at desc);
create index trust_fabric_decision_state_idx on public.trust_fabric_decisions(enterprise_id,trust_state,created_at desc);

-- Provider-neutral current-object projection. No duplicate trust-object event store is introduced.
create or replace view public.enterprise_trust_objects with (security_invoker=true) as
select s.enterprise_id,s.subject_type,s.subject_id,coalesce(s.display_label,s.subject_id) as display_label,
  case coalesce(st.state,'UNKNOWN') when 'VERIFIED' then 'verified' when 'TRUSTED' then 'verified'
    when 'CHALLENGED' then 'contested' when 'BLOCKED' then 'suspended' when 'REVOKED' then 'revoked' else 'degraded' end as current_trust_state,
  case when exists(select 1 from public.evidence_objects e where e.enterprise_id=s.enterprise_id and e.subject_id=s.subject_id) then 'partial' else 'unknown' end as evidence_completeness,
  st.updated_at as last_evaluated_at,st.current_state_decision_id,
  (select n.node_id from public.evidence_graph_nodes n where n.enterprise_id=s.enterprise_id and n.node_type='SUBJECT' and n.external_id=s.subject_id order by n.created_at desc limit 1) as evidence_graph_node_id
from public.trust_subjects s
left join public.subject_trust_state st on st.enterprise_id=s.enterprise_id and st.subject_id=s.subject_id;

alter table public.trust_contracts enable row level security;
alter table public.trust_contract_evaluations enable row level security;
alter table public.trust_fabric_decisions enable row level security;
revoke all on public.trust_contracts,public.trust_contract_evaluations,public.trust_fabric_decisions from anon,authenticated;
revoke all on public.enterprise_trust_objects from anon,authenticated;
grant select on public.trust_contracts,public.trust_contract_evaluations,public.trust_fabric_decisions,public.enterprise_trust_objects to authenticated;
grant all privileges on public.trust_contracts,public.trust_contract_evaluations,public.trust_fabric_decisions to service_role;
grant select on public.enterprise_trust_objects to service_role;
create policy "tenant reads trust contracts" on public.trust_contracts for select to authenticated using(public.user_can_access_trust_workspace(enterprise_id));
create policy "tenant reads trust contract evaluations" on public.trust_contract_evaluations for select to authenticated using(public.user_can_access_trust_workspace(enterprise_id));
create policy "tenant reads trust fabric decisions" on public.trust_fabric_decisions for select to authenticated using(public.user_can_access_trust_workspace(enterprise_id));

create trigger trust_contracts_append_only before update or delete on public.trust_contracts for each row execute function public.prevent_trust_architecture_history_mutation();
create trigger trust_contract_evaluations_append_only before update or delete on public.trust_contract_evaluations for each row execute function public.prevent_trust_architecture_history_mutation();
create trigger trust_fabric_decisions_append_only before update or delete on public.trust_fabric_decisions for each row execute function public.prevent_trust_architecture_history_mutation();

create or replace function public.persist_trust_contract_v1(p_enterprise_id uuid,p_actor_id uuid,p_contract jsonb,p_record_hash text,p_correlation_id uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare existing_hash text; identifier uuid:=(p_contract->>'contractId')::uuid;
begin
  if auth.role()<>'service_role' then raise exception 'Trust Fabric service path required'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_enterprise_id::text||':'||identifier::text,71));
  select record_hash into existing_hash from public.trust_contracts where enterprise_id=p_enterprise_id and contract_id=identifier;
  if found then
    if existing_hash<>p_record_hash then raise exception 'Trust Contract idempotency conflict'; end if;
    return jsonb_build_object('status','DUPLICATE','contractId',identifier);
  end if;
  insert into public.trust_contracts(contract_id,enterprise_id,subject_type,subject_id,workflow_id,authorized_objective,contract,policy_version,revocation_state,issued_at,expires_at,supersedes_contract_id,record_hash,correlation_id,actor_id)
  values(identifier,p_enterprise_id,p_contract#>>'{subject,type}',p_contract#>>'{subject,id}',p_contract#>>'{workflow,id}',p_contract->>'authorizedObjective',p_contract,p_contract->>'policyVersion',p_contract->>'revocationState',(p_contract->>'issuedAt')::timestamptz,(p_contract->>'expiresAt')::timestamptz,nullif(p_contract->>'supersedesContractId','')::uuid,p_record_hash,p_correlation_id,p_actor_id);
  insert into public.trust_architecture_audit_log(enterprise_id,action,actor_reference,target_type,target_id,correlation_id,metadata)
  values(p_enterprise_id,'TRUST_CONTRACT_CREATED','user:'||p_actor_id::text,'TRUST_CONTRACT',identifier::text,p_correlation_id,jsonb_build_object('recordHash',p_record_hash));
  return jsonb_build_object('status','CREATED','contractId',identifier);
end $$;
revoke all on function public.persist_trust_contract_v1(uuid,uuid,jsonb,text,uuid) from public,anon,authenticated;
grant execute on function public.persist_trust_contract_v1(uuid,uuid,jsonb,text,uuid) to service_role;

create or replace function public.persist_trust_contract_evaluation_v1(p_enterprise_id uuid,p_actor_id uuid,p_evaluation jsonb)
returns jsonb language plpgsql security definer set search_path=public as $$
declare existing_digest text; identifier uuid:=(p_evaluation->>'evaluationId')::uuid;
begin
  if auth.role()<>'service_role' then raise exception 'Trust Fabric service path required'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_enterprise_id::text||':'||identifier::text,73));
  select deterministic_digest into existing_digest from public.trust_contract_evaluations where enterprise_id=p_enterprise_id and evaluation_id=identifier;
  if found then
    if existing_digest<>p_evaluation->>'deterministicDigest' then raise exception 'Trust Contract evaluation idempotency conflict'; end if;
    return jsonb_build_object('status','DUPLICATE','evaluationId',identifier);
  end if;
  insert into public.trust_contract_evaluations(evaluation_id,enterprise_id,contract_id,outcome,trust_state,reason_codes,evidence_references,evaluated_at,correlation_id,deterministic_digest,actor_id)
  values(identifier,p_enterprise_id,(p_evaluation->>'contractId')::uuid,p_evaluation->>'outcome',p_evaluation->>'trustState',array(select jsonb_array_elements_text(p_evaluation->'reasonCodes')),p_evaluation->'evidenceReferences',(p_evaluation->>'evaluatedAt')::timestamptz,(p_evaluation->>'correlationId')::uuid,p_evaluation->>'deterministicDigest',p_actor_id);
  insert into public.trust_architecture_audit_log(enterprise_id,action,actor_reference,target_type,target_id,correlation_id,metadata)
  values(p_enterprise_id,'TRUST_CONTRACT_EVALUATED','user:'||p_actor_id::text,'TRUST_CONTRACT_EVALUATION',identifier::text,(p_evaluation->>'correlationId')::uuid,jsonb_build_object('outcome',p_evaluation->>'outcome','digest',p_evaluation->>'deterministicDigest'));
  return jsonb_build_object('status','CREATED','evaluationId',identifier);
end $$;
revoke all on function public.persist_trust_contract_evaluation_v1(uuid,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.persist_trust_contract_evaluation_v1(uuid,uuid,jsonb) to service_role;

-- Durable decisions for forward-only policy reconciliation. Historical migrations remain immutable.
create table public.migration_policy_decisions (
  decision_id uuid primary key default gen_random_uuid(),
  migration_version text not null,
  schema_name text not null,
  table_name text not null,
  policy_name text not null,
  decision text not null check(decision in ('CREATED','UNCHANGED','REPLACED','CONFLICT')),
  requested_definition jsonb not null,
  previous_definition jsonb,
  replacement_reason text,
  decided_at timestamptz not null default now(),
  decided_by text not null default current_user
);
alter table public.migration_policy_decisions enable row level security;
revoke all on public.migration_policy_decisions from public,anon,authenticated;
grant select,insert on public.migration_policy_decisions to service_role;
create trigger migration_policy_decisions_append_only before update or delete on public.migration_policy_decisions for each row execute function public.prevent_trust_architecture_history_mutation();

-- Canonical policy guard for forward migrations. Replacement is possible only with explicit versioned intent.
create or replace function public.ensure_policy_definition_v2(p_schema text,p_table text,p_name text,p_command text,p_roles name[],p_using text,p_check text default null,p_mode text default 'strict',p_migration_version text default null,p_replacement_reason text default null,p_raise_on_conflict boolean default true)
returns text language plpgsql security definer set search_path=pg_catalog,public as $$
declare existing record; normalized_using text:=regexp_replace(coalesce(p_using,''),'\s+','','g'); normalized_check text:=regexp_replace(coalesce(p_check,''),'\s+','','g'); role_sql text; requested jsonb; previous jsonb; definitions_match boolean;
begin
  if auth.role()<>'service_role' then raise exception 'Migration policy guard requires service role'; end if;
  if p_schema<>'public' or p_command not in ('SELECT','INSERT','UPDATE','DELETE','ALL') or p_mode not in ('strict','intentional_replace') then raise exception 'Policy guard input invalid'; end if;
  if p_migration_version is null or btrim(p_migration_version)='' then raise exception 'Migration version is required for policy reconciliation'; end if;
  if p_mode='intentional_replace' and (p_replacement_reason is null or btrim(p_replacement_reason)='') then raise exception 'Intentional policy replacement requires a reason'; end if;
  requested:=jsonb_build_object('command',p_command,'roles',p_roles,'using',p_using,'withCheck',p_check);
  select * into existing from pg_policies where schemaname=p_schema and tablename=p_table and policyname=p_name;
  if found then
    previous:=jsonb_build_object('command',existing.cmd,'roles',existing.roles,'using',existing.qual,'withCheck',existing.with_check);
    definitions_match:=existing.cmd=p_command and existing.roles::text=p_roles::text and regexp_replace(coalesce(existing.qual,''),'\s+','','g')=normalized_using and regexp_replace(coalesce(existing.with_check,''),'\s+','','g')=normalized_check;
    if definitions_match then
      insert into public.migration_policy_decisions(migration_version,schema_name,table_name,policy_name,decision,requested_definition,previous_definition)
      values(p_migration_version,p_schema,p_table,p_name,'UNCHANGED',requested,previous);
      return 'UNCHANGED';
    end if;
    if p_mode='intentional_replace' then
      execute format('drop policy %I on %I.%I',p_name,p_schema,p_table);
    else
      if not p_raise_on_conflict then
        insert into public.migration_policy_decisions(migration_version,schema_name,table_name,policy_name,decision,requested_definition,previous_definition)
        values(p_migration_version,p_schema,p_table,p_name,'CONFLICT',requested,previous);
        return 'CONFLICT';
      end if;
      raise exception 'Conflicting policy definition: %.%.%',p_schema,p_table,p_name;
    end if;
  end if;
  select string_agg(quote_ident(role_name::text),',') into role_sql from unnest(p_roles) role_name;
  execute format('create policy %I on %I.%I for %s to %s%s%s',p_name,p_schema,p_table,p_command,role_sql,
    case when p_using is null then '' else format(' using (%s)',p_using) end,
    case when p_check is null then '' else format(' with check (%s)',p_check) end);
  insert into public.migration_policy_decisions(migration_version,schema_name,table_name,policy_name,decision,requested_definition,previous_definition,replacement_reason)
  values(p_migration_version,p_schema,p_table,p_name,case when previous is null then 'CREATED' else 'REPLACED' end,requested,previous,p_replacement_reason);
  return case when previous is null then 'CREATED' else 'REPLACED' end;
end $$;
revoke all on function public.ensure_policy_definition_v2(text,text,text,text,name[],text,text,text,text,text,boolean) from public,anon,authenticated;
grant execute on function public.ensure_policy_definition_v2(text,text,text,text,name[],text,text,text,text,text,boolean) to service_role;

-- Compatibility wrapper retains the original fail-closed contract for existing forward callers.
create or replace function public.ensure_policy_definition_v1(p_schema text,p_table text,p_name text,p_command text,p_roles name[],p_using text,p_check text default null)
returns text language plpgsql security definer set search_path=pg_catalog,public as $$
begin
  return public.ensure_policy_definition_v2(p_schema,p_table,p_name,p_command,p_roles,p_using,p_check,'strict','202608010002-enterprise-trust-fabric',null,true);
end $$;
revoke all on function public.ensure_policy_definition_v1(text,text,text,text,name[],text,text) from public,anon,authenticated;
grant execute on function public.ensure_policy_definition_v1(text,text,text,text,name[],text,text) to service_role;

comment on view public.enterprise_trust_objects is 'Security-invoker current-state projection; canonical payloads remain in their owning systems.';
comment on function public.ensure_policy_definition_v1(text,text,text,text,name[],text,text) is 'Forward migration helper: idempotent only for identical policy definitions and fail-closed on drift.';
comment on function public.ensure_policy_definition_v2(text,text,text,text,name[],text,text,text,text,text,boolean) is 'Forward-only policy reconciliation: create, repeat unchanged, explicitly replace, or fail/record conflict with a durable migration decision.';
