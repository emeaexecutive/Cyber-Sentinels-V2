# Trust Contracts™ Foundation

A Trust Contract defines deterministic conditions under which an existing subject may continue an existing workflow. It composes canonical Identity, Authority, Environment Attestation, Scope Continuity, provider evidence and Continuous Trust decisions. It does not create authority grants or scope leases.

## Model

The model in `src/lib/trust-fabric/types.ts` records `enterpriseId`, `subjectType`, `subjectId`, `workflowId`, authorized objective, required identity and environment states, required authority, permitted scope/providers, required evidence types and age, monitoring, human-review thresholds, contradiction policy, incident threshold, issuance/expiry/revocation timestamps, issuer, approver, policy ID/version, evidence references and supersession.

Contracts are append-only. An active contract has `revokedAt: null`; a revoked contract records its revocation time. Replacement uses a new immutable record and `supersedesContractId`. `contractId` and record hash make retries idempotent; changed reuse fails closed.

## Evaluation

`evaluateTrustContract` produces one of:

- `satisfied`
- `satisfied_with_degraded_evidence`
- `review_required`
- `paused`
- `breached`
- `revoked`

Revocation and revoked authority prevail. Expiry, wrong authority/environment/provider/scope, and incident threshold breaches are explicit. Stale evidence pauses. A contradiction follows the contract's `review`, `pause` or `breach` policy. Missing evidence can degrade a satisfied contract but is never silently treated as evidence. Results have stable reason codes, evidence references, a correlation ID and deterministic digest.

## Operational and legal boundary

The evaluator recommends contract state; it does not perform containment, modify the underlying scope lease, revoke the authority grant, make a legal decision or report to a regulator. Authorized services and human reviewers perform those actions through their own controls. LLM output is never an allow, deny, revoke or legal input.

## Storage and access

`trust_contracts` and `trust_contract_evaluations` have tenant-first composite keys, deny anonymous access, expose tenant-scoped authenticated reads, and allow writes only through audited service-role functions. Evaluation history is append-only. Evidence bodies and restricted provider payloads are not stored.

## Limitations

Epic 28 supplies the foundation, APIs and read-only Trust Centre presentation. A contract-authoring interface, approval ceremony, external provider adapters and remote migration are intentionally deferred.
