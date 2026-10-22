# TENENTE five-agent local demonstration

From `swarm/qualification-hardening` at base `5652c25`, building on the authority and cancellation infrastructure from PR #118 and PR #123.

Run with installed repository dependencies (Node 22):

```sh
npm run demo:swarm
```

In Windows PowerShell with script execution disabled, use `npm.cmd run demo:swarm`.
The command runs all nine scenarios, asserts their outcomes, writes JSON evidence to `artifacts/swarm-demo/`, then runs the demonstration tests and the existing `test:swarm-authority` suite. Any failed stage exits nonzero.
Run the automated tests with `npm run test:swarm-demo`; run existing authority, budget, cancellation, delegation and projection regressions with `npm run test:swarm-authority`.

Coordinator creates a task plan; Research reads a synthetic duplicate-charge record; Analysis calculates the refund; Execution attempts a local refund; Audit checks the journal and observed effects. Each role has a registered identity, heartbeat and scope, and passes through `executeAuthorizedAction` and `swarmNativeGuard`. Child authority is attenuated from the Coordinator's organization-issued root. Hashes bind the handoffs to request payloads. Registration alone confers no authority.

| Scenario | Local refund effects | Required result |
| --- | ---: | --- |
| ALLOW | 1 | Verified destination receipt settles EUR 1 |
| REVIEW | 0 | Canonical REVIEW blocks dispatch |
| DENY | 0 | Canonical DENY blocks dispatch |
| Revocation | 0 | Revoked Execution credentials block dispatch |
| Budget exhaustion | 1 | Second refund blocked after EUR 1 settlement |
| Forged delegation | 0 | Child grant with forged grantor rejected |
| Cross-tenant | 0 | Foreign identity denied execution and evidence access |
| Ambiguous cancellation | 1 | Lost outcome acknowledgement remains CANCELLATION_UNCONFIRMED; EUR 1 stays reserved; retry blocked |
| Missing evidence | 1 | Null destination evidence rejected; outcome UNKNOWN, EUR 1 reserved, retry blocked |

Each scenario JSON includes role outputs, requests, native eligibility results, local destination receipts, authority journal, leases, balances and canonical Replay/Trust Memory projection rows. `summary.json` includes canonical report hashes. Cancellation commands use ephemeral Ed25519 keys; runtime evidence MACs are verified during execution and the secret is not exported. The exported `signatureVerified` is a local test observation, not an independently verifiable external attestation.

These are deterministic role workers in one process with synthetic authentication, policy resolution and destination verification. Audit receives an operator-authorized journal snapshot; it has no independent operator permissions. Persistence is in memory and projections are exported as rows, not inserted into a database. Non-refund task leases remain dispatched because no external outcome verifier is modeled for those tasks. This qualifies the existing local control boundaries, not hosted identity, distributed transport, external rollback or production readiness. The ambiguous case deliberately withholds destination evidence from settlement even though the harness can observe the effect.

No credentials, environment files, network providers or hosted mutations are needed. The tests also reject changed journal content, foreign-tenant Replay and tampered projection receipts.

## Verified results (2026-10-22)

Current run output is captured in `artifacts/swarm-demo/qualification.txt`; the final demonstration test rerun is in `demo-tests.tap`. Each attempt exports identity, delegation chain, policy decision, requested action, execution outcome and receipt integrity verification. Audit separately checks destination receipt hashes and journal reconciliation. Hash integrity is local verification, not external attestation. Older logs in this directory predate this completion pass; consult `test-results.json` for current counts.
