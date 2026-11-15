# Execution06 baseline and PR truth

Observed 15 November 2026 through connected GitHub metadata/workflow/status/review-thread queries: **25 open PRs**. All reported heads remain unchanged from Execution05. Raw evidence: EXECUTION06-PR-SNAPSHOT.json. Required branch-protection approvals are not inferred from green checks or automated COMMENTED reviews.

Recovered c08831b43d9c3a8c020b3314c25cd33519dde446 and evidence commit 88062f52a64b31c270af17ee65a1576acacbdc43. New Track A branch codex/execution06-core-20261115 starts at 88062f5; application security commit 6b84d7615cf2246324a5985c56ef819955606424, final scanner-qualified source17055a082112c1c8f134f5132ee97100a68b0cf9. Original dirty root and other worktrees are preserved. Execution05's explicit workload relay restriction is retained; Execution06 defaults all API-client decision dependencies to no relay. All58 worktrees and local branch refs were inventoried read-only with zero inspection errors after approved ownership access.

| PR / title | Exact head | Base / SHA | Draft / mergeable | Returned workflows | Unresolved inline threads |
|---|---|---|---|---|---|---|
| #143 docs: clarify current bilingual website status | `9b58683a63ce71b7f6d48936dfd71f90f52b15c3` | codex/execution03-website-20261112 / `f0b0f3258124212b5f0bda96ecdccef4fb0dd803` | false / true | CodeQL: success; Redacted secret scan: failure; Public website exact-head qualification: success; Production verification: success | 0 |
| #142 Execution 03: integrated shared-quota enforcement and bounded SOC inference | `c6f84ebefd901725440f602288016c741d004b2c` | codex/shared-loop-budget-20261112 / `4ae8d2d5e6488773f68d8cd49002ff419d39b5ae` | true / true | Redacted secret scan: success; Production verification: success; Watchtower signed warning boundary: success; Integrated PostgreSQL enforcement: success; CodeQL: success | 0 |
| #141 feat(website): add bilingual River Crossing loop-limit simulation | `f0b0f3258124212b5f0bda96ecdccef4fb0dd803` | website/watchtowers-ribagorza-20261109 / `582acc889afbe59991ea307bc5e4a2b986b11c0e` | true / true | Public website exact-head qualification: success; Redacted secret scan: success; CodeQL: success; Production verification: success | 0 |
| #140 fix(swarm): enforce shared retry allowance across delegated agents | `4ae8d2d5e6488773f68d8cd49002ff419d39b5ae` | codex/governed-soc-runtime-20261112 / `87fa4ed672bc34d80b2f772cf0c26325903b78d7` | true / true | Watchtower signed warning boundary: success; Production verification: success; Redacted secret scan: success; CodeQL: success | 0 |
| #139 feat(soc): connect signed detection to governed synthetic response | `87fa4ed672bc34d80b2f772cf0c26325903b78d7` | codex/soc-replay-schema-20261112 / `8d31e027921ad046afd9158daaaadba2d9b41c64` | true / false | Watchtower signed warning boundary: success; Production verification: success; CodeQL: success; Redacted secret scan: success | 0 |
| #138 fix(db): support governed SOC records in shared Replay | `459be1c12c1c972406634d036dd410c9e532ea44` | feat/watchtower-controlled-demos-20261109 / `202117ae82a48a7f8d536c29d5d700e8fbf11c70` | true / true | Redacted secret scan: success; CodeQL: success; Watchtower signed warning boundary: success; Production verification: success | 0 |
| #137 Exclude ignored scratch trees from TypeScript program | `efb3a64036b984c309f4ac45c7a54e819a3c777e` | main / `63a0e0f550f65b4beb3c52afabdba0481b510e69` | false / true | Redacted secret scan: success; Production verification: success; CodeQL: success | 0 |
| #136 feat(website): add bilingual Ribagorza watchtower simulations | `582acc889afbe59991ea307bc5e4a2b986b11c0e` | website/spanish-public-completion-20261108 / `13a3485bb8a6ec8af720ec579bcf6b357003dec6` | true / true | CodeQL: success; Redacted secret scan: success; Production verification: success; Public website exact-head qualification: success | 0 |
| #135 feat(tenente): authenticate watchtower warnings without granting authority | `202117ae82a48a7f8d536c29d5d700e8fbf11c70` | feat/tenente-swarm-authority-control / `f144fd079043c72c981a3a29e029cad39e89a3cc` | true / true | Redacted secret scan: success; CodeQL: success; Production verification: success; Watchtower signed warning boundary: success | 0 |
| #134 test(tenente): prove River Crossing at a controlled destination | `25f82561435be959e4b14b61873fb454cc1aa51a` | migration/approval-consumption-20261108 / `ad4a0e907a48bdb687351672355cddc5e74e2c00` | true / true | Atomic approval consumption: success; Redacted secret scan: success; CodeQL: success; Production verification: success | 0 |
| #133 website: complete English-Spanish public pages and qualification gates | `13a3485bb8a6ec8af720ec579bcf6b357003dec6` | main / `63a0e0f550f65b4beb3c52afabdba0481b510e69` | true / true | Redacted secret scan: success; Public website exact-head qualification: success; Production verification: success; CodeQL: success | 0 |
| #132 security: add atomic single-use approval consumption | `ad4a0e907a48bdb687351672355cddc5e74e2c00` | fix/approval-single-use-20261106 / `44b3c04f7f8431524c8a8d93d2f74751d957c2a4` | true / true | Atomic approval consumption: success; Production verification: success; Redacted secret scan: success; CodeQL: success | 0 |
| #131 fix: require durable single-use approval dispatch claims | `44b3c04f7f8431524c8a8d93d2f74751d957c2a4` | main / `63a0e0f550f65b4beb3c52afabdba0481b510e69` | true / true | CodeQL: success; Redacted secret scan: success; Production verification: success | 0 |
| #130 feat(auth): tenant-bound OIDC workload API | `e155cd35cf8f12fae94186c1fb3e7c55c86a2be8` | main / `63a0e0f550f65b4beb3c52afabdba0481b510e69` | false / true | CodeQL: success; Production verification: success; Redacted secret scan: success | 5 |
| #129 Release approved website changes for 3 November 2026 | `6a0c1813abcfadb9dd8d2af2b29baa569f33b8af` | main / `63a0e0f550f65b4beb3c52afabdba0481b510e69` | true / true | Redacted secret scan: success; CodeQL: success; Production verification: success | 0 |
| #128 Prevent high-consequence approval reuse and revalidate before tool dispatch | `ab88dbfc848ee09f1ef08d28fd3f1d871981165f` | swarm/qualification-hardening / `43af4fcf96481039fcb920ce7871b3bf39842e2b` | true / true | Redacted secret scan: success; CodeQL: success; Production verification: success | 0 |
| #127 chore(deps): bump github/codeql-action/init from 3.38.0 to 3.39.1 | `4e01459bdc9b8b3cf1a21748c2219629dfe3c831` | main / `63a0e0f550f65b4beb3c52afabdba0481b510e69` | false / true | CodeQL: failure; Redacted secret scan: success; Production verification: success | 0 |
| #126 chore(deps-dev): bump @types/node from 22.20.4 to 22.20.5 in the development-tooling group | `2639911a58b38861eb7f7e4f7fbeba1661d2056e` | main / `63a0e0f550f65b4beb3c52afabdba0481b510e69` | false / true | Redacted secret scan: success; CodeQL: success; Production verification: success | 0 |
| #125 chore(deps-dev): bump supabase from 2.119.0 to 2.122.0 in the supabase-tooling group | `8d4e6ec9347f344276d90f8bd329e30f6bfdca91` | main / `63a0e0f550f65b4beb3c52afabdba0481b510e69` | false / true | Redacted secret scan: success; CodeQL: success; Production verification: success | 0 |
| #123 test(swarm): delegation property tests, enterprise-context interface and maturity matrix | `43af4fcf96481039fcb920ce7871b3bf39842e2b` | feat/tenente-swarm-authority-control / `f144fd079043c72c981a3a29e029cad39e89a3cc` | true / true | Redacted secret scan: success; Production verification: success; CodeQL: success | 0 |
| #118 TENENTE swarm: authority enforcement and authenticated runtime cancellation | `f144fd079043c72c981a3a29e029cad39e89a3cc` | feat/authority-of-record-tenente / `1138150889ec1237a848073f352881d93b72484b` | true / true | CodeQL: success; Redacted secret scan: success; Production verification: success | 0 |
| #116 Harden recovery and governance; rehearse Production migrations | `1138150889ec1237a848073f352881d93b72484b` | main / `94a530cfacbc4470a3f02ff8b08dfc60cd3e13de` | true / true | Redacted secret scan: success; CodeQL: success; Production verification: success | 0 |
| #100 chore(deps): bump stripe from 22.4.0 to 22.6.2 | `3ddf30f61a981ae5c8c12e88e55a4dd9d9db3267` | main / `d40a0a14772af190a2d82e454b6294113ad35bd2` | false / true | CodeQL: success; Redacted secret scan: success; Production verification: failure | 0 |
| #96 chore(deps-dev): bump the css-toolchain group across 1 directory with 2 updates | `6270e1da9bb65a2f32083744198bf2843b4785dd` | main / `63a0e0f550f65b4beb3c52afabdba0481b510e69` | false / true | Redacted secret scan: success; CodeQL: success; Production verification: failure | 0 |
| #95 chore(deps): bump the react-ecosystem group across 1 directory with 4 updates | `6b808f3d47e13f7daaaf1df425d4bb1e7d7aabdf` | main / `63a0e0f550f65b4beb3c52afabdba0481b510e69` | false / true | Redacted secret scan: success; CodeQL: success; Production verification: failure | 0 |

