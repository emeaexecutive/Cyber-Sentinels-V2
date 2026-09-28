# V2 production proof matrix

Review: 27 September 2026. Base main `f1c12752a130acfc0721f9b124900c7726c5a26e` after normal merge of PR #108. This branch is not a production release.

WORKING below means the named implementation has executable local evidence. It does not certify a real provider, a production user journey, or an untested destination. PARTIAL identifies a real boundary whose full workflow is not connected. Production observations in this task were read-only schema, permissions and aggregate integrity checks; no production transaction, account, provider event or test data was created.

| Capability | Status | Evidence source | Production proof still needed |
| --- | --- | --- | --- |
| AUTH | WORKING | `tests/sign-out.test.mjs`, `supabase-ssr-auth-regression`, `auth-callback-redirect-security`, password recovery suites | Consented real login, recovery, logout and expired session on released build |
| API KEY | WORKING | `public-api-v1-security.test.mjs`; key hashing, scope, expiry/revocation and owner membership in `lib/public-api/v1/authentication.ts` | Controlled tenant key lifecycle and cross-tenant denial |
| AGENT REGISTRATION | WORKING | `lib/public-api/v1/runtime.ts`, external-agent platform suite | Register approved test agent in authorized environment |
| ED25519 PROOF | WORKING | `native-operational-entity-verification.test.mjs`, public API security tests | Real controlled agent challenge, expiry and replay denial |
| AUTHORITY | WORKING | Canonical and public API tests; live `trust_contracts` constraints inspected | Issue, narrow, expire and evaluate approved authority |
| DELEGATION | WORKING | Native delegated-authority suites; parent/entity FKs inspected | Production table was empty; issue/accept/use/revoke chain not exercised here |
| PURPOSE | WORKING | `v2.1-purpose-lineage.test.mjs`, canonical tests | Matched purpose and observed drift in controlled flow |
| TARGET | WORKING | `opengraph-boundary.test.mjs`, canonical boundary tests | Exact target and out-of-scope rejection at qualified executor |
| POLICY | WORKING | Canonical policy version tests; persisted version/digest contract | Released policy version and replay comparison |
| ALLOW | WORKING | Canonical tests; incomplete receipt lineage now fails with 503 | Fresh qualified flow with complete evidence and separate outcome |
| REVIEW | WORKING | Canonical and synthetic interaction tests | Verify held dispatch, authorized reviewer, fresh evaluation after review |
| DENY | WORKING | Canonical, native enforcement and OpenGraph tests | Confirm no external attempt through every approved executor path |
| REVOCATION | WORKING | Native delegation cascade, public key lifecycle and canonical tests | Revoke while work is queued; verify next effect is stopped |
| EVIDENCE | WORKING | Judge.me, provider-neutral, client-evidence and incident suites | Legitimate provider event, bound tenant/subject/action, minimal persisted fields |
| RECEIPT | WORKING | Canonical tests and `lib/trust-transaction/server.ts` | Complete persisted graph/replay/material-memory references; no execution conclusion inferred |
| REPLAY | WORKING | Canonical idempotency and replay suites; deployed transaction-event parent aggregate = 0 orphans | Compare decision-time record to released UI/API; historical retry grants no new execution authority |
| TRUST MEMORY | PARTIAL | Canonical material-change tests and SQL; admin benchmark projection is now labeled | Canonical memory lineage vs validation-review projection must remain distinct |
| INCIDENT | WORKING | Operational incident suites; live incident-link aggregate = 0 missing transaction parents | Bound evidence and reviewer lifecycle in controlled production case |
| DECISION OUTCOME REVIEW | WORKING | Canonical/incident tests; `attach_canonical_decision_outcome_review_v1` inspected service-only | Original decision preserved while later outcomes/adjudication attach |
| SYNTHETIC INTERACTION | PARTIAL | `synthetic-interaction-trust.test.mjs`; canonical request composer | No general live executor; consequential unqualified actions remain held |
| OPENGRAPH | BLOCKED_EXTERNAL | `src/lib/opengraph/workflow.ts`, 41 boundary tests | Credentials and qualified DNS, redirect, subresource, target and outcome controls; NOT_CONFIGURED executor |
| JUDGEME | BLOCKED_EXTERNAL | `lib/providers/judgeme.ts`, normalization + HMAC tests | Merchant installation, credentials, authenticated ingestion, durable replay reservation and bindings; NOT_CONFIGURED executor |
| IDENTITY PROVIDERS | BLOCKED_EXTERNAL | Provider resilience/runtime tests; provider matrix | Real World ID/Stripe Identity/Persona qualification is not established by fixture tests |
| BACK OFFICE | PARTIAL | [UI audit](V2_BACKOFFICE_AUDIT.md), tenant/auth tests and canonical repository | Real role-based browser proof; legacy and benchmark surfaces are not canonical ledger evidence |

## Controlled proof sequence

1. Review and merge this PR separately. Apply the forward permission repair through the normal database release procedure, then read back function ACLs. The four currently exposed helper functions are a production security blocker until that happens.
2. In an explicitly authorized environment, use two isolated tenants and owner/admin/reviewer/observer accounts. Exercise session denial, key expiry/revocation, cross-tenant lookup denial and admin-only pages. Preserve safe request IDs and status codes, not tokens or customer payloads.
3. Register a controlled agent, verify its Ed25519 challenge, issue bounded authority and delegation, and exercise purpose/action/target mismatch plus expiry/revocation. Attach real provider evidence only after separate qualification.
4. Evaluate ALLOW, REVIEW and DENY. Record dispatch attempt and provider/destination outcome independently. Retry unchanged requests and conflicting idempotency payloads; simulate storage failure in a disposable test environment only.
5. Compare the same transaction through receipt, Replay, Trust Memory, incident evidence and outcome review. Original decision and policy digest must remain unchanged. REVIEW approval requires a new evaluation rather than rewriting the original result.
6. Record exact deployment SHA, environment, timestamp, test actor, safe evidence references and any remaining blocker. No row becomes PRODUCTION EXERCISED solely because a secret exists, a table has rows, a UI renders, or synthetic tests passed.

Search Console/Bing ownership and indexing/citation observations are separate external proof, described in `SEARCH_VISIBILITY.md`. No paid integration is required to complete the local implementation.
