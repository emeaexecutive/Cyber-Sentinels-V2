# Execution and outcome proof audit

Audit date: 2026-09-29. Base: `d40a0a14772af190a2d82e454b6294113ad35bd2`. Scope: the existing canonical transaction, Decision Outcome Review, provider evidence, and native controlled-destination paths. No new decision engine, evidence platform, outcome system, table, API scope, or dependency was added.

**Overall: PARTIAL.** Cyber Sentinels can retain an authorization separately from execution claims, correlate signed evidence for an exact controlled action, and record contradictions without changing the authorization. A generic provider success response does not prove an external effect or business outcome. The controlled destination is operated by Cyber Sentinels, so its successful local tests do not establish independent third-party confirmation. OpenGraph and Judge.me live qualification remains **BLOCKED_EXTERNAL**; see [provider qualification](PROVIDER_EXECUTION_QUALIFICATION.md).

`WORKING` below means implemented and supported by the stated local behavioral tests. It does not mean an authenticated Production transaction was executed. `PARTIAL` means a real implementation exists with a stated coverage/provenance gap. `MISSING` means the named proof is absent. `BLOCKED_EXTERNAL` means external configuration/qualification prevents the live claim. Database evidence below is migration/function inspection and source-contract tests; it is not a Production write or an applied-migration claim. Database runtime checks are reported separately in [MigrationReport](../reports/MigrationReport.md).

## One concrete transaction path

The inspected path is a delegated agent requesting `READ` at `controlled-repository-a`. `evaluateDelegatedAction` in [delegated-authority-server.ts](../lib/operational-entities/delegated-authority-server.ts) calls the **existing** `executeCanonicalTrustTransaction`, binds its ALLOW receipt to the delegated evaluation, and exposes a separate request for native enforcement. The native request reloads the tenant-scoped canonical transaction and derives its action from that row. It cannot turn a DENY into a dispatch. This is executable implementation, not an architecture-only diagram. The local behavioral fixtures execute the canonical evaluator and native executor/correlator; the full authenticated API-to-database transaction was not run in this audit.

Source keys used in the table:

- **C**: [canonical.ts](../src/lib/trust-transaction/canonical.ts), especially `executeCanonicalTrustTransaction`, `evaluateCanonicalTrustDecision`, `requestExternalExecutionIfAllowed`, and `returnSafeTransactionReceipt`.
- **S**: [canonical server dependencies](../lib/trust-transaction/server.ts); **D**: [delegated authority server](../lib/operational-entities/delegated-authority-server.ts).
- **N**: [native enforcement core](../lib/operational-entities/native-enforcement.ts); **NS**: [native enforcement server](../lib/operational-entities/native-enforcement-server.ts).
- **DB-C**: [canonical transaction migration](../supabase/migrations/202608060002_end_to_end_trust_transaction.sql); **DB-N**: [native outcome migration](../supabase/migrations/202608090002_native_enforcement_outcome_proof.sql); **DB-R**: [Decision Outcome Review migration](../supabase/migrations/20260907120000_add_decision_outcome_review_to_canonical_trust.sql).
- **TC**: [canonical behavioral tests](../tests/canonical-trust-transaction.test.mjs); **TN**: [native behavioral tests](../tests/native-enforcement-outcome-proof.test.mjs); **TI**: [native source/SQL contracts](../tests/native-enforcement-outcome-proof-integration.test.mjs); **TR**: [review source/SQL contracts](../tests/decision-outcome-review.test.mjs).
- **API-C**: authenticated [POST /api/trust/execute](../app/api/trust/execute/route.ts); **API-N**: role-checked [GET/POST entity enforcement](../app/api/operational-entities/[entityId]/enforcement/route.ts); **API-R**: authenticated [outcome review](../app/api/trust/transactions/[transactionId]/outcome-review/route.ts) and [receipt export](../app/api/trust/transactions/[transactionId]/receipt/route.ts).

