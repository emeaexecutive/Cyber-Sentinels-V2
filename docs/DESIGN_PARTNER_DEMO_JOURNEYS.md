# Design Partner Demo Journeys

These journeys use existing routes and engines. They are demo paths for enterprise buyers, not new product surfaces.

## Journey 1: Synthetic Applicant

| Step | Route or Engine | Evidence |
| --- | --- | --- |
| Synthetic applicant | `/enterprise/hiring-security`, `/interview/session/[id]` | Candidate/session context and claimed identity. |
| Detection | Provider readiness and ML status surfaces | Source labels, credential state, limitations and confidence. |
| Replay | `/replay/[id]`, `/trust-replay` | Who acted, what changed, evidence available and trust evolution. |
| Governance | `/dashboard/governance`, `/admin/reviews` | Reviewer decision, escalation owner and override reason. |
| Evidence | `/trust/receipt/[id]`, `/verification/receipt/[id]` | Evidence chain and receipt export. |
| Decision | `/workspace/[id]` or dashboard workflow view | Final workflow state with limitations retained. |

## Journey 2: AI Agent

| Step | Route or Engine | Evidence |
| --- | --- | --- |
| Registration | `/agents/register`, `/api/agents/register` | Agent identity, owner and authority scope. |
| Runtime | `/agents/[id]/runtime`, runtime trust engine | Actions, anomalies, permissions and blast radius. |
| Trust posture | `/dashboard/trust-posture`, `/trust/posture` | Posture changes and evidence references. |
| Replay | `/trust-replay`, `/replay/[id]` | Authorization lineage and operational memory. |
| Kill-switch | Agent runtime control and governance queue | Revocation state, reviewer and reason. |

## Journey 3: Executive Deepfake

| Step | Route or Engine | Evidence |
| --- | --- | --- |
| Evidence | `/evidence-upload`, evidence APIs | Uploaded media, provenance and source context. |
| Media provenance | C2PA/provenance verification routes | Metadata present, missing or conflicting. |
| Trust report | `/api/trust-reports`, receipts and replay | Evidence summary, limitations and review state. |
| Executive dashboard | Protected dashboard/admin route | Executive-level posture, governance action and next step. |

## Demo Rules

- Demo data must be labeled as demo or simulated.
- Provider output must show credential state and limitations.
- Replay must preserve authority, evidence and governance state.
- No demo may claim production accuracy without reviewed dataset evidence.
