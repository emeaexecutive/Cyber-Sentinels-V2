# Execution 02 — qualification report, 12 November 2026

**Overall verdict: NO-GO for an operational Production SOC release.** This execution implements and exercises a governed local synthetic incident journey. It does not establish hosted AI operation, complete localization, independently operating AI workers or Production recovery readiness. Existing uncommitted work was preserved in the original checkout. No GitHub PR was merged and no hosted schema/data write or manual deployment was executed. Connected Staging inspection used read-only catalog SELECTs.

## Candidate and review scope

Runtime branch: `codex/governed-soc-runtime-20261112`. Final code/build candidate: `2f77ed63c20fe312c3a5d4c07ef9d70bb9f52eb1` (SOC security source at `9ccf1b153c663b560c286e62620bb952dbd54909`, then CI/docs and explicit checkout tracing-root fixes). It starts at PR135 `202117ae82a48a7f8d536c29d5d700e8fbf11c70`, carries PR137's tooling fix, and includes schema branch `483d7dc18c12edfe636a8f8faec06df31389b635` as an ancestor. Later evidence-only commits must be distinguished from this code SHA.

All 13 original open PRs were inspected, including #116, #118, #123 and #128–137. Exact heads/checks/file lists and dependency findings are in [PR reconciliation](PR-DEPENDENCY-RECONCILIATION-20261112.md). Important: #131 is not a descendant of #128, #134 does not include #118's runtime, and River proof imports watchtower source from a separately pinned checkout. Green individual heads do not qualify their composition. Full integration attempts demonstrated conflicts in application, enforcement, package and deployment configuration; these were abandoned only in the new isolated checkout, without dropping original work or tests.

## 1–6. Agents, tools, AI classification and failures

The [runtime matrix](AGENT-TOOL-RUNTIME-MATRIX.md) and compressed source appendix record source paths, branches/SHAs, exports and qualification boundaries. Expanded discovery includes all 13 original PR head SHAs: **22,233 records across 23 ref snapshots** (some snapshots resolve to the same commit; this is not 22,233 distinct tools).

Named discoveries include TENENTE, ALSAMORA, VIACAMP, VIACAMP-2, CHIRIVETA, TORCH Intelligence, Sentinel Intelligence, Sentinel Copilot, Swarm Investigator, Authority Guardian, Containment Guardian, River Crossing, Swarm Emergency Stop; Watcher, Analyst, Guardian, Witness, Recovery and interceptor; Authority/Identity/Runtime/Evidence/Deployment/Workforce/Robotics Sentinel; Coordinator, Research, Analysis, Execution and Audit demo roles. Registry/Passports, Authority Graph, Evidence Vault/Replay, Trust Memory, external API routes, scheduled investigation/watchtower jobs and executable controls are also indexed. An enumerated source export is not automatically an agent-callable tool.

The new runtime entry points are `lib/soc/workflow.ts:GovernedSoc`, `lib/soc/copilot.ts:investigateWithCopilot`, existing `lib/swarm/watchtower-signals.ts:WatchtowerSignals`, `lib/swarm/containment.ts:SwarmContainment`, and `lib/swarm/operations.ts:swarmOperations`. Existing `app/api/tenente/swarm/route.ts` derives the tenant from authenticated context; `app/tenente/swarm/swarm-console.tsx` displays the persisted incident chain and offers controlled intake, registration, investigation and analyst feedback.

**Genuinely provider-backed code:** existing `lib/ai/openai.ts` and the new explicit OpenAI Responses adapter. Existing governance default is `gpt-5.2`; SOC requires an explicit `OPENAI_SOC_MODEL` and records configured/returned model identity. No live inference was executed in this run. Transport tests are **MOCKED**, not hosted model proof.

**Deterministic:** warning creation/relay verification, TORCH baseline scoring, evidence collection, Sentinel Intelligence assessment, authority enforcement, CHIRIVETA review, emergency stop, Sentinel role helpers and demo agents. New named SOC stages are coordinator stages with registered keys, owner/task/tool-contract evidence. They are not separate LLM-driven workers or independently authenticated read-tool calls. Only the TENENTE execution identity is bound to the canonical delegated-authority dispatcher. Full multi-agent autonomy remains unqualified.

**Working locally:** authenticated Ed25519 warning intake, alert deduplication/correlation, scoped evidence retrieval, bounded investigations, deterministic findings, exact-record Copilot citations under injected transport, current gateway checks, allowed synthetic dispatch, independently read destination effect, recovered journal Replay and trust-history records. Consequential execution is limited to the explicit synthetic test action. The web endpoint deliberately exposes no response-dispatch command until a destination and resolver are qualified.

