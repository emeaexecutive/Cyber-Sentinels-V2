# Trust Drift

Drift is deterministic and explainable. Each finding contains type, severity, confidence, affected dimensions, before/after values, recommended action, explanation, and reason codes.

| Rule family | Trigger examples | Dimensions |
| --- | --- | --- |
| Device continuity | New device, fingerprint change, mismatch | Device, Behaviour, Historical |
| Location/network | Impossible travel, unusual location, VPN/proxy | Location, Network, Behaviour |
| Identity evidence | Corporate email loss, document expiry, liveness failure, deepfake risk | Identity plus evidence-specific dimensions |
| Provider condition | Degraded, unavailable, timeout, low confidence | Provider Confidence, Historical |
| AI/authority | Abnormal AI behaviour, authority change, revoked delegation | AI Behaviour, Enterprise, Historical |
| Credential/policy | Unexpected rotation, enterprise-policy breach | Identity, Enterprise, Historical |
| Pattern/history | Three or more failures, shared identifier, disappearing evidence, ≥10-point score reduction, behaviour mismatch | Signal-specific plus Historical |

VPN/proxy is context, not fraud proof. Provider unavailability recommends alert/record behavior, not negative identity evidence.

Policy evaluation uses signal severity/confidence and the existing enterprise continuous-trust policy used by recalculation. Outcomes are `NO_ACTION`, `RECORD_ONLY`, `RECALCULATE`, `WATCH`, `ALERT`, `STEP_UP_VERIFICATION`, `RESTRICT`, `SUSPEND`, `REVOKE`, or `REQUIRE_MANUAL_REVIEW`. The policy decision ID is deterministic over tenant, signal, policy version, action, and reasons.

Example:

```json
{
  "driftType": "trust_score_reduction",
  "severity": "HIGH",
  "confidence": 0.91,
  "affectedDimensions": ["Device", "Behaviour", "Historical"],
  "previousValue": 92,
  "currentValue": 70,
  "recommendedAction": "RESTRICT",
  "explanation": "The trust score fell by the configured material threshold.",
  "reasonCodes": ["TRUST_SCORE_REDUCED"]
}
```

Future ML detectors may emit candidate findings behind the same contract. They must be separately versioned, calibrated, validated, and policy-gated; they cannot mutate state directly.
