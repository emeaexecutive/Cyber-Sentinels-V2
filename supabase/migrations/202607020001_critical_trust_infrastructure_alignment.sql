-- Critical Trust Infrastructure Alignment
-- Extends existing records only. No duplicate registry, posture, session, or
-- evidence tables are introduced.

alter table public.ai_agents
  add column if not exists verified_agent_name text,
  add column if not exists owner_organization text,
  add column if not exists registry_status text not null default 'pending_review',
  add column if not exists identity_claims jsonb not null default '[]'::jsonb,
  add column if not exists trust_lineage jsonb not null default '[]'::jsonb,
  add column if not exists last_trust_recalculation_reason text;

create index if not exists ai_agents_registry_status_idx
  on public.ai_agents (registry_status, created_at desc);

comment on column public.ai_agents.identity_claims is
  'Declared or provider-supported claims. Claims are not treated as verified unless review evidence says so.';
comment on column public.ai_agents.trust_lineage is
  'References to existing ownership, authorization, evidence, and governance records.';
comment on column public.ai_agents.last_trust_recalculation_reason is
  'Human-readable reason for the latest trust posture recalculation.';

alter table public.verification_signals
  drop constraint if exists verification_signals_category_check;

alter table public.verification_signals
  add constraint verification_signals_category_check check (
    category in (
      'liveness_check',
      'deepfake_risk',
      'injection_risk',
      'device_channel_integrity',
      'session_anomaly',
      'manual_review_required',
      'ip_location_change',
      'vpn_anomaly',
      'device_continuity',
      'browser_consistency',
      'provider_verification_change',
      'session_interruption',
      'workflow_inconsistency',
      'virtual_camera_risk',
      'frame_integrity',
      'device_attestation'
    )
  );

