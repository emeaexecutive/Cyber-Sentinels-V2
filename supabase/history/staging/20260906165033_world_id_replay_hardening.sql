-- Forward hardening for World ID nullifier replay protection.
-- This migration preserves the existing identity/authority semantics and
-- strengthens replay uniqueness, workspace linkage, provider constraints, and
-- RPC execution privileges without modifying the earlier guard migration.

alter table public.world_id_nullifier_claims
  drop constraint if exists world_id_nullifier_claims_scope_unique;

alter table public.world_id_nullifier_claims
  add constraint world_id_nullifier_claims_nullifier_action_unique
  unique (nullifier_digest, action);

alter table public.world_id_nullifier_claims
  add constraint world_id_nullifier_claims_enterprise_fk
  foreign key (enterprise_id) references public.trust_workspaces (id);

alter table public.world_id_nullifier_claims
  add constraint world_id_nullifier_claims_provider_check
  check (provider = 'world_id');

revoke execute on function public.claim_world_id_nullifier_v1(
  uuid,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  timestamptz
) from public, anon, authenticated;

grant execute on function public.claim_world_id_nullifier_v1(
  uuid,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  timestamptz
) to service_role;