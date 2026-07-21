-- EPIC 18: Enterprise Trust Architecture. Forward-only, additive consolidation.
create extension if not exists pgcrypto;

create table public.trust_domain_versions (
  id uuid primary key default gen_random_uuid(), domain_key text not null, version text not null,
  display_name text not null, description text not null, active boolean not null default false,
  effective_at timestamptz not null, supersedes_id uuid references public.trust_domain_versions(id) on delete restrict,
  change_event_id uuid references public.trust_events(id) on delete restrict, created_at timestamptz not null default now(),
  unique(domain_key,version), check(domain_key in ('IDENTITY','AI_AGENT','DEVICE','AUTHORITY','WORKFLOW','RUNTIME','NETWORK','DATA','CONSENT','GOVERNANCE'))
);

insert into public.trust_domain_versions(domain_key,version,display_name,description,active,effective_at) values
('IDENTITY','1.0.0','Identity','Human and organization identity evidence.',true,'2026-07-21T00:00:00Z'),
('AI_AGENT','1.0.0','AI agent','Machine identity, delegation and authorization.',true,'2026-07-21T00:00:00Z'),
('DEVICE','1.0.0','Device','Device integrity and attestation.',true,'2026-07-21T00:00:00Z'),
('AUTHORITY','1.0.0','Authority','Authority grants and lineage.',true,'2026-07-21T00:00:00Z'),
('WORKFLOW','1.0.0','Workflow','Workflow participation and control integrity.',true,'2026-07-21T00:00:00Z'),
('RUNTIME','1.0.0','Runtime','Continuous execution and session observations.',true,'2026-07-21T00:00:00Z'),
('NETWORK','1.0.0','Network','Network posture and transport observations.',true,'2026-07-21T00:00:00Z'),
('DATA','1.0.0','Data','Data provenance, handling and integrity.',true,'2026-07-21T00:00:00Z'),
('CONSENT','1.0.0','Consent','Consent choices, receipts and policy state.',true,'2026-07-21T00:00:00Z'),
('GOVERNANCE','1.0.0','Governance','Policies, reviews, exceptions and audit state.',true,'2026-07-21T00:00:00Z');

create table public.trust_subjects (
  subject_record_id uuid primary key default gen_random_uuid(), enterprise_id uuid not null references public.trust_workspaces(id) on delete cascade,
  domain_key text not null, subject_id text not null, subject_type text not null, display_label text,
  created_at timestamptz not null default now(), retired_at timestamptz, unique(enterprise_id,domain_key,subject_id),
  check(domain_key in ('IDENTITY','AI_AGENT','DEVICE','AUTHORITY','WORKFLOW','RUNTIME','NETWORK','DATA','CONSENT','GOVERNANCE'))
);

-- Consolidate the EPIC 17.1D evidence store rather than creating a second ledger.
insert into public.provider_capability_versions(enterprise_id,provider_key,capability_version,capability_json,effective_at) values
(null,'hopae_connect','consensus-capability-v2','{"state":"ENVIRONMENT_AWARE","baseWeight":0.9,"cryptographicVerificationRequired":true,"serverVerificationRequired":true,"positiveEvidence":"ONLY_WHEN_ACTIVE_SIGNED_SERVER_VERIFIED_AND_PERSISTED"}','2026-07-21T00:00:00Z');

alter table public.evidence_objects
  add column evidence_id uuid,
  add column domain_key text,
  add column subject_id text,
  add column subject_type text,
  add column evidence_type text,
  add column source_type text,
  add column source_key text,
  add column result text,
  add column assurance_level text,
  add column cryptographically_verified boolean,
  add column server_verified boolean,
  add column received_at timestamptz,
  add column expires_at timestamptz,
  add column payload_hash text,
  add column canonicalization text,
  add column hash_algorithm text,
  add column reason_codes text[];
update public.evidence_objects set
  evidence_id=coalesce(evidence_id,id), domain_key=coalesce(domain_key,'IDENTITY'),
  subject_id=coalesce(subject_id,'legacy-evidence:'||id::text), subject_type=coalesce(subject_type,'UNKNOWN'),
  evidence_type=coalesce(evidence_type,evidence_classification), source_type=coalesce(source_type,'CANONICAL_TRUST_EVENT'),
  source_key=coalesce(source_key,provider_key), result=coalesce(result,'INCONCLUSIVE'), assurance_level=coalesce(assurance_level,'NONE'),
  cryptographically_verified=coalesce(cryptographically_verified,false), server_verified=coalesce(server_verified,false),
  received_at=coalesce(received_at,created_at), expires_at=coalesce(expires_at,retention_expires_at),
  payload_hash=coalesce(payload_hash,encode(digest(normalized_facts::text,'sha256'),'hex')),
  canonicalization=coalesce(canonicalization,'JCS'), hash_algorithm=coalesce(hash_algorithm,'SHA-256'), reason_codes=coalesce(reason_codes,'{}');
alter table public.evidence_objects
  alter column evidence_id set not null, alter column domain_key set not null, alter column subject_id set not null,
  alter column subject_type set not null, alter column evidence_type set not null, alter column source_type set not null,
  alter column source_key set not null, alter column result set not null, alter column assurance_level set not null,
  alter column cryptographically_verified set not null, alter column server_verified set not null, alter column received_at set not null,
  alter column payload_hash set not null, alter column canonicalization set not null, alter column hash_algorithm set not null,
  alter column reason_codes set not null;
create unique index evidence_objects_evidence_id_unique on public.evidence_objects(evidence_id);
alter table public.evidence_objects add constraint evidence_objects_epic18_integrity check(
  domain_key in ('IDENTITY','AI_AGENT','DEVICE','AUTHORITY','WORKFLOW','RUNTIME','NETWORK','DATA','CONSENT','GOVERNANCE') and
  result in ('POSITIVE','NEGATIVE','INCONCLUSIVE','UNAVAILABLE','REVOKED') and assurance_level in ('NONE','LOW','MEDIUM','HIGH','VERY_HIGH') and
  payload_hash ~ '^[a-f0-9]{64}$' and canonicalization='JCS' and hash_algorithm='SHA-256'
) not valid;

