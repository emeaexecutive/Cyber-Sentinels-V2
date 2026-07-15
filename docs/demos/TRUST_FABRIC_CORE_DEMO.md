# Trust Fabric Core Demo

This deterministic demonstration uses `buildTrustFabricDemo()` and writes no customer records.

## Flow

1. **Human delegates authority.** An organization grants a financial-risk owner `approve_payment`; the human delegates only that scope to a registered AI agent. The authority graph validates tenant, chain, depth, expiry, revocation and constraints.
2. **AI Agent executes.** The agent requests `approve_payment` for the declared `financial_approval` purpose. Authorization remains external to the agent runtime.
3. **Provider signals are collected.** Identity and session-integrity signals are normalized with provider, category, model, version, latency, confidence, evidence and limitations.
4. **Consensus is created.** Two independent categories support the request. The contribution trace remains visible; no confidence is blindly averaged.
5. **Trust Decision is generated.** Trust, runtime, policy, authority and evidence determine allow/review/block. Provider consensus alone cannot authorize execution.
6. **Enforcement applies.** Invalid nonce, policy, purpose, arguments or delegation defaults to deny.
7. **Replay is written.** The lifecycle chronology receives a Replay reference before continuity is claimed.
8. **Evidence Graph is updated.** Organization, human, agent, machine, credential, workflow, provider, authority, decision, execution, evidence, Replay, governance, posture and Trust Memory™ nodes remain connected and tenant-isolated.
9. **Trust Memory™ is updated.** The change records why, by whom, evidence, policy/authority context and an evolution state such as gained, challenged or reduced.
10. **Governance review is available.** Review/block/insufficient-evidence paths identify the next accountable action.

## Demonstrate fail-closed behavior

- Add `transfer_funds` only to the child grant: authority becomes `DENY` because the child broadened scope.
- Set the terminal grant's `revokedAt` or expired `expiresAt`: authority becomes `DENY`.
- Change the session signal to `challenge`: consensus becomes `conflict` and the workflow routes to review.
- Remove a provider category: consensus becomes `insufficient_evidence`.
- Inject Replay or Trust Memory write failure through the existing lifecycle test seam: execution blocks until evidence continuity is restored.

Live provider status is not claimed by this demo. Provider names, models and evidence are deterministic demonstration inputs; the Trust Fabric logic and fail-closed checks are executable code.
