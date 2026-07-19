-- EPIC 17.1B: additive Identity Signal Engine runtime hardening.
-- This migration stores normalized evidence and digests only. Raw provider
-- payloads, proofs, credentials, documents and biometric material are banned.

alter table public.identity_verification_requests
  add column if not exists operation text not null default 'identity_verification';

alter table public.identity_provider_capabilities
  add column if not exists id uuid not null default gen_random_uuid(),
  add column if not exists enterprise_id uuid references public.trust_workspaces(id) on delete cascade;

do $$
begin
  if exists (select 1 from pg_constraint where conname = 'identity_provider_capabilities_pkey') then
    alter table public.identity_provider_capabilities drop constraint identity_provider_capabilities_pkey;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'identity_provider_capabilities_id_pkey') then
    alter table public.identity_provider_capabilities add constraint identity_provider_capabilities_id_pkey primary key (id);
  end if;
end $$;

create unique index if not exists identity_provider_capability_scope_unique_idx
  on public.identity_provider_capabilities (coalesce(enterprise_id, '00000000-0000-0000-0000-000000000000'::uuid), provider_id, signal_type);
create index if not exists identity_provider_capability_enterprise_idx
  on public.identity_provider_capabilities (enterprise_id, provider_id, signal_type);

drop index if exists public.identity_verification_idempotency_idx;
create unique index if not exists identity_verification_operation_idempotency_idx
  on public.identity_verification_requests (enterprise_id, operation, idempotency_key);
create index if not exists identity_verification_enterprise_status_idx
  on public.identity_verification_requests (enterprise_id, status, created_at desc);

alter table public.identity_provider_transactions
  add column if not exists provider_event_id text,
  add column if not exists provider_transaction_id text,
  add column if not exists payload_hash text,
  add column if not exists updated_at timestamptz not null default now();

create unique index if not exists identity_provider_event_unique_idx
  on public.identity_provider_transactions (enterprise_id, provider_id, provider_event_id, signal_type)
  where provider_event_id is not null;
create unique index if not exists identity_provider_transaction_unique_idx
  on public.identity_provider_transactions (enterprise_id, provider_id, provider_transaction_id, signal_type)
  where provider_transaction_id is not null;
create index if not exists identity_provider_query_idx
  on public.identity_provider_transactions (enterprise_id, provider_id, created_at desc);

alter table public.identity_signal_evidence
  add column if not exists signal_status text not null default 'PENDING',
  add column if not exists signature_verified boolean not null default false,
  add column if not exists provider_event_id text,
  add column if not exists provider_reference text,
  add column if not exists payload_hash text,
  add column if not exists normalized_value jsonb,
  add column if not exists provenance jsonb not null default '{}'::jsonb;

update public.identity_signal_evidence
set signal_status = case outcome
  when 'VERIFIED' then 'PASS'
  when 'FAILED' then 'FAIL'
  when 'INCONCLUSIVE' then 'INCONCLUSIVE'
  when 'UNAVAILABLE' then 'UNAVAILABLE'
  when 'UNSUPPORTED' then 'UNSUPPORTED'
  when 'BLOCKED' then 'BLOCKED'
  else 'ERROR'
end
where signal_status = 'PENDING';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'identity_signal_status_check') then
    alter table public.identity_signal_evidence add constraint identity_signal_status_check
      check (signal_status in ('PASS','FAIL','INCONCLUSIVE','UNAVAILABLE','UNSUPPORTED','BLOCKED','ERROR','PENDING'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'identity_signal_payload_hash_check') then
    alter table public.identity_signal_evidence add constraint identity_signal_payload_hash_check
      check (payload_hash is null or payload_hash ~ '^[a-f0-9]{64}$');
  end if;
  if not exists (select 1 from pg_constraint where conname = 'identity_transaction_payload_hash_check') then
    alter table public.identity_provider_transactions add constraint identity_transaction_payload_hash_check
      check (payload_hash is null or payload_hash ~ '^[a-f0-9]{64}$');
  end if;
end $$;

create unique index if not exists identity_signal_provider_event_unique_idx
  on public.identity_signal_evidence (enterprise_id, provider_id, provider_event_id, signal_type)
  where provider_event_id is not null;
create index if not exists identity_signal_provider_query_idx
  on public.identity_signal_evidence (enterprise_id, provider_id, signal_type, observed_at desc);
create index if not exists identity_audit_request_created_idx
  on public.identity_audit_events (enterprise_id, verification_request_id, created_at desc);

alter table public.identity_confidence_results
  add column if not exists contradiction_count integer not null default 0;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'identity_confidence_contradiction_check') then
    alter table public.identity_confidence_results add constraint identity_confidence_contradiction_check
      check (contradiction_count >= 0);
  end if;