| Stage | Status | Code evidence | Database evidence | Test evidence | API evidence and practical boundary |
| --- | --- | --- | --- | --- | --- |
| Business mandate | PARTIAL | C checks purpose against `authorizedObjective`; D resolves parent authority and delegated scope | `trust_contracts`, authority delegations, canonical `action_purpose` | TC scope/purpose and missing-owner cases | API-C receives a requested purpose; it does not independently verify a real business mandate |
| Principal | WORKING | S authenticates the user and resolves tenant; C records actor and accountable owner | Canonical actor/tenant references; entity accountable owner | TC tenant/accountability rejection; TI role contracts | API-C authenticated session; API-N owner/admin for mutations |
| Agent | WORKING | C resolves Operational Entity and rejects inactive/unaccountable entities | `operational_entities`, subject/entity references on transaction | TC revoked entity, missing owner, cross-tenant cases | D uses the resolved delegated entity, not a provider display name |
| Authority | WORKING | C resolves current contract, purpose/action/target/environment boundaries, expiry and revocation | `trust_contracts`, canonical authority/version/evidence references | TC scope/revocation; OpenGraph authority boundary tests | API-C delegates authority loading to server dependencies |
| Delegation | WORKING | D evaluates parent/delegate bounds; N rechecks current delegation before reservation | `operational_entity_authority_delegations`, `operational_entity_delegated_action_evaluations`, DB-N decision bindings | TN revoked delegation; TI immutable binding and stale-state reservation | API-N requires the bound canonical transaction/evaluation |
| Policy | WORKING | C requires an active version and invokes the canonical contract evaluator | Policy ID/version/hash pinned on DB-C receipt | TC changed/inactive policy and external policy ALLOW cases | External policy assertions cannot create a contract or delegation |
| Requested action | WORKING | C binds type, purpose, resource, environment, payload digest and idempotency | DB-C action columns; DB-N exact action digest/request | TC idempotency mismatch; TN digest binds tenant/transaction/entity/action/target | API-C bounded request fields; NS derives execution action from stored transaction |
| Decision | WORKING | C remains sole canonical ALLOW/REVIEW/DENY evaluator | Canonical decision and frozen snapshot; DB-R only appends review | TC exact decision and immutable original-review cases | API-C receipt; API-R loads stored original decision |
| Execution | PARTIAL | N only dispatches ALLOW; reservation rechecks authority/runtime; generic C relay is a separate provider attempt | `external_action_requests`; DB-N serialized request and acknowledgement records | TN no DENY dispatch, retry reservation, stale runtime; TC unknown/unconfigured executor | API-N controlled actions only; request registration is not delivery proof |
| External system | PARTIAL | NS implements Controlled Repository A, bounded to READ/WRITE_TEST_RECORD | `controlled_destination_records` with tenant/destination/idempotency uniqueness | TI destination bounds; TN controlled adapter behavior | API-N exists; real external provider execution remains BLOCKED_EXTERNAL |
| Destination evidence | PARTIAL | N signs/verifies HMAC, tenant/transaction/entity, digest, action matching and freshness; NS ingests and correlates | `native_destination_observations`, separate from provider claims | TN tampering, wrong scope, expired/out-of-window observations, exact-action confirmation | API-N ingestion is owner/admin and verifies evidence; controlled key is not an independent third-party attestation |
| Actual outcome | PARTIAL | N distinguishes confirmed/unknown/critical failure; DB-R review has separate provider/runtime/destination assertions | `native_enforcement_outcomes`, contradictions and incident lineage; `decision_outcome_review` | TN provider success vs signed destination failure; TC all requested review scenarios | API-N correlation and API-R adjudication exist; generic business-result verification is MISSING |
| Receipt | WORKING | C returns decision/evidence/policy/graph/Replay/memory references; S reconstructs persisted receipt | DB-C canonical index and external references | TC receipt completeness, unknown executor, duplicate retrieval | API-R exports stored review with original decision; a SUCCEEDED relay field remains a provider-reported outcome |
| Replay | WORKING | C appends before executor; NS appends separate acknowledgement/destination/outcome events | Canonical transaction events and native Replay lineage | TC artifacts survive provider exception; TI/TR chronology contracts | Receipt/history and API-N retrieval expose lineage, not independent proof by themselves |
| Trust Memory | WORKING | C writes only material decision/condition change; NS/DB-N record material contradiction/control-failure history | `trust_memory_index`; DB-R review memory event | TC non-material suppression and original decision preservation; TI critical incident/memory contracts | Memory is historical context, not authority to repeat an action |

