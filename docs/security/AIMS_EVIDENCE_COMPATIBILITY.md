# AIMS Evidence Compatibility

## Compatibility boundary

AIMS is treated only as an evidence compatibility model. Cyber Sentinels does not depend on AIMS, does not delegate canonical authority to an AIMS provider, and does not introduce an AIMS-specific evaluator, graph, identity system, or evidence store.

`PROVIDER_ASSERTION != CANONICAL_DECISION`

## Provider-neutral mapping

`AimsCompatibleEvidence` can map provider/source evidence for:

- agent identity, principal, delegator, and delegation chain;
- authority grant, scope, and authorization version;
- tool, action, resource, parameter bindings, and execution context;
- credential-reference digest, policy, and authorization change;
- destination, execution result, evidence reference, timestamp, and correlation ID.

The mapper preserves supplied lineage hops and marks that missing hops were not invented. It also records `providerIsCanonical: false` and `aimsDependency: false`. Evidence is tenant-scoped; cross-tenant AIMS evidence is rejected before assessment.

Authorization changes can represent grant, renewal, scope change, downgrade, revocation, expiry, credential rotation, and policy change. Execution evidence can show who acted, under whose authority and version, with which tool/action/resource/parameters/runtime/credential reference/destination, and with what observed result.

## Existing Fabric integration

Mapped evidence enters the same canonical decision-time evidence object and extends only the existing Graph projection, Replay events, Trust Memory material-event path, Twin, Forecast, Adaptive Verification, Sentinel, and receipt summary. The canonical Trust Fabric remains responsible for `ALLOW`, `REVIEW`, and `DENY`.

The resulting chain can represent:

`PRINCIPAL -> DELEGATION -> AGENT -> AUTHORITY_VERSION -> TOOL -> PARAMETER_BINDING -> RUNTIME_AUTHORITY -> ACTION -> DESTINATION_AUTHORITY -> OUTCOME`

This is an implementation compatibility statement, not a standards-compliance or certification claim. No new table or migration is required.
