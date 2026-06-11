# Pilot Readiness Lockdown

Date: 2026-06-11

## Stable Systems

- Core trust workflow is locked around: Trust Case -> Evidence Upload -> Governance Review -> Timeline -> Verification Receipt -> Replay.
- Hiring security workflow is locked around: Candidate Verify -> Interview Session -> Risk Events -> Governance Review -> Hiring Trust Report.
- Runtime validation reports `READY`, `CAUTION` and `BLOCKED` from the admin validation path.
- Public status distinguishes `WARNING` from `FAILURE`; protected Supabase `401` and `403` probes are treated as reachable protected endpoints.
- Stripe, OpenAI and World ID are optional integrations and fail closed into disabled or unavailable states when not configured.
- Admin/founder cockpit shows deployment readiness, runtime validation links, unresolved escalations, pilot readiness, onboarding progress, workflow health and integration warnings.

## Known Warnings

- Optional integrations may be disabled for pilot environments.
- Runtime table validation depends on server-side `SUPABASE_SERVICE_ROLE_KEY`.
- Historical duplicate evidence chains or notifications should be reviewed through trust integrity tooling before external demos with live data.
- Build-time navigation warnings can appear in local environments when Supabase public env vars are absent; production should configure them.

## Disabled Integrations

- Stripe disabled: checkout and customer portal redirect to waitlist or billing-coming-soon paths.
- OpenAI disabled: governance analysis returns unavailable or redirects with a missing-key code.
- World ID disabled: verification remains optional and should not block unrelated workflows.

## Operational Constraints

- Cyber Sentinels is AI-assisted and human-governed. It must not be positioned as an autonomous trust authority.
- Detection, liveness and provenance outputs are signals, not certainty claims.
- Replay is operational memory. It must not mutate audit trails, overwrite governance records or imply historical certainty beyond recorded evidence.
- Verification receipts summarize evidence and review state; they do not replace accountable human decisions.

## Deferred Roadmap

- Production provider onboarding for Stripe, OpenAI and World ID.
- Broader historical cleanup of duplicate notification history after backup and operator approval.
- Provider-backed liveness, provenance and interview-integrity signals beyond placeholder interfaces.
- Expanded customer-specific runtime validation and API regression suites.

## Pilot Assumptions

- Supabase migrations are applied in order before external onboarding.
- Required env vars are configured in production: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
- Optional provider gaps are acceptable as `CAUTION` unless the pilot explicitly needs that provider.
- Founder/admin operators run `/admin/runtime-validation` and review `/admin/founder-control` before onboarding a pilot organization.
- Pilot users understand Cyber Sentinels as Operational Trust Infrastructure for AI-era workflows: Hiring Security, Interview Integrity, Explainable Governance, Evidence Chains, Verification Receipts and Replayable Trust Timelines.
