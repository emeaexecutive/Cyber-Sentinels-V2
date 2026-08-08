# End-to-End Trust Transaction Audit

Date: 2026-08-07

Branch: `feat/product-closure-canonical-transaction`

Scope: repository and local validation only; production was not accessed or changed.

## Executive finding

Before this closure, Cyber Sentinels had strong persisted parts but no single transaction boundary joining them. The strongest real path was Hopae Connect callback verification through normalized provider evidence and the RC1 atomic assessment persistence function. Trust Object composition and Trust Contract evaluation were also durable. External execution was only an in-memory design-partner plan, acknowledgement and outcome were not separate durable records, and the generic `/api/trust/execute` fallback accepted caller-supplied trust signals.

The canonical path is now `executeCanonicalTrustTransaction()` in `src/lib/trust-transaction/canonical.ts`. It composes the existing Trust Object, Trust Contract, exact policy version, stored normalized evidence, Trust Fabric decision, Evidence Graph, Replay, material Trust Memory and Operational Trust state. It adds only the missing transaction and external-action records. The old design-partner engine remains for compatibility but is explicitly non-canonical.

## Classification vocabulary

- **working** — executable code with a durable, tenant-scoped storage boundary.
- **working only in memory** — executable behavior without durable authoritative state.
- **mocked** — simulated adapter, relay, result or fixture.
- **static UI** — a page presents prepared data without a working write/read path.
- **partially persisted** — some, but not all, required records survive the request.
- **live-provider blocked** — the adapter is implemented, but this environment lacks the credentials or provider state needed to prove a live call.
- **missing** — no implementation for the required stage.
- **duplicated** — more than one implementation claims or approximates the same responsibility.

## Canonical implementation map

| Capability | Canonical implementation | As-found classification | Closure classification | Evidence |
|---|---|---:|---:|---|
| Trust Object | Enterprise Trust Fabric projection and types | working | working | `enterprise_trust_objects`; `src/lib/trust-fabric/types.ts`; `src/lib/trust-fabric/repository.ts` |
| Identity/provider evidence | Hopae provider adapter, signed callback, normalized evidence ledger | working; live-provider blocked | working; live-provider blocked | `lib/providers/hopae-rc1-server.ts`; `normalized_identity_evidence`; `provider_execution_records` |
| Authority | Trust Contract plus deterministic contract evaluator | working | working | `trust_contracts`; `src/lib/trust-fabric/contracts.ts` |
| Policy evaluation | Exact Trust Contract policy and `trust_policy_versions` | working; duplicated | working | `src/lib/trust-fabric/contracts.ts`; `trust_policy_versions` |
| Trust decision | Trust Fabric decision envelope and durable decision table | partially persisted; duplicated | working | `createDecisionEnvelope()`; `trust_fabric_decisions`; canonical transaction decision RPC |
| External action relay | Design-partner GitHub relay plan | working only in memory; mocked | working when configured; live-provider blocked otherwise | signed server relay in `lib/trust-transaction/server.ts`; separate request/acknowledgement/outcome tables |
| Evidence Graph | Enterprise evidence graph nodes and edges | working; duplicated | working | `evidence_graph_nodes`; `evidence_graph_edges`; graph extension RPC |
| Replay | RC1 replay sessions and newer replay event implementations | working; duplicated | working | `trust_replay_sessions`; canonical replay RPC |
| Trust Memory | RC1 timeline memory and Enterprise Trust Memory index | partially persisted; duplicated | working, material changes only | `trust_memory_index`; material memory RPC |
| Operational Trust | Trust state projections and lifecycle logic | working; duplicated | working | transaction `trust_state`; prior transaction linkage; `subject_trust_state` remains the wider read model |
| Recovery | Trust recovery API and state-transition components | partially persisted; duplicated | working for transaction re-evaluation; wider recovery remains separate | `previous_transaction_id`; changed conditions; ALLOW/REVIEW/DENY maps to verified/degraded/suspended |

## Eighteen-stage audit

