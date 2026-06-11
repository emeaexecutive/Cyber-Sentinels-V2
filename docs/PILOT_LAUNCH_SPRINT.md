# Cyber Sentinels Pilot Launch Sprint

Date: 2026-06-11

## Objective

Finalize Cyber Sentinels as a stable operational alpha for controlled enterprise pilot usage. This sprint focused on reliability, workflow quality, onboarding clarity, operational readiness and deployment confidence without adding major architecture.

## Workflow Architecture

The alpha workflow spine is:

1. Trust case
2. Evidence upload
3. Governance review
4. Timeline event
5. Verification receipt
6. Replay session

Trust cases live inside workspaces. Evidence, governance actions, receipts, timeline events, replay sessions and relationships are linked by subject type and subject id where existing tables support it. Missing downstream records should produce empty or pending states rather than route failures.

## Hiring Security Workflow

The hiring workflow is:

1. Candidate verification
2. Recruiter verification
3. Interview session
4. Risk events
5. Governance review
6. Hiring trust report

Candidate and recruiter records remain review context, not automated hiring decisions. Interview integrity events are linked to interview sessions and can trigger governance review, receipts, replay and timeline context.

## Governance Principles

- Humans decide. AI-assisted analysis may summarize or recommend review, but it does not approve, reject or decide trust.
- Governance actions preserve status, assignment, escalation and resolution notes.
- Escalated trust cases and governance actions remain visible until resolved.
- Optional providers such as OpenAI, Stripe and World ID are warnings when not configured, not platform outages.

## Replay Model

Replay is operational memory. It reconstructs context from evidence, signals, decisions, audit logs, relationships, timeline events and replay sessions.

Replay must not:

- rewrite history
- delete audit records
- override governance decisions
- claim immutable truth

Replay ordering remains timestamp-based. Repair tooling can backfill missing replay continuity without changing decisions.

## Trust Receipt Model

Verification receipts summarize:

- subject type and id
- receipt type
- verification status
- confidence metadata
- issuing user or process
- evidence snapshot

Receipt creation is now idempotent for the same subject and receipt type to reduce duplicate operational actions.

## Auth Assumptions

Supabase auth remains the identity layer. The app handles:

- signup and login
- email callback
- logout
- password reset
- stale sessions
- expired or invalid callback links

Protected routes redirect to login or admin denial gates instead of exposing stack traces.

## Admin And Security Assumptions

- `/admin/*` is protected by middleware and server-side admin checks.
- Founder Control, deployment readiness, runtime validation and trust integrity tools are admin-only.
- Uploads require authenticated users and validate case id, file presence, size and file type.
- Service-role access is server-only.
- Supabase RLS must be applied in the target project before pilot use.

## Operational Readiness

The founder/operator path is:

- `/admin/founder-control` for cockpit overview and demo controls
- `/admin/deployment-readiness` for pilot readiness
- `/admin/runtime-validation` for route, auth, provider and workflow checks
- `/admin/trust-integrity` for relationship, receipt, replay and timeline repair
- `/enterprise/pilot-setup` for first pilot workspace and trust case

Founder Control now links directly to deployment readiness and runtime validation.

## Pilot Onboarding

The 10-minute onboarding path is:

1. Create pilot workspace.
2. Record reviewer/admin invite list.
3. Create first trust case.
4. Open pending governance review.
5. Upload evidence.
6. Review governance state.
7. Generate or inspect trust receipt.
8. Review replay and timeline.

The pilot setup flow now creates the first pending governance review so the user has a clear next operational step.

## Runtime Constraints

The alpha should degrade gracefully when:

- Supabase is temporarily unavailable
- optional provider keys are missing
- records are missing
- workflow references are invalid
- protected endpoints return `401` or `403`

Protected `401` and `403` responses are access-control signals, not Supabase outages.

## Deferred Roadmap

- Real reviewer invitation delivery.
- Workspace-scoped evidence selection during pilot setup.
- More granular tenant policies for every operational table.
- Provider-backed provenance and interview integrity checks.
- Backup-aware bulk repair tools for larger production datasets.
- Cleaner separation between demo, pilot and production records in operator reports.
