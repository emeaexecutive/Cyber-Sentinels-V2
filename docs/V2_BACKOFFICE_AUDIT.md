# V2 back office alignment audit

27 September 2026. Source review plus isolated contract tests, not authenticated production browser qualification. Classification describes the displayed capability. A working data path is not proof that every row is provider-qualified.

| Surface / capability | Classification | Source and boundary |
| --- | --- | --- |
| Operational Entities list/detail | WORKING | `app/operational-entities`, `lib/operational-entities/server.ts`: session, tenant-scoped repository, current entity/authority/evidence. Controlled Alpha/Beta onboarding remains separately gated. |
| Canonical Agent Registry / native identity | WORKING | Operational Entities and `/api/v1/agents`; native manifest, key-possession proof and public client bindings. Registration is not authority. |
| Legacy `/agent-registry` | PARTIAL | Reads `ai_agents`, not canonical `operational_entities`; empty state includes labeled demo profiles. Errors no longer substitute demo agents; canonical destination now linked. |
| Legacy registry detail | PARTIAL | Profile state is not enforcement proof. Demo profile labeled explicitly; demo view omits live audit rows. General registry events now described as unfiltered to the agent. Unsupported inferred kill-switch state removed. |
| Authority and delegation detail | WORKING | `app/operational-entities/[entityId]/page.tsx`, native delegated-authority server/repository. Parent scope, acceptance and revocation remain canonical; no external provider label grants authority. |
| Canonical decisions/history | WORKING | `app/trust/transactions/[transactionId]` uses `loadCanonicalTrustTransactionHistory`; original decision distinct from external state and later review. |
| Decision outcome review | WORKING | Existing canonical review API/server/RPC; original reasons/policy preserved. UI rendering is not evidence that a downstream action succeeded. |
| Incidents / incident evidence | WORKING | `app/dashboard/incident-evidence`, operational incident server, `incident_evidence_links`; explicit tenant filter and verified references. |
| Canonical receipt / Replay | WORKING | `/api/v1/trust/transactions/*`, `/dashboard/replay`, transaction history. Incomplete persisted receipt lineage is rejected on evaluation retry. |
| Legacy verification receipts / timeline | PARTIAL | `verification_receipts`, `trust_timeline_events`, `evidence_chains` support prior workflows; these are not substitutes for canonical V2 transactions. `/trust/receipt/demo` visibly labels simulation. |
| Canonical Trust Memory | WORKING | Material-change canonical RPC and `trust_memory_index`, linked transaction/correlation. Source type is polymorphic; do not infer all memory rows are decisions. |
| `/admin/trust-memory` | PARTIAL | Built from `loadValidationCases`/`runValidationBenchmark` reviewed outcomes. Added visible projection notice and canonical Replay link. This view does not read the canonical transaction memory ledger. |
| Evidence | WORKING | Existing canonical, identity-signal and incident repositories retain provenance and minimized references. Judge.me assertions remain unqualified; Persona completion no longer fabricates biometric/document checks. |
| Provider status / integration status | PARTIAL | `/admin/provider-status`, `/admin/integrations`, `/dashboard/identity/providers` distinguish configuration and runtime evidence. Legacy World ID “not implemented” wording corrected to implemented verifier with live qualification unestablished. Conservative health fields are not a live provider probe. |
| Judge.me / OpenGraph installed executor controls | NOT BUILT | Local composition/normalization boundaries exist; no merchant installation UI or qualified live executor. Current status remains BLOCKED_EXTERNAL / NOT_CONFIGURED. |
| User/session/auth | WORKING | Supabase server client, middleware, auth/logout/recovery handlers; isolated session regressions. Supabase JWT expiry still applies after refresh-session revocation. |
| Admin-only surfaces | WORKING | `checkAdminAccess` / `requireAdminPageAccess` and API counterparts; provider/global admin status queries follow admin guards. Role-policy tests do not replace production browser proof. |
| Legacy `/back-office` and governance dashboards | PARTIAL | Aggregate legacy scoring, review queues, providers and canonical navigation coexist. Deterministic posture/benchmark outputs must not be described as the canonical ALLOW/REVIEW/DENY engine. No new decision engine added. |
| Public badge verification | NOT BUILT | Former endpoint returned a demo badge for unknown IDs. Now HTTP 501 `BADGE_VERIFICATION_NOT_CONFIGURED`, no synthetic trust score and no false verification events. |
| Compliance export placeholder | MOCKED | Public route explicitly returns draft/placeholder output; not a real evidence export or compliance certification. |

No new UI executor, API scope, paid service or provider qualification was introduced. Remaining production proof is in `V2_PRODUCTION_PROOF_MATRIX.md`. The forward-only SQL helper-permission repair is necessary even though these UI guards exist: direct database RPC permissions are a separate boundary.