-- Compatibility guard for any legacy server writer not yet sending the EPIC 18 columns.
-- Such rows are deliberately non-positive until explicitly reclassified by new evidence.
create or replace function public.normalize_legacy_evidence_object_v1() returns trigger language plpgsql security definer set search_path=public as $$
begin
  new.evidence_id:=coalesce(new.evidence_id,new.id);
  new.domain_key:=coalesce(new.domain_key,'IDENTITY');
  new.subject_id:=coalesce(new.subject_id,'legacy-evidence:'||new.id::text);
  new.subject_type:=coalesce(new.subject_type,'UNKNOWN');
  new.evidence_type:=coalesce(new.evidence_type,new.evidence_classification);
  new.source_type:=coalesce(new.source_type,'LEGACY_NORMALIZED_LEDGER');
  new.source_key:=coalesce(new.source_key,new.provider_key);
  new.result:=coalesce(new.result,'INCONCLUSIVE');
  new.assurance_level:=coalesce(new.assurance_level,'NONE');
  new.cryptographically_verified:=coalesce(new.cryptographically_verified,false);
  new.server_verified:=coalesce(new.server_verified,false);
  new.received_at:=coalesce(new.received_at,now());
  new.expires_at:=coalesce(new.expires_at,new.retention_expires_at);
  new.payload_hash:=coalesce(new.payload_hash,encode(digest(new.normalized_facts::text,'sha256'),'hex'));
  new.canonicalization:=coalesce(new.canonicalization,'JCS');
  new.hash_algorithm:=coalesce(new.hash_algorithm,'SHA-256');
  new.reason_codes:=coalesce(new.reason_codes,array['LEGACY_EVIDENCE_FAIL_CLOSED']);
  return new;
end $$;
create trigger evidence_objects_epic18_normalize before insert on public.evidence_objects for each row execute function public.normalize_legacy_evidence_object_v1();

create table public.trust_references (
  reference_id uuid primary key default gen_random_uuid(), enterprise_id uuid not null references public.trust_workspaces(id) on delete cascade,
  source_type text not null, source_id text not null, ref_type text not null, ref_id text not null, ref_version text,
  created_at timestamptz not null default now(), unique(enterprise_id,source_type,source_id,ref_type,ref_id,ref_version)
);

create table public.trust_policy_versions (
  policy_version_id uuid primary key default gen_random_uuid(), enterprise_id uuid references public.trust_workspaces(id) on delete cascade,
  policy_id text not null, version text not null, layer text not null, domain_key text, workflow_id text, authority_id text,
  active boolean not null default false, valid_from timestamptz not null, valid_until timestamptz, rules jsonb not null,
  policy_hash text not null check(policy_hash ~ '^[a-f0-9]{64}$'), change_event_id uuid references public.trust_events(id) on delete restrict,
  created_by uuid, created_at timestamptz not null default now(), unique(enterprise_id,policy_id,version),
  check(layer in ('PLATFORM_DEFAULT','ENTERPRISE_OVERRIDE','DOMAIN_POLICY','WORKFLOW_POLICY','AUTHORITY_POLICY','RUNTIME_EXCEPTION')),
  check(valid_until is null or valid_until>valid_from)
);

create table public.trust_decision_contracts (
  decision_contract_id uuid primary key, enterprise_id uuid not null references public.trust_workspaces(id) on delete restrict,
  domain_key text not null, subject_id text not null, workflow_id text, authority_id text, policy_id text not null, policy_version text not null,
  evidence_snapshot_hash text not null check(evidence_snapshot_hash ~ '^[a-f0-9]{64}$'),
  decision_input_hash text not null check(decision_input_hash ~ '^[a-f0-9]{64}$'), canonicalization text not null check(canonicalization='JCS'),
  hash_algorithm text not null check(hash_algorithm='SHA-256'), requested_at timestamptz not null, created_at timestamptz not null default now()
);

create table public.trust_state_decisions (
  state_decision_id uuid primary key, decision_contract_id uuid not null references public.trust_decision_contracts(decision_contract_id) on delete restrict,
  enterprise_id uuid not null references public.trust_workspaces(id) on delete restrict, domain_key text not null, subject_id text not null,
  prior_state text not null, next_state text not null, recommendation_id uuid, policy_id text not null, policy_version text not null,
  evidence_snapshot_hash text not null check(evidence_snapshot_hash ~ '^[a-f0-9]{64}$'), decision_input_hash text not null check(decision_input_hash ~ '^[a-f0-9]{64}$'),
  decision_hash text not null check(decision_hash ~ '^[a-f0-9]{64}$'), decided_at timestamptz not null, reason_codes text[] not null,
  trust_event_id uuid references public.trust_events(id) on delete restrict, created_at timestamptz not null default now(),
  check(prior_state in ('UNKNOWN','OBSERVED','INCONCLUSIVE','TRUSTED','VERIFIED','CHALLENGED','BLOCKED','REVOKED','EXPIRED')),
  check(next_state in ('UNKNOWN','OBSERVED','INCONCLUSIVE','TRUSTED','VERIFIED','CHALLENGED','BLOCKED','REVOKED','EXPIRED'))
);

alter table public.subject_trust_state add column if not exists domain_key text not null default 'IDENTITY';
alter table public.subject_trust_state add column if not exists current_state_decision_id uuid references public.trust_state_decisions(state_decision_id) on delete restrict;
alter table public.subject_trust_state drop constraint if exists subject_trust_state_state_check;
alter table public.subject_trust_state add constraint subject_trust_state_state_epic18_check check(state in ('UNKNOWN','OBSERVED','INCONCLUSIVE','TRUSTED','VERIFIED','CHALLENGED','BLOCKED','REVOKED','EXPIRED'));
comment on table public.subject_trust_state is 'Materialized read model. Only apply_trust_state_decision_v1 may change current trust state.';

