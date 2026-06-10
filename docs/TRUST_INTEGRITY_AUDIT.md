# Cyber Sentinels Trust Integrity Audit

Date: 2026-06-10

## Scope

This pass reviewed operational trust continuity across existing Cyber Sentinels workflows. It focused on relationship correctness, timeline consistency, auditability, governance continuity and replay accuracy without adding major new product systems.

## Relationship Architecture

Cyber Sentinels uses a small set of existing operational records as the trust spine:

- `trust_cases` represent reviewable trust work.
- `evidence_files` and `evidence_chains` describe supporting material and evidence context.
- `governance_actions` represent human review, escalation and resolution work.
- `verification_receipts` summarize what was reviewed, with confidence and evidence metadata.
- `trust_timeline_events` provide ordered workflow history.
- `trust_replay_sessions` preserve replay summaries without rewriting historical records.
- `trust_relationships` link receipts, evidence chains, governance actions, interview risk events and workflow subjects.
- `notifications` coordinate human review and preserve read/unread state.

Relationships are directional and explainable. A receipt links to its subject, an evidence chain links to its subject, a governance action links to the subject it governs, and risk events link to the interview session they describe.

## Timeline Guarantees

Timeline events are ordered by `created_at` and scoped by `subject_type` plus `subject_id`.

The expected continuity events are:

- `verification_receipt_issued` for verification receipts.
- `evidence_chain_created` for evidence chains.
- `governance_action_created` and `governance_decision_flow_updated` for governance activity.
- `interview_risk_event` for interview risk records.
- `replay_snapshot_recorded` for repair-backed replay continuity.
- `notification_created` where notification triggers create coordination events.

Missing references should not crash user-facing routes. Views should show unavailable, pending, or empty states while operators repair continuity from the admin console.

## Replay Integrity Strategy

Replay is a reconstruction aid, not an authority layer. Replay sessions should preserve:

- subject type and subject id
- generated-by source
- replay summary
- created timestamp

Replay repair backfills missing replay snapshots for interview sessions and adds timeline continuity for replay sessions that already exist. It does not reorder historical timestamps or change workflow decisions.

## Verification Receipt Integrity

Receipts should connect to a valid subject and have:

- receipt type
- verification status
- confidence level
- issued by when a reviewer or user exists
- evidence snapshot
- evidence-chain relationship where available

The repair utility can regenerate missing interview-session receipts for existing sessions. It avoids duplicate receipts when a receipt already exists for the subject.

## Governance Continuity Model

Governance actions preserve human review through:

- `action_status`
- `assigned_to`
- `assigned_by`
- `assigned_at`
- `escalation_chain`
- `resolution_notes`
- timeline events
- audit logs

Governance triggers already record timeline and audit activity on inserts and meaningful updates. The repair utility backfills missing creation timeline events and subject relationships for older or partially written governance actions.

## Notification Integrity

Notifications should remain scoped to a user and workflow context. The audit checks for likely duplicates using:

- user id
- notification type
- title
- metadata subject id
- metadata governance action id

Read and unread state is preserved through existing `read` and `is_read` fields. Repair actions do not delete duplicates automatically because notification read state is user-facing operational history.

## Hiring Security Integrity

Hiring integrity depends on:

- interview sessions linking to candidate and recruiter profiles when provided
- interview risk events linking to interview sessions
- verification receipts linking to interview sessions
- replay sessions preserving interview workflow history
- hiring reports handling missing references gracefully

The audit flags missing candidate, recruiter and session references. Repair backfills missing interview receipts and replay snapshots without asserting detection accuracy.

## Agent Governance Integrity

Agent integrity depends on:

- agent ownership records
- agent activity linked to a valid agent
- trust events, audit logs and governance actions created around risky activity
- receipts and replay sessions for registration flows where available

The audit checks agent activity against both existing `agents` and `ai_agents` tables, because the current codebase has adjacent agent identity surfaces.

## Provenance Integrity

Provenance records should connect to evidence, receipts, governance context and replay summaries where those records exist. Missing provenance context should render as unavailable or pending rather than failing the route or implying authenticity.

Public-safe provenance views must avoid exposing raw private evidence.

## Admin Repair Utilities

Added admin-only repair tools at `/admin/trust-integrity`:

- Run audit
- Rebuild timelines
- Rebuild trust relationships
- Regenerate verification receipts
- Repair replay ordering
- Run all repairs

The repair actions run as admin-only server actions from the protected page. They require service-role Supabase configuration and return safe operator errors when unavailable.

## Operational Trust Assumptions

- Supabase RLS remains the primary data boundary in deployed environments.
- Repair tools are operational backfills, not product workflows.
- Repairs are idempotent and check existing continuity records before inserting.
- Existing decisions, scores and human review outcomes are not overwritten.
- Cyber Sentinels remains explainable and human-governed; generated receipts, timelines and replay summaries support review but do not replace it.

## Deferred Risks

- Some table families use flexible `subject_type` and `subject_id` rather than strict foreign keys; integrity is therefore partly enforced by repair/audit checks.
- Notification deduplication is reported but not automatically deleted to avoid changing read/unread user history.
- Provenance provider checks remain placeholder-level until real provider integrations are enabled.
- Broad production cleanup of historical duplicate relationships should be run only after a backup and operator review.
