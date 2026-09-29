-- Minimal dependencies for executing the four real RPC bodies locally.
-- Scope/incident tables, checks, foreign keys, RLS and immutable triggers are
-- loaded from their actual historical migrations by the regression harness.
create role anon;
create role authenticated;
create role service_role bypassrls;
create schema auth;
create schema extensions;
create extension pgcrypto with schema extensions;
grant usage on schema public, auth to anon, authenticated, service_role;
create function auth.role() returns text language sql stable as $$
  select current_setting('request.jwt.claim.role',true)
$$;
create function public.user_can_access_trust_workspace(tenant uuid) returns boolean language sql stable as $$
  select tenant::text=current_setting('test.tenant',true)
$$;
create table public.trust_workspaces(id uuid primary key);
create table public.trust_subjects(enterprise_id uuid,subject_id text,retired_at timestamptz);
create table public.trust_architecture_audit_log(
  enterprise_id uuid,action text,actor_reference text,target_type text,target_id text,correlation_id uuid,metadata jsonb
);
create table public.evidence_graph_nodes(
  node_id uuid primary key default gen_random_uuid(),enterprise_id uuid not null,
  node_type text not null,external_id text not null,domain_key text,label text,metadata jsonb,
  unique(enterprise_id,node_type,external_id)
);
create table public.evidence_graph_edges(
  edge_id uuid primary key default gen_random_uuid(),enterprise_id uuid not null,
  from_node_id uuid not null,to_node_id uuid not null,edge_type text not null,
  unique(enterprise_id,from_node_id,to_node_id,edge_type)
);
create table public.trust_memory_index(
  memory_id uuid primary key default gen_random_uuid(),enterprise_id uuid not null,
  subject_id text not null,domain_key text not null,memory_type text not null,
  source_id text not null,occurred_at timestamptz not null,summary jsonb not null,
  unique(enterprise_id,memory_type,source_id)
);
create table public.hopae_verifications(
  id uuid primary key,verification_id text,workspace_id uuid,workflow_id uuid,owner_user_id uuid,
  correlation_id uuid,source_mode text,status text,normalized_user_data jsonb,provenance jsonb,
  upstream_identity_proof jsonb,normalized_evidence jsonb,evidence_quality jsonb,replay_reference uuid,
  evidence_graph_reference uuid,trust_memory_reference uuid,enforcement_receipt_reference uuid,
  completed_at timestamptz,updated_at timestamptz
);
create table public.hopae_webhook_events(
  id uuid primary key default gen_random_uuid(),event_id text,event_type text,verification_id text,
  signature_timestamp bigint,event_digest text,workspace_id uuid,workflow_id uuid,correlation_id uuid,
  normalized_evidence jsonb,evidence_quality jsonb,processing_outcome text,raw_event jsonb,processed_at timestamptz
);
-- This is the real partial-index shape that caused 42P10.
create unique index hopae_webhook_events_event_id_uidx on public.hopae_webhook_events(event_id) where event_id is not null;
create table public.trust_replay_sessions(
  id uuid primary key default gen_random_uuid(),subject_type text,subject_id uuid,workspace_id uuid,
  owner_user_id uuid,correlation_id uuid,replay_summary text,generated_by text
);
create table public.evidence_chains(
  id uuid primary key default gen_random_uuid(),subject_type text,subject_id uuid,workspace_id uuid,
  owner_user_id uuid,correlation_id uuid,chain_summary text,evidence jsonb
);
create table public.trust_timeline_events(
  id uuid primary key default gen_random_uuid(),subject_type text,subject_id uuid,workspace_id uuid,
  owner_user_id uuid,correlation_id uuid,event_type text,event_title text,event_summary text,
  actor_type text,actor_id uuid,severity text,metadata jsonb
);
create table public.verification_receipts(
  id uuid primary key default gen_random_uuid(),subject_type text,subject_id uuid,workspace_id uuid,
  owner_user_id uuid,correlation_id uuid,receipt_type text,verification_status text,
  confidence_level text,issued_by uuid,receipt_summary text,evidence_snapshot jsonb
);
create table public.trust_relationships(
  source_type text,source_id uuid,relationship_type text,target_type text,target_id uuid,
  confidence_level text,explanation text,workspace_id uuid,owner_user_id uuid,correlation_id uuid
);
create table public.audit_logs(event_type text,actor text,metadata jsonb,created_at timestamptz);
-- The append-event dependency is a controlled success boundary, not a replay-chain test.
create function public.append_trust_event_v1(jsonb,text,uuid) returns text language sql as $$ select 'APPENDED'::text $$;
