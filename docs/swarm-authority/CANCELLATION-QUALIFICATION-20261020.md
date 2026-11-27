# First-party cancellation delivery ? 20 October 2026

Follow-up to CPTO-CLOSURE-20261020.md, based on founder authorization to use the existing Trust Gateway and controlled HTTP/MCP runtime. The commit containing this report identifies the candidate; exact tested-source hashes and logs are retained alongside it. No hosted deployment or migration is included.

## Discovered execution and evidence paths

- `app/api/operational-entities/[entityId]/enforcement/route.ts`: existing authenticated gateway handler, action `request_enforcement`.
- `lib/operational-entities/native-enforcement-server.ts`: existing stored-decision/authority resolver and registered tool adapter composition; now passes the first-party cancellation lifecycle to registered HTTP/MCP adapters.
- `lib/operational-entities/native-enforcement.ts`: canonical current-state/admission/dispatch checks before adapter execution.
- `lib/operational-entities/http-tool-adapter.ts`: existing signed HTTP and MCP `tools/call` transport; now combines an AbortController signal with the existing timeout and closes its lifecycle in finally.
- `lib/swarm/native-server-controls.ts`, `native-guard.ts`, `containment.ts`: existing durable lease, authority and task binding. Cancellation blocks new admissions for the same swarm/task even with a changed idempotency key.
- `lib/swarm/cancellation.ts`: new signed command verification, durable transitions, bounded delivery observation, authenticated runtime evidence and reconciliation.
- `lib/swarm/store.ts`, `rpc-persistence.ts`: existing tenant CAS and append-only hash-linked journal. No new table, grant, RPC or migration is needed.
- `lib/swarm/evidence-projection.ts`, `evidence-projection-server.ts`: existing canonical Replay and Trust Memory projection/recovery. Cancellation transitions use the existing TRANSACTIONS_RECONCILED event envelope with explicit cancellationStatus, command and signed runtime evidence.
- `app/api/tenente/swarm/route.ts`, `lib/swarm/operations.ts`, `app/tenente/swarm/swarm-console.tsx`: existing authenticated owner/admin operations; adds cancel/reconcile-cancellation, displays task/execution IDs and resulting cancellation status.

## Contract and proof limits

Command domain `tenente:cancellation:v1`: tenantId, swarmId, taskId, executionId, reason, issuer, keyId, nonce, issuedAt, expiresAt, correlationId. `executionId` is the existing durable swarm lease ID (`swarmRequestDigest`); `taskId` is its server-classified task correlation. These are checked against stored state, not accepted as caller authority. The console exposes the identifiers.

Commands are Ed25519 signed using `signCancellation`. The existing server-only public-key registry pins issuer, tenant, swarm and key validity. The issuer must also be the currently authenticated independent operator. Maximum command validity is 60 seconds. Expired/forged/foreign-target commands, revoked keys and reuse of a nonce for changed content are rejected without mutation. An exact, still-valid retry returns the existing transition rather than issuing another cancellation; an expired replay is rejected. Reconciliation of an already accepted historical command may occur after expiry because it resolves recorded facts and does not grant execution authority.

| State | Established fact |
|---|---|
| CANCEL_REQUESTED | Signed request accepted into durable tenant journal and task blocked against new admission |
| CANCEL_ACKNOWLEDGED | First-party runtime authenticated the command and recorded receipt, or recovered a durable queued cancellation |
| CANCELLED | Atomic READY-to-REVOKED transition proves the queued lease never crossed dispatch; unused reservation released |
| ALREADY_COMPLETED | Existing verified completed lease establishes execution had finished; no rollback claimed |
| CANCELLATION_UNCONFIRMED | Worker delivery, transport completion or external effect cannot be established; no successful cancellation claim |

Each transition retains the operator Ed25519 signature and domain-separated HMAC runtime evidence using the existing server-only destination evidence key. The MAC binds the entire receipt body, including tenant, subject, actor, time, sequence, previous hash and transition details; this is authenticated server evidence, not a public-key runtime signature. `verifyCancellationEvidence` verifies the receipt hash and runtime signature. The API accepts no caller-supplied acknowledgement or outcome. Operator-supplied claims cannot produce CANCELLED/ALREADY_COMPLETED without the corresponding durable state.

Delivery is a durable journal request, not a process-local callback. Active controlled HTTP/MCP workers observe the journal across instances, at most one outstanding check per worker, every 100 ms. The operator request observes at most three 250 ms intervals before recording unconfirmed delivery. Exact retries do not redispatch external work. Current lease, membership, generation and runtime freshness are checked immediately before transport and during execution; canonical authority is also re-resolved by the existing admission/dispatch path. Emergency stop/revocation aborts an active controlled transport and records signed uncertainty.

HTTP AbortController also stops the existing HTTP-carried MCP transport. This is **not** a claim that a remote MCP server honored a logical tool-cancellation notification or reversed an effect. In-flight abort tests deliberately report CANCELLATION_UNCONFIRMED. UNKNOWN reservations remain held; only the existing verified destination-outcome path can settle them. Later reconciliation reports completed execution accurately. Queued proof survives a projection failure and can be recovered without rerunning execution.

`ThirdPartyCancellationAdapter` is the extension boundary. The supplied implementation is explicitly UNSUPPORTED with CANCELLATION_UNCONFIRMED and no signed evidence. No arbitrary external AI agent cancellation, provider URL, or remote kill payload is implemented. Provider-specific cancellation requires its documented contract and real integration evidence; the first-party implementation does not depend on that selection.

## Acceptance evidence

`tests/swarm-cancellation.test.mjs` covers twelve cases: queued/no-effect cancellation and exact retry; forged/expired/cross-tenant/wrong-target/revoked-key/changed-nonce rejection; expired replay; concurrent duplicates; actual loopback in-flight HTTP abort; actual HTTP-carried MCP abort; emergency stop; already-completed and tamper checks; absent-worker delivery and verified reconciliation; SQL journal/Replay/Memory persistence; recovery after projection interruption/expiry; compromised-agent rejection. A separate mocked-auth console route integration test verifies signature rejection, task/execution/status visibility and per-transition projection through the actual handler.

Controlled in-flight tests: one downstream request each, observed connection abort, zero subsequent calls, outcome CANCELLATION_UNCONFIRMED. Queued test: zero downstream effects, three signed transitions. PostgreSQL 17.11 persisted all three to the journal, canonical Replay and Trust Memory. The separate five-agent tests retain peak five, six requests including failure/retry, 50,000 EUR minor units and zero post-parent-revocation calls for each HTTP/MCP transport. No real money or commercial-provider effect was used.

Final validation: 2,262/2,262 regressions passed, including 88 swarm tests; the PostgreSQL cancellation/concurrency run passed 14/14. Typecheck, lint and optimized build passed. Changed-file lint is clean; full lint retains ten pre-existing warnings. The redacted changed-source scan found no leaks. [Evidence manifest](cancellation-evidence-20261020/manifest.json) records exact tested source hashes and compressed logs; CI is recorded on PR #118. An initial disposable PostgreSQL attempt used its previous ephemeral port and failed with loopback connection refusal; the corrected container port was verified before the successful run. An initial typecheck identified two unknown-to-canonical-JSON typing errors; those were fixed and verification rerun.

## Release status

First-party cancellation: WORKING_LOCAL after the recorded checks. Hosted execution, deployed signing configuration, cross-instance operational latency and real operator journey remain unqualified. Third-party cancellation remains UNSUPPORTED. No shared Staging or Production mutation/deployment was performed. PR #118 remains draft; no merge or Production release approval is implied.