## Workload findings: individual dispositions

1. External relay execution: FIXED LOCALLY. Preserved 35a979f and defaulted API-client decisions to no dispatch; actual dependency factory tests verify configured relay is never called for explicit and default decision-only paths.
2. External OIDC rejected by recovery middleware: FIXED LOCALLY. Only exact POST workload-decision route delegates bearer verification to the pinned workload verifier. Recovery cookies/session claims still quarantine. Actual middleware test and inherited recovery journey pass.
3. Idempotency header contract: FIXED LOCALLY. Header validates 8–120 supported characters; OpenAPI matches. Boundary tests cover empty/short/invalid/121-character rejection and both valid endpoints.
4. Workload request schema: FIXED LOCALLY. WorkloadDecisionRequest requires action, excludes operational_entity_id, and permits optional body key. Shared action/context schemas are referenced rather than duplicated; OpenAPI and SDK parity tests pass.
5. Revoked history breaks re-registration: FIXED LOCALLY. Query filters active status and null revocation before maybeSingle; malformed expiry also fails closed. Actual authentication module test selects the active row beside revoked history.

Remote #130 threads remain unresolved because no push/comment/review mutation is authorized or performed. Local tests are not hosted proof.

## Scanner and SOC conflict

#143 failure reproduced with its unchanged scanner configuration and published origin refs: one historical negative-auth fixture at a9bffc15e6889e874a9f58fb523965fc45260e5c, tools/qualification/execution03-database-rehearsal.mjs:63. Source deliberately supplies a wrong local password and requires SCRAM rejection 28P01. It is not an issued credential. Local website correction 3b97827927e4d1dbab97276b978ef35449257b5d carries the exact already-reviewed enforcement fingerprint; no rules, paths or workflow exclusions were added. Corrected published-ref scan passed at the inspected scope; final refreshed-ref results are recorded separately.