Ordering matters: the canonical decision, Evidence Graph, Replay and material Trust Memory are persisted **before** the generic executor is called. An executor throw previously prevented the returned receipt/outcome, not those earlier artifacts. The fix normalizes an unclassified executor exception to `UNKNOWN`, with internal `configured: null`, no invented request/acknowledgement reference, and a constant sanitized reason. A configuration or delivery claim is not inferred from the throw. Typed persistence failures still throw. Persisting UNKNOWN uses the existing outcome RPC, which requires an existing request record: if reservation never succeeded, it fails visibly rather than manufacturing a request. An idempotent retry does not re-execute an earlier authorization.

The generic SQL request record means an attempt was registered; it is created before transport. Accordingly, its appended `COMMAND_SENT` continuity entry is now `asserted`, and unconfigured registrations do not add that entry. Generic SUCCEEDED adds `ACTION_EXECUTED`/`CONSEQUENCE_OBSERVED` as `asserted`; absent final outcome adds `missing`. Independent observed stages already present in the receipt are preserved. The native signed destination path retains its stronger `CONFIRMED` result. Persisted generic continuity and immediate post-call continuity are not a complete, independently verified world-state timeline; the external event ledgers remain the durable detail.

## Decision Outcome Review and contradictions

The existing review already represents `SUPPORTED`, `CONTRADICTED`, `HUMAN_OVERRIDDEN`, `PARTIALLY_SUPPORTED`, and `UNRESOLVED`. It retains `originalDecision`, original policy/reasons, nullable model provenance, separate provider/runtime/destination outcomes, optional human override, and adjudication. No representation gap justifies a new table.

| Scenario | Existing representation and verified behavior |
| --- | --- |
| ALLOW, execution never occurred | `UNRESOLVED`, provider `NOT_ATTEMPTED`, destination null; canonical NOT_CONFIGURED/UNKNOWN never implies execution. Native no-evidence correlation is UNCONFIRMED/UNKNOWN. |
| ALLOW, provider SUCCEEDED, destination FAILED | Review `CONTRADICTED` retains both observations; matching authenticated native FAILED evidence contradicts a SUCCEEDED claim. Original ALLOW remains unchanged. |
| ALLOW, independent destination contradicts provider | Same review representation; native and federated correlation retain conflict. Local tests use distinct signed fixture source labels; they do not prove a live independent organization supplied the evidence. |
| DENY, downstream execution observed | Native dispatcher is never invoked. Separately ingested signed OBSERVED evidence can produce `EXECUTION_OCCURRED_AFTER_DENY` and critical control failure; DB-N appends incident/Replay/memory evidence. Review records CONTRADICTED while original DENY remains unchanged. FAILED, unverified, tampered, wrong-transaction, wrong-action/target/digest or implausibly timed observations do not prove this case. No-request DENY correlation derives action scope and decision time from the server-owned canonical row, checks a 30-second clock skew, and does not invent an enforcement request. |

The review endpoint resolves the authenticated tenant and original decision from persistence. Its SQL function changes only the review/updated timestamp and appends chronology/memory. A repeat of the same review is idempotent; a different review cannot overwrite the attached review. **Limit:** outcome strings and evaluation status are reviewer assertions, not an automatic cryptographic verifier. The endpoint does not dereference arbitrary evidence strings or establish an independent legal source. A late review must cite the existing authenticated evidence records; attaching `SUPPORTED` alone cannot establish actual execution. The single immutable review also does not provide a general amendment history; later evidence is retained in the existing event/native ledgers.

