-- Verifier Network schema coverage
-- Supports the existing verifier API and authenticated review surface.

create table if not exists public.verifiers (
  id uuid primary key default gen_random_uuid(),
  verifier_name text not null,
  verifier_type text not null default 'external_reviewer',
  organisation text not null default 'Independent',
  email text not null,
  status text not null default 'pending',
  capabilities text[] not null default array['review_evidence']::text[],
  trust_score integer not null default 50,
  assigned_cases integer not null default 0,
  completed_reviews integer not null default 0,
  created_by uuid not null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint verifiers_type_check check (
    verifier_type in (
      'internal_admin',
      'external_reviewer',
      'recruiter_verifier',
      'cyber_analyst',
      'identity_partner',
      'legal_reviewer',
      'compliance_partner',
      'ai_agent_reviewer'
    )
  ),
  constraint verifiers_status_check check (
    status in ('pending', 'approved', 'suspended', 'revoked', 'under_review')
  ),
  constraint verifiers_trust_score_check check (trust_score between 0 and 100),
  constraint verifiers_assigned_cases_check check (assigned_cases >= 0),
  constraint verifiers_completed_reviews_check check (completed_reviews >= 0)
);

create unique index if not exists verifiers_email_idx
  on public.verifiers (lower(email));

create index if not exists verifiers_status_created_idx
  on public.verifiers (status, created_at desc);

revoke all on table public.verifiers from anon;
grant select, insert on table public.verifiers to authenticated;
grant all privileges on table public.verifiers to service_role;

alter table public.verifiers enable row level security;

drop policy if exists "authenticated read verifiers" on public.verifiers;
create policy "authenticated read verifiers"
on public.verifiers
for select
to authenticated
using (true);

drop policy if exists "authenticated create own verifier application" on public.verifiers;
create policy "authenticated create own verifier application"
on public.verifiers
for insert
to authenticated
with check (created_by = auth.uid() and status = 'pending');
