create extension if not exists pgcrypto;

create table if not exists public.world_id_nullifier_claims (
  id uuid primary key default gen_random_uuid(),
  enterprise_id uuid not null,
  provider text not null default 'world_id',
  nullifier_digest text not null,
  action text not null,
  subject_reference text not null,
  provider_reference text,
  verification_reference text,
  payload_digest text,
  verified_at timestamptz not null,
  created_at timestamptz not null default now(),
  constraint world_id_nullifier_claims_scope_unique unique(enterprise_id, action, subject_reference, nullifier_digest)
);

create index if not exists world_id_nullifier_claims_lookup_idx
  on public.world_id_nullifier_claims (enterprise_id, action, subject_reference, nullifier_digest, verified_at desc);

alter table public.world_id_nullifier_claims enable row level security;
revoke all on public.world_id_nullifier_claims from public, anon, authenticated;
grant insert, select on public.world_id_nullifier_claims to service_role;

create or replace function public.claim_world_id_nullifier_v1(
  p_enterprise_id uuid,
  p_provider text,
  p_nullifier_digest text,
  p_action text,
  p_subject_reference text,
  p_provider_reference text,
  p_verification_reference text,
  p_payload_digest text,
  p_verified_at timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  claim_id uuid;
  existing_count int;
begin
  if auth.role() <> 'service_role' then
    raise exception 'world_id replay claim requires service_role';
  end if;

  insert into public.world_id_nullifier_claims (
    enterprise_id,
    provider,
    nullifier_digest,
    action,
    subject_reference,
    provider_reference,
    verification_reference,
    payload_digest,
    verified_at
  ) values (
    p_enterprise_id,
    coalesce(p_provider, 'world_id'),
    p_nullifier_digest,
    p_action,
    p_subject_reference,
    p_provider_reference,
    p_verification_reference,
    p_payload_digest,
    coalesce(p_verified_at, now())
  ) returning id into claim_id;

  return jsonb_build_object(
    'accepted', true,
    'claim_id', claim_id,
    'reason_code', null
  );
exception
  when unique_violation then
    select count(*) into existing_count
    from public.world_id_nullifier_claims
    where enterprise_id = p_enterprise_id
      and action = p_action
      and subject_reference = p_subject_reference
      and nullifier_digest = p_nullifier_digest;

    return jsonb_build_object(
      'accepted', false,
      'claim_id', null,
      'reason_code', 'WORLD_ID_NULLIFIER_REPLAY'
    );
end;
$$;