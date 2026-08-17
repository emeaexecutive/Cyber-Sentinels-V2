-- Idempotent, additive registry reconciliation. This establishes known domain
-- versions only; it does not assert that a subject, provider or observation is
-- trusted. No rows are removed and unrelated future domains are preserved.
create extension if not exists pgcrypto;

do $$ begin
  if to_regclass('public.trust_domain_versions') is null then
    raise exception 'EPIC 18 trust_domain_versions migration must be applied before registry reconciliation';
  end if;
end $$;

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
('GOVERNANCE','1.0.0','Governance','Policies, reviews, exceptions and audit state.',true,'2026-07-21T00:00:00Z')
on conflict(domain_key,version) do nothing;

do $$
declare required_key text;
begin
  foreach required_key in array array['IDENTITY','AI_AGENT','DEVICE','AUTHORITY','WORKFLOW','RUNTIME','NETWORK','DATA','CONSENT','GOVERNANCE'] loop
    if not exists(select 1 from public.trust_domain_versions where domain_key=required_key and version='1.0.0' and active) then
      raise exception 'Canonical trust domain % version 1.0.0 is not active after reconciliation',required_key;
    end if;
  end loop;
end $$;

alter table public.trust_domain_versions enable row level security;
revoke all on public.trust_domain_versions from public,anon,authenticated;
grant select on public.trust_domain_versions to authenticated;
grant all privileges on public.trust_domain_versions to service_role;
select public.ensure_policy_definition_v2(
  'public', 'trust_domain_versions', 'authenticated reads active domain registry',
  'SELECT', array['authenticated']::name[], 'active', null,
  'strict', '20260817175347-reconcile-enterprise-trust-domain-registry', null, true
);

comment on table public.trust_domain_versions is 'Canonical trust-domain schema registry. Registration is not a trust assertion.';
