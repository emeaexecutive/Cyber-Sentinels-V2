# V2 Production Closure input ? 10 September 2026

Production promotion is NOT AUTHORIZED. V1 remains the approved Production release at `b0f6b37d41714efa940852b3ef955e9c7317c513`.

## Release hardening

PR #87 is squash-merged into main `d68b714857ef7944480396c6217b1db3cddfbf41`. All five archive files are documentation only; each old report is explicitly historical/superseded, and the final V1 control-plane proof remains canonical. Executable CI, CodeQL, Gitleaks, Docker and Preview passed. Supabase Preview was skipped by the integration and is not counted as a pass.

The release branch `release/v2-production-closure` is rebased onto that main. Its former tip `ffeb4a5a35144f3cc6f261633164d75f0da4f967` is preserved on `archive/v2-closure-pre-hardening-20260910`. Exact candidate qualification and Preview evidence are recorded after the candidate commit, on a separate evidence branch so the source SHA remains frozen. This source document does not claim pending checks passed.

Homepage changes were extracted only from `dd0c682` and `61b9701` on the qualified `958b9eff1e058dae2b59dfc32d0a947c8bfd12f7` lineage: `app/page.tsx`, `app/loading.tsx`, canonical navigation, seven existing tests and the browser qualification tool. No historical database output or dependency file was copied from that lineage. The requested authority example, demo intent, API docs, Developers navigation, incident reconstruction and Trust Memory narrative are restored. Existing tests gain current expectations; no test is removed or skipped. React review: server-rendered static content, semantic headings/lists, no added client state, effects, dependencies or hydration suppression.

## Dependency security

Fresh npm audit before fixes: two distinct HIGH advisories, represented by four high package/metavulnerability entries, plus one LOW. After the focused lockfile update: zero advisories.

| Advisory | Dependency and exposure | Resolution |
|---|---|---|
| [GHSA-rgj7-g3m4-5g8c](https://github.com/advisories/GHSA-rgj7-g3m4-5g8c) | Next.js ? sharp; optional runtime dependency, vulnerable libheif AVIF decoder. Next 15.5.25 alone left the override at sharp 0.35.3. No direct app sharp/next-image imports were found, but absence of imports does not prove Vercel image-service non-reachability. | FIXED: sharp 0.35.4; installed libheif 1.23.2; benign AVIF encode/decode smoke passes. No accepted reachability risk is needed. |
| [GHSA-2883-xcg3-v3hh](https://github.com/advisories/GHSA-2883-xcg3-v3hh) | ESLint ? @eslint/eslintrc ? js-yaml; DEV ONLY YAML parsing, not an app request parser. | FIXED: 4.3.1 ? 4.3.2. |
| [GHSA-w9m9-85wc-3x92](https://github.com/advisories/GHSA-w9m9-85wc-3x92) | Tailwind/PostCSS nested selector parser, development/build tooling. | FIXED: 6.1.2 ? 6.1.4 within existing compatible range. |

Sharp native packages move with sharp, libvips packages 1.3.2 ? 1.3.3; its wasm runtime requires @emnapi/runtime ^1.11.3, resolved to 1.11.3. Next.js remains 15.5.25; React, Supabase, lucide and other ecosystem packages are unchanged. Dependabot alert metadata was unavailable (HTTP 403); conclusions use the actual npm audit and resolved graph, not labels. Vercel's independently managed image service binary is not inspected by the local sharp smoke test.

## Qualification contract

Use Node 22.23.1 / npm 10.9.8. Baseline is 1,514 tests, with no added test cases, failures, skips or TODO masking intended. Run clean install, full tests, lint, typecheck, build, audit, Gitleaks, scoped secret scan and actual Preview checks at 1440, 1280, 1024, 768, 430 and 390 pixels. The browser harness checks CTAs, navigation, axe accessibility, keyboard interaction, console/page errors and logged-out hard reload/direct/navigation/slow-load cases. Intermittent hydration remains P2 unless reproduced and fixed with proof.

## Database and API

Fresh read-only live ledger: Staging 131 entries; Production 114 entries. Both version/name sets match the prior closure pack. Environment-specific local migration queues contain 131 and 115 files respectively, with no unexpected ledger versions. Exactly one pending Production file: `20260909163513_operational_incident_evidence_foundation.sql`. V2 table/RPC/migration are present in Staging and absent in Production. No migration, key issuance, schema mutation or Production environment change is authorized here.

The five previously highlighted NOT VALID constraints apply to the scoped canonical transaction/evidence tables. They are not a database-wide count: the fresh full-public-schema query returns 26 in Staging and 37 in Production. This broader historical inventory is disclosed, not changed or newly validated.

API contract remains OpenAPI 3.1.0, API version 2026-08-29, 25 paths and 26 operations. V2 scopes remain `incidents:read`, `incidents:write`, `evidence:export`; old keys receive no automatic scope upgrade. Full-suite security regression covers legacy scopes, tenant isolation, invalid digest and caller-forged derived state. Prior live Staging V1 ALLOW/revocation/DENY/receipt/Replay/Memory and V2 incident/export evidence is retained in `closure-20260910`; it is historical source-equivalent evidence for unchanged API/database code, not a new hosted execution claim.

V1 is CLOSED. V2 foundation and Epic 1 are Staging-qualified; Purpose Lineage is PARTIAL. No independent provider execution, predictive intelligence, certification or compliance automation is claimed.

World ID remains IMPLEMENTED / STAGING DATABASE QUALIFIED / READY FOR REAL HUMAN PROVIDER QUALIFICATION / NOT PRODUCTION EXERCISED.

## Production hard stop and rollback

Do not apply the Production migration, deploy a Production target, move aliases, create a Production V2 key, run Production Customer Zero or change Production environment variables. No Epic 2 work.

After separate explicit Production Closure authorization: recheck exact source SHA, live aliases and environment binding; establish a fresh recoverable backup; regenerate the environment-specific migration context and require exactly the one V2 migration; apply and verify catalog/RLS/grants; deploy the approved SHA; issue a narrowly scoped expiring test key; exercise bounded identity/authority/ALLOW, incident chronology/export/Replay/Memory, authority revocation/DENY and tenant/scope/digest/forgery negatives; revoke temporary credentials, inspect sanitized runtime logs and retain proof before declaring GO.

If application promotion fails, restore the approved V1 deployment and aliases through the authorized recovery procedure. Keep additive database history and stop/revoke V2 writers. Do not drop evidence, delete ledger entries or reverse migrations destructively; use reviewed forward corrections. Record the recovered SHA and reverify the V1 lifecycle. This plan is not a fresh restore rehearsal.

## Previous terminal failure

The previous session's final exit 1 came from Gitleaks reporting 109 reviewed public UUID/fingerprint false positives, not an existing-worktree guard. Exact triage and exclusions resolved it; a fresh broader history scan returned exit 0. Rebase changed the evidence commit ID, so only those 109 exact exclusion fingerprints were remapped to its new ID; no rule/path suppression was added. FOLLOW-UP REQUIRED = NO for that prior failure.