#139 vs corrected #138: local merge-tree and staged merge both isolate the conflict to gitleaks-verified-fixtures.ignore. Manual union preserves all 22 exact reviewed fingerprints and every SOC source file. Two-parent local reconciliation commit 29589e66d33ff20586b08636cb1d7e5c21800e05 adds corrected schema triage documentation without runtime deletion. No GitHub PR was merged or rebased.

## Dependency-ordered review and merge/closure plan

1. Review local security closure on #142 and its source provenance before any remote action. Require CI for the exact eventual pushed SHA, uncached generated-route types, security suites and build. Existing separate-head CI does not qualify this new source.
2. Core declared stack: #116 → #118 → #135 → #138 → #139 → #140 → #142. Preserve #116 recovery/governance and all forward migrations. Apply reviewed #139 reconciliation on its own branch only after approval to publish; no blind whole-tree replacement.
3. Selective integrated changes from #123/#128/#130/#131/#132/#134 remain security-relevant. #131 → #132 → #134 app/database coupling is mandatory. Before closing any original, compare its unique migration and property/concurrency tests against the selected candidate and prove behavior equivalence. None is declared superseded merely by title.
4. Website independent stack #133 → #136 → #141 → #143 plus the local exact-fingerprint repair. #129 is only a CLOSE CANDIDATE pending unique-source equivalence. Eleven publication notices are not approved legal content. Full protected localization is incomplete.
5. #137 compiler remediation is present in the integrated baseline; keep scratch exclusions and generated routes. Treat as a merge candidate only after formal approval. New Track B branch is not a prerequisite for Track A.
6. Dependency PRs #95/#96/#100/#125/#126/#127: HOLD until rebased compatibility and security evidence at the selected baseline. Current failures on #95/#96/#100/#127 block automatic disposition.

