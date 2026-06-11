# Controlled Pilot Activation

Cyber Sentinels pilot activation is designed for controlled enterprise evaluation. The goal is operational learning with isolated pilot workspaces, human governance, clear replay, and calm failure handling.

## Onboarding Flow

1. Create a pilot organization workspace with one of four states: `internal`, `invited`, `active`, or `suspended`.
2. Add reviewer contacts for controlled invitation and assign the creator as the initial workspace admin.
3. Create the first trust case inside the isolated pilot workspace.
4. Upload evidence to the trust case.
5. Complete human governance review.
6. Generate a verification receipt after evidence and review context exist.
7. Review the timeline and replay before external handoff.

Pilot setup seeds the first operational path so teams can reach a meaningful workflow quickly without relying on production shortcuts.

## Governance Workflow

Pilot workspaces receive default governance templates for evidence completeness, governance completion, and replay consistency. These templates create human review context; they do not automate trust decisions.

Governance actions should remain tied to trust cases, evidence, timelines, audit logs, and verification receipts. Suspended pilot organizations should be treated as operational cautions until a founder or admin reactivates them.

## Replay Workflow

Pilot setup creates a sample replay structure for the first trust case:

- trust case created
- evidence uploaded
- governance reviewed
- timeline generated
- verification receipt generated
- replay reviewed

Replay is an explanatory view over recorded workflow state. It must not rewrite history or replace human review.

## Operational Assumptions

- Pilot organizations are isolated through workspace membership and existing RLS boundaries.
- Service-role credentials remain server-side only.
- Optional providers such as Stripe, OpenAI, and World ID may be safely disabled during pilots.
- Supabase 200, 401, and 403 responses from REST indicate endpoint reachability; protected access is evaluated separately.
- Runtime failures should show calm operator states rather than raw stack traces.

## Pilot Constraints

V1 is intentionally constrained:

- Cyber Sentinels is not a biometric truth engine.
- Cyber Sentinels is not an autonomous trust authority.
- Cyber Sentinels does not guarantee deepfake detection.
- AI-assisted review does not decide trust outcomes.
- Human review is required for governance conclusions.
- Verification receipts explain recorded evidence and workflow context; they are not absolute proof.
- Replay is operational memory, not a forensic guarantee.

## Deployment Assumptions

Deployment readiness is considered acceptable when the app renders, Supabase URL and anon key exist, the Supabase endpoint is reachable, and core protected routes are not publicly exposed. Missing Stripe, OpenAI, or World ID configuration should be warnings unless a pilot explicitly depends on that provider.

## Deferred Roadmap

- Formal organization lifecycle table if pilot volume requires richer state transitions.
- Dedicated invitation management for reviewers and admins.
- Workspace-level analytics beyond lightweight operational counts.
- Deeper evidence retention policy controls.
- External admin approval workflow for pilot state changes.
