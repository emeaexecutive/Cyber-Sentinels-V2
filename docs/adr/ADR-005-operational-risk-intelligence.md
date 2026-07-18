# ADR-005: Operational Risk Intelligence

## Status

Accepted with non-enforcement constraint.

## Context

Operational Risk Intelligence (ORI) can compare reviewed workflow evidence with an explainable risk model, but current validation is limited and synthetic evidence cannot support public accuracy or autonomous enforcement claims.

## Decision

ORI operates only in `off`, `shadow` or `advisory` mode after the authoritative Trust Decision. It uses a versioned feature registry, deterministic model artifact, validated coverage, contribution explanations and abstention. Unsupported modes fail closed to `off`. ORI returns `authoritativeDecisionUnchanged: true` and has no enforcement capability.

## Alternatives

- Enforce ORI recommendations: rejected because reviewed calibration and authorization evidence are insufficient.
- Use an opaque hosted model: rejected because explanation, versioning and sovereignty would weaken.
- Remove risk intelligence entirely: rejected because shadow comparison can produce governed validation evidence.

## Consequences

- Model, feature, threshold, dataset and normalization versions are retained.
- Insufficient coverage produces `ABSTAIN`, not misleading low risk.
- Persistence or timeout failure does not change the authoritative decision.
- Accuracy claims remain blocked until enough reviewed ground truth exists.

## Security impact

Restricted data is rejected, scope is resolved through an authenticated client, artifacts are integrity-checked and outputs are non-authorizing. Explanations must not leak prohibited raw features.

## Future work

Collect approved reviewed outcomes, meet minimum sample gates, assess calibration and fairness, and require a new ADR before any enforcement mode is considered.
