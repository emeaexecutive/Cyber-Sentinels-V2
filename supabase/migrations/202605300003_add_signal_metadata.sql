-- Evidence workflow signals need structured context for Back Office auditability.

alter table public.signals add column if not exists metadata jsonb default '{}'::jsonb;