**Failures/gaps demonstrated:** missing model configuration is a persisted failure; provider uncertainty stays UNKNOWN; malformed warnings and unauthorized requests fail closed. A caller-owned request mutation after authorization could substitute a destructive action: fixed by copying both request and warning before the first await, with regressions. Atomic per-alert investigation reservations prevent repeated/concurrent model calls. Interrupted reservations do not retry automatically and require operator review. Incomplete language content and unqualified hosted integrations remain release blockers, not successful features.

## 7. TypeScript and build

PR137 head `efb3a64036b984c309f4ac45c7a54e819a3c777e` has successful inspected CI steps including typecheck, tests, browser checks and build. The scratch exclusion retains application, tests and Next generated routes. No heap override was added.

The first fresh candidate typecheck exposed one route response-union error, subsequently fixed. Final exact-source validation results and logs are recorded in `VALIDATION-20261112.json`; preliminary results must not be substituted for the final result. A build started before the security-review changes is diagnostic only. Nested-worktree root inference and dependency isolation are recorded as environment limits where applicable.

## 8–9. SQL and PRs

[Draft schema PR #138](https://github.com/emeaexecutive/Cyber-Sentinels-V2/pull/138) extends the existing Replay CHECK with exactly 11 SOC/warning kinds; it creates no parallel SOC evidence store and changes no grants or RLS. Migration: `supabase/migrations/20261112104809_soc_replay_event_types.sql`. Existing private tenant CAS state/events hold alerts, investigations, model records, delegated state, outcomes, emergency state and evidence references. Existing projection recovery feeds canonical Replay/Trust Memory.

Four isolated SQL tests passed, including rollback/reapply, actual projection rows, tenant binding, grants, CAS conflicts and append-only history. Engine: **PGlite**, with serialized queries. This is not independent multi-connection PostgreSQL race proof or rehearsal of every hosted migration. See [database reconciliation](SOC-DATABASE-RECONCILIATION-20261112.md). Later atomic native-dispatch migrations in PR132 are not silently assumed present in the runtime base.

The runtime implementation and full qualification reports are in [draft PR #139](https://github.com/emeaexecutive/Cyber-Sentinels-V2/pull/139), stacked on schema PR #138. Neither PR authorizes merging, Production SQL or Production deployment.

## 10–12. Demonstration, model costs and emergency stop

Run `npm run demo:soc` to reproduce the local synthetic incident. `artifacts/soc/incident.json` contains the signed chain, one destination effect independently read from a separate file, COMPLETED outcome, recovered-store Replay verification, console timeline and trust-history records. The model is explicitly `NOT_CONFIGURED`; no deterministic explanation is passed off as AI inference. `artifacts/soc/console-browser.json` and desktop/mobile screenshots establish a real-component local browser fixture using real signatures and operations. They are not a Next/Supabase/hosted tenant test.

No hosted SOC demonstration exists for the new branch. Existing Preview deployment metadata is in [hosted qualification](HOSTED-QUALIFICATION-20261112.md); READY only establishes deployment status. Current serving Production SHA could not be established from the returned metadata.

No model tokens were purchased or measured live. New adapter records usage, latency, provider and actual model per successful call; cost is `null` unless an explicit matching price schedule is supplied. The synthetic no-model demo has zero model cost. Synthetic transport usage values are test data. Bounded input/output, deadlines and one investigation reservation per alert limit work, but there is no tenant-wide monetary budget or independently measured correlation benefit.

Emergency stop is deterministic and uses the existing atomic containment/quarantine state. Local tests cover stopping between admission/dispatch, coordinator revocation races, in-flight UNKNOWN outcomes and independently authorized recovery. READY work is revoked; future dispatch is fenced. Already-dispatched external work may finish, cannot necessarily be interrupted and must be reconciled before recovery. CHIRIVETA's 60-second review window does not prove destination TTL enforcement; the demo records a timestamp only. Real provider expiry/reversal remains an explicit adapter qualification blocker.

## 13. Languages

The [language-by-route report](LANGUAGE-ROUTE-MATRIX-20261112.md) gives measured denominators and reasons per surface. Original dirty HEAD: Spanish ownership **0/43 (0%)**. Main snapshot: **0/42 (0%)**. Spanish PR133 source: **42/42 (100%) route mapping**, not semantic completion. Watchtower website PR136: **45/45 (100%) route mapping**, with 11 translated review/publication notices: at most **34/45 (75.56%)** non-notice route ownership. Neither percentage is a claim of translated product completeness or hosted quality.

English is the published source language. Presence of English routes is not a measured 100% accessibility/content-quality result. Protected SOC, onboarding, billing, Registry, Authority Graph and Evidence flows do not have complete reviewed Spanish resources. French, German, Portuguese, Italian, Arabic and Chinese are disabled public options: **0 qualified published translated routes**, rather than supported completed locales. French supplier-pilot labels are a narrow subset, not a French product. Hosted deployment mismatch, missing strings/routes, publication notices and absent content review are distinguished in the route matrix. Full release language acceptance fails. No unsupported locale was enabled by this change.

## 14–16. Integrations, blockers and customer readiness

- OpenAI: real adapter implemented; key/model absent; live inference, actual cost and model benefit unqualified.
- Supabase: shared schema/RPC integration and isolated SQL tests; no candidate hosted target configured or migration applied.
- Vercel/GitHub: connected read-only PR and existing deployment inspection completed; two review branches are explicit task output, not release approval.
- External destination: one file-backed synthetic adapter/observer demonstrated; no customer security connector, infrastructure-containment provider or real TTL enforcement qualified.
- External API/MCP: existing routes and tests inventoried; no new hosted product MCP endpoint or all-tools execution qualification established.
- Recovery: journal reopening and bounded SQL rollback/reapply tested. Full hosted DB/Storage backup restore, current recovery point, offsite ownership and external outcome reconciliation remain required.

On the exact locked dependency tree, the combined SOC/warning/authority/cancellation/persistence regression run passed **99/99**, API route mocks **6/6**, and the desktop/mobile browser journey **1/1**. Targeted ESLint passed. A redacted exact-range Gitleaks scan initially flagged 21 synthetic UUID/public-key fingerprint occurrences; each was verified against its historical JSON and source generator, then only those exact historical fingerprints were excepted. CI-configured rescan found no remaining leaks. These checks do not qualify unrelated repository history or hosted secrets.

Connected read-only inspection found **Cyber Sentinels Staging**, project `agpyhygpfmppjkxwcpac`, healthy. Its catalog currently has neither private swarm tables nor `load_swarm_state_v1` / `cas_swarm_state_v1`, and the Replay constraint accepts neither SWARM nor SOC events. Existing Replay/Memory tables have RLS enabled, not forced. Thus the new additive migration alone cannot make this hosted target ready: the prior swarm persistence/projection migrations and their dependency review are required first. `STAGING-READONLY-20261112.json` preserves metadata only; no customer rows were queried or changed.

The Staging security advisor reports four warning categories (14 findings): one mutable function search path ([remediation](https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable)); eleven authenticated-callable SECURITY DEFINER helpers ([review guidance](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable)); disabled leaked-password protection ([guidance](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection)); and insufficient MFA options ([guidance](https://supabase.com/docs/guides/auth/auth-mfa)). An intentionally exposed authorization helper is not automatically a vulnerability: inspect its authorization body before revoking privileges. No hosted repair or auth setting was changed.

Customer-ready claim is limited to a reviewable **local synthetic governance demonstration**. A customer-operating autonomous SOC, independently acting AI swarm, comprehensive alerting/detection coverage, full Spanish product and governed Production containment remain roadmap/qualification work. The four-record hand-labelled adversarial dataset deliberately records TP2/FP1/TN1/FN0: precision 2/3, recall 2/2 on that fixture only. Provenance does not establish maliciousness; the false positive is retained in the evidence.

## 17–18. Release verdicts and next approvals

| Surface | Verdict from this run | Blocking evidence |
|---|---|---|
| Website full release | NO-GO | English/Spanish semantic and protected-route completeness; current hosted functional/accessibility qualification |
| Customer pilot | NO-GO for operational use | Missing configured tenant/provider and hosted end-to-end evidence; local synthetic demo is reviewable |
| Control plane | NO-GO for Production promotion | Divergent stacks, atomic dispatch migration/app reconciliation, hosted tenant and backup/restore qualification |
| TENENTE SWARM | LOCAL SYNTHETIC DEMO ONLY | Independent agent workers, hosted delegation/revocation races and qualified destination remain absent |
| AI SOC | NO-GO | No live model run or measurable model benefit, no hosted SOC journey, synthetic source/response only |

Required next decisions: review the concrete schema/runtime PRs and dependency order; approve an exact isolated Staging project/tenant and migration window; configure server-only provider credentials and explicit model/budget through the approved secret channel; nominate independent operators and outcome-verifier ownership; then run the hosted adversarial journey, database security/race checks and backup/restore rehearsal. Production SQL, merging and Production promotion require separate explicit approval after those results. Broad acceptance is **not complete**.
