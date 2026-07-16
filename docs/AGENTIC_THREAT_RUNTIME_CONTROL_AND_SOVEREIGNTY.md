# Agentic Threat Runtime Control and Sovereignty

Cyber Sentinels verifies who or what acted, under whose authority, what was accessed, and why the action was allowed, reviewed or blocked.

## Agentic Threat Model

AI agents can now act across SaaS tools, internal workflows, data stores, ticketing systems, developer tools and provider APIs. The relevant risk is not only whether an identity exists, but whether the runtime action stayed inside authority and permission boundaries.

Cyber Sentinels tracks reviewable evidence for:

- credential sweep patterns
- sensitive-data discovery
- unusual tool sequences
- unexpected outbound actions
- permission boundary violations
- repeated failed authorization
- large data access
- unknown agent runtime context

These are explainable runtime events. They are not ransomware detection, malware attribution or confirmed compromise unless a separate provider or forensic system supplies evidence.

## NHI Governance Model

Non-human identities should remain connected to:

- owner mapping
- human owner or accountable organization
- credential type
- access scope
- orphaned status
- linked agent
- authorization lineage
- delegated constraints
- expiry and revocation status
- runtime escalation state

This pass extends existing agent, trust, replay and governance structures. It does not create a duplicate NHI database or parallel route family beyond the explicitly requested route surfaces.

## Permission Boundary Model

Runtime action is compared against declared purpose, delegated authority, permission scope, accessed resource and workflow sensitivity.

Boundary states:

- `within_scope` - action appears aligned with declared authority.
- `overbroad` - action may be too broad and should be reviewed.
- `violation` - action crosses a declared boundary and should escalate or block.
- `unknown` - evidence is insufficient for reliance.

The system can recommend allow, review, escalation, step-up authority or block. Human governance remains authoritative for escalated and blocked states.

## Credential Exposure Risk Model

`lib/security/credential-exposure-risk.ts` evaluates heuristic signals for:

- exposed token pattern placeholders
- high-scope credential flags
- orphaned credential flags
- unusual credential usage
- agent access to sensitive secrets
- outbound action with credential risk

Labels:

- `Heuristic Baseline`
- `Runtime Intelligence`

These signals do not confirm compromise. Raw secrets, provider tokens and credential values must not be displayed or persisted in summaries.

## Suspicious Agent Behavior Events

`lib/agents/agent-behavior-events.ts` defines source-labelled, replayable and governance-reviewable events:

- `credential_sweep_pattern`
- `sensitive_data_discovery`
- `unusual_tool_sequence`
- `unexpected_outbound_action`
- `permission_boundary_violation`
- `repeated_failed_authorization`
- `large_data_access`
- `unknown_agent_runtime`

Each event includes explanation, severity, evidence references, source labels and limitations.

## Kill-Switch Policy

Kill-switch states are:

- `not_recommended`
- `review_kill_switch`
- `kill_switch_recommended`
- `kill_switch_activated_placeholder`

Every block or kill-switch recommendation must preserve current evidence, write audit context, write Replay context, create governance review and show human reviewer status where applicable. Tenant retention, legal hold, approved deletion and redaction remain governed; removal creates a tombstone rather than silently rewriting history.

`kill_switch_activated_placeholder` means the runtime record can represent activation state, but it is not proof that an external agent runtime was interrupted unless a governed integration supplies evidence.

## Replay Evidence Model

Replay should preserve:

- agent
- human owner
- delegated authority
- permission boundary
- action intent
- accessed resources
- credential/API-key risk
- suspicious behavior event
- trust decision
- allowed, reviewed, escalated or blocked outcome
- governance action
- source labels
- limitations

`lib/trust-replay/replay.ts` now includes agentic runtime fields in canonical memory so agentic events remain reconstructable with the rest of the trust record.

## AI Sovereignty and Provider Control

Cyber Sentinels gives enterprises control over AI providers, operational memory, identity signals and workflow evidence.

Sovereignty controls include:

- provider independence
- customer-owned operational memory
- customer-owned identity signals
- local/control-plane readiness
- restricted-data controls
- provider audit trail
- no single AI provider dependency

Provider output remains evidence. It does not replace accountable enterprise policy, human ownership or governance review.

## Heuristic vs Provider vs ML

| Capability | Current label | Boundary |
| --- | --- | --- |
| Credential exposure risk | Heuristic Baseline / Runtime Intelligence | Reviewable risk signal, not confirmed compromise. |
| Agent behavior events | Heuristic Baseline / Runtime Intelligence | Explainable event routing, not autonomous attribution. |
| Provider evidence | Provider API | Only when a live provider supplies normalized evidence. |
| First-party ML | Not claimed | No trained proprietary threat model or ransomware detector is claimed. |
| Reviewed outcomes | Governance evidence | Human adjudication supports calibration, not automated certainty. |

## Remaining Validation Gaps

- Real enterprise agent activity is needed to validate risk weights.
- Provider-specific runtime integrations need credential, timeout and audit validation.
- Kill-switch activation requires external runtime integration evidence.
- Credential exposure heuristics need reviewed false-positive and false-negative analysis.
- Queue durability and replay volume need pilot traffic before heavier worker infrastructure.
- Restricted-data egress controls must remain enforced before live provider calls.
