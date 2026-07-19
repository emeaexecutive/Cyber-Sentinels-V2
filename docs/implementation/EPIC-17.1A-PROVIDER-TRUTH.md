# EPIC 17.1A — Provider Truth Model

## Capability states

Provider maturity is an ordered evidence set, not a boolean.

| State | Required evidence |
| --- | --- |
| `REGISTERED` | A provider capability entry exists. |
| `CONFIGURED` | Required server-side configuration is present. |
| `AVAILABLE` | The provider is enabled, configured, and has a healthy runtime check. |
| `TRANSACTIONAL` | An available provider has a retained successful transaction reference. |
| `SIGNED` | The transaction has verified signature and idempotency evidence. |
| `SERVER_VERIFIED` | Signed evidence was normalized and persisted, and its server-verified evidence row has a source digest. |
| `DEGRADED` | Runtime health is degraded or unavailable. |
| `DISABLED` | The provider is not enabled. |
| `BLOCKED` | A prerequisite or explicit blocker prevents the full evidence chain. |

States can coexist. For example, a provider may be `REGISTERED`, `CONFIGURED`, `DEGRADED`, and `BLOCKED`. Neither `REGISTERED` nor `CONFIGURED` implies a transaction or verified identity.

## Provider matrix

| Provider | Repository truth | Allowed runtime truth | Positive confidence |
| --- | --- | --- | ---: |
| Hopae Connect | Signed adapter, timestamp validation, event ledger, transaction identifiers, payload digest, normalization, provenance, and atomic persistence exist. | Advances only as runtime evidence satisfies each ordered gate. | Only normalized server-verified evidence may contribute. |
| World ID | Proof-shaped input and callback endpoints exist; server verification does not. | `BLOCKED`/`INCONCLUSIVE`; reason `WORLD_ID_SERVER_VERIFICATION_NOT_IMPLEMENTED`; `serverVerified=false`. | 0 |
| Device context | Privacy-limited continuity context exists. | `INCONCLUSIVE`; reason `CLIENT_REPORTED_DEVICE_CONTEXT`. | 0 |
| Email, phone, IP reputation, network anonymity, geolocation | Registry-only or missing transactional adapters. | `UNAVAILABLE`/`DISABLED`/`BLOCKED`; reason `PROVIDER_ADAPTER_NOT_IMPLEMENTED`. | 0 |

## Hopae reason codes

| Reason code | Meaning |
| --- | --- |
| `HOPAE_SIGNED_ASSERTION_VALID` | The signed callback and downstream evidence chain completed. |
| `HOPAE_SIGNATURE_INVALID` | The signature was absent, malformed, or did not match. |
| `HOPAE_SIGNATURE_EXPIRED` | The signed timestamp was outside the accepted tolerance. |
| `HOPAE_DUPLICATE_EVENT` | The event identifier was already reserved or persisted. |
| `HOPAE_DUPLICATE_TRANSACTION` | A new event targeted an already completed provider transaction. |
| `HOPAE_PROVIDER_ERROR` | The provider path failed without a more specific safe reason. |

Duplicate callbacks are acknowledged idempotently and cannot create duplicate normalized evidence. Raw callback content is represented by a digest; reason codes and safe messages are exposed instead of sensitive upstream detail.

## Operational evidence states

| State | Meaning |
| --- | --- |
| `VERIFIED_FROM_RUNTIME` | Direct runtime evidence from the authoritative target was captured. |
| `VERIFIED_FROM_REPOSITORY` | Repository source proves only the stated source property. |
| `BLOCKED_BY_EXTERNAL_CONFIGURATION` | The claim requires authenticated external control-plane evidence. |
| `NOT_CONFIGURED` | Direct evidence proves the control is absent or disabled. |

The Vercel Production branch policy and environment completeness, Cloudflare WAF/DNSSEC/bot controls/rate limiting, Supabase deployed migrations, and Supabase Production RLS remain `BLOCKED_BY_EXTERNAL_CONFIGURATION`. Repository configuration or a successful deployment cannot silently upgrade these claims.
