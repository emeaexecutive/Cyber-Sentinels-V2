# Consensus Integrity Controls

- Provider observations are normalized, server-controlled and contain opaque evidence references rather than raw provider payloads.
- Authenticated users receive tenant-scoped reads only. Observation, decision and current-state writes use service-only paths.
- Decision, evidence, conflict, policy-version, capability-version, health-history and audit tables are append-only.
- Canonical JSON and SHA-256 bind the policy, evidence snapshot, contribution lineage, result and prior-decision reference.
- Advisory transaction locks and stable idempotency keys prevent duplicate decisions under concurrent retries.
- Canonical Trust Events are appended in the same transaction as decisions and current-state materialization.
- Invalid signatures, missing required server verification, unsupported signals, unknown providers, duplicates and stale evidence have zero positive weight.
- World ID and placeholders are hard-zero in capability code and regression tests.
- Cross-site mutation checks, bounded request bodies, role authorization and correlation IDs protect APIs.

The verifier performs source invariants and local quality gates but does not prove deployed RLS, credentials, WAF, DNSSEC or production rate limiting.