end $$;

-- Composite tenant keys prevent a valid ID from being related to a row owned
-- by another enterprise even on service-role callback paths.
create unique index if not exists identity_subject_enterprise_id_idx
  on public.identity_subjects (enterprise_id, id);
create unique index if not exists identity_request_enterprise_id_idx
  on public.identity_verification_requests (enterprise_id, id);
create unique index if not exists identity_transaction_enterprise_id_idx
  on public.identity_provider_transactions (enterprise_id, id);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'identity_request_subject_tenant_fk') then
    alter table public.identity_verification_requests add constraint identity_request_subject_tenant_fk
      foreign key (enterprise_id, subject_id) references public.identity_subjects (enterprise_id, id) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'identity_transaction_request_tenant_fk') then
    alter table public.identity_provider_transactions add constraint identity_transaction_request_tenant_fk
      foreign key (enterprise_id, verification_request_id) references public.identity_verification_requests (enterprise_id, id) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'identity_evidence_subject_tenant_fk') then
    alter table public.identity_signal_evidence add constraint identity_evidence_subject_tenant_fk
      foreign key (enterprise_id, subject_id) references public.identity_subjects (enterprise_id, id) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'identity_evidence_request_tenant_fk') then
    alter table public.identity_signal_evidence add constraint identity_evidence_request_tenant_fk
      foreign key (enterprise_id, verification_request_id) references public.identity_verification_requests (enterprise_id, id) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'identity_evidence_transaction_tenant_fk') then
    alter table public.identity_signal_evidence add constraint identity_evidence_transaction_tenant_fk
      foreign key (enterprise_id, provider_transaction_id) references public.identity_provider_transactions (enterprise_id, id) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'identity_confidence_subject_tenant_fk') then
    alter table public.identity_confidence_results add constraint identity_confidence_subject_tenant_fk
      foreign key (enterprise_id, subject_id) references public.identity_subjects (enterprise_id, id) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'identity_confidence_request_tenant_fk') then
    alter table public.identity_confidence_results add constraint identity_confidence_request_tenant_fk
      foreign key (enterprise_id, verification_request_id) references public.identity_verification_requests (enterprise_id, id) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'identity_audit_subject_tenant_fk') then
    alter table public.identity_audit_events add constraint identity_audit_subject_tenant_fk
      foreign key (enterprise_id, subject_id) references public.identity_subjects (enterprise_id, id) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'identity_audit_request_tenant_fk') then
    alter table public.identity_audit_events add constraint identity_audit_request_tenant_fk
      foreign key (enterprise_id, verification_request_id) references public.identity_verification_requests (enterprise_id, id) not valid;
  end if;
end $$;

grant insert on public.identity_subjects, public.identity_verification_requests to authenticated;

drop policy if exists "authenticated read provider capabilities" on public.identity_provider_capabilities;
create policy "enterprise members read provider capabilities" on public.identity_provider_capabilities
  for select to authenticated using (
    enterprise_id is null or public.user_can_access_trust_workspace(enterprise_id)
  );

drop policy if exists "authorized operators create identity subjects" on public.identity_subjects;
create policy "authorized operators create identity subjects" on public.identity_subjects
  for insert to authenticated with check (
    created_by = auth.uid()
    and public.user_can_access_trust_workspace(enterprise_id)
    and public.identity_workspace_role(enterprise_id) in ('owner','admin','reviewer')
  );

drop policy if exists "authorized operators create identity verification requests" on public.identity_verification_requests;
create policy "authorized operators create identity verification requests" on public.identity_verification_requests
  for insert to authenticated with check (
    requested_by = auth.uid()
    and public.user_can_access_trust_workspace(enterprise_id)
    and public.identity_workspace_role(enterprise_id) in ('owner','admin','reviewer')
  );

comment on column public.identity_signal_evidence.signal_status is
  'Normalized signal status. PASS is evidence quality only and never independently authorizes or verifies identity.';
comment on column public.identity_signal_evidence.payload_hash is
  'SHA-256 digest of bounded provider input; raw provider payload storage is prohibited.';
comment on column public.identity_signal_evidence.normalized_value is
  'Allowlisted normalized value only; raw proof, document and biometric data are prohibited.';
