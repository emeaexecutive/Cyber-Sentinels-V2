# Hopae architecture

Hopae Connect is the first PAL adapter. The implementation uses the documented REST Verification API with Basic authentication. Session creation is not retried because the reviewed Hopae documentation does not establish a creation idempotency header. Retrieval, userinfo, provider discovery, 429, and transient 5xx requests may retry up to the configured bounded maximum.

The adapter captures safe provider request IDs, validates required response fields, maps Hopae lifecycle states, verifies callbacks, and emits only normalized `IDENTITY_SESSION` evidence. Provider execution is retained before the network call. Trust Decision remains authoritative after callback normalization; the callback route cannot authorize.

Official references: [REST API integration](https://docs.hopae.com/guides/api-integration), [verification lifecycle](https://docs.hopae.com/guides/concepts/verification-flow), and [return data](https://docs.hopae.com/guides/concepts/return-data-model).
