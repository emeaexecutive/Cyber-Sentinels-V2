-- Trust Evidence Chains & Verification Receipts V1
-- Portable, explainable operational receipts without blockchain or immutable-truth claims.

create table if not exists public.verification_receipts (
  id uuid primary key default gen_random_uuid(),
  subject_type text,
  subject_id uuid,
  receipt_type text,
  verification_status text,
  confidence_level text,
  issued_by uuid,
  issued_at timestamptz default now(),
  expires_at timestamptz null,
  receipt_summary text,
  evidence_snapshot jsonb default '{}'::jsonb
);

create table if not exists public.evidence_chains (
  id uuid primary key default gen_random_uuid(),
  subject_type text,
  subject_id uuid,
  chain_summary text,
  evidence jsonb default '[]'::jsonb,
  created_at timestamptz default now()
);

create index if not exists verification_receipts_subject_idx
  on public.verification_receipts (subject_type, subject_id, issued_at desc);

create index if not exists verification_receipts_type_idx
  on public.verification_receipts (receipt_type, issued_at desc);

create index if not exists evidence_chains_subject_idx
  on public.evidence_chains (subject_type, subject_id, created_at desc);

revoke all on table public.verification_receipts from anon;
revoke all on table public.evidence_chains from anon;

grant select, insert on table public.verification_receipts to authenticated;
grant select, insert on table public.evidence_chains to authenticated;
grant all privileges on table public.verification_receipts to service_role;
grant all privileges on table public.evidence_chains to service_role;

alter table public.verification_receipts enable row level security;
alter table public.evidence_chains enable row level security;

drop policy if exists "authenticated read verification_receipts" on public.verification_receipts;
drop policy if exists "authenticated insert verification_receipts" on public.verification_receipts;
drop policy if exists "authenticated read evidence_chains" on public.evidence_chains;
drop policy if exists "authenticated insert evidence_chains" on public.evidence_chains;

create policy "authenticated read verification_receipts"
  on public.verification_receipts
  for select
  to authenticated
  using (true);

create policy "authenticated insert verification_receipts"
  on public.verification_receipts
  for insert
  to authenticated
  with check (true);

create policy "authenticated read evidence_chains"
  on public.evidence_chains
  for select
  to authenticated
  using (true);

create policy "authenticated insert evidence_chains"
  on public.evidence_chains
  for insert
  to authenticated
  with check (true);

create or replace function public.trust_receipt_record_integrity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  row_data jsonb := to_jsonb(new);
begin
  insert into public.trust_timeline_events (
    subject_type,
    subject_id,
    event_type,
    event_title,
    event_summary,
    actor_type,
    actor_id,
    metadata,
    severity,
    created_at
  )
  values (
    new.subject_type,
    new.subject_id,
    'verification_receipt_issued',
    'Verification receipt issued',
    coalesce(
      nullif(new.receipt_summary, ''),
      'A verification receipt was issued for explainable operational review.'
    ),
    'human_governance',
    new.issued_by,
    row_data,
    case
      when lower(coalesce(new.confidence_level, '')) in ('low', 'elevated risk', 'review') then 'review'
      else 'info'
    end,
    coalesce(new.issued_at, now())
  );

  insert into public.audit_logs (event_type, actor, metadata, created_at)
  values (
    'verification_receipt_issued',
    coalesce(new.issued_by::text, 'verification_receipt_registry'),
    jsonb_build_object(
      'receipt_id', new.id,
      'subject_type', new.subject_type,
      'subject_id', new.subject_id,
      'receipt_type', new.receipt_type,
      'verification_status', new.verification_status,
      'confidence_level', new.confidence_level,
      'operational_context', 'Explainable verification receipt recorded for governance traceability.'
    ),
    coalesce(new.issued_at, now())
  );

  insert into public.trust_relationships (
    source_type,
    source_id,
    relationship_type,
    target_type,
    target_id,
    confidence_level,
    explanation,
    created_at
  )
  select
    'verification_receipt',
    new.id,
    'verified_by',
    new.subject_type,
    new.subject_id,
    coalesce(nullif(new.confidence_level, ''), 'medium'),
    'Verification receipt links this subject to the evidence and human-governance context that supported the review.',
    coalesce(new.issued_at, now())
  where new.subject_id is not null
    and not exists (
      select 1
      from public.trust_relationships existing
      where existing.source_type = 'verification_receipt'
        and existing.source_id = new.id
        and existing.relationship_type = 'verified_by'
        and existing.target_type = new.subject_type
        and existing.target_id = new.subject_id
    );

  return new;
end;
$$;

create or replace function public.evidence_chain_record_integrity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  row_data jsonb := to_jsonb(new);
begin
  insert into public.trust_timeline_events (
    subject_type,
    subject_id,
    event_type,
    event_title,
    event_summary,
    actor_type,
    actor_id,
    metadata,
    severity,
    created_at
  )
  values (
    new.subject_type,
    new.subject_id,
    'evidence_chain_created',
    'Evidence chain created',
    coalesce(
      nullif(new.chain_summary, ''),
      'An operational evidence chain was recorded for explainable trust review.'
    ),
    'evidence_chain_registry',
    null,
    row_data,
    'info',
    coalesce(new.created_at, now())
  );

  insert into public.audit_logs (event_type, actor, metadata, created_at)
  values (
    'evidence_chain_created',
    'evidence_chain_registry',
    jsonb_build_object(
      'evidence_chain_id', new.id,
      'subject_type', new.subject_type,
      'subject_id', new.subject_id,
      'operational_context', 'Evidence chain recorded to explain what supported the verification state.'
    ),
    coalesce(new.created_at, now())
  );

  insert into public.trust_relationships (
    source_type,
    source_id,
    relationship_type,
    target_type,
    target_id,
    confidence_level,
    explanation,
    created_at
  )
  select
    'evidence_chain',
    new.id,
    'linked_to',
    new.subject_type,
    new.subject_id,
    'medium',
    'Evidence chain links this subject to reviewable operational evidence, signals and governance records.',
    coalesce(new.created_at, now())
  where new.subject_id is not null
    and not exists (
      select 1
      from public.trust_relationships existing
      where existing.source_type = 'evidence_chain'
        and existing.source_id = new.id
        and existing.relationship_type = 'linked_to'
        and existing.target_type = new.subject_type
        and existing.target_id = new.subject_id
    );

  return new;
end;
$$;

drop trigger if exists verification_receipts_integrity_insert on public.verification_receipts;
create trigger verification_receipts_integrity_insert
  after insert on public.verification_receipts
  for each row execute function public.trust_receipt_record_integrity();

drop trigger if exists evidence_chains_integrity_insert on public.evidence_chains;
create trigger evidence_chains_integrity_insert
  after insert on public.evidence_chains
  for each row execute function public.evidence_chain_record_integrity();
