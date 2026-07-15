# Trust Decision Explainability

Release: 1.1.4

Every request through the canonical `requestTrust()` façade returns an `explainability` object. A Trust Decision is incomplete if any required explanation field is absent.

| Required field | Contract content |
| --- | --- |
| Decision | Final governed Trust Decision |
| Evidence summary | Count, references, Evidence Graph integrity and missing node types |
| Authority summary | ALLOW/DENY result, reason, accountable human, authority reference, effective scope and limitations |
| Policy applied | Policy version, governance status, validation status and minimum evidence |
| Confidence explanation | Confidence band, provider consensus result, coverage, contributing explanation and limitations |
| Replay reference | Replay identifier or explicit `null` when unavailable |
| Trust Memory™ update | Reference, operational state, timestamp, reason, actor, evidence and authority references |
| Next recommended action | Required next control or continuation action |

## Confidence boundary

Confidence is an explanation of the evidence and policy path, not certainty. Provider signals retain source, runtime state, model/version metadata where reported, category weighting and limitations. Conflicts route to policy or human review; a blind average is never treated as truth.

## Trust Memory lifecycle

The operational state vocabulary is `Trust Increased`, `Trust Reduced`, `Trust Challenged`, `Trust Restored`, `Trust Expired`, `Trust Revoked`, `Trust Delegated`, `Trust Reviewed` and `Trust Confirmed`. Every append contains a timestamp, reason, actor, evidence references and authority references. Empty reference arrays remain explicit; fields are not silently omitted.

## Failure behavior

Replay or Trust Memory write failure blocks execution and is exposed as an unavailable reference plus a retry action. Missing policy validation, insufficient provider categories and authority limitations remain visible in the response.
