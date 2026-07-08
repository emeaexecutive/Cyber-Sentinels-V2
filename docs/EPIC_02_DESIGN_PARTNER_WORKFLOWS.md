# Epic 02 Design Partner Workflows

Last updated: 2026-07-08

## Purpose

These workflows are polished demonstrations for enterprise design-partner conversations. They use existing surfaces and do not add new product systems.

## Workflow A: Enterprise AI Agent

Demo path: `/enterprise/demo-stories` -> `/demo/agent-tracking-flow` -> `/agents` -> `/dashboard/agent-risk` -> `/trust-replay` -> `/dashboard/governance`.

| Step | Surface | Proof shown |
| --- | --- | --- |
| Register | `/agents` | Agent identity, purpose and registry context. |
| Assign Owner | `/agents/[id]` | Human ownership and accountable enterprise context. |
| Assign Authority | `/agents/[id]` and `/dashboard/access-governance` | Permission scope and authorization lineage. |
| Runtime Monitoring | `/agents/[id]/runtime` and `/dashboard/agent-risk` | Runtime evidence, anomalies and kill-switch readiness boundaries. |
| Trust Score | `/dashboard/trust-posture` | Current posture with explicit confidence boundaries. |
| Replay Timeline | `/trust-replay` | Chronology of events, evidence and trust changes. |
| Governance Decision | `/dashboard/governance` | Review ownership, escalation and final decision rationale. |

Boundary: runtime control remains evidence-backed and reviewable; it does not claim full external agent interruption unless an integration proves it.

## Workflow B: Human Identity

Demo path: `/enterprise/demo-stories` -> `/demo/session-integrity` -> `/verify/session` -> `/trust-replay` -> `/verification-receipts` -> `/dashboard/governance`.

| Step | Surface | Proof shown |
| --- | --- | --- |
| Verification | `/verify/session` | Human/session verification context. |
| Session Integrity | `/dashboard/session-integrity` | Channel, device and session-risk evidence. |
| Continuous Trust | `/dashboard/trust-posture` | Trust changes after entry. |
| Replay | `/trust-replay` | Enterprise memory of the trust path. |
| Evidence | `/verification-receipts` and `/trust/receipt/[id]` | Evidence summary and provider-state boundaries. |
| Decision | `/dashboard/governance` | Human-governed outcome. |

Boundary: verification and session integrity are review evidence, not automatic rejection logic.

## Workflow C: Executive Deepfake

Demo path: `/enterprise/demo-stories` -> `/verification-replay` -> `/admin/provider-status` -> `/trust-replay` -> `/dashboard/governance`.

| Step | Surface | Proof shown |
| --- | --- | --- |
| Media Submitted | `/verification-replay` | Scenario entry and media/provenance context. |
| Evidence Collection | `/trust-replay` | Evidence chain and replay memory. |
| Provider Analysis | `/admin/provider-status` | Connected, Configured, Awaiting Credentials, Offline or Unsupported status. |
| Trust Engine | `/dashboard/trust-posture` | Trust posture and limitations. |
| Governance | `/dashboard/governance` | Reviewer path and decision. |
| Report | `/trust/receipt/[id]` or `/verification/receipt/[id]` | Portable evidence and reviewed outcome. |

Boundary: provider results are normalized trust signals and do not become standalone certainty claims.

## Design Partner Close

The proof point is not that Cyber Sentinels detects everything. The proof point is that consequential human, agent, machine and media workflows become explainable, reviewable and replayable.
