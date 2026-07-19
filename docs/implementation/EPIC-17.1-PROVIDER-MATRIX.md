# EPIC 17.1 — Provider Capability Matrix

**Validated:** 2026-07-19

**Rule:** Configuration, payload shape, or session creation is never reported as verified evidence.

| Provider | Signal | Implementation | Default runtime | Server-verified contribution | Evidence |
| --- | --- | --- | --- | --- | --- |
| Hopae Connect | `IDENTITY_ASSERTION` | IMPLEMENTED | BLOCKED BY CREDENTIALS unless enabled and fully configured | Yes, only after signed callback, upstream retrieval, normalization, and accepted evidence quality | `lib/providers/adapters/hopae`, `lib/providers/hopae-rc1-server.ts`, identity callback bridge |
| Hopae Connect | `GOVERNMENT_ID` | IMPLEMENTED | BLOCKED BY CREDENTIALS unless enabled and fully configured | Same gate as above | Same as above |
| World ID | `PROOF_OF_PERSONHOOD` | PARTIALLY IMPLEMENTED | BLOCKED BY EXTERNAL CONFIGURATION | No | Proof shape route and callback fail safely with `INCONCLUSIVE`, score 0, and HTTP 501 |
| Native device context | `DEVICE_CONTEXT` | PARTIALLY IMPLEMENTED | BLOCKED BY EXTERNAL CONFIGURATION if `SECURITY_HASH_SECRET` is absent | No | Bounded fields are HMAC-digested. Client-reported context is continuity context only. |
| Email | `EMAIL_OWNERSHIP` | MISSING | DISABLED | No | Truthful disabled adapter persists a blocked result. |
| Phone | `PHONE_OWNERSHIP` | MISSING | DISABLED | No | Truthful disabled adapter persists a blocked result. |
| IP reputation | `IP_REPUTATION` | MISSING | DISABLED | No | Existing IP hashing is not treated as reputation evidence. |
| Network anonymity | `NETWORK_ANONYMITY` | MISSING | DISABLED | No | No VPN, proxy, or Tor provider is configured. |
| Geolocation | `GEOLOCATION` | MISSING | DISABLED | No | No geolocation provider is configured. |

## Runtime state interpretation

- `AVAILABLE`: required local configuration is present. It is not a live-success claim.
- `BLOCKED_BY_CREDENTIALS`: required secrets are absent or invalid.
- `BLOCKED_BY_EXTERNAL_CONFIGURATION`: an upstream server exchange, deployment secret, callback, or console configuration is incomplete.
- `DISABLED`: no live provider is selected; the adapter returns a persisted non-success state.
- `UNSUPPORTED`: the signal is outside the declared engine contract.

Provider secrets remain environment-only. The capability table stores secret names, never secret values.