create table public.evidence_graph_nodes (
  node_id uuid not null default gen_random_uuid(), enterprise_id uuid not null references public.trust_workspaces(id) on delete cascade,
  node_type text not null, external_id text not null, domain_key text, label text, metadata jsonb not null default '{}', created_at timestamptz not null default now(),
  primary key(enterprise_id,node_id), unique(enterprise_id,node_type,external_id)
);
create table public.evidence_graph_edges (
  edge_id uuid primary key default gen_random_uuid(), enterprise_id uuid not null references public.trust_workspaces(id) on delete cascade,
  from_node_id uuid not null, to_node_id uuid not null, edge_type text not null, evidence_id uuid references public.evidence_objects(evidence_id) on delete restrict,
  created_at timestamptz not null default now(),
  foreign key(enterprise_id,from_node_id) references public.evidence_graph_nodes(enterprise_id,node_id) on delete restrict,
  foreign key(enterprise_id,to_node_id) references public.evidence_graph_nodes(enterprise_id,node_id) on delete restrict,
  unique(enterprise_id,from_node_id,to_node_id,edge_type,evidence_id), check(from_node_id<>to_node_id), check(edge_type in ('ASSERTS','DERIVED_FROM','OBSERVED_BY','AUTHORIZED_BY','PARTICIPATED_IN','APPLIES_TO','SUPERSEDES','REVOKES','CONFLICTS_WITH','SUPPORTED','CHALLENGED','RESULTED_IN'))
);
create index evidence_graph_edges_from_idx on public.evidence_graph_edges(enterprise_id,from_node_id,created_at);
create index evidence_graph_edges_to_idx on public.evidence_graph_edges(enterprise_id,to_node_id,created_at);

create table public.trust_memory_index (
  memory_id uuid primary key default gen_random_uuid(), enterprise_id uuid not null references public.trust_workspaces(id) on delete cascade,
  subject_id text not null, domain_key text not null, memory_type text not null, source_id text not null, occurred_at timestamptz not null,
  summary jsonb not null default '{}', created_at timestamptz not null default now(), unique(enterprise_id,memory_type,source_id)
);
create index trust_memory_subject_idx on public.trust_memory_index(enterprise_id,subject_id,occurred_at desc);

create table public.trust_simulations (
  simulation_id uuid primary key, enterprise_id uuid not null references public.trust_workspaces(id) on delete cascade,
  simulation_type text not null, subject_id text, decision_id uuid, input_hash text not null check(input_hash ~ '^[a-f0-9]{64}$'),
  requested_by uuid not null, requested_at timestamptz not null, status text not null check(status in ('QUEUED','RUNNING','COMPLETED','FAILED')), created_at timestamptz not null default now()
);
create table public.trust_simulation_results (
  result_id uuid primary key default gen_random_uuid(), simulation_id uuid not null references public.trust_simulations(simulation_id) on delete cascade,
  enterprise_id uuid not null references public.trust_workspaces(id) on delete cascade, result_hash text not null check(result_hash ~ '^[a-f0-9]{64}$'),
  result jsonb not null, completed_at timestamptz not null, unique(simulation_id)
);
create table public.trust_kpi_snapshots (
  snapshot_id uuid primary key default gen_random_uuid(), enterprise_id uuid not null references public.trust_workspaces(id) on delete cascade,
  metric_key text not null, metric_value numeric, metric_status text not null check(metric_status in ('MEASURED','INSUFFICIENT_DATA')),
  numerator numeric, denominator numeric, evidence_hash text not null check(evidence_hash ~ '^[a-f0-9]{64}$'), measured_at timestamptz not null,
  created_at timestamptz not null default now(), unique(enterprise_id,metric_key,measured_at)
);
create table public.trust_architecture_audit_log (
  audit_id uuid primary key default gen_random_uuid(), enterprise_id uuid not null references public.trust_workspaces(id) on delete cascade,
  action text not null, actor_reference text not null, target_type text not null, target_id text not null, correlation_id uuid not null,
  metadata jsonb not null default '{}', created_at timestamptz not null default now()
);

-- Consent receipts and provider observations become first-class evidence references without rewriting history.
alter table public.consent_receipts add column if not exists evidence_object_id uuid references public.evidence_objects(evidence_id) on delete restrict;
alter table public.provider_observations add column if not exists evidence_object_id uuid references public.evidence_objects(evidence_id) on delete restrict;

create or replace function public.materialize_consent_receipt_evidence_v1() returns trigger language plpgsql security definer set search_path=public as $$
begin
  insert into public.evidence_objects(id,evidence_id,enterprise_id,provider_key,evidence_classification,storage_boundary,normalized_facts,occurred_at,retention_expires_at,
    domain_key,subject_id,subject_type,evidence_type,source_type,source_key,result,assurance_level,cryptographically_verified,server_verified,received_at,expires_at,payload_hash,canonicalization,hash_algorithm,reason_codes)
  values(gen_random_uuid(),new.receipt_id,new.enterprise_id,'cyber_sentinels_consent','CONSENT_RECEIPT','NORMALIZED_LEDGER',jsonb_build_object('policyVersion',new.policy_version,'consentAction',new.consent_action,'categories',new.categories),new.occurred_at,new.expires_at,
    'CONSENT',new.subject_key,'HUMAN','CONSENT_RECEIPT','CONSENT_MANAGER','cyber_sentinels_consent',case when new.consent_action='WITHDRAW' then 'REVOKED' else 'INCONCLUSIVE' end,'MEDIUM',false,true,new.received_at,new.expires_at,new.receipt_hash,'JCS','SHA-256',array['CONSENT_RECEIPT_INTEGRITY_RECORDED']);
  new.evidence_object_id:=new.receipt_id; return new;
