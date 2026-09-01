# Authority-Bound Tool Parameters

## Status and boundary

Authority-bound tool parameters are an extension of the existing Authority Integrity assessment in the canonical Trust Fabric. They do not introduce a tool-specific policy engine or a second authorization result. The canonical evaluator remains the only component that returns `ALLOW`, `REVIEW`, or `DENY`.

The governing invariant is:

`MODEL_PROPOSED_PARAMETER != AUTHORITY_BOUND_PARAMETER`

A model may propose an action or a parameter only where policy permits model provenance. It may not define or replace a security boundary that policy requires to come from authority, policy, a human, a runtime, or a provider.

## Provider-neutral contract

`ParameterAuthorityContract` lets a tool/action policy declare:

- parameter name and class;
- expected provenance;
- authority reference;
- allowed value digests or masked values and allowed scope;
- runtime, human, and destination bindings;
- validation requirement; and
- whether the parameter is security-critical.

Supported provenance classes are `AUTHORITY_BOUND`, `POLICY_BOUND`, `HUMAN_BOUND`, `RUNTIME_DERIVED`, `PROVIDER_BOUND`, `MODEL_PROPOSED`, `USER_SUPPLIED`, `SYSTEM_SUPPLIED`, and `UNKNOWN`.

Observations retain evidence provider, evidence reference, timestamp, confidence, limitations, and optional provider assertions. Raw parameter values are not required; digests or masked values are used for comparison and evidence.

## Assessment semantics

The existing Authority Integrity evaluator compares each contract with the decision-time observation and returns `MATCH`, `SUPPORTED`, `OUT_OF_SCOPE`, `PROVENANCE_MISMATCH`, `UNRESOLVED`, `CONFLICTING`, or `INSUFFICIENT_EVIDENCE`.

`MODEL_CONTROLLED_SECURITY_BOUNDARY` is emitted only when a security-critical parameter expected from trusted provenance is observed as model-proposed. It is an integrity finding, not a claim of malicious intent. A model-proposed value returns `SUPPORTED` when the contract explicitly permits `MODEL_PROPOSED`.

The evaluator can also surface `AUTHORITY_PARAMETER_DRIFT`, `DESTINATION_BINDING_LOST`, `UNRESOLVED_PARAMETER_PROVENANCE`, and `PROVIDER_CONFLICT`. Targeted controls include `PIN_PARAMETER_TO_AUTHORITY`, `PIN_DESTINATION`, `REQUIRE_HUMAN_BINDING`, `REQUIRE_RUNTIME_DERIVATION`, and `VERIFY_PARAMETER_PROVENANCE`.

## Existing Fabric integration

The assessment remains in the existing decision-time snapshot. It contributes explainable conditions to Trust Forecast, Trust Pressure, Trust Budget, Trust Twin, Adaptive Verification, Sentinel recommendations, the existing Evidence Graph projection, Replay, Trust Memory, and the canonical receipt summary. Forecast cannot deny, Sentinel cannot authorize or block, and verification cannot grant authority.

No new table, migration, evaluator, evidence store, graph, or Twin store is required.
