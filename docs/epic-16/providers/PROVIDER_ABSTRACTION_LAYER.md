# Provider Abstraction Layer

The PAL lives in the existing `lib/providers` domain. `IdentityProviderAdapter` defines provider-neutral create, retrieve, callback verification, evidence normalization, and health operations. `provider-service.ts` owns server selection; clients cannot choose an adapter. `errors.ts` supplies stable codes, safe messages, diagnostics, retryability, provider, correlation ID, and HTTP mapping.

Flow: authenticated workflow -> server-selected adapter -> provider -> signed callback/poll -> replay ledger -> normalized identity evidence -> canonical Trust Decision pipeline -> Replay, Evidence Graph, Trust Memory, receipt -> post-decision ORI.

Provider-specific payloads end inside the adapter. Downstream contracts carry status, assurance, provenance presence, timestamps, mapping version, digest, references, and limitations only. Adapters for World ID, Stripe Identity, enterprise IAM, government eID, or media authenticity can implement the same contract without changing the trust sinks.

The legacy provider-signal adapter remains for backwards compatibility, but the identity PAL is the production integration contract.