end $$;
create trigger consent_receipts_evidence_v1 before insert on public.consent_receipts for each row execute function public.materialize_consent_receipt_evidence_v1();

create or replace function public.materialize_provider_observation_evidence_v1() returns trigger language plpgsql security definer set search_path=public as $$
declare mapped_result text; mapped_assurance text;
begin
  mapped_result:=case when new.result='PASS' and new.provider_key<>'world_id' and new.server_verified then 'POSITIVE' when new.result in ('FAIL','BLOCKED') then 'NEGATIVE' when new.result='REVOKED' then 'REVOKED' when new.result='UNAVAILABLE' then 'UNAVAILABLE' else 'INCONCLUSIVE' end;
  mapped_assurance:=case when new.assurance>=0.9 then 'VERY_HIGH' when new.assurance>=0.7 then 'HIGH' when new.assurance>=0.4 then 'MEDIUM' when new.assurance>0 then 'LOW' else 'NONE' end;
  insert into public.evidence_objects(id,evidence_id,enterprise_id,provider_key,evidence_classification,storage_boundary,normalized_facts,occurred_at,retention_expires_at,
    domain_key,subject_id,subject_type,evidence_type,source_type,source_key,result,assurance_level,cryptographically_verified,server_verified,received_at,expires_at,payload_hash,canonicalization,hash_algorithm,reason_codes)
  values(gen_random_uuid(),new.observation_id,new.enterprise_id,new.provider_key,'PROVIDER_OBSERVATION','NORMALIZED_LEDGER',jsonb_build_object('signalType',new.signal_type,'result',new.result,'quality',new.quality),new.occurred_at,new.expires_at,
    'IDENTITY',new.subject_id,'HUMAN',new.signal_type,'PROVIDER_OBSERVATION',new.provider_key,mapped_result,mapped_assurance,new.signature_verified,new.server_verified,new.received_at,new.expires_at,new.evidence_digest,'JCS','SHA-256',
    case when new.provider_key='world_id' then array['WORLD_ID_SERVER_VERIFICATION_NOT_IMPLEMENTED'] else new.reason_codes end);
  new.evidence_object_id:=new.observation_id; return new;
end $$;
create trigger provider_observations_evidence_v1 before insert on public.provider_observations for each row execute function public.materialize_provider_observation_evidence_v1();

-- Bounded, fail-closed historical backfill for the EPIC 17 receipt and observation ledgers.
insert into public.evidence_objects(id,evidence_id,enterprise_id,provider_key,evidence_classification,storage_boundary,normalized_facts,occurred_at,retention_expires_at,domain_key,subject_id,subject_type,evidence_type,source_type,source_key,result,assurance_level,cryptographically_verified,server_verified,received_at,expires_at,payload_hash,canonicalization,hash_algorithm,reason_codes)
select gen_random_uuid(),r.receipt_id,r.enterprise_id,'cyber_sentinels_consent','CONSENT_RECEIPT','NORMALIZED_LEDGER',jsonb_build_object('policyVersion',r.policy_version,'consentAction',r.consent_action,'categories',r.categories),r.occurred_at,r.expires_at,'CONSENT',r.subject_key,'HUMAN','CONSENT_RECEIPT','CONSENT_MANAGER','cyber_sentinels_consent',case when r.consent_action='WITHDRAW' then 'REVOKED' else 'INCONCLUSIVE' end,'MEDIUM',false,true,r.received_at,r.expires_at,r.receipt_hash,'JCS','SHA-256',array['CONSENT_RECEIPT_INTEGRITY_RECORDED'] from public.consent_receipts r where r.evidence_object_id is null on conflict(evidence_id) do nothing;
update public.consent_receipts r set evidence_object_id=r.receipt_id where r.evidence_object_id is null and exists(select 1 from public.evidence_objects e where e.enterprise_id=r.enterprise_id and e.evidence_id=r.receipt_id and e.source_type='CONSENT_MANAGER');

insert into public.evidence_objects(id,evidence_id,enterprise_id,provider_key,evidence_classification,storage_boundary,normalized_facts,occurred_at,retention_expires_at,domain_key,subject_id,subject_type,evidence_type,source_type,source_key,result,assurance_level,cryptographically_verified,server_verified,received_at,expires_at,payload_hash,canonicalization,hash_algorithm,reason_codes)
select gen_random_uuid(),o.observation_id,o.enterprise_id,o.provider_key,'PROVIDER_OBSERVATION','NORMALIZED_LEDGER',jsonb_build_object('signalType',o.signal_type,'result',o.result,'quality',o.quality),o.occurred_at,o.expires_at,'IDENTITY',o.subject_id,'HUMAN',o.signal_type,'PROVIDER_OBSERVATION',o.provider_key,case when o.result='PASS' and o.provider_key<>'world_id' and o.server_verified then 'POSITIVE' when o.result in ('FAIL','BLOCKED') then 'NEGATIVE' when o.result='REVOKED' then 'REVOKED' when o.result='UNAVAILABLE' then 'UNAVAILABLE' else 'INCONCLUSIVE' end,case when o.assurance>=0.9 then 'VERY_HIGH' when o.assurance>=0.7 then 'HIGH' when o.assurance>=0.4 then 'MEDIUM' when o.assurance>0 then 'LOW' else 'NONE' end,o.signature_verified,o.server_verified,o.received_at,o.expires_at,o.evidence_digest,'JCS','SHA-256',case when o.provider_key='world_id' then array['WORLD_ID_SERVER_VERIFICATION_NOT_IMPLEMENTED'] else o.reason_codes end from public.provider_observations o where o.evidence_object_id is null on conflict(evidence_id) do nothing;
update public.provider_observations o set evidence_object_id=o.observation_id where o.evidence_object_id is null and exists(select 1 from public.evidence_objects e where e.enterprise_id=o.enterprise_id and e.evidence_id=o.observation_id and e.source_type='PROVIDER_OBSERVATION');

