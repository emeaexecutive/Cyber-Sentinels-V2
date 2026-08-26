# Runtime Authority Evidence

## Purpose

Runtime Authority Evidence records what a runtime believed was effective at decision/execution time. It is provider-neutral evidence consumed by the existing Authority Integrity assessment; it is not a new runtime-security platform or an authorization engine.

The model keeps four states separate:

- declared authority;
- control-plane authority;
- runtime-effective authority; and
- destination-effective authority.

This prevents a control-plane update from being misrepresented as runtime or destination enforcement.

## Evidence contract

Supported evidence includes runtime type and identity, workload, agent and session references, authority reference/version, effective permissions and scope, credential-reference digest/version/expiry, delegated principal, policy reference, destination scope, measurement time, provider, confidence, and limitations.

Only credential references or digests are accepted. Raw credentials, passwords, secrets, and tokens are rejected before assessment and are not written to the decision snapshot, Graph, Replay, Trust Memory, Twin, or receipt.

## Comparisons and findings

The existing evaluator compares runtime-effective authority with control-plane authority separately from the destination-effective comparison. Evidence can produce:

- `RUNTIME_AUTHORITY_MISMATCH`;
- `DESTINATION_AUTHORITY_MISMATCH`; or
- `AUTHORITY_PROPAGATION_UNRESOLVED`.

These are non-malicious trust-integrity conditions. Confidence, limitations, evidence references, and freshness remain visible rather than being collapsed into an opaque score.

## Existing Fabric integration

Decision-time snapshots can include declared authority, delegated principal, authority version, credential state, runtime-effective scope, destination-effective scope, parameter provenance, propagation state, provider evidence, conflicts, limitations, and freshness. Trust Twin projects these fields; Forecast, Pressure, Budget, Adaptive Verification, Sentinel, Graph, Replay, Trust Memory, and the receipt consume the same assessment while retaining their existing authority boundaries.

No new runtime store, graph, evaluator, table, or migration is required.
