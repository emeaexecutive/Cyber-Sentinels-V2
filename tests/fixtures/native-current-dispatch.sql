-- Isolated predecessor fixture extensions for actual v3 routines and HTTP effects.
alter table canonical_trust_transactions add column policy_hash text default 'policy-hash';
alter table operational_entity_delegated_action_evaluations add column action_tool text default 'test-tool';
alter table operational_entity_authority_delegations
 add column parent_delegation_id uuid, add column delegator_operational_entity_id text default 'owner',
 add column not_before timestamptz default '2026-01-01', add column can_redelegate boolean default true,
 add column delegation_depth integer default 0, add column permitted_actions text[] default array['write_test_record','read'],
 add column permitted_tools text[] default array['test-tool'], add column permitted_targets text[] default array['repository:a'],
 add column environments text[] default array['test'], add column financial_limit numeric, add column execution_limit integer,
 add column maximum_delegation_depth integer default 2, add column data_boundary text default 'CONFIDENTIAL';
alter table trust_contracts add column contract jsonb default '{"policyVersion":"v1"}';
alter table operational_entity_native_verifications add column verification_id uuid default gen_random_uuid(),add column credential_id uuid default gen_random_uuid();
create table operational_entity_native_credentials(enterprise_id uuid,operational_entity_id text,credential_id uuid,state text,revoked_at timestamptz,valid_from timestamptz,expires_at timestamptz);
create table native_entity_identity_evidence(enterprise_id uuid,operational_entity_id text,verification_id uuid,revoked_at timestamptz,expires_at timestamptz);
create table operational_entities(enterprise_id uuid,entity_id text,lifecycle_state text);
create table trust_policy_versions(enterprise_id uuid,policy_id text,version text,policy_hash text,active boolean,valid_from timestamptz,valid_until timestamptz);
create table controlled_destination_records(record_id uuid primary key,enterprise_id uuid,destination_id text,transaction_id uuid,operational_entity_id text,action text,target text,idempotency_key text,test_record jsonb,result text,occurred_at timestamptz,record_digest text,unique(enterprise_id,destination_id,idempotency_key));

alter table operational_entity_owner_bindings add column effective_to timestamptz;
