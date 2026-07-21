# Trust Domains

Registry version 1.0.0 defines `IDENTITY`, `AI_AGENT`, `DEVICE`, `AUTHORITY`, `WORKFLOW`, `RUNTIME`, `NETWORK`, `DATA`, `CONSENT`, and `GOVERNANCE`.

`src/lib/trust-architecture/domain-registry.ts` is the runtime registry and `trust_domain_versions` is the audited persistence registry. Domain versions are append-only. Unknown or inactive keys fail closed; callers must not map an unknown key to a generic positive domain.
