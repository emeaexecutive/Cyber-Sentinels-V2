# Controlled provider outcome qualification

`tests/controlled-provider-outcome-qualification.test.mjs` composes the actual canonical evaluator/orchestrator, native execution guard, destination signing and verification, evidence correlator, receipt builder, and additive outcome-review normalizer in six local behavioral cases. It proves those functions work together with explicit fixture adapters. It does **not** qualify a real provider, establish independent destination observation, or prove a joined durable database chain.

| Controlled case | Immutable decision | Generic receipt outcome | Native correlation | Native outcome |
| --- | --- | --- | --- | --- |
| Success with matching signed destination evidence | ALLOW | SUCCEEDED | CONFIRMED | CONFIRMED |
| Provider and destination report failure | ALLOW | FAILED | UNCONFIRMED | UNKNOWN |
| Provider reports success; destination reports failure | ALLOW | SUCCEEDED | CONTRADICTED | UNKNOWN |
| Executor not configured; no attempt | ALLOW | NOT_CONFIGURED | UNCONFIRMED | UNKNOWN |
| Destination execution observed despite denied authority | DENY | NOT_REQUESTED | CONTRADICTED | CONTROL_FAILURE_CRITICAL |
| Purpose drift requires review; no attempt | REVIEW | NOT_REQUESTED | UNCONFIRMED | UNKNOWN |

The native outcome enum has no terminal `FAILED` value. Signed failure evidence remains visible, while the generic receipt reports the provider's `FAILED` assertion and native confirmation remains `UNKNOWN`. Likewise, provider success cannot erase contradictory destination evidence or become an observed execution stage in the generic receipt. The DENY case supplies a correctly bound, signed local observation after the canonical guard has refused dispatch; the test does not cause an actual denied action.

Each case evaluates fixture identity evidence, authority and policy through `executeCanonicalTrustTransaction`. Revoked authority produces DENY; observed purpose drift produces REVIEW. For configured ALLOW cases, a test-only composition calls `executeAuthorizedAction` from the generic dispatch dependency. Native current-state checks and request reservation precede its local adapter call. Both guards prevent DENY/REVIEW execution. The signing and correlation functions bind destination evidence to tenant, transaction, operational entity, action, target, payload digest, idempotency key and observation window.

The test retains the canonical decision, digest, authority version, policy and reason codes throughout correlation and outcome-review normalization. Frozen decision records and equality checks detect mutation. The normalizer also rejects an attempted replacement of the original decision. This is an in-process invariant check; database immutability enforcement is outside this test.

## Receipt, Replay and Trust Memory boundaries

The actual orchestrator calls decision persistence, Evidence Graph, Replay and material Trust Memory dependencies **before** external dispatch. This test captures those hook arguments and checks their common transaction, authority, action, decision and digest. Returned `fixture:*` references only demonstrate reference propagation through the receipt. They are not stored database artifacts. Historical idempotent replay returns the original receipt without reloading authority or repeating dispatch, reservation or material-memory hooks.

The generic relay acknowledgement/outcome hooks and native request/observation/correlation stores are separate server persistence paths. The test deliberately supplies a local bridge between their functions; no such production adapter is installed by this change. Destination correlation does not automatically rewrite the generic receipt or the initial Replay/Trust Memory arguments. Outcome-review normalization validates the review supplied by the test; it does not automatically adjudicate the evidence or invoke the later review-persistence RPC.

Consequently, **Authority → Decision → Execution → Provider → Destination → DestinationEvidence → ActualOutcome → ContradictionState → Receipt → Replay → TrustMemory is a logical coverage checklist, not the literal write sequence proved here**. This test covers decision-time Replay/Memory calls and subsequent execution/correlation behavior. A full durable proof still requires actual authenticated server persistence, native outcome/review attachment, reconstruction of later Replay/Memory events, and qualified provider/destination transport.

All identity, policy, authority/delegation current-state, reservation, persistence, provider and destination dependencies are local fixtures. One explicitly public test key signs all destination observations, and every source uses the same fixture party. No network request, credential, real provider, independent observer, hosted write, schema change or deployment is involved.

## Validation

```powershell
node --experimental-strip-types --test tests/controlled-provider-outcome-qualification.test.mjs
```

Result: **6 tests passed, 0 failed**. Node reports the repository's existing module-type warning when loading TypeScript as ES modules.
