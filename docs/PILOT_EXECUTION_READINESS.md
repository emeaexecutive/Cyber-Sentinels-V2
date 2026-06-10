# Cyber Sentinels Pilot Execution Readiness

Date: 2026-06-10

## Purpose

This pass prepares Cyber Sentinels for controlled enterprise design-partner usage. The focus is operational reliability, clear onboarding, workflow trust, enterprise confidence and execution quality without adding major architecture.

## Onboarding Flow

The target first-success path is under 10 minutes:

1. Create organization through `/enterprise/pilot-setup`.
2. Record reviewer/admin invite emails.
3. Create the first trust case inside an isolated pilot workspace.
4. Upload evidence through the existing evidence workflow.
5. Open a pending governance review for the trust case.
6. Generate or backfill an explainable trust receipt when evidence and review context exist.
7. Review timeline and replay from the workspace, timeline and replay surfaces.

The pilot setup flow now creates:

- an isolated `trust_workspaces` record
- an admin `workspace_members` record for the creator
- a first `trust_cases` record
- a pending `governance_actions` record linked to the first case
- audit and launch-control notes for operator traceability

## Workspace Isolation

Pilot workspace isolation depends on existing Supabase RLS:

- workspace owners and members can read their workspaces
- workspace members can read cases in their workspace
- workspace reviewers can create case relationships
- anonymous access is revoked from workspace, case, governance, evidence, timeline and replay tables

Service-role reads are reserved for server-side admin readiness and repair utilities.

## Trust Workflow Guidance

Pilot workflows should show or imply these operator states:

- current state
- next required action
- reviewer status
- governance state
- evidence completeness
- trust receipt availability
- replay and timeline availability

The pilot setup page now states the expected current state and next action before the user enters the workspace, reducing onboarding ambiguity.

## Governance Flow

Governance remains human-led:

- A pending governance review is created for the first pilot case.
- Escalations remain visible in deployment readiness.
- Governance actions should connect to timelines, audit logs and trust relationships through existing triggers and repair tools.
- Resolved, approved and rejected actions count as completed governance reviews for pilot readiness metrics.

AI-assisted analysis may provide context, but it must not become an automated trust authority.

## Replay Flow

Replay is used to reconstruct workflow context:

- case creation starts timeline continuity
- governance activity adds review context
- receipts summarize evidence and confidence metadata
- replay sessions preserve a readable operational summary

Replay ordering should stay timestamp-based and stable. Repair tools can backfill missing replay snapshots without rewriting decisions.

## Escalation Handling

Escalations are operational blockers when unresolved:

- trust cases with `escalated` status require review
- governance actions with `escalated` status require review
- evidence gaps should remain visible as review work, not as failed trust conclusions

Deployment readiness reports unresolved escalations as caution unless runtime or environment blockers exist.

## Operational Metrics

The `/admin/deployment-readiness` view reports lightweight operational metrics:

- cases created
- governance reviews completed
- trust receipts generated
- replay sessions viewed
- unresolved escalations
- onboarding completion
- pilot workspace count

These are aggregate operational counts from existing tables. No invasive analytics or user tracking was added.

## Founder Demo Mode

Founder Demo Mode remains sample-only:

- demo records are tagged with guided-demo metadata
- reset clears demo-tagged records before reseeding
- seeded data demonstrates hiring security, governance, replay, receipts, timelines and interview integrity
- demo records are not intended to mutate production workflows

Operators should continue to describe demo data as sample-only and not representative of real enterprise outcomes.

## Deployment Readiness

New admin route:

- `/admin/deployment-readiness`

It combines:

- runtime validation
- environment readiness
- workflow readiness
- API readiness
- auth readiness
- pilot readiness

Statuses:

- READY
- CAUTION
- BLOCKED

Optional integrations such as Stripe, OpenAI and World ID are warnings when missing unless a dependent workflow is intentionally enabled.

## Operational Assumptions

- Supabase migrations are applied in the target project.
- `SUPABASE_SERVICE_ROLE_KEY` is configured only server-side.
- Admin routes remain protected by middleware and server-side admin checks.
- Workspace isolation depends on RLS and membership policies.
- Trust receipts, timelines and replay support human review; they do not decide trust.

## Deferred Roadmap

- Full reviewer email invitation delivery.
- Dedicated workspace-scoped evidence upload picker.
- More granular workspace-level notification filtering.
- Provider-backed provenance and interview integrity checks.
- Automated backup-before-repair workflow for large production datasets.