## Provider-neutral evidence and external policy

The existing [adapter envelope](../lib/providers/adapters.ts), [federated evidence classifications](../lib/operational-entities/federated-evidence.ts), and [Evidence Graph](../lib/evidence-graph/evidence-graph.ts) can represent the requested categories without a new platform:

| Requested kind | Existing representation | Verification boundary |
| --- | --- | --- |
| IDENTITY_PROVIDER_ASSERTION | IDENTITY_PROVIDER plus `identity_provider_asserted` | Verified identity does not grant action authority |
| ACCESS_PROVIDER_ASSERTION / AUTHORIZATION_PROVIDER_ASSERTION | Evidence type + `provider_asserted`, provider/native event references | Permission or external ALLOW is evidence, not canonical ALLOW |
| EXTERNAL_POLICY_ASSERTION / AGENT_CONTRACT / IAM_POLICY / MCP_POLICY / DATA_GOVERNANCE_POLICY / DESTINATION_POLICY / REGULATORY_CONTROL | Existing evidence type and `normalizedEvidence`/`evidenceContext`; evidence node and authorization relationship | Representable; generic authenticity, completeness and semantic enforcement are PARTIAL |
| SECURITY_PROVIDER_ASSERTION / GATEWAY_ASSERTION / RUNTIME_ASSERTION | Existing provider class/type and `provider_asserted`/`runtime_observed` | A label is not verified coverage or attestation |
| EXECUTION_OBSERVATION / DESTINATION_EVIDENCE | Separate native execution/runtime/destination records; `destination_observed` | Exact scope, signature, freshness and correlation required |
| INDEPENDENT_EVIDENCE | `independently_corroborated`, source party and independence classification | Multiple systems from one party are not independent; source registration/authentication is still required |
| OUTCOME_CONTRADICTION | Contradiction record, review status, graph relationship flags | Preserves conflicting facts; does not replace the original decision |
| CYBER_SENTINELS_DECISION | Canonical decision/snapshot and decision graph node | Created by the canonical evaluator only |

Provider, object ID, version, hash, issuer, effective time, expiry, scope and provenance fit the existing envelope: provider key/class; provider event/reference; schema/version; source/payload digest; source party/classification; observed/expiry times; scope; normalized metadata. External-policy-specific issuer/effective/version fields are metadata rather than required typed, independently authenticated claims. The graph's presentation metadata is bounded/redacted and is not a full-fidelity policy store. This is **PARTIAL provenance enforcement**, not a schema representation failure.

The normalizer previously inferred `provider_signed` from `runtime_security`, `human_signed` from `human_intent`, coverage from a runtime label, and continuity from substrings such as `verified` (including `NOT_VERIFIED`). It now defaults to unsigned/not-observed/review-required because normalization does no verification. Canonical monitoring requirements no longer alone manufacture observed coverage. Existing authenticated native destination verification is unchanged in strength. Reference adapters remain non-live/INCONCLUSIVE; client evidence is bounded by the [agent-asserted ingestion path](../lib/public-api/v1/client-evidence.ts).

The tested invariants are: identity != authority; policy != authority; agent contract != delegation; entitlement/permission rule != business mandate; external ALLOW != canonical ALLOW; provider success/agent report != verified outcome; activity/audit history != end-to-end proof. The new policy fixture carries external ALLOW and still receives canonical DENY for absent action scope or revoked delegation. No external policy engine was added.

## Execution environment evidence

RUNTIME_ASSERTION, HARDWARE_ATTESTATION, WORKLOAD_ATTESTATION, ENVIRONMENT_IDENTITY, ENVIRONMENT_INTEGRITY, ENVIRONMENT_COMPROMISED, ATTESTATION_EXPIRED and ATTESTATION_UNAVAILABLE can be represented through existing evidence types/metadata, provider classes, timestamps and transaction references. This representational support does not implement hardware quote verification or certify an environment.

