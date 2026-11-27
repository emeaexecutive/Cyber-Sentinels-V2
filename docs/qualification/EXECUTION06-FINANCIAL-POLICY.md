# Execution06 financial policy

Implementation: lib/treasury/sandbox.ts at189601d. Environment: LOCAL SYNTHETIC ONLY. No funds, provider, custody, chain signing or live billing.

A server-owned policy binds allowed beneficiary/destination/provider/currency/asset/network/chain/contract tuples. Financial amounts use positive safe integer minor units; exposure arithmetic uses BigInt. One policy budget must use consistent currency/asset units. Per-transaction, UTC daily and rolling-window ceilings count both committed effects and unexpired reserved mandates across agents/providers. Reservations carry across a day/window boundary and expire without destination effect. Velocity is bounded.

High-consequence requests return REVIEW until two distinct independent current human fixture principals approve the exact payment digest and policy version. Agent-controlled/self approvers are rejected. Approvals expire and are rechecked at commit. A mandate binds the complete signed payment, enrolled key version, policy ID and expiration; maximum configured TTL is five minutes, demo TTL60seconds. Changed beneficiary/amount/currency/provider/destination cannot reuse it.

The gateway's commit method revalidates and atomically consumes the mandate with its synthetic destination effect in the existing SWARM CAS. Idempotency/reused mandates deny additional effects. Independent disk CAS clients race to one winner. A tested interleaving pauses a stale dispatch before CAS, commits revocation, then retries to DENY with zero effects. No arbitrary external adapter callback is accepted inside this atomic boundary.

Gateway unavailability denies without effect. A deliberately dropped response after commit leaves client UNKNOWN; an independent ledger read reconciles it. No blind retry or refund of unknown exposure is claimed. Emergency stop is a versioned server policy change; member quarantine uses existing TENENTE controls. Already committed effects are not reversed.

Digital-asset identifiers are bound fields only. On-chain simulation, token allowance enforcement, wallet custody, real settlement and AML/sanctions/fraud provider checks are NOT BUILT. Static allowlists are not AML. Hosted authority loading, real human identity proofing, PostgreSQL cross-instance financial qualification and managed recovery remain gates.