| # | Required stage | As found | Canonical closure | Stored proof |
|---:|---|---|---|---|
| 1 | Human or AI agent registered | working; duplicated between `agents`, `ai_agents` and Trust Subjects | Trust Object must already exist in the session tenant; unknown subjects fail closed | Trust Object projection and subject identifiers |
| 2 | Identity/provider evidence collected | working; live-provider blocked in this environment | only completed, normalized provider evidence is loaded server-side | evidence reference, provider ID, provider event ID, source digest, timestamps and outcome |
| 3 | Authority issued | working through Trust Contracts; older authority graphs also exist | latest active, tenant-scoped Trust Contract is required | contract ID plus authority evidence references |
| 4 | Consequential action requested | partially persisted in older runtime; design-partner request in memory | request metadata and SHA-256 payload digest are persisted | canonical transaction and external request records |
| 5 | Policy evaluates action | working; duplicated | exact active policy ID/version/hash from the Trust Contract is resolved | policy ID, version and hash on decision and event records |
| 6 | Evidence completeness checked | working in engines; not one canonical persisted result | completeness and freshness are stored on the transaction | `evidence_complete`, `evidence_fresh`, evidence digest and reason codes |
| 7 | ALLOW, REVIEW or DENY | working in multiple engines | one deterministic transaction decision mapping | Trust Fabric decision plus transaction decision |
| 8 | Decision persisted | partially persisted across earlier paths | decision and transaction request persist atomically and idempotently | `trust_fabric_decisions`; `canonical_trust_transactions`; decision event |
| 9 | Authority Lineage linked | working in contracts/graph; not consistently joined to execution | contract and authority evidence references are attached to receipt and graph | authority reference, lineage JSON and graph node/edge |
| 10 | Evidence Graph linked | working; duplicated | transaction, decision, policy, authority, Trust Object and evidence refs are linked | tenant-scoped graph nodes/edges with correlation ID |
| 11 | Replay written | working; duplicated | Replay is required before any external relay call | replay session and canonical replay event |
| 12 | Trust Memory written only when material | older lifecycle wrote memory for every assessment | non-material writes are skipped in code and rejected in SQL | `material_change`, changed conditions and Trust Memory reference |
| 13 | Action executes only when approved | design-partner plan only; generic fallback was not a safe relay boundary | external request function rejects anything except persisted ALLOW | SQL ALLOW guard plus REVIEW/DENY tests |
| 14 | External result separate from request | missing | request, acknowledgement and outcomes are separate append-only records | three separate tables and event types |
| 15 | Changed condition triggers re-evaluation | working only in memory in Living Trust demonstrations | prior transaction is tenant-linked; evidence, authority and policy changes are compared | `previous_transaction_id`; `changed_conditions` |
| 16 | Trust degrades, suspends or recovers | partially persisted across lifecycle/state engines | REVIEW → degraded, DENY → suspended, later ALLOW → verified recovery | prior/current transaction history and material Trust Memory |
| 17 | Complete history in one UI | static or spread across several pages | one tenant-protected transaction page | `/trust/transactions/{transactionId}` returned in the receipt |
| 18 | Every statement backed by stored evidence | partially persisted | UI uses the stored receipt, stage events and external records; unknown stays unknown | correlation ID, record digest, references and immutable chronology |

## Canonical service boundary

`executeCanonicalTrustTransaction()` runs this sequence:

1. `authenticateActor()`
2. `resolveTenantFromSession()`
3. `resolveTrustObject()`
4. `collectConfiguredEvidence()`
5. `validateEvidenceFreshness()`
6. `resolveAuthority()`
7. `validateAuthorityScope()`
8. `resolvePolicyVersion()`
9. `evaluateCanonicalTrustDecision()`
10. `persistDecision()`
11. `extendEvidenceGraph()`
12. `appendReplay()`
13. `emitMaterialTrustMemory()`
14. `requestExternalExecutionIfAllowed()`
15. `recordExternalAcknowledgement()`
16. `recordExternalOutcome()`
17. `returnSafeTransactionReceipt()`

The input intentionally has no tenant or enterprise field. The tenant is obtained from signed session application metadata when present, then from a tenant owned by the authenticated user, then from a tenant membership. Every database lookup is scoped with that resolved tenant.

## Decision behavior

| Condition | Decision | Operational Trust | External execution |
|---|---|---|---|
| Active authority, matching scope/purpose, exact active policy, fresh successful provider evidence | ALLOW | verified | requested only after decision, graph, Replay and material-memory stages succeed |
| Missing, stale or inconclusive evidence, or a review condition | REVIEW | degraded | prohibited |
| Revoked/expired/out-of-scope authority, negative provider evidence, prohibited provider/environment or material incident breach | DENY | suspended | prohibited |
| Later compliant evidence/authority/policy after degraded or suspended transaction | ALLOW | verified (recovered in history) | eligible after the new transaction is persisted |

An acknowledgement proves only that the relay received a request. It never becomes an outcome. A timeout or transport failure is recorded as `UNKNOWN`, because execution may have occurred beyond the observable boundary. A later evidence-backed terminal outcome can be appended without deleting the unknown record.

## Provider reality

Hopae Connect is the strongest existing provider path:

- a provider execution record is written before the upstream call;
- callbacks require server verification;
- callback idempotency is reserved before processing;
- provider state is retrieved and normalized;
- the provider event ID and raw-payload digest are retained;
- raw identity documents, biometrics, access tokens and provider secrets are excluded;
- normalized evidence is written before it can influence the canonical transaction.

