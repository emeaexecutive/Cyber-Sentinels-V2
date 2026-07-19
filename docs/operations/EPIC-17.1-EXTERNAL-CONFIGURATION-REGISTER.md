# EPIC 17.1 — External Configuration Register

No external configuration was changed during implementation.

| System | Required configuration | Current repository-observable state | Owner action | Verification |
| --- | --- | --- | --- | --- |
| Supabase | Apply `202607190001_identity_signal_engine.sql` | Migration committed; hosted application not performed by this work | Apply through the approved migration workflow | Run live cross-tenant RLS denial suite and `/api/health/identity-signals` |
| Hopae Connect | `HOPAE_ENABLED`, environment, base URL, client ID, client secret, provider ID, webhook secret | Names and strict validation implemented; values not inspected or changed | Configure in the approved secret store and register `/api/providers/hopae/callback` | Provider health, signed sandbox callback, duplicate replay, forged/stale rejection |
| World ID | App/action identity, server verification API, callback authentication | Not connected | Select and implement the official server verification exchange before enabling | Valid, invalid, replayed, and forged proofs must remain distinguishable |
| Device context | Stable `SECURITY_HASH_SECRET` | Code requires it for stable HMAC digests | Configure a high-entropy secret through deployment controls | Confirm deterministic digest within environment and different digest after authorized rotation |
| Email ownership | Provider selection, credentials, callback/domain setup | No provider selected | Architecture and procurement decision | End-to-end ownership challenge and replay tests |
| Phone ownership | Provider selection, credentials, sender/region setup | No provider selected | Architecture, legal, and procurement decision | End-to-end challenge, abuse, and replay tests |
| IP/network/geolocation | Provider selection, privacy/DPA/data-residency approval | No provider selected | Security and privacy review before implementation | Contract tests plus regional privacy validation |
| Vercel | New variables and callback URLs | Not changed | Apply only after approval | Preview verification before production promotion |

## Prohibited shortcuts

- Do not mark a provider available because variable names exist.
- Do not paste provider secrets into Supabase tables, logs, tickets, or documentation.
- Do not make World ID, device context, or request-IP hashes contribute verified confidence.
- Do not apply the migration with ad hoc destructive SQL.
