# Provider Readiness Matrix

Provider readiness is evidence for controlled operation, not proof of detection accuracy. Credentials alone do not make a provider live.

## Release 1.0 RC1 decision

Hopae Connect is the production-candidate provider in approved external `Test` maturity (internal runtime `Test Mode`): session creation, signed/timestamped/idempotent callback, status re-fetch, provider-neutral normalization, evidence-quality gating and atomic proof continuity are implemented and fixture-tested. Credentials were not present in this checkout, so the deployed state remains `Awaiting Credentials` until configured and successfully checked. Stripe Identity and World ID remain prototypes. Turnstile is supporting abuse control, never identity proof.

RC6 retains `Live` only when `release_evidence_checks` contains a passed `real_target_environment_flow` with a target environment, timestamp and evidence reference, plus a reviewed provider outcome. Current RC6 state: **Awaiting Credentials; no real retained execution**.

ERM priority order for real integrations:

1. World ID
2. Stripe Identity
3. Veriff
4. Reality Defender
5. Sensity
6. C2PA verification

| Area | Current State | Evidence | Gap | Next Action |
| --- | --- | --- | --- | --- |
| Credential state | Provider readiness reports credential presence and runtime state. | `lib/providers/provider-readiness.ts`, `lib/providers/provider-orchestrator.ts`. | Missing credentials or configured-but-unreviewed adapters remain unavailable for production reliance. | Keep provider-facing maturity constrained to Production, Sandbox, Awaiting Credentials, Prototype and Disabled; retain timeout/failure only as internal telemetry. |
| Health | Readiness now includes healthy/degraded/blocked health labels. | Provider checks mark live/configured/missing states without implying production accuracy. | No durable provider health history exists yet. | Persist health snapshots only after pilot provider traffic exists. |
| Latency | Provider orchestration returns `latencyMs`; readiness exposes p95 placeholders. | Runtime pipeline records provider latency samples through `runtime-profiler`. | p95 is not measured until enough samples exist. | Record provider p50/p95 under pilot workflows. |
| Supported features | Provider readiness exposes `supportedFeatures`. | Orchestrator includes category and purpose; detection providers expose supported signals. | Verification providers need more granular signal taxonomy. | Normalize supported features per provider adapter before enabling live output. |
| Limitations | Provider readiness exposes limitations as first-class output. | Each provider states credential, workflow, benchmark and data-handling boundaries. | Limitations need reviewer confirmation for live workflows. | Keep limitations visible in replay, receipts and admin readiness views. |
| Normalized output | Provider result includes normalized evidence and limitations. | `normalizedEvidence`, source, confidence, workflow reference and credential state. | Raw provider payloads are intentionally not exposed. | Keep raw result unavailable by default unless protected audit storage is approved. |
| Timeout handling | Provider calls are isolated with timeouts. | `orchestrateProviders` and parallel signal runner. | Timeout samples are not yet reviewed at scale. | Compare timeout rates under pilot traffic. |
| Retry logic | Explicitly not marked mature. | Provider readiness reports `retryLogicImplemented: false`. | Retrying external identity/media providers can increase latency and duplicate cost. | Add idempotent retry only for reviewed providers with documented retry policy. |
| Audit logging | Readiness tracks audit logging and replay integration. | Active replay-integrated providers are treated as stronger evidence. | Some placeholder providers are not audit-ready. | Require replay or receipt evidence before provider output affects trust decisions. |

Readiness summary:
- Current provider layer is suitable for controlled pilot evaluation.
- It is not yet suitable for public accuracy claims.
- Live provider enablement should require credential setup, timeout evidence, audit logging, restricted-data review, reviewed dataset comparison and replay linkage.

## Adapter Audit

| Provider | Signal Area | Current State | Readiness Gap | Next Action |
| --- | --- | --- | --- | --- |
| Reality Defender | Media forensics | Adapter exposes credential checks, status and normalized result shape. | Live inference and reviewed benchmark evidence are not assumed. | Validate one workflow with provider output, timeout telemetry and reviewed outcome. |
| Sensity | Media forensics | Adapter is tracked as a provider signal source. | No public accuracy claim or reviewed live path. | Keep disabled/awaiting credentials until endpoint and data handling are reviewed. |
| Pindrop | Voice | Adapter is represented for synthetic voice risk. | Voice benchmark coverage and reviewer outcomes are incomplete. | Add reviewed voice cases before using output in calibration. |
| Document Forensics | Document | Adapter supports document-risk normalization. | Document fraud dataset and provider comparison are incomplete. | Add reviewed document cases and provider agreement evidence. |
| Onfido | Identity/document | Future or credential-gated adapter. | Credentials and workflow gating do not prove readiness. | Review endpoint, restricted-data handling and audit logging before live use. |
| Veriff | Identity/document | Future or credential-gated adapter. | No production readiness without reviewed workflow evidence. | Validate identity/document evidence against replay and governance flows. |
| World ID | Proof of personhood | Optional proof-of-personhood signal. | Action configuration and workflow use remain gated. | Keep as one signal, not proof of trust or authenticity. |
| Stripe Identity | Identity | Optional identity verification source. | Server key presence does not equal workflow readiness. | Validate workflow-specific setup and replay evidence before reliance. |
| C2PA | Provenance | Provenance signal adapter is represented. | Provenance is not proof of realness. | Keep provenance as review evidence and track missing/conflicting metadata. |
| SynthID | Provenance | Synthetic-media provenance signal is represented. | Coverage depends on supported media and metadata availability. | Compare against reviewed media cases when available. |
| Hopae Connect | eID verification | RC1 path includes safe session creation, signed callback, normalization, quality gate, authority/policy, atomic Replay/Graph/Memory/receipt persistence and approved fixtures. RC6 strengthens retained ledger fields. | Deployment credentials, applied RC6 migration, real target flow and reviewed pilot evidence remain. | Apply migrations, configure approved target credentials, retain the complete real flow, then review the result before using `Live`. |
| Cloudflare Turnstile | Bot protection | Active server-form protection when configured. | Bot challenge evidence is not identity trust. | Keep separate from identity, session and workflow trust. |
| Persona | Future identity adapter | Placeholder/future adapter. | Not implemented for production workflow use. | Keep disabled until credentials, workflow and audit design are approved. |
| Entrust | Future identity/document adapter | Placeholder/future adapter. | Not implemented for production workflow use. | Keep disabled until endpoint behavior and restricted-data controls are reviewed. |
| Fingerprint / device risk | Device risk | Placeholder enrichment source. | Not connected to reviewed workflow trust. | Enable only after consent, privacy and replay evidence review. |
| External verification source | Fallback | Safe fallback for unattributed provider evidence. | Disabled until supported provider ID is attached. | Require recognized provider identity before use in trust decisions. |
