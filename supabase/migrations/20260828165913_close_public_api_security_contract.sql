-- P0 external API security closure. This migration changes no canonical data
-- model and creates no parallel evidence or Replay store. It only reconciles
-- the existing API-key scope constraint and makes public-client assertions
-- append-only inside the existing evidence_objects ledger.

alter table public.api_keys
  drop constraint if exists api_keys_scope_v1_check;
alter table public.api_keys
  add constraint api_keys_scope_v1_check check(
    scopes <@ array[
      'agents:write',
      'agents:verify',
      'authority:read',
      'trust:request',
      'trust:read',
      'evidence:write',
      'outcomes:write'
    ]::text[]
  );

create or replace function public.protect_public_api_client_evidence_v1()
returns trigger
language plpgsql
security invoker
set search_path=public
as $$
begin
  if old.source_type='PUBLIC_API_CLIENT_ASSERTION' then
    raise exception 'Public API client evidence is append-only';
  end if;
  if tg_op='DELETE' then return old; end if;
  return new;
end $$;

drop trigger if exists protect_public_api_client_evidence_v1 on public.evidence_objects;
create trigger protect_public_api_client_evidence_v1
before update or delete on public.evidence_objects
for each row execute function public.protect_public_api_client_evidence_v1();

comment on function public.protect_public_api_client_evidence_v1() is
  'Prevents mutation or deletion of AGENT_ASSERTED public API evidence while preserving the existing canonical evidence store.';
