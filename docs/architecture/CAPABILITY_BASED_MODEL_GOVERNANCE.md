# Capability-Based Model Governance

Cyber Sentinels governs operational trust by evidence and capability — not by whether the AI is open, closed, cloud-hosted or self-hosted.

## Architecture position

Capability governance is a typed projection attached to the existing Operational Entity. It does not create a model registry, an AI registry, an authority store, or a decision engine. `evaluateCapabilityGovernance` produces a condition result that the canonical trust transaction maps into its existing `ALLOW`, `REVIEW`, or `DENY` outcome.

The canonical chain is:

`Model/agent provenance → capability evidence → deployment environment → safeguards → enterprise policy → authority → action → outcome → Replay → Trust Memory`

## Inputs

- Canonical tenant and Operational Entity.
- Model ID, exact version, artifact hash where applicable, fine-tune reference, family, deployment origin, and hosting operator.
- Descriptive open/closed/hosting classification. This field has no direct trust weight.
- Provider-attributed capability assessments with evaluator, accountable source party, evaluation reference, assessed model/version/hash, environment, timestamp, validity, digest, confidence, and attribution.
- Existing Environment Attestation reference, runtime, tools, hosting operator, and expiry.
- Active safeguards, oversight regimes, enterprise risk classification, permission scope, and continuity reference.
- Existing enterprise policy for the requested action.

Raw prompts, hidden reasoning, chain-of-thought, reusable credentials, tokens, and private keys are not inputs and must not be stored.

## Outputs and canonical mapping

The evaluator returns `PASS`, `REVIEW`, `FAIL`, or `UNKNOWN`, an authority impact (`UNCHANGED`, `REVIEW_REQUIRED`, `REAUTHORIZATION_REQUIRED`, or `DENY`), evidence references, a digest, and reason codes. The canonical transaction remains the only execution decision:

| Capability state | Canonical decision |
|---|---|
| `PASS` | eligible for `ALLOW` if every other canonical control passes |
| `REVIEW` | minimum `REVIEW` |
| `UNKNOWN` | minimum `REVIEW` |
| `FAIL` | `DENY` |

Principal reason codes include `MODEL_PROVENANCE_UNVERIFIED`, `MODEL_VERSION_CHANGED`, `MODEL_HASH_CHANGED`, `CAPABILITY_ASSESSMENT_MISSING`, `CAPABILITY_ASSESSMENT_EXPIRED`, `CAPABILITY_THRESHOLD_CHANGED`, `CAPABILITY_EVIDENCE_CONFLICT`, `ENVIRONMENT_ATTESTATION_MISSING`, `ENVIRONMENT_CHANGED`, `SAFEGUARD_REQUIRED`, `OVERSIGHT_REGIME_CHANGED`, and `ENTERPRISE_POLICY_REVIEW_REQUIRED`.

## Capability-bound authority and continuity

Authority may depend on verified identity, current model provenance, attributed capability evidence, current environment, safeguards, policy, and delegated scope. Provider brand, model popularity, and open/closed status never grant authority.

`evaluateCapabilityReauthorization` extends existing material-change semantics. Model, weights/hash, fine-tune, runtime, hosting operator, environment, tool set, permission scope, capability threshold, safeguard, assessment expiry, and oversight changes are explicit triggers. A change does not automatically revoke identity or authority: policy selects review, reauthorization, or denial.

## Existing stores reused

- Capability and environment sources remain attributed Evidence Graph evidence.
- The canonical transaction freezes the complete model-governance snapshot and evidence digest at decision time.
- Replay records the ordered provenance, assessment, environment, safeguard, authority, action, outcome, and memory sequence.
- Trust Memory receives material events only; unchanged evaluations do not append duplicates.
- Existing Environment Attestation, Scope Continuity, delegated authority, provider-independence, and governance-review controls remain authoritative.

No schema migration is required for this version. The existing Operational Entity, evidence metadata, decision-time JSON snapshot, Evidence Graph, Replay, and Trust Memory structures preserve the projection without creating a competing canonical table. Their existing tenant RLS and append-only history controls remain in force.

## Trust boundaries and limitations

Third-party assessments remain third-party claims. Multiple APIs operated by the same accountable party are not independent evidence. Cyber Sentinels does not certify model safety, infer government compliance, or claim a provider integration merely because an attributed record can represent that provider.

Tests cover provider-reputation substitution, open-weight neutrality, hash/fine-tune/environment changes, expiry, conflicting evaluators, missing safeguards, lower-risk policy behavior, tenant binding, snapshot immutability, and canonical decision mapping.
