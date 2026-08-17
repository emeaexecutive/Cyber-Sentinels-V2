create table if not exists public.runtime_validation_logs (
  id uuid primary key default gen_random_uuid(),
  deployment_state text not null,
  health_percent integer not null,
  critical_blockers text[] default '{}'::text[],
  warnings text[] default '{}'::text[],
  summary jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

-- Older environments used overall_status/health_score. Reconcile additively so
-- this repository migration is safe on both shapes and preserves old rows.
alter table public.runtime_validation_logs
  add column if not exists deployment_state text,
  add column if not exists health_percent integer,
  add column if not exists critical_blockers text[] default '{}'::text[],
  add column if not exists warnings text[] default '{}'::text[];
do $$ begin
  if exists(select 1 from information_schema.columns where table_schema='public' and table_name='runtime_validation_logs' and column_name='overall_status')
    and exists(select 1 from information_schema.columns where table_schema='public' and table_name='runtime_validation_logs' and column_name='health_score') then
    execute $sql$update public.runtime_validation_logs
      set deployment_state=coalesce(deployment_state,overall_status,'UNKNOWN'),
          health_percent=coalesce(health_percent,health_score,0),
          critical_blockers=coalesce(critical_blockers,'{}'::text[]),
          warnings=coalesce(warnings,'{}'::text[])
      where deployment_state is null or health_percent is null or critical_blockers is null or warnings is null$sql$;
  else
    update public.runtime_validation_logs
      set deployment_state=coalesce(deployment_state,'UNKNOWN'),
          health_percent=coalesce(health_percent,0),
          critical_blockers=coalesce(critical_blockers,'{}'::text[]),
          warnings=coalesce(warnings,'{}'::text[])
      where deployment_state is null or health_percent is null or critical_blockers is null or warnings is null;
  end if;
end $$;
alter table public.runtime_validation_logs
  alter column deployment_state set not null,
  alter column health_percent set not null,
  alter column critical_blockers set default '{}'::text[],
  alter column warnings set default '{}'::text[];

create index if not exists runtime_validation_logs_created_idx
on public.runtime_validation_logs (created_at desc);

create index if not exists runtime_validation_logs_state_created_idx
on public.runtime_validation_logs (deployment_state, created_at desc);

alter table public.runtime_validation_logs enable row level security;

revoke all on table public.runtime_validation_logs from anon;
grant select, insert on table public.runtime_validation_logs to authenticated;
grant all privileges on table public.runtime_validation_logs to service_role;

drop policy if exists "admin read runtime validation logs" on public.runtime_validation_logs;
drop policy if exists "admin insert runtime validation logs" on public.runtime_validation_logs;

create policy "admin read runtime validation logs"
on public.runtime_validation_logs
for select
to authenticated
using (
  coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin'
);

create policy "admin insert runtime validation logs"
on public.runtime_validation_logs
for insert
to authenticated
with check (
  coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin'
);
