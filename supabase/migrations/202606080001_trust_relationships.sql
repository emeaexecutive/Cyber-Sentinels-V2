-- Explainable Trust Relationship Layer V1
-- Simple PostgreSQL-backed relationships for operational trust visibility.

create table if not exists public.trust_relationships (
  id uuid primary key default gen_random_uuid(),
  source_type text,
  source_id uuid,
  relationship_type text,
  target_type text,
  target_id uuid,
  confidence_level text default 'medium',
  explanation text,
  created_at timestamptz default now()
);

create index if not exists trust_relationships_source_idx
  on public.trust_relationships (source_type, source_id, created_at desc);

create index if not exists trust_relationships_target_idx
  on public.trust_relationships (target_type, target_id, created_at desc);

create index if not exists trust_relationships_type_idx
  on public.trust_relationships (relationship_type, created_at desc);

revoke all on table public.trust_relationships from anon;
grant select, insert on table public.trust_relationships to authenticated;
grant all privileges on table public.trust_relationships to service_role;

alter table public.trust_relationships enable row level security;

drop policy if exists "authenticated read trust_relationships" on public.trust_relationships;
drop policy if exists "authenticated insert trust_relationships" on public.trust_relationships;

create policy "authenticated read trust_relationships"
  on public.trust_relationships
  for select
  to authenticated
  using (true);

create policy "authenticated insert trust_relationships"
  on public.trust_relationships
  for insert
  to authenticated
  with check (
    relationship_type in (
      'submitted_evidence',
      'reviewed_by',
      'linked_to',
      'generated_signal',
      'owned_by',
      'verified_by',
      'escalated_to',
      'connected_activity'
    )
  );