When the active authority contract requires `RUNTIME_ATTESTATION`, the focused behavioral matrix proves missing, unavailable, expired, unconfirmed and agent-reported attestation produces REVIEW and zero executor calls; FAILED/compromised evidence produces DENY. Native enforcement separately cancels changed runtime and reviews UNKNOWN runtime continuity. The policy version is pinned, but required evidence is presently enforced through the existing authority contract fields; an arbitrary external policy object is not compiled into requirements automatically. Monitoring requirement names alone are not attestation evidence.

Thus agent verified != runtime verified; authority verified != execution integrity verified; ALLOW != safe execution environment; a provider runtime assertion != independent attestation. No EDR, scanner, confidential-computing platform, Meta integration or VAST integration was built or claimed.

## Cyber Sentinels capability boundary

This matrix makes no assertion about Outerlimit or any other competitor.

| Capability | Cyber Sentinels status | Evidence/limit |
| --- | --- | --- |
| Agent identity | WORKING | Operational Entity resolution and identity evidence; TC/TN |
| Business mandate | PARTIAL | Authorized objective/purpose/owner recorded; independent mandate issuance not established |
| Authority | WORKING | Tenant/action/target/environment/time-bound contract evaluation |
| Delegation | WORKING | Parent/delegate constraints, immutable binding, current-state reservation |
| Policy | WORKING | Active canonical version and contract rules; external-policy semantics remain evidence |
| Execution context | PARTIAL | Action/runtime/model/evidence context represented; arbitrary runtime authenticity not established |
| Action-specific authorization | WORKING | Canonical action boundaries and immutable digest |
| Pre-execution enforcement | WORKING | Native ALLOW-only reservation and current-state checks for controlled destination |
| MCP/tool enforcement | PARTIAL | OpenGraph tool/domain authority checks exist; real provider execution unqualified |
| Revocation | WORKING | New evaluations/native reservation reject revoked authority/delegation/entity |
| Execution observation | PARTIAL | Native claims/runtime observations separated; generic relay assertions are not observation |
| External-effect observation | PARTIAL | Bounded controlled destination record exists; arbitrary external effect unproven |
| Destination evidence | PARTIAL | Signed exact-action controlled evidence; live independent source qualification missing |
| Actual-outcome verification | PARTIAL | Controlled action confirmation; general business outcome verifier MISSING |
| Contradiction detection | WORKING | Provider/destination disagreement, destination conflicts, authenticated DENY execution case |
| Receipt | WORKING | Canonical reference/digest/policy/review receipt with explicit unknown outcomes |
| Replay | WORKING | Persistent decision and separate later evidence chronology |
| Trust Memory | WORKING | Material change/contradiction/review retention, not routine-success authority |
| Cross-provider evidence | PARTIAL | Neutral envelope/source-party classification; live adapter authenticity varies and reference adapters are non-live |

The smallest remaining gap is operational qualification of a scoped, authenticated external executor and destination evidence source feeding the existing transaction/native evidence/review records, with demonstrated exact-action correlation and independent provenance where claimed. A new generic model would not supply that missing proof. For the controlled destination the code can prove the recorded action under its own signing trust boundary; for unqualified external providers the answer to “what happened after authorization?” remains UNKNOWN/BLOCKED_EXTERNAL.

## Validation

`npx tsx --test --test-reporter=spec tests/canonical-trust-transaction.test.mjs tests/decision-outcome-review.test.mjs tests/native-enforcement-outcome-proof.test.mjs tests/native-enforcement-outcome-proof-integration.test.mjs tests/provider-neutral-evidence-independence.test.mjs tests/opengraph-boundary.test.mjs`

Result: **168 tests passed, 0 failed, 0 skipped** on 2026-09-29. Behavioral cases execute the real canonical/native pure implementation with synthetic dependencies and signed fixture evidence. TI/TR explicitly inspect source/SQL contracts; they are not live RLS or authenticated Production proof. Complete repository validation is recorded in the PR alongside the wider suite and TypeScript checks. No Production transaction, live provider call, migration application, merge or deployment was performed for this audit.