No pushes, PR merges/closures, hosted SQL, migrations, credential changes, deployments, live charges or real transactions occurred. Remote merge/closure approval remains required; local preparation is reviewable now.

## Per-PR disposition and actual action

No PR is certified SUPERSEDED without equivalence proof. All remote PRs remain open.

| PR | Recommended disposition | Actual action |
|---|---|---|
| #143 | CONSOLIDATE — preserve unique source/migrations/tests | Local exact-fingerprint repair3b97827 plus reviewed evidence metadata; remote unchanged |
| #142 | MERGE CANDIDATE — gated, approval and new exact-head CI required | Local TrackA security closure17055a0; remote unchanged |
| #141 | MERGE CANDIDATE — gated, approval and new exact-head CI required | Website release boundary preserved; no remote change |
| #140 | CONSOLIDATE — preserve unique source/migrations/tests | No remote change |
| #139 | CONSOLIDATE — preserve unique source/migrations/tests | Local two-parent reconciliation29589e6; remote unchanged |
| #138 | CONSOLIDATE — preserve unique source/migrations/tests | No remote change |
| #137 | MERGE CANDIDATE — gated, approval and new exact-head CI required | Scratch exclusion retained; no remote change |
| #136 | CONSOLIDATE — preserve unique source/migrations/tests | No remote change |
| #135 | CONSOLIDATE — preserve unique source/migrations/tests | No remote change |
| #134 | CONSOLIDATE — preserve unique source/migrations/tests | No remote change |
| #133 | CONSOLIDATE — preserve unique source/migrations/tests | No remote change |
| #132 | CONSOLIDATE — preserve unique source/migrations/tests | No remote change |
| #131 | CONSOLIDATE — preserve unique source/migrations/tests | No remote change |
| #130 | CONSOLIDATE — preserve unique source/migrations/tests | Five findings fixed on local TrackA; remote unchanged |
| #129 | CLOSE CANDIDATE — unique-source equivalence still required | No remote change |
| #128 | CONSOLIDATE — preserve unique source/migrations/tests | No remote change |
| #127 | HOLD — dependency/CI compatibility | No remote change |
| #126 | HOLD — dependency/CI compatibility | No remote change |
| #125 | HOLD — dependency/CI compatibility | No remote change |
| #123 | CONSOLIDATE — preserve unique source/migrations/tests | No remote change |
| #118 | CONSOLIDATE — preserve unique source/migrations/tests | No remote change |
| #116 | CONSOLIDATE — preserve unique source/migrations/tests | No remote change |
| #100 | HOLD — dependency/CI compatibility | No remote change |
| #96 | HOLD — dependency/CI compatibility | No remote change |
| #95 | HOLD — dependency/CI compatibility | No remote change |

