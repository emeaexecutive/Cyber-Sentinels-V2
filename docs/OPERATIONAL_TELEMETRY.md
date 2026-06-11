# Operational Telemetry

Cyber Sentinels telemetry is operational, explainable and governance-safe. It exists to help operators understand workflow health, runtime confidence and trust continuity without building surveillance tooling or invasive analytics.

## Telemetry Philosophy

- Track workflow state, not unnecessary personal behavior.
- Use existing operational records instead of creating hidden analytics systems.
- Prefer calm indicators over alert walls.
- Make every telemetry signal human-readable and tied to an operational action.
- Treat telemetry as review context, not autonomous scoring or truth authority.

## Privacy Boundaries

- Do not track personal browsing behavior, keystrokes, screen activity or hidden user profiling.
- Do not expose sensitive logs publicly.
- Do not use telemetry to create opaque trust scores.
- Keep provider secrets, Supabase keys and service-role state server-side.
- In-app notifications, audit logs, runtime validation logs and API test results remain operational records for admins and operators.

## Observability Model

Operational visibility is derived from existing system records:

- trust cases created
- evidence uploads
- governance reviews completed
- verification receipts generated
- replay sessions viewed or saved
- unresolved escalations
- onboarding completion
- API test failures
- runtime validation warnings
- integration warning state
- trust integrity anomalies

Founder Control summarizes these indicators as calm operational telemetry. Runtime validation also reads recent API test and runtime validation logs so deployment checks reflect current operational stability.

## Governance Telemetry

Governance telemetry focuses on workflow integrity:

- escalation frequency
- unresolved governance actions
- governance completion counts
- replay review activity
- trust report and receipt generation
- evidence review state
- stale escalation and workflow failure visibility

These indicators help teams assign reviewers, complete evidence checks and preserve timeline continuity. They do not automate governance decisions.

## Integration Telemetry

Integration telemetry tracks whether providers are available, disabled or warning-only:

- Supabase health and protected endpoint reachability
- Stripe availability and webhook readiness
- OpenAI availability and bounded request behavior
- World ID availability
- Email provider availability
- API timeout and failure trends from admin test runs

Optional integrations missing remain WARNING only unless a pilot explicitly depends on that provider.

## Alerting Principles

Alerts should be:

- actionable
- calm
- operational
- human-readable
- tied to a next review step

Avoid:

- noisy duplicate alerts
- false critical states
- vague warnings
- public exposure of raw errors
- personal surveillance framing

## Operational Assumptions

- Runtime validation logs and API test runs are admin-only operational records.
- Founder Control is the internal source of truth for deployment readiness, runtime incidents, workflow health, onboarding progress, unresolved governance, integration warnings and trust integrity anomalies.
- Trust integrity checks surface orphan relationships, replay inconsistencies, missing evidence references and broken governance chains.
- Missing optional integrations should reduce confidence to CAUTION/WARNING, not block the platform.
- Human reviewers remain responsible for approvals, escalations and operational decisions.
