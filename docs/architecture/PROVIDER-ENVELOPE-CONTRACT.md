# Provider Envelope Contract

An adapter declares a real protocol from `HMAC`, `SIGNED_JWT`, `PUBLIC_KEY_SIGNATURE`, `CHALLENGE_RESPONSE`, `OAUTH_PROTECTED`, `MTLS`, `UNSIGNED` or `UNSUPPORTED`, then implements capability truth, raw-envelope verification, parsing, idempotency derivation and normalization. `RawProviderRequest` carries the exact bytes, normalized headers, HTTP method/path, receive time and correlation ID. Signature algorithms consume the exact received bytes.

The gateway checks capability truth before processing, verifies authentication and timestamp tolerance, parses only after verification, resolves the enterprise through authenticated context or an existing provider transaction, and reserves the envelope by tenant/provider/idempotency key. The same key and same body digest returns the prior result. The same key with different bytes is a conflict. Reused nonces are rejected as replay.

Hopae uses its established timestamped SHA-256 HMAC header and preserves the existing production callback route. That route retains the exact request bytes and sends them through the canonical gateway after the established provider and identity bridge. The gateway creates a canonical signed-envelope event but does not treat that envelope alone as server-verified identity; upstream retrieval remains required by the established Hopae flow.

Rejected envelopes retain only safe metadata and the request digest, record the adapter's actual protocol, and create an append-only rejection audit when persistence is available. Completed envelopes are immutable; duplicates return their original event IDs and disposition.

World ID uses `CHALLENGE_RESPONSE`, but the server exchange is absent. It may record `identity.world_id.proof_received` only as `INCONCLUSIVE`, `serverVerified=false`, confidence 0, with `WORLD_ID_SERVER_VERIFICATION_NOT_IMPLEMENTED`.

Registry-only and placeholder adapters declare `UNSUPPORTED`, create no normalized events and contribute no evidence. Adapter capability metadata is not runtime proof.
