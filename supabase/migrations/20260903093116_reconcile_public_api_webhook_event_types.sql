-- Reconcile the public API webhook vocabulary independently of the broader
-- VALE migration. Some environments received the public API migrations
-- without the expanded event-type constraint.
--
-- This migration intentionally changes no grants, policies, functions, or
-- stored data. Adding the constraint as NOT VALID keeps the table scan out of
-- the initial DDL lock; VALIDATE then proves all retained rows conform.
alter table public.public_api_webhook_events
  drop constraint if exists public_api_webhook_events_event_type_check;

alter table public.public_api_webhook_events
  add constraint public_api_webhook_events_event_type_check check (event_type in (
    'decision.created',
    'decision.review_required',
    'decision.denied',
    'authority.changed',
    'monitoring.coverage_gap',
    'deployment.reauthorization_required',
    'intent.execution_mismatch',
    'execution.outcome',
    'data.impact_detected',
    'receipt.available',
    'authority.revoked',
    'trust.material_change',
    'outcome.contradiction'
  )) not valid;

alter table public.public_api_webhook_events
  validate constraint public_api_webhook_events_event_type_check;
