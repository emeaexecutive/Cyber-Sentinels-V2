# Enterprise Operational Freeze

Cyber Sentinels is frozen for controlled pilot rollout as Operational Trust Infrastructure for AI-era workflows. This freeze protects reliability, workflow integrity, explainability, deployment confidence and enterprise readiness.

## Stable Systems

- Trust workflow: trust case -> evidence -> governance -> timeline -> verification receipt -> replay.
- Hiring Security: candidate -> interview session -> risk event -> governance review -> hiring trust report.
- Agent governance: agent registration, activity context, governance signals and explainable trust state.
- Provenance orchestration: media and source context are treated as review signals, not proof of truth.
- Evidence chains, verification receipts, trust timelines and replay sessions are operational memory for human review.
- Runtime validation, deployment readiness, status checks and Founder Control are the operational confidence surfaces.
- Notifications remain operational context and should not be bulk-mutated without operator review.

## Known Warnings

- Optional integrations can be disabled during pilots and should remain WARNING, not BLOCKED: Stripe, OpenAI and World ID.
- Protected Supabase endpoints can return 401 or 403 while still being reachable and correctly protected.
- Local builds may warn when `NEXT_PUBLIC_SUPABASE_URL` or `NEXT_PUBLIC_SUPABASE_ANON_KEY` are not present in the shell environment.
- Historical duplicate notification or relationship records should be reviewed through trust integrity tooling before production cleanup.
- Incomplete pilot data can surface caution states for receipts, replay or trust integrity even when routes are healthy.

## Deferred Scope

The deferred roadmap remains intentionally excluded from this freeze:

- autonomous trust systems
- advanced biometric truth engines
- cryptographic attestation infrastructure
- full C2PA integrations
- black-box ML scoring
- advanced ML scoring
- large-scale orchestration infrastructure

These items must not be partially implemented during pilot hardening. See `docs/DEFERRED_SCOPE.md` for the standing scope registry.

## Operational Assumptions

- Supabase URL and anon key are configured for runtime client access.
- Supabase service-role access is used server-side only for admin and operational repair paths.
- Admin routes remain admin-only; public routes remain public.
- Missing optional providers degrade to unavailable, waitlist or warning states without crashing workflows.
- Runtime pages avoid raw stack traces, raw server errors and sensitive environment values.
- Replay ordering is timestamp-based and deterministic after snapshot filtering.

## Pilot Constraints

- A pilot organization should be able to onboard, create a workspace, upload evidence, govern workflows, generate a trust receipt and review replay without engineering intervention.
- Target onboarding time remains 10 minutes when environment variables, migrations and admin access are configured.
- Founder Control is the single operational source of truth for deployment readiness, runtime validation, workflow health, onboarding state, unresolved escalations, trust integrity warnings and integration warnings.
- Trust reports must show evidence, signals, reviewer actions, governance state, escalation state and timeline continuity.

## Remaining Risks

- Missing production environment variables can reduce runtime confidence until configured and verified.
- Human review ownership is an operational process and must be maintained by the pilot organization.
- Optional integration warnings may need explanation during stakeholder walkthroughs.
- Historical data cleanup should be performed only after backup and operator approval.
- Trust scores remain explainability aids; they must not be presented as autonomous truth or binary authenticity decisions.

## Governance Philosophy

Cyber Sentinels is AI-assisted and human-governed. The platform coordinates evidence, signals, governance actions, receipts, timelines and replay so operators can understand what happened, what evidence exists, who reviewed it, what happens next and whether escalation is required.

The platform does not decide trust autonomously, does not claim fake certainty and does not position itself as a surveillance system. Receipts and replay support accountable review; they do not replace it.