insert into public.trust_references(enterprise_id,source_type,source_id,ref_type,ref_id)
select t.enterprise_id,'TRUST_EVENT',t.event_id::text,'EVIDENCE_REFERENCE',reference from public.trust_events t cross join lateral unnest(t.evidence_references) reference where t.enterprise_id is not null and t.event_id is not null on conflict do nothing;
insert into public.trust_references(enterprise_id,source_type,source_id,ref_type,ref_id,ref_version)
select r.enterprise_id,'CONSENT_RECEIPT',r.receipt_id::text,'EVIDENCE_OBJECT',r.evidence_object_id::text,r.policy_version from public.consent_receipts r where r.evidence_object_id is not null on conflict do nothing;
insert into public.trust_references(enterprise_id,source_type,source_id,ref_type,ref_id)
select o.enterprise_id,'PROVIDER_OBSERVATION',o.observation_id::text,'EVIDENCE_OBJECT',o.evidence_object_id::text from public.provider_observations o where o.evidence_object_id is not null on conflict do nothing;

create or replace function public.index_evidence_graph_v1() returns trigger language plpgsql security definer set search_path=public as $$
declare subject_node uuid; evidence_node uuid;
begin
  insert into public.trust_subjects(enterprise_id,domain_key,subject_id,subject_type) values(new.enterprise_id,new.domain_key,new.subject_id,new.subject_type) on conflict do nothing;
  insert into public.evidence_graph_nodes(enterprise_id,node_type,external_id,domain_key,label) values(new.enterprise_id,'SUBJECT',new.subject_id,new.domain_key,new.subject_type||' subject') on conflict do nothing;
  insert into public.evidence_graph_nodes(enterprise_id,node_type,external_id,domain_key,label) values(new.enterprise_id,'EVIDENCE',new.evidence_id::text,new.domain_key,new.evidence_type) on conflict do nothing;
  select node_id into subject_node from public.evidence_graph_nodes where enterprise_id=new.enterprise_id and node_type='SUBJECT' and external_id=new.subject_id;
  select node_id into evidence_node from public.evidence_graph_nodes where enterprise_id=new.enterprise_id and node_type='EVIDENCE' and external_id=new.evidence_id::text;
  insert into public.evidence_graph_edges(enterprise_id,from_node_id,to_node_id,edge_type,evidence_id) values(new.enterprise_id,subject_node,evidence_node,'ASSERTS',new.evidence_id) on conflict do nothing;
  return new;
end $$;
create trigger evidence_objects_graph_index_v1 after insert on public.evidence_objects for each row execute function public.index_evidence_graph_v1();

insert into public.trust_subjects(enterprise_id,domain_key,subject_id,subject_type)
select distinct enterprise_id,domain_key,subject_id,subject_type from public.evidence_objects on conflict do nothing;
insert into public.evidence_graph_nodes(enterprise_id,node_type,external_id,domain_key,label)
select distinct enterprise_id,'SUBJECT',subject_id,domain_key,subject_type||' subject' from public.evidence_objects on conflict do nothing;
insert into public.evidence_graph_nodes(enterprise_id,node_type,external_id,domain_key,label)
select enterprise_id,'EVIDENCE',evidence_id::text,domain_key,evidence_type from public.evidence_objects on conflict do nothing;
insert into public.evidence_graph_edges(enterprise_id,from_node_id,to_node_id,edge_type,evidence_id)
select e.enterprise_id,s.node_id,n.node_id,'ASSERTS',e.evidence_id from public.evidence_objects e join public.evidence_graph_nodes s on s.enterprise_id=e.enterprise_id and s.node_type='SUBJECT' and s.external_id=e.subject_id join public.evidence_graph_nodes n on n.enterprise_id=e.enterprise_id and n.node_type='EVIDENCE' and n.external_id=e.evidence_id::text on conflict do nothing;

do $$ declare table_name text; begin foreach table_name in array array[
  'trust_domain_versions','trust_subjects','trust_references','trust_policy_versions','trust_decision_contracts','trust_state_decisions',
  'evidence_graph_nodes','evidence_graph_edges','trust_memory_index','trust_simulations','trust_simulation_results','trust_kpi_snapshots','trust_architecture_audit_log'
] loop execute format('alter table public.%I enable row level security',table_name); execute format('revoke all on public.%I from anon,authenticated',table_name); execute format('grant all privileges on public.%I to service_role',table_name); end loop; end $$;

grant select on public.trust_domain_versions to authenticated;
grant select on public.trust_subjects,public.trust_references,public.trust_policy_versions,public.trust_decision_contracts,public.trust_state_decisions,public.evidence_graph_nodes,public.evidence_graph_edges,public.trust_memory_index,public.trust_simulations,public.trust_simulation_results,public.trust_kpi_snapshots to authenticated;
create policy "authenticated reads active domain registry" on public.trust_domain_versions for select to authenticated using(active);
create policy "tenant reads trust subjects" on public.trust_subjects for select to authenticated using(public.user_can_access_trust_workspace(enterprise_id));
create policy "tenant reads trust references" on public.trust_references for select to authenticated using(public.user_can_access_trust_workspace(enterprise_id));
create policy "tenant reads trust policies" on public.trust_policy_versions for select to authenticated using(enterprise_id is null or public.user_can_access_trust_workspace(enterprise_id));
create policy "tenant reads decision contracts" on public.trust_decision_contracts for select to authenticated using(public.user_can_access_trust_workspace(enterprise_id));
create policy "tenant reads state decisions" on public.trust_state_decisions for select to authenticated using(public.user_can_access_trust_workspace(enterprise_id));
create policy "tenant reads graph nodes" on public.evidence_graph_nodes for select to authenticated using(public.user_can_access_trust_workspace(enterprise_id));
create policy "tenant reads graph edges" on public.evidence_graph_edges for select to authenticated using(public.user_can_access_trust_workspace(enterprise_id));
create policy "tenant reads trust memory" on public.trust_memory_index for select to authenticated using(public.user_can_access_trust_workspace(enterprise_id));
create policy "tenant reads simulations" on public.trust_simulations for select to authenticated using(public.user_can_access_trust_workspace(enterprise_id));
create policy "tenant reads simulation results" on public.trust_simulation_results for select to authenticated using(public.user_can_access_trust_workspace(enterprise_id));
create policy "tenant reads kpi snapshots" on public.trust_kpi_snapshots for select to authenticated using(public.user_can_access_trust_workspace(enterprise_id));