No Hopae sandbox verification was run for this closure because `HOPAE_API_KEY`, `HOPAE_WEBHOOK_SECRET`, Supabase URL and service-role credentials are not configured in the local environment. This is classified **live-provider blocked**, not passed. The local evidence-preservation and no-fabrication behavior is covered by focused tests.

## Duplication disposition

The following remain for compatibility but are not canonical for consequential execution:

- `lib/design-partner/trust-transaction.ts` — in-memory agent, authority, decisions and a relay plan; mocked/in-memory.
- `lib/runtime/trust-execution-pipeline.ts` and the removed generic `/api/trust/execute` fallback — older runtime evaluation; caller-controlled signals are no longer accepted by the execution route.
- `lib/core/trust-lifecycle-orchestrator.ts` — deterministic assessment/lifecycle composition used by RC1 provider evidence; not the external transaction persistence boundary.
- `lib/replay/replay-writer.ts` — persists timeline items but its retry/dead-letter diagnostics are process-local.
- multiple Trust Memory and Evidence Graph projections — retained because current consumers depend on them; the canonical transaction links the enterprise stores and does not create another graph or memory engine.

## Security and integrity properties

- No client-controlled tenant exists in the canonical input. The Hopae start path now resolves its workspace from the session as well.
- No caller-provided trust score, provider signal, evidence reference or verification result is accepted by the canonical execution route.
- Provider evidence must already be normalized and persisted. An explicit provider execution must also match the tenant, workflow, provider session and Trust Object subject. Missing evidence cannot be fabricated into ALLOW.
- Tenant ID and correlation ID are present on every newly introduced record.
- Application comparison, database uniqueness and advisory locks enforce idempotency. Actor, subject, action, purpose, resource, environment or digest changes under an existing key raise a conflict.
- Decision, events, external requests, acknowledgements and outcomes are append-only; the transaction row is a service-maintained receipt index.
- External payload bodies are not stored. Only the request digest and bounded action metadata are retained.
- The configured relay requires HTTPS except local non-production testing and receives an HMAC signature, correlation ID and idempotency key.
- RLS permits tenant members to read only records for workspaces they can access. Writes require the service role RPC boundary.

## API contract

Canonical execution continues at `POST /api/trust/execute`. `action: "establish_trust"` starts the existing Hopae verification flow. Any other action invokes the canonical transaction with this bounded shape:

```json
{
  "subject_type": "ai_agent",
  "subject_id": "00000000-0000-4000-8000-000000000000",
  "requested_action": "settle_invoice",
  "requested_purpose": "settle_invoice",
  "resource": "invoice:4488",
  "environment": "sandbox",
  "payload_digest": "<64 lowercase hex characters>",
  "idempotency_key": "settlement-4488-attempt-1",
  "provider_execution_id": "<optional completed provider execution UUID>",
  "previous_transaction_id": "<optional tenant-scoped transaction UUID>"
}
```

The response contains only safe normalized evidence metadata and references. It returns the history URL. It never returns raw provider payloads, action payloads or relay secrets.

## Validation record

Focused test command:

```text
npm run test:canonical-trust-transaction
```

Covered behavior:

- exact pipeline surface;
- no tenant in input;
- Hopae event ID/source digest preservation;
- ALLOW execution;
- REVIEW and DENY non-execution;
- acknowledgement/outcome separation;
- `UNKNOWN` outcome persistence;
- idempotent retry short-circuit;
- degrade/suspend/recover state mapping;
- material-only Trust Memory;
- tenant RLS and append-only SQL controls;
- single history UI;
- removal of the caller-controlled runtime fallback.

Full validation completed locally:

| Check | Result |
|---|---|
| `npm ci` | passed; 381 packages audited |
| `npm run lint` | passed with zero errors and two pre-existing unused-import warnings in release tooling |
| `npm run typecheck` | passed |
| `npm run test:canonical-trust-transaction` | passed; 18/18 tests |
| `npm test` | passed; complete repository test chain |
| `npm run build` | passed; 192 static pages and the dynamic transaction history route compiled |
| local `/api/health` | HTTP 200 |
| local protected transaction history without auth configuration | HTTP 503, fail closed |
| local canonical execution API without auth configuration | HTTP 503, fail closed |
| `npm audit --omit=dev` | zero production dependency vulnerabilities |
| full `npm audit` | one high-severity development-only `js-yaml` advisory (CVE-2026-59870); dependency baseline not changed in this closure |

The migration was not applied to a local or remote Supabase database because no Supabase URL or service-role key is configured. Production was untouched. Database application and a credentialed Hopae sandbox transaction therefore remain deployment evidence gates, not implied passes.
