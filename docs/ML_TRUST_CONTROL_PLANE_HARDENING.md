# ML Trust Control Plane Hardening

## Current ML maturity

Cyber Sentinels is at **Level 2 — Provider-ready foundation**. Explainable deterministic signals, provider interfaces, governance workflows, evidence receipts, and replay are implemented. No first-party trained ML inference is active. The baseline is labelled **Heuristic Baseline / `baseline_model_assisted`** and must not be represented as real ML.

## Provider readiness

Reality Defender, Sensity, Pindrop, Veriff, Onfido/Entrust, World ID, Stripe Identity, C2PA, and SynthID are represented through the existing provider registry. Every adapter reports one of `Live`, `Simulated`, `Awaiting Credentials`, or `Disabled`. Credentials alone never produce a live state: a reviewed endpoint implementation is also required. Current placeholder adapters make no network call and return no fabricated inference.

## Benchmark status

The benchmark harness loads labelled cases from `data/validation`, preserves source-specific results, and reports confusion matrix, precision, recall, F1, reviewer agreement, provider agreement, case count, false-positive/false-negative case IDs, and detection-source coverage. When no approved dataset exists it returns: **“No validation dataset available yet.”** No accuracy claim is permitted in that state.

## Heuristic baseline

The explainable baseline can surface repeated verification failures, device/session mismatch, impossible workflow velocity, missing or conflicting provenance, virtual-camera indicators, emulator or tampered-app indicators, document conflict, agent runtime anomalies, and authorization anomalies. Each result includes source, confidence, evidence, and limitations. These weighted rules support review; they are not trained ML or final authenticity decisions.

## Agent and NHI governance readiness

AI agents are governed operational identities. Registration evidence records agent identity, human authority, owner mapping, authorization lineage, least-privilege permissions, runtime risk, blast radius, kill-switch state, review state, and replay linkage. Signed action receipts remain evidence-backed: cryptographic signing is never asserted without a signature reference.

## Session and injection integrity

Session evidence keeps liveness, deepfake risk, injection risk, device/channel integrity, virtual-camera risk, emulator risk, tampered-app risk, and manual review separate. Missing provider evidence stays pending rather than being converted into a clean or detected state.

## AI sovereignty controls

- Restricted operational data egress is blocked.
- PII, secrets, credentials, evidence identifiers, and tokens are redacted before permitted provider use.
- Provider-policy decisions emit audit metadata and require interaction tracking.
- Provider training and external retention are disabled by default.
- Operational memory and replay remain customer-owned.

## Replay as enterprise memory

Replay reconstructs actor, workflow, evidence continuity, authorization lineage, governance state, trust change, detection sources, and final operational outcome. It is persistent operational memory, not merely an activity viewer.

## Regulated workflow readiness

The control plane is designed for governed fintech, insurance, banking, healthcare, hiring, claims, onboarding, approval, and AI-agent workflows. Readiness means policy enforcement, attributable review, provider truth, receipts, and reconstructable evidence; it does not imply regulatory certification or validated ML accuracy.

## Remaining gaps to reach 65–80% ML maturity

1. Curate and approve representative labelled datasets by workflow and risk cohort.
2. Complete at least one reviewed provider endpoint with redaction, audit logging, retention controls, health checks, and failure handling.
3. Run reproducible benchmarks and publish bounded precision, recall, F1, false-positive, and false-negative results with dataset scope.
4. Establish reviewer-agreement baselines and adjudication procedures.
5. Calibrate thresholds per regulated workflow and document drift monitoring.
6. Add signed provider/action receipt verification where supported.
7. Complete security, privacy, model-risk, and customer-control reviews before production claims.