create or replace function public.prevent_trust_architecture_history_mutation() returns trigger language plpgsql security definer set search_path=public as $$ begin raise exception 'Enterprise Trust Architecture history is append-only'; end $$;
do $$ declare table_name text; begin foreach table_name in array array['trust_domain_versions','trust_references','trust_policy_versions','trust_decision_contracts','trust_state_decisions','evidence_graph_nodes','evidence_graph_edges','trust_memory_index','trust_simulations','trust_simulation_results','trust_kpi_snapshots','trust_architecture_audit_log'] loop execute format('create trigger %I_epic18_append_only before update or delete on public.%I for each row execute function public.prevent_trust_architecture_history_mutation()',table_name,table_name); end loop; end $$;

-- Consensus persistence now records a recommendation and lineage only.
create or replace function public.persist_consensus_decision_v1(p_decision jsonb,p_trust_events jsonb,p_correlation_id uuid) returns jsonb language plpgsql security definer set search_path=public as $$
declare enterprise uuid:=(p_decision->>'enterpriseId')::uuid; decision uuid:=(p_decision->>'decisionId')::uuid; existing public.consensus_decisions%rowtype; item jsonb; trust_event jsonb; trust_status text;
begin
  if auth.role()<>'service_role' then raise exception 'Trusted consensus path required'; end if;
  perform pg_advisory_xact_lock(hashtextextended(enterprise::text||':'||(p_decision->>'subjectId')||':'||coalesce(p_decision->>'workflowId',''),37));
  select * into existing from public.consensus_decisions where enterprise_id=enterprise and subject_id=p_decision->>'subjectId' and idempotency_key=p_decision->>'idempotencyKey' and simulated=false for update;
  if found then return jsonb_build_object('status','DUPLICATE','decisionId',existing.decision_id,'decisionHash',existing.decision_hash,'recommendedState',existing.state,'confidence',existing.confidence); end if;
  insert into public.consensus_decisions(decision_id,enterprise_id,subject_id,workflow_id,policy_id,policy_version,evaluated_at,state,prior_state,confidence,reason_codes,evidence_snapshot_hash,idempotency_key,thresholds,prior_decision_id,decision_hash,decision_json,simulated)
  values(decision,enterprise,p_decision->>'subjectId',nullif(p_decision->>'workflowId',''),p_decision->>'policyId',p_decision->>'policyVersion',(p_decision->>'evaluatedAt')::timestamptz,p_decision->>'recommendedState',nullif(p_decision->>'priorState',''),(p_decision->>'confidence')::integer,array(select jsonb_array_elements_text(p_decision->'reasonCodes')),p_decision->>'evidenceSnapshotHash',p_decision->>'idempotencyKey',p_decision->'thresholds',nullif(p_decision->>'priorDecisionId','')::uuid,p_decision->>'decisionHash',p_decision,false);
  for item in select value from jsonb_array_elements(p_decision->'evidence') loop insert into public.consensus_decision_evidence(decision_id,enterprise_id,observation_id,provider_key,result,included,ignored_reason,effective_weight,freshness_multiplier,independence_multiplier,independence_group) values(decision,enterprise,(item->>'observationId')::uuid,item->>'providerKey',item->>'result',(item->>'included')::boolean,nullif(item->>'ignoredReason',''),(item->>'effectiveWeight')::numeric,(item->>'freshnessMultiplier')::numeric,(item->>'independenceMultiplier')::numeric,nullif(item->>'independenceGroup','')); end loop;
  for item in select value from jsonb_array_elements(p_decision->'conflicts') loop insert into public.consensus_conflicts(conflict_id,decision_id,enterprise_id,severity,conflict_type,observation_ids,reason_code,explanation) values(item->>'conflictId',decision,enterprise,item->>'severity',item->>'type',array(select value::text::uuid from jsonb_array_elements_text(item->'observationIds')),item->>'reasonCode',item->>'explanation'); end loop;
  for trust_event in select value from jsonb_array_elements(p_trust_events) loop trust_status:=public.append_trust_event_v1(trust_event,null,p_correlation_id); if trust_status<>'APPENDED' then raise exception 'Consensus Trust Event chain conflict'; end if; end loop;
  insert into public.consensus_audit_log(enterprise_id,decision_id,action,actor_reference,correlation_id,metadata) values(enterprise,decision,'CONSENSUS_RECOMMENDATION_CREATED','system:provider-consensus-engine',p_correlation_id,jsonb_build_object('recommendedState',p_decision->>'recommendedState','policyVersion',p_decision->>'policyVersion'));
  return jsonb_build_object('status','CREATED','decisionId',decision,'decisionHash',p_decision->>'decisionHash','recommendedState',p_decision->>'recommendedState','confidence',(p_decision->>'confidence')::integer);
end $$;

