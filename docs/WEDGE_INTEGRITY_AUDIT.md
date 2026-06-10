# Cyber Sentinels Wedge Integrity Audit

Date: 2026-06-10

## Scope

This audit reviewed the existing strategic wedge surfaces without adding duplicate routes, duplicate tables, or rebuilding modules.

Reviewed wedges:

- Hiring Security / Interview Integrity
- AI Agent Identity / Governance
- Provenance-aware Trust Orchestration

Status vocabulary:

- WORKING: End-to-end route/API/table path is present and connected.
- PARTIAL: Core path exists, but one or more downstream trust-fabric links are incomplete.
- BROKEN: Route/API has a compile, import, or disconnected call issue.
- PLACEHOLDER: UI or provider logic is intentionally simulated or not connected to a real external provider.
- DUPLICATED: Duplicate route/table/module competing with the same responsibility.
- UNSAFE: Public or weakly protected access to sensitive workflow data.

## Summary

| Wedge | Status | Notes |
| --- | --- | --- |
| Hiring Security / Interview Integrity | PARTIAL, PLACEHOLDER | Core candidate, recruiter, interview session, report, signal, receipt and replay paths exist. Risk/liveness providers remain placeholder by design. |
| AI Agent Identity / Governance | WORKING, PARTIAL | Agent registration, listing, detail, admin review and APIs exist with session/admin scoping. New registrations now write governance, trust case, receipt, evidence chain and replay context where tables are available. |
| Provenance-aware Trust Orchestration | PARTIAL, PLACEHOLDER | Verification and public-safe media view exist. Provenance scoring remains placeholder, but verification now writes governance, trust case, receipt, evidence chain and replay context. |

No duplicate routes or duplicate tables were created.

## Hiring Security / Interview Integrity

Reviewed routes and APIs:

- `/enterprise/hiring-security`
- `/verify/candidate`
- `/verify/recruiter`
- `/interview/session/[id]`
- `/trust/hiring-report/[id]`
- `/dashboard/interview-risk`
- `/api/candidate/verify`
- `/api/recruiter/verify`
- `/api/interview/create`
- `/api/interview/analyze`
- `/api/interview/report`
- `/api/interview/liveness`

Connected trust fabric:

- Trust cases: interview workflows have migration-level governance/trust-case hooks; creation also records audit and signals.
- Evidence: candidate, recruiter and interview creation generate verification receipts and evidence chains.
- Signals: candidate, recruiter, interview create/report and liveness checks write signals.
- Governance actions: interview workflow migrations create governance actions for review-worthy interview risk.
- Audit logs: candidate, recruiter, interview create/report and liveness checks write audit logs.
- Timelines: trust timeline triggers consume signals, audit logs, trust events and related workflow records.
- Verification receipts: candidate, recruiter and interview create flows generate receipts.
- Replay: interview creation now writes `trust_replay_sessions`; hiring report now displays replay memory.

Findings:

- `/api/interview/liveness` was publicly callable. Fixed by requiring a Supabase session and recording audit/signal context.
- `/trust/hiring-report/[id]` displayed receipts, timeline, governance and evidence-chain relationships, but not replay memory. Fixed by reading and displaying latest replay context.
- Provider checks are still placeholder interfaces. This is acceptable for current wedge positioning but should remain clearly labelled.

Status: PARTIAL, PLACEHOLDER

## AI Agent Identity / Governance

Reviewed routes and APIs:

- `/agents`
- `/agents/[id]`
- `/agents/register`
- `/trust/agent/[id]`
- `/admin/agents`
- `/api/agents`
- `/api/agents/register`
- `/api/agents/verify`
- `/api/agents/activity`
- `/api/agents/[id]`

Connected trust fabric:

- Trust cases: agent registration now best-effort creates a valid trust case using existing columns.
- Evidence: agent registration now creates an evidence chain through the existing receipt bundle helper.
- Signals: agent creation/update and trust event creation write signals.
- Governance actions: agent registration now best-effort creates a governance action.
- Audit logs: agent creation/update and trust event creation write audit logs.
- Timelines: existing trust event, signal and audit triggers populate timeline records.
- Verification receipts: agent registration now creates an agent identity receipt.
- Replay: agent registration now creates an initial replay session.

Findings:

- Session scoping exists for agent APIs. Non-admin users are restricted to owned agents; admins can see broader agent records.
- Admin `/admin/agents` is protected by existing admin page access patterns.
- Agent registration previously emitted trust events, audit logs and signals but did not consistently populate receipt/governance/replay records. Fixed with best-effort writes to existing tables.

Status: WORKING, PARTIAL

## Provenance-aware Trust Orchestration

Reviewed routes and APIs:

- `/verify/provenance`
- `/trust/media/[id]`
- `/api/provenance/verify`
- `/api/provenance/report/[id]`

Connected trust fabric:

- Trust cases: provenance verification now best-effort creates a trust case using existing columns.
- Evidence: provenance verification now creates an evidence chain through the existing receipt bundle helper.
- Signals: provenance verification writes signals.
- Governance actions: provenance verification now best-effort creates a governance action.
- Audit logs: provenance verification writes audit logs.
- Timelines: existing signal and audit triggers populate timeline records.
- Verification receipts: provenance verification now creates a media provenance receipt.
- Replay: provenance verification now creates an initial replay session.

Findings:

- `/api/provenance/verify` required auth and emitted audit/signals, but returned a generated report ID without persistent receipt/replay/governance context. Fixed.
- `/api/provenance/report/[id]` was public and returned placeholder data. Fixed by requiring a Supabase session and returning linked receipt/replay context when present.
- `/trust/media/[id]` remains public-safe by design and does not expose raw evidence or private records.
- C2PA/SynthID/metadata checks remain placeholder factors.

Status: PARTIAL, PLACEHOLDER

## Duplicate Check

No duplicate route families were introduced. Existing adjacent surfaces have distinct responsibilities:

- `/trust/hiring-report/[id]` is the hiring integrity report tied to interview sessions.
- `/trust/interview-report/[id]` remains a separate trust-report view for report records.
- `/agents/[id]` is the operational agent detail view.
- `/trust/agent/[id]` is the public/trust-facing agent context view.
- `/verify/provenance` starts a provenance review.
- `/trust/media/[id]` presents a public-safe media trust view.

Status: no DUPLICATED findings.

## Fixes Applied

- Protected `/api/interview/liveness` with Supabase session auth.
- Added audit/signal records for liveness checks.
- Added replay creation for interview session creation.
- Added replay display to `/trust/hiring-report/[id]`.
- Added agent registration connections to existing governance actions, trust cases, verification receipts, evidence chains and replay sessions.
- Added provenance verification connections to existing governance actions, trust cases, verification receipts, evidence chains and replay sessions.
- Protected `/api/provenance/report/[id]` and connected it to receipt/replay reads.

## Residual Risks

- Hiring liveness, voice mismatch, webcam integrity, C2PA, SynthID and provenance scoring remain placeholders.
- Some best-effort connective writes depend on migrations and RLS being applied in the target Supabase project.
- Trust case linkage is currently descriptive for agent/provenance because the existing `trust_cases` table does not have generic `subject_type` / `subject_id` columns.
- Public-safe media view intentionally avoids raw private evidence; deeper evidence inspection should remain authenticated.
