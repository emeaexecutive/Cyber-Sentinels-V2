# Real Usage Validation

Cyber Sentinels was reviewed as an operational trust platform for realistic pilot usage. The validation focus was workflow reliability, explainability, runtime consistency and controlled enterprise onboarding, without adding major product systems or speculative architecture.

## Validated Workflows

### Flow A: Trust Workflow

Expected path: create trust case -> upload evidence -> trigger governance review -> escalate issue -> generate verification receipt -> review replay timeline.

Validated behavior:
- Trust cases remain the operational container for evidence, governance actions, timeline events, receipts and replay.
- Evidence upload is linked to review context and should render as available evidence or a clear pending state.
- Governance review and escalation states remain visible in Founder Control and governance surfaces.
- Verification receipts explain evidence, signals and human-governance context rather than asserting absolute truth.
- Replay timelines are ordered by creation time after snapshot filtering, so newest-first database reads do not create replay inconsistencies.

### Flow B: Hiring Security

Expected path: verify candidate -> create interview session -> generate risk events -> trigger governance review -> generate hiring trust report.

Validated behavior:
- Candidate and interview records are treated as review context, not automated hiring decisions.
- Interview risk events explain the signal source, confidence state, escalation requirement and review reason.
- Hiring trust reports surface current state, next step, evidence chain, governance decisions, timeline context and replay memory.
- Human governance remains explicit: AI can summarize context, but it does not reject candidates or replace accountable hiring review.

### Flow C: Agent Governance

Expected path: register AI agent -> log activity -> trigger governance signal -> generate explainable trust state.

Validated behavior:
- Agent registration writes trust context where configured tables are available.
- Agent activity, audit logs, signals, governance context, receipts and replay remain best-effort operational records.
- Missing downstream records should render as pending or unavailable rather than crashing the workflow.
- Trust state remains explainable through signals, evidence, governance actions and replay context.

## Runtime Assumptions

- Supabase URL and anon key must be configured for authenticated runtime usage.
- Supabase service role must remain server-side only.
- Stripe, OpenAI and World ID are optional for pilot validation and should show warnings when disabled.
- Protected endpoints may return 401 or 403 and still be reachable; this is not an outage.
- Invalid links, stale sessions and missing optional APIs should return safe login, unavailable or warning states.
- Runtime pages should distinguish WARNING from FAILURE and avoid raw server errors, stack traces or sensitive environment values.

## Known Warnings

- Local builds may warn when `NEXT_PUBLIC_SUPABASE_URL` or `NEXT_PUBLIC_SUPABASE_ANON_KEY` are not present in the shell environment.
- Optional integrations can remain disabled during controlled pilots if the operator-facing status surfaces show WARNING rather than BLOCKED.
- Replay is operational memory, not a cryptographic attestation system.
- Trust scoring is an explainability aid and should be reviewed with evidence, governance actions and timeline context.

## Pilot Constraints

- A pilot organization should be able to onboard, create a workspace, upload evidence, complete governance review, generate a trust receipt and review replay within 10 minutes when environment variables, migrations and admin access are configured.
- Founder Control is the operational source of truth for readiness, runtime warnings, unresolved escalations, workflow failures, onboarding progress, integrations and trust integrity issues.
- Public positioning should remain: Operational Trust Infrastructure for AI-era workflows.
- Hiring Security must communicate Interview Integrity, Candidate Provenance, Explainable Governance, Human-Governed Review, Evidence Chains and Replayable Trust Timelines.

## Deferred Roadmap

The following remain explicitly deferred during pilot readiness:
- advanced biometrics
- autonomous trust systems
- full C2PA integrations
- cryptographic attestation systems
- advanced ML scoring
- large-scale orchestration infrastructure

## Remaining Operational Risks

- Missing or stale production environment variables can reduce runtime confidence until configured and verified.
- Incomplete pilot data can produce caution states for trust integrity, receipts or replay even when routes are healthy.
- Optional integration warnings must be explained to pilot operators so they are not mistaken for platform failures.
- Human review ownership must be maintained operationally; Cyber Sentinels provides workflow evidence and replay, not autonomous trust authority.
