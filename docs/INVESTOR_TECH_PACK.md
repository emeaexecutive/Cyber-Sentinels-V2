# Investor Tech Pack

Cyber Sentinels is moving into Enterprise Readiness Mode: fewer features, stronger proof, clearer limitations and higher operational confidence.

## Architecture

The platform is organized around trust execution, replay, governance, provider orchestration, validation and protected enterprise workflows. The strongest architecture spine is:

- Trust Engine: evaluates workflow trust from evidence and policy.
- Runtime Pipeline: coordinates provider signals, trust calculation, replay and governance side effects.
- Replay Engine: preserves operational memory and evidence lineage.
- Governance Engine: routes exceptions, reviewer actions and escalation outcomes.
- Provider Orchestrator: normalizes external provider evidence without locking the product to one model or vendor.
- Validation Harness: evaluates datasets, reviewed outcomes, provider agreement and metric eligibility.

## Core Engines

| Engine | Evidence | Readiness |
| --- | --- | --- |
| Trust Engine | `lib/core/trust-engine.ts` | Strong deterministic foundation; depends on evidence quality. |
| Replay Engine | `lib/core/replay-engine.ts`, `lib/trust-replay/replay.ts` | Strong product moat; requires complete evidence capture. |
| Runtime Engine | `lib/runtime/trust-execution-pipeline.ts` | Instrumented and async-aware; needs pilot timing samples. |
| Governance Engine | `lib/core/governance-engine.ts`, `lib/governance/reviewed-outcomes.ts` | Reviewable and explainable; needs SLA and reviewer volume validation. |
| ML Validation | `lib/validation/benchmark-harness.ts` | Honest metrics framework; no fabricated accuracy. |
| Provider Readiness | `lib/providers/provider-readiness.ts` | Normalized readiness contract; live readiness still gated. |

## ML Reality

Cyber Sentinels does not claim universal AI detection or biometric certainty. ML-adjacent outputs are governed signals. Precision, recall and F1 are valid only when attached to a reviewed dataset version, threshold and test condition.

Current state: `Validation incomplete - insufficient reviewed dataset.`

## Validation Status

- Dataset registry and coverage reporting exist.
- Reviewed outcomes and benchmark history are represented.
- False positives and false negatives can be calculated when data exists.
- ROC/AUC remains unavailable until threshold sweeps and reviewed holdout sets exist.

## Provider Roadmap

Highest-priority real integrations:

1. World ID
2. Stripe Identity
3. Veriff
4. Reality Defender
5. Sensity
6. C2PA verification

Provider readiness requires health, credential state, latency, supported features, limitations and normalized output before any workflow can rely on it.

## Security Posture

Auth, admin allowlisting, email verification, protected admin routes, RLS migrations, private evidence storage and replay/audit concepts are present. Production readiness still requires deployed RLS review, rate-limit review, CSRF review for mutations and environment-specific auth testing.

## Performance

Runtime profiling now captures provider, trust, workflow, replay, queue and cache samples and exposes top slowest operations. This is readiness telemetry, not production APM. Enterprise claims require sustained pilot traffic and query-level database profiling.

## Known Limitations

- No public accuracy claims until reviewed datasets exist.
- Provider credentials do not equal production readiness.
- In-process queues and profiling are not durable enterprise observability.
- Some public/internal routes overlap and require consolidation.
- Older RLS policies require deployed verification before broad production use.

## Funding Priorities

1. Reviewed dataset acquisition and adjudication.
2. Live provider validation with restricted-data handling.
3. Durable observability and queue infrastructure.
4. Enterprise security review and RLS tightening.
5. Design partner pilots with replay-backed proof.

## Competitive Moat

The moat is not owning every AI model. The moat is owning the governed trust record: evidence, authority, replay, review, provider independence, policy and operational memory controlled by the enterprise.
