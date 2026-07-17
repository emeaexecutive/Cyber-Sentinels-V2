# ORI Architecture

```text
Normalized evidence
  -> Replay / Evidence Graph / Trust Memory context
  -> authoritative Trust Decision and workflow execution
  -> authenticated tenant and trust-session resolution
  -> deterministic feature extraction and validation
  -> server-selected artifact hash verification
  -> logistic inference or abstention
  -> contribution explanation
  -> non-enforcing shadow recommendation
  -> comparison with authoritative decision
  -> sanitized tenant-scoped record
  -> immutable reviewer outcome
  -> validation evidence gate
```

ORI is called by the existing Trust Execution Pipeline after `executeTrustWorkflow`. It cannot change that result. Disabled, invalid-scope, incompatible-schema, tampered-artifact, insufficient-coverage, timeout, explanation, telemetry, and persistence failures remain non-blocking.

The typed feature registry is the runtime source of truth. Its version and hash are also seeded into the database for audit. Only server code selects the model. The database grants no authenticated client write access to registries, inference records, or reviewer outcomes.
