-- Minimal pre-existing schema contract for testing the NEW routines on real PG.
-- This is not a full Supabase migration rehearsal or hosted schema parity proof.
do $$ begin
  if not exists(select 1 from pg_roles where rolname='anon') then create role anon; end if;
  if not exists(select 1 from pg_roles where rolname='authenticated') then create role authenticated; end if;
  if not exists(select 1 from pg_roles where rolname='service_role') then create role service_role bypassrls; end if;
end $$;
create schema auth;
create function auth.role() returns text language sql stable as $$ select current_setting('request.jwt.claim.role',true) $$;
grant usage on schema auth to anon,authenticated,service_role;
grant execute on function auth.role() to anon,authenticated,service_role;
create table public.canonical_trust_transactions(
 enterprise_id uuid,transaction_id uuid,operational_entity_id text,action_type text,action_resource text,action_environment text,
 request_digest text,policy_id text,policy_version text,decision text,decision_time_snapshot jsonb,
 primary key(enterprise_id,transaction_id));
create table public.native_enforcement_decision_bindings(enterprise_id uuid,transaction_id uuid,operational_entity_id text,evaluation_id uuid,decision_digest text);
create table public.operational_entity_delegated_action_evaluations(enterprise_id uuid,evaluation_id uuid,delegation_id uuid,decision_digest text,decision text,decision_snapshot jsonb);
create table public.operational_entity_authority_delegations(enterprise_id uuid,delegation_id uuid,parent_authority_id uuid,delegate_operational_entity_id text,policy_version text,status text,revoked_at timestamptz,expires_at timestamptz);
create table public.trust_contracts(enterprise_id uuid,contract_id uuid,revocation_state text,expires_at timestamptz);
create table public.operational_entity_native_verifications(enterprise_id uuid,operational_entity_id text,status text,expires_at timestamptz,runtime_binding text,continuity_fingerprint text,verified_at timestamptz);
create table public.operational_entity_owner_bindings(enterprise_id uuid,operational_entity_id text,state text,effective_from timestamptz);
create table public.native_enforcement_human_approvals(approval_id uuid primary key,enterprise_id uuid,transaction_id uuid,operational_entity_id text,action_digest text,approved_by uuid,approved_at timestamptz,expires_at timestamptz,non_transferable boolean,approval_digest text,unique(enterprise_id,transaction_id,action_digest));
create table public.native_enforcement_requests(request_id uuid primary key,enterprise_id uuid,transaction_id uuid,evaluation_id uuid,operational_entity_id text,authority_id uuid,delegation_id uuid,action_type text,action_target text,environment text,consequence text,action_digest text,decision_digest text,idempotency_key text,request_state text,actor_id uuid,unique(enterprise_id,request_id));
