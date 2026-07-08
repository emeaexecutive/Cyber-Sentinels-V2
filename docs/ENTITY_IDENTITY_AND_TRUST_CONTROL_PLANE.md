# Entity Identity and Trust Control Plane

Cyber Sentinels identifies humans, AI agents, machine identities and regulated workflows before routing them through the trust control plane.

## Entity Model

The canonical model lives in `lib/core/entity-identity.ts`.

Every entity includes:

- `id`
- `type`
- `owner`
- `authority`
- `verification_status`
- `trust_posture`
- `evidence_refs`
- `replay_refs`
- `governance_status`
- `risk_level`

Supported entity types are `human`, `ai_agent`, `machine_identity` and `regulated_workflow`.

## Human Identification

Human context can include Supabase auth user ID, email verification, phone/MFA status, proof-of-human provider status, device/session continuity, geo/session risk and manual review status.

## AI Agent Identification

AI agent context can include agent registry ID, agent name, owner organization, human authority, delegated permissions, signed action receipts, runtime session status and kill-switch status.

## Machine Identity Identification

Machine identity context can include service account, API key placeholder, OAuth app placeholder, certificate placeholder, token scope, credential owner, expiry/rotation status, orphaned status and linked agent or workflow.

Placeholders do not claim live provider integrations or credential inspection.

## Regulated Workflow Identification

Regulated workflow context can include workflow type, data sensitivity, policy requirement, approval requirement, replay requirement, evidence requirement, regulatory context placeholder and governance owner.

## Engine Integration

Entity identity is normalized once and can travel through:

- `trustEngine.calculateTrustPosture`
- `runtimeEngine.evaluateRuntime`
- `runtimeEngine.executeRuntimeWorkflow`
- `replayEngine.buildReplayEvidenceMemory`
- `replayEngine.buildEntityReplaySurface`
- `governanceEngine.routeGovernanceDecision`
- `governanceEngine.evaluateGovernancePolicy`
- `mlValidationEngine.runMlValidationEngine`

The entity context supports the decision engine and workflow executor through the trust and runtime engine facades. It does not create a separate trust calculation path.

## Replay Surface

Replay exposes:

- entity type
- authority
- evidence
- trust posture
- decision
- outcome

Replay remains the operational memory. It explains what happened and preserves context; it does not guarantee authenticity, biometric certainty or regulatory compliance.

## ML and Provider Boundary

Entity identity does not imply real ML capability. ML readiness still separates Real ML, Provider API, Heuristic Baseline, Awaiting Credentials and Not Implemented. Provider placeholders remain placeholders until real credentials and adapters exist.

## Security Boundary

This pass does not weaken auth, RLS or admin controls. It does not expose secrets, provider keys or raw tokens. Entity identity carries references and governed summaries, not sensitive credential material.