create or replace function public.apply_trust_state_decision_v1(p_contract jsonb,p_decision jsonb,p_trust_event jsonb,p_correlation_id uuid) returns jsonb language plpgsql security definer set search_path=public as $$
declare enterprise uuid:=(p_decision->>'enterpriseId')::uuid; decision uuid:=(p_decision->>'stateDecisionId')::uuid; recommendation uuid:=nullif(p_decision->>'recommendationId','')::uuid; trust_status text; current_state text; current_id uuid; subject_node uuid; decision_node uuid;
begin
  if auth.role()<>'service_role' then raise exception 'Trust State Engine service path required'; end if;
  perform pg_advisory_xact_lock(hashtextextended(enterprise::text||':'||(p_decision->>'domainKey')||':'||(p_decision->>'subjectId'),47));
  select state,current_state_decision_id into current_state,current_id from public.subject_trust_state where enterprise_id=enterprise and subject_id=p_decision->>'subjectId' for update;
  if coalesce(current_state,'UNKNOWN')<>(p_decision->>'priorState') then raise exception 'Trust state compare-and-set conflict'; end if;
  if current_state='REVOKED' and p_decision->>'nextState'<>'REVOKED' then raise exception 'Revocation cannot be reversed'; end if;
  if not (
    p_decision->>'priorState'=p_decision->>'nextState' or
    (p_decision->>'priorState'='UNKNOWN' and p_decision->>'nextState' in ('OBSERVED','INCONCLUSIVE','TRUSTED','VERIFIED','CHALLENGED','BLOCKED','REVOKED','EXPIRED')) or
    (p_decision->>'priorState'='OBSERVED' and p_decision->>'nextState' in ('INCONCLUSIVE','TRUSTED','VERIFIED','CHALLENGED','BLOCKED','REVOKED','EXPIRED')) or
    (p_decision->>'priorState'='INCONCLUSIVE' and p_decision->>'nextState' in ('OBSERVED','TRUSTED','VERIFIED','CHALLENGED','BLOCKED','REVOKED','EXPIRED')) or
    (p_decision->>'priorState'='TRUSTED' and p_decision->>'nextState' in ('INCONCLUSIVE','VERIFIED','CHALLENGED','BLOCKED','REVOKED','EXPIRED')) or
    (p_decision->>'priorState'='VERIFIED' and p_decision->>'nextState' in ('INCONCLUSIVE','TRUSTED','CHALLENGED','BLOCKED','REVOKED','EXPIRED')) or
    (p_decision->>'priorState'='CHALLENGED' and p_decision->>'nextState' in ('OBSERVED','INCONCLUSIVE','TRUSTED','VERIFIED','BLOCKED','REVOKED','EXPIRED')) or
    (p_decision->>'priorState'='BLOCKED' and p_decision->>'nextState'='REVOKED') or
    (p_decision->>'priorState'='EXPIRED' and p_decision->>'nextState' in ('OBSERVED','INCONCLUSIVE','TRUSTED','VERIFIED','CHALLENGED','BLOCKED','REVOKED'))
  ) then raise exception 'Invalid Trust State transition'; end if;
  insert into public.trust_decision_contracts(decision_contract_id,enterprise_id,domain_key,subject_id,workflow_id,authority_id,policy_id,policy_version,evidence_snapshot_hash,decision_input_hash,canonicalization,hash_algorithm,requested_at)
  values((p_contract->>'decisionContractId')::uuid,enterprise,p_contract->>'domainKey',p_contract->>'subjectId',nullif(p_contract->>'workflowId',''),nullif(p_contract->>'authorityId',''),p_contract->>'policyId',p_contract->>'policyVersion',p_contract->>'evidenceSnapshotHash',p_contract->>'decisionInputHash','JCS','SHA-256',(p_contract->>'requestedAt')::timestamptz) on conflict do nothing;
  insert into public.trust_state_decisions(state_decision_id,decision_contract_id,enterprise_id,domain_key,subject_id,prior_state,next_state,recommendation_id,policy_id,policy_version,evidence_snapshot_hash,decision_input_hash,decision_hash,decided_at,reason_codes)
  values(decision,(p_decision->>'decisionContractId')::uuid,enterprise,p_decision->>'domainKey',p_decision->>'subjectId',p_decision->>'priorState',p_decision->>'nextState',recommendation,p_decision->>'policyId',p_decision->>'policyVersion',p_decision->>'evidenceSnapshotHash',p_decision->>'decisionInputHash',p_decision->>'decisionHash',(p_decision->>'decidedAt')::timestamptz,array(select jsonb_array_elements_text(p_decision->'reasonCodes')));
  insert into public.subject_trust_state(enterprise_id,subject_id,workflow_id,state,confidence,current_decision_id,domain_key,current_state_decision_id)
  values(enterprise,p_decision->>'subjectId',nullif(p_contract->>'workflowId',''),p_decision->>'nextState',coalesce((p_decision->>'confidence')::integer,0),recommendation,p_decision->>'domainKey',decision)
  on conflict(enterprise_id,subject_id) do update set workflow_id=excluded.workflow_id,state=excluded.state,confidence=excluded.confidence,current_decision_id=excluded.current_decision_id,domain_key=excluded.domain_key,current_state_decision_id=excluded.current_state_decision_id,updated_at=now();
  insert into public.trust_memory_index(enterprise_id,subject_id,domain_key,memory_type,source_id,occurred_at,summary) values(enterprise,p_decision->>'subjectId',p_decision->>'domainKey','TRUST_STATE_DECISION',decision::text,(p_decision->>'decidedAt')::timestamptz,jsonb_build_object('priorState',p_decision->>'priorState','nextState',p_decision->>'nextState','policyId',p_decision->>'policyId','policyVersion',p_decision->>'policyVersion'));
  insert into public.trust_subjects(enterprise_id,domain_key,subject_id,subject_type) values(enterprise,p_decision->>'domainKey',p_decision->>'subjectId','UNKNOWN') on conflict do nothing;
  insert into public.evidence_graph_nodes(enterprise_id,node_type,external_id,domain_key,label) values(enterprise,'SUBJECT',p_decision->>'subjectId',p_decision->>'domainKey','Trust subject') on conflict do nothing;
  insert into public.evidence_graph_nodes(enterprise_id,node_type,external_id,domain_key,label) values(enterprise,'STATE_DECISION',decision::text,p_decision->>'domainKey',p_decision->>'nextState') on conflict do nothing;
  select node_id into subject_node from public.evidence_graph_nodes where enterprise_id=enterprise and node_type='SUBJECT' and external_id=p_decision->>'subjectId';
  select node_id into decision_node from public.evidence_graph_nodes where enterprise_id=enterprise and node_type='STATE_DECISION' and external_id=decision::text;
  insert into public.evidence_graph_edges(enterprise_id,from_node_id,to_node_id,edge_type) values(enterprise,subject_node,decision_node,'RESULTED_IN') on conflict do nothing;
  trust_status:=public.append_trust_event_v1(p_trust_event,null,p_correlation_id); if trust_status<>'APPENDED' then raise exception 'Trust State Event chain conflict'; end if;
  insert into public.trust_architecture_audit_log(enterprise_id,action,actor_reference,target_type,target_id,correlation_id,metadata) values(enterprise,'TRUST_STATE_TRANSITION_APPLIED','system:trust-state-engine','TRUST_STATE_DECISION',decision::text,p_correlation_id,jsonb_build_object('priorState',p_decision->>'priorState','nextState',p_decision->>'nextState'));
  return jsonb_build_object('status','APPLIED','stateDecisionId',decision,'state',p_decision->>'nextState');
