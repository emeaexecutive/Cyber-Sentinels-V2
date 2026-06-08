# Operational Hardening & Trust Readiness

Cyber Sentinels is positioned as AI-assisted, human-governed operational trust infrastructure. The platform supports explainable review, provenance, governance, and operational trust workflows without treating AI output as an autonomous authority.

## Route Protections

Public routes are intentionally limited to marketing, docs, pricing, legal, demo, and public verification surfaces.

Authenticated user routes include:

- `/passport` and `/passports/*`
- `/agents/*`
- `/workspace/*`
- `/governance`
- `/timeline`
- `/trust-replay`
- `/evidence-upload`
- `/messages`, `/notifications`, `/appeals`, `/feedback`

Admin routes require an authenticated admin allowlist and the admin verification cookie:

- `/back-office`
- `/admin/*`
- `/verification-queue`
- `/trust-graph-engine`
- `/mission-control`
- `/signals`
- other protected operational admin surfaces listed in `middleware.ts`

Reviewer boundaries are enforced by `/governance`: authenticated users must be workspace reviewers, workspace owners, or admin allowlisted before governance actions are shown.

## RLS Assumptions

Operational tables revoke anonymous access unless they are explicitly public submission surfaces. The hardening migration reinforces this for major trust tables:

- `passports`
- `evidence_files`
- `audit_logs`
- `signals`
- `trust_relationships`
- `trust_timeline_events`
- `trust_workspaces`
- `workspace_members`
- `trust_cases`
- `trust_case_relationships`
- `governance_actions`
- `governance_policies`
- `ai_agents`
- `subscriptions`

Workspace and case data is scoped to workspace owners or workspace members. Admin-wide operational views should use server-side admin controls and service role clients only from server code.

## Admin Boundaries

Admin access is controlled by `ADMIN_EMAILS` and the `cyber_admin_verified` cookie. If admin configuration is missing, protected admin routes are gated rather than silently exposed.

Service role usage must remain server-side only. Client components must not import service role clients, secret environment variables, or OpenAI keys.

## AI Safety Constraints

AI assistance may summarize operational context, governance gaps, missing evidence, unresolved signals, and provenance history.

AI must not:

- approve or reject passports
- ban users
- mutate trust history
- rewrite timelines or replay records
- create hidden scoring logic
- replace human governance decisions

All AI outputs should remain recommendations or summaries for human review.

## Operational Trust Principles

Cyber Sentinels should remain calm, understandable, and evidence-led:

- Explain why a workflow needs review.
- Preserve audit trails and timeline events.
- Link decisions to evidence, signals, relationships, and governance actions where relevant.
- Keep replay and timeline history immutable.
- Avoid surveillance language and social-scoring framing.
- Prefer clear operational messages over raw database errors.

## Launch Readiness

`/admin/launch-control` reports Ready, Caution, or Blocked across auth, billing, governance, trust workflows, integrations, uploads, and AI assistance.

Launch should be considered blocked when core auth, Supabase, admin protection, enterprise access, uploads, or trust workflow tables are unavailable. Optional APIs such as Stripe, OpenAI, and World ID may remain disabled if the application handles that state safely.
