# Trust Event Integrity

Trust Event v1 uses deterministic RFC 8785-style JSON Canonicalization Scheme serialization and SHA-256. Object keys are sorted lexicographically; arrays retain order; finite ECMAScript numbers use their JSON representation; negative zero becomes zero; strings are encoded as UTF-8. Undefined values, functions, symbols, bigints, non-finite numbers, cyclic graphs, non-plain objects and lone UTF-16 surrogates are rejected. Timestamps are parsed and emitted as normalized UTC ISO strings with millisecond precision.

`canonicalizeTrustEvent` validates the runtime model and serializes every field except `eventHash`. `hashTrustEvent` hashes those UTF-8 bytes. `verifyTrustEventHash` recomputes the digest and uses constant-time comparison. Algorithm and schema metadata are covered by the hash, preventing silent downgrade.

Appending is optimistic and concurrency safe. The application reads the tenant chain head, builds and hashes the next candidate, and calls `append_trust_event_v1`. PostgreSQL takes an advisory transaction lock derived from the enterprise and partition, locks the chain-head row, and checks both sequence and previous hash. A competing writer receives `CHAIN_CONFLICT`; the gateway rebuilds against the new head. No global chain exists.

The integrity API recomputes the event hash, compares canonical identity and integrity values with their relational ledger columns, and checks that the prior sequence owns `previousHash`. A failure is evidence of corruption or incomplete history and must block Replay or trust decisions until investigated. It must never be repaired by rewriting accepted events.