end $$;
revoke all on function public.apply_trust_state_decision_v1(jsonb,jsonb,jsonb,uuid) from public,anon,authenticated;
grant execute on function public.apply_trust_state_decision_v1(jsonb,jsonb,jsonb,uuid) to service_role;

create or replace function public.create_trust_policy_version_v1(p_enterprise_id uuid,p_actor_id uuid,p_policy jsonb,p_policy_hash text,p_trust_event jsonb,p_correlation_id uuid) returns jsonb language plpgsql security definer set search_path=public as $$
declare trust_status text; created_id uuid;
begin
  if auth.role()<>'service_role' then raise exception 'Trust policy service path required'; end if;
  if p_policy_hash !~ '^[a-f0-9]{64}$' then raise exception 'Invalid policy hash'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_enterprise_id::text||':'||(p_policy->>'policyId'),53));
  insert into public.trust_policy_versions(enterprise_id,policy_id,version,layer,domain_key,workflow_id,authority_id,active,valid_from,valid_until,rules,policy_hash,created_by)
  values(p_enterprise_id,p_policy->>'policyId',p_policy->>'version',p_policy->>'layer',nullif(p_policy->>'domainKey',''),nullif(p_policy->>'workflowId',''),nullif(p_policy->>'authorityId',''),(p_policy->>'active')::boolean,(p_policy->>'validFrom')::timestamptz,nullif(p_policy->>'validUntil','')::timestamptz,p_policy->'rules',p_policy_hash,p_actor_id) returning policy_version_id into created_id;
  trust_status:=public.append_trust_event_v1(p_trust_event,null,p_correlation_id); if trust_status<>'APPENDED' then raise exception 'Trust policy event chain conflict'; end if;
  insert into public.trust_architecture_audit_log(enterprise_id,action,actor_reference,target_type,target_id,correlation_id,metadata) values(p_enterprise_id,'TRUST_POLICY_VERSION_CREATED','administrator:'||p_actor_id::text,'TRUST_POLICY_VERSION',created_id::text,p_correlation_id,jsonb_build_object('policyId',p_policy->>'policyId','version',p_policy->>'version','policyHash',p_policy_hash));
  return jsonb_build_object('policyVersionId',created_id,'policyId',p_policy->>'policyId','version',p_policy->>'version','policyHash',p_policy_hash);
end $$;
revoke all on function public.create_trust_policy_version_v1(uuid,uuid,jsonb,text,jsonb,uuid) from public,anon,authenticated;
grant execute on function public.create_trust_policy_version_v1(uuid,uuid,jsonb,text,jsonb,uuid) to service_role;

create or replace function public.persist_trust_simulation_v1(p_simulation jsonb,p_result jsonb,p_correlation_id uuid) returns jsonb language plpgsql security definer set search_path=public as $$
declare simulation uuid:=(p_simulation->>'simulationId')::uuid; enterprise uuid:=(p_simulation->>'enterpriseId')::uuid;
begin
  if auth.role()<>'service_role' then raise exception 'Trust simulation service path required'; end if;
  insert into public.trust_simulations(simulation_id,enterprise_id,simulation_type,subject_id,decision_id,input_hash,requested_by,requested_at,status)
  values(simulation,enterprise,p_simulation->>'simulationType',nullif(p_simulation->>'subjectId',''),nullif(p_simulation->>'decisionId','')::uuid,p_simulation->>'inputHash',(p_simulation->>'requestedBy')::uuid,(p_simulation->>'requestedAt')::timestamptz,'COMPLETED');
  insert into public.trust_simulation_results(simulation_id,enterprise_id,result_hash,result,completed_at) values(simulation,enterprise,p_simulation->>'resultHash',p_result,now());
  insert into public.trust_architecture_audit_log(enterprise_id,action,actor_reference,target_type,target_id,correlation_id,metadata) values(enterprise,'TRUST_SIMULATION_COMPLETED','user:'||(p_simulation->>'requestedBy'),'TRUST_SIMULATION',simulation::text,p_correlation_id,jsonb_build_object('simulationType',p_simulation->>'simulationType','mutatedProduction',false));
  return jsonb_build_object('simulationId',simulation,'status','COMPLETED','resultHash',p_simulation->>'resultHash');
end $$;
revoke all on function public.persist_trust_simulation_v1(jsonb,jsonb,uuid) from public,anon,authenticated;
grant execute on function public.persist_trust_simulation_v1(jsonb,jsonb,uuid) to service_role;

comment on function public.persist_consensus_decision_v1(jsonb,jsonb,uuid) is 'Persists recommendations only. It cannot mutate subject_trust_state.';
comment on function public.apply_trust_state_decision_v1(jsonb,jsonb,jsonb,uuid) is 'The sole state mutation boundary; atomically records a state decision, read model and Canonical Trust Event.';
