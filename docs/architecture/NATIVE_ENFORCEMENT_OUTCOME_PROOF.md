# Native enforcement and outcome proof

Status: working and locally qualified for Cyber Sentinels Controlled Repository A. This does not claim arbitrary third-party enforcement or independent third-party corroboration.

## Canonical boundary

The implementation extends the existing canonical trust transaction. Decision-time identity, owner, authority, delegation, policy, evidence, consequence and decision remain immutable. Later facts append in this order:

`TRUST_DECISION -> ENFORCEMENT_REQUEST -> ENFORCEMENT_ACKNOWLEDGEMENT -> EXECUTION_CLAIM -> RUNTIME_OBSERVATION -> DESTINATION_OBSERVATION -> BUSINESS_OUTCOME`

`ALLOW` means only that enforcement may be requested. `DENY` and `REVIEW` create no request. Missing destination evidence remains `UNKNOWN`.

## Provider-neutral contract

`executeAuthorizedAction()` accepts the canonical transaction, Operational Entity, parent authority, delegation, exact action, target, environment, decision digest and stable idempotency key. An adapter can return `ACCEPTED`, `REJECTED`, `FAILED`, `TIMEOUT` or `UNKNOWN`; it cannot change the canonical decision.

The atomic reservation boundary re-reads the current parent Trust Contract, accepted delegation, native verification, runtime continuity fingerprint and scoped human approval immediately before execution. Authority or runtime changes cancel enforcement.

## Controlled destination

Controlled Repository A supports only `READ` and `WRITE_TEST_RECORD`. Its records live in `controlled_destination_records`, separately from trust-decision and enforcement evidence. A unique tenant/destination/idempotency constraint permits one logical execution across retries.

Destination observations bind tenant, transaction, entity, destination, action, target, idempotency key, time window and result. SHA-256 canonical digests plus HMAC-SHA-256 using `NATIVE_DESTINATION_EVIDENCE_KEY` detect tampering. The secret remains server-side.

## Correlation and outcomes

`execution-correlation-v1` compares the immutable decision, request, acknowledgement, provider claim, runtime observation and every destination observation. `outcome-confirmation-v1` produces:

- `CONFIRMED` only for a current exact destination match;
- `UNKNOWN` for absent or partial evidence;
- `CONTROL_FAILURE_CRITICAL` when execution is observed after `DENY`.

Conflicting claims are retained. A provider acknowledgement or success claim cannot establish execution by itself. Same-party multi-system evidence is labelled `SAME_PARTY`, not independent.

Outcome state is evidence-derived. AI may explain, for example, that Beta was authorized while destination execution remains unconfirmed; AI cannot decide that execution occurred or promote `UNKNOWN` to `CONFIRMED`.

Critical control failure appends contradictions, an existing serious-incident case, Replay and material Trust Memory. Trust Health, Drift, Confidence, Stability, Recovery, Narrative and Recommendation consume these persisted outcome facts through the existing intelligence projection; no second scoring system is introduced.

## Security and limitations

All API tenant and actor context comes from the authenticated session. RLS permits authenticated tenant reads while writes require the service role. Append-only triggers preserve evidence. Cross-tenant/entity/transaction evidence, expired evidence, invalid MACs, stale authority, revoked delegation and changed runtime fail closed.

High-consequence approvals use a dedicated authenticated write path. Each approval is bound to one tenant, transaction, entity and action digest; it is non-transferable and expires within at most 15 minutes.

Controlled failure injection is enabled only in local Development or `VERCEL_ENV=preview`; every other environment fails closed. Production is not changed by this migration or demo.

## Qualification

- `tests/native-enforcement-outcome-proof.test.mjs`
- `tests/native-enforcement-outcome-proof-integration.test.mjs`
- migration audit and clean non-production reconstruction
- full lint, typecheck, test, build, CodeQL and Gitleaks gates
