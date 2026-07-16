# RC1 Primary Provider Decision

Decision: **Hopae Connect**, in approved `Test Mode`. No provider is marked `Live`.

Environment inspection examined variable names and presence only. This checkout has `.env.example`; no relevant process credentials were present. No secret value was printed.

| Criterion | Hopae Connect | Stripe Identity | World ID |
| --- | --- | --- | --- |
| Adapter maturity | Active server adapter, create/status/user-info calls, HMAC helper, timeout and assurance tests | Billing exists; Identity adapter is placeholder | Proof route/package exists; registry remains placeholder |
| Credentials present | No | No | No |
| API and callback flow | Implemented and RC1-completed | Identity flow not implemented | No RC1 callback continuity |
| Testability | Approved fixtures and mocked responses | Requires new Identity workflow | Does not cover the requested eID path |
| Privacy and Replay | Normalized-only retention and atomic continuity | Review incomplete | Not connected to RC1 lifecycle |

Hopae wins on repository maturity and continuity, not credential presence. `HOPAE_ENABLED=true` plus server credentials are still required for a deployment call. Missing configuration returns `Awaiting Credentials` safely. Turnstile remains supporting abuse control and never contributes identity proof.
