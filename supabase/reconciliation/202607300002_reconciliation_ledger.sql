-- STAGING VALIDATION APPROVED
-- NOT APPROVED FOR PRODUCTION
-- STAGING VALIDATION ONLY
-- Phase 2: service-role-only reconciliation execution ledger.

begin;

do $reconciliation_gate$
begin
  if current_setting('app.reconciliation.environment', true) is distinct from 'staging' then
    raise exception
      'RECONCILIATION_LEDGER_FAILED: app.reconciliation.environment must equal staging';
  end if;
  if to_regclass('public.schema_reconciliation_runs') is not null then
    raise exception
      'RECONCILIATION_LEDGER_FAILED: schema_reconciliation_runs already exists; definition not assumed compatible';
  end if;
end
$reconciliation_gate$;

create table public.schema_reconciliation_runs (
  id uuid primary key default gen_random_uuid(),
  reconciliation_key text not null unique,
  phase text not null,
  status text not null,
  started_at timestamptz not null default clock_timestamp(),
  completed_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  constraint schema_reconciliation_runs_status_check
    check (status in ('started', 'completed', 'failed', 'rolled_back')),
  constraint schema_reconciliation_runs_completion_check
    check (
      (status = 'started' and completed_at is null)
      or (status <> 'started' and completed_at is not null)
    ),
  constraint schema_reconciliation_runs_metadata_object_check
    check (jsonb_typeof(metadata) = 'object')
);

alter table public.schema_reconciliation_runs enable row level security;
alter table public.schema_reconciliation_runs force row level security;

revoke all on table public.schema_reconciliation_runs from public;
revoke all on table public.schema_reconciliation_runs from anon;
revoke all on table public.schema_reconciliation_runs from authenticated;
grant select, insert, update on table public.schema_reconciliation_runs to service_role;

insert into public.schema_reconciliation_runs (
  reconciliation_key,
  phase,
  status,
  completed_at,
  metadata
) values (
  '202607300002_reconciliation_ledger',
  'ledger',
  'completed',
  clock_timestamp(),
  jsonb_build_object(
    'baseline', 'production-schema-baseline-normalised.sql',
    'publicTablesBefore', 87,
    'publicRoutinesBefore', 43,
    'publicPoliciesBefore', 176
  )
);

commit;
