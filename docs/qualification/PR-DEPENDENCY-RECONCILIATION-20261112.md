# PR dependency reconciliation — 12 November 2026

This is a read-only reconciliation of all 13 currently open PRs in `emeaexecutive/Cyber-Sentinels-V2`. Connected GitHub queries verified current heads, status contexts and workflow conclusions. It does not qualify a newly composed integration SHA or hosted execution. No PR was merged, changed or closed; no hosted database was modified.

## Exact review heads

| PR | Branch | Exact head | Declared base | Current CI |
|---|---|---|---|---|
| [#116](https://github.com/emeaexecutive/Cyber-Sentinels-V2/pull/116) | `feat/authority-of-record-tenente` | `1138150889ec1237a848073f352881d93b72484b` | `main` | 3 queried workflows successful; no commit status contexts returned |
| [#118](https://github.com/emeaexecutive/Cyber-Sentinels-V2/pull/118) | `feat/tenente-swarm-authority-control` | `f144fd079043c72c981a3a29e029cad39e89a3cc` | `feat/authority-of-record-tenente` | 3 queried workflows successful; no commit status contexts returned |
| [#123](https://github.com/emeaexecutive/Cyber-Sentinels-V2/pull/123) | `swarm/qualification-hardening` | `43af4fcf96481039fcb920ce7871b3bf39842e2b` | `feat/tenente-swarm-authority-control` | 3 queried workflows successful; Vercel success |
| [#128](https://github.com/emeaexecutive/Cyber-Sentinels-V2/pull/128) | `audit/authority-closure-review` | `ab88dbfc848ee09f1ef08d28fd3f1d871981165f` | `swarm/qualification-hardening` | 3 queried workflows successful; Vercel success |
| [#129](https://github.com/emeaexecutive/Cyber-Sentinels-V2/pull/129) | `release/website-only-20261103` | `6a0c1813abcfadb9dd8d2af2b29baa569f33b8af` | `main` | 3 queried workflows successful; Vercel success |
| [#130](https://github.com/emeaexecutive/Cyber-Sentinels-V2/pull/130) | `feat/tenente-workload-identity-pr-a` | `e155cd35cf8f12fae94186c1fb3e7c55c86a2be8` | `main` | 3 queried workflows successful; Vercel success |
| [#131](https://github.com/emeaexecutive/Cyber-Sentinels-V2/pull/131) | `fix/approval-single-use-20261106` | `44b3c04f7f8431524c8a8d93d2f74751d957c2a4` | `main` | 3 queried workflows successful; Vercel success |
| [#132](https://github.com/emeaexecutive/Cyber-Sentinels-V2/pull/132) | `migration/approval-consumption-20261108` | `ad4a0e907a48bdb687351672355cddc5e74e2c00` | `fix/approval-single-use-20261106` | 4 queried workflows successful; Vercel success |
| [#133](https://github.com/emeaexecutive/Cyber-Sentinels-V2/pull/133) | `website/spanish-public-completion-20261108` | `13a3485bb8a6ec8af720ec579bcf6b357003dec6` | `main` | 4 queried workflows successful; Vercel success |
| [#134](https://github.com/emeaexecutive/Cyber-Sentinels-V2/pull/134) | `test/watchtower-river-boundary-20261109` | `25f82561435be959e4b14b61873fb454cc1aa51a` | `migration/approval-consumption-20261108` | 4 queried workflows successful; Vercel success |
| [#135](https://github.com/emeaexecutive/Cyber-Sentinels-V2/pull/135) | `feat/watchtower-controlled-demos-20261109` | `202117ae82a48a7f8d536c29d5d700e8fbf11c70` | `feat/tenente-swarm-authority-control` | 4 queried workflows successful; Vercel success |
| [#136](https://github.com/emeaexecutive/Cyber-Sentinels-V2/pull/136) | `website/watchtowers-ribagorza-20261109` | `582acc889afbe59991ea307bc5e4a2b986b11c0e` | `website/spanish-public-completion-20261108` | 4 queried workflows successful; Vercel success |
| [#137](https://github.com/emeaexecutive/Cyber-Sentinels-V2/pull/137) | `codex/p0-typecheck-20261111` | `efb3a64036b984c309f4ac45c7a54e819a3c777e` | `main` | 3 queried workflows successful; Vercel success |

Every queried workflow conclusion was success. Workflow queries are PR-triggered first-page summaries; a successful workflow does not establish that optional jobs ran. In particular, historically skipped Supabase Preview jobs are not hosted database proof. PR137's Production verification job steps were separately inspected: npm ci, production audit, lint, typecheck, tests, auth browser and build all succeeded; Docker succeeded. CI is evidence for those original heads only. The companion JSON preserves query results and filenames.

## Dependency order and scope

1. Build/tooling: #137 is independent on main `63a0e0f550f65b4beb3c52afabdba0481b510e69`; carry its two-file change into every candidate and retain tests/generated route typing.
2. Core authority/governance: #116 → #118 → #123 → #128 is the original declared stack. #116 includes account approval, audited transition, recovery and migrations; its deployment/account-state implications require explicit review.
3. Current dispatch application and database: #131 → #132 → #134. #131 and #132 are operationally coupled: the app intentionally fails closed without new RPCs. #132 prepares `20261108100241_atomic_native_dispatch.sql`; #134 retains 23 approval SQL tests and adds nine River tests.
4. TENENTE warnings: #135 is based on #118. Its ALSAMORA/VIACAMP/CHIRIVETA code is deterministic. #134's composed warning test imports actual #135 modules from a separate clean checkout pinned to `202117ae82a48a7f8d536c29d5d700e8fbf11c70` through `WATCHTOWER_SIGNAL_SOURCE`. It is not application wiring of #135 into #134.
5. Website/translations: #129 is an earlier website candidate; #133 → #136 is the more recent declared public website stack. #136 imports signed fixtures from #134/#135 but does not invoke their execution paths.
6. Workload identity: #130 is separately based on main. It requests decisions only, has no provider dispatch, and still needs hosted issuer/JWKS, binding migration, revocation and tenant-isolation proof.
7. SaaS onboarding/billing: no separate current PR establishes full operational qualification. Website and auth regression success must not be reported as a hosted paid customer journey.

Git ancestry explicitly disproves two tempting integration shortcuts: #128's head is not an ancestor of #131's head; #118's head is not an ancestor of #134's head. Their overlapping capabilities do not prove safe supersession. Keep original security/property/concurrency tests until behavior equivalence is demonstrated at the integrated SHA. Do not close #128/#123/#129 as superseded solely from titles.

The current PR split is not clean: #131 changes 97 files, including public pages, navigation, recovery artifacts, dependencies and enforcement; #133 changes 217 files and includes Auth/Turnstile routes and middleware as well as translations. New focused PRs should isolate incremental work rather than pretend these existing reviews are enforcement-only or website-only.

## Recommended integration candidate

Start controlled-execution composition from #134 `25f82561435be959e4b14b61873fb454cc1aa51a`, retain #132's SQL and existing regression harness, explicitly integrate needed #118/#135 runtime and identity dependencies, and apply #137's scratch exclusions. Keep website integration separate on #136 `582acc889afbe59991ea307bc5e4a2b986b11c0e`. Resolve actual code overlap rather than merging all stacks blindly. The root implementation workstream must record the resulting integration SHA and rerun affected security tests, uncached typecheck and production build. None of the above original SHAs alone is a qualified unified AI SOC candidate.

## TypeScript OOM fix assessment

#137 head `efb3a64036b984c309f4ac45c7a54e819a3c777e` changes only `tsconfig.json` and `docs/product/TYPESCRIPT-BUILD-QUALIFICATION.md`. Exclusions are `node_modules`, `tmp`, `temp`; includes retain `**/*.ts`, `**/*.tsx`, `.next/types/**/*.ts` and `.next/dev/types/**/*.ts`.

The prior evidence identifies 20,200 unrelated TypeScript files (131,432,670 bytes) in ignored nested scratch worktrees as the OOM cause. A fresh generated-route check reported 2,623 files, 60–100 seconds and about 1.6–2.2 GiB compiler memory. Build aggregate Node working set reached about 2.4–3.2 GiB; no heap override or new suppression was introduced. Production dependency audit was clean; six moderate development findings remained. These are historical local measurements, not new integration measurements.

Live CI at the exact head independently confirms typecheck and production build success via [Production verification run 43073193879](https://github.com/emeaexecutive/Cyber-Sentinels-V2/actions/runs/43073193879). It does not prove that a future integrated stack fits a smaller runner. A clean candidate must regenerate Next route types and use `tsc --noEmit --incremental false` or remove only its own build info before checking, with scratch probes excluded and real application/test source retained.

## Prior release evidence and remaining gates

Reviewed prior release evidence: `P0-REMEDIATION-EVIDENCE-20261108.md`, `WATCHTOWER-ADDENDUM-EVIDENCE-20261109.md`, `docs/governance/PR-116-QUALIFICATION-EVIDENCE.md`, and #137's build qualification document, plus current PR descriptions and changed filenames.

The October hosted approval/RLS tests and restored-backup rehearsal are historical, bounded proofs. The later 23 PostgreSQL/HTTP dispatch tests use a minimal predecessor schema. River proves at-most-once controlled synthetic destination effects and explicit UNKNOWN; it does not establish generic exactly-once provider execution. Signed warning and public bilingual Preview rendering are demonstrated; live AI review, hosted ingress, current RLS/delegation/approval/provider chain and hosted Evidence Vault/Trust Memory remain unqualified.

Latest prior read-only Staging evidence reports missing `issue_native_enforcement_approval_v2`, `claim_native_enforcement_dispatch_v2`, `load_swarm_state_v1`, `cas_swarm_state_v1`. This report has not rechecked the live schema. Migration drift, full-schema isolated rehearsal, recovery point and bindings need reconciliation before seeking the named hosted migration and synthetic-write approvals. No blanket db push or ledger rewrite is justified.

Website public review: GO at its existing tested scope. Website operational release, customer pilot, control plane, TENENTE SWARM hosted execution and AI SOC Production: NO-GO pending corresponding integrated and hosted acceptance evidence and explicit release approval. Green builds do not change those verdicts.

