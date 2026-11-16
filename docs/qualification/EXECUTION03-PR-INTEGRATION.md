# Execution03 PR integration review

Read-only GitHub snapshot: 12 November 2026. No PR merge or hosted write. Exact current heads, workflow summaries and external statuses were fetched through the connected GitHub service; workflow green is not hosted enforcement evidence. Source diffs below use the actual merge base, not whole-tree replacement.

| PR | Exact head | Base branch | Returned workflow conclusions | Already ancestor of source140? |
|---|---|---|---|---|
| [#116](https://github.com/emeaexecutive/Cyber-Sentinels-V2/pull/116) | `1138150889ec1237a848073f352881d93b72484b` | `main` | Redacted secret scan: success (39282491635); CodeQL: success (39282491640); Production verification: success (39282491627) | True |
| [#118](https://github.com/emeaexecutive/Cyber-Sentinels-V2/pull/118) | `f144fd079043c72c981a3a29e029cad39e89a3cc` | `feat/authority-of-record-tenente` | CodeQL: success (39428629867); Redacted secret scan: success (39428629052); Production verification: success (39428629007) | True |
| [#123](https://github.com/emeaexecutive/Cyber-Sentinels-V2/pull/123) | `43af4fcf96481039fcb920ce7871b3bf39842e2b` | `feat/tenente-swarm-authority-control` | Redacted secret scan: success (39787350411); Production verification: success (39787350794); CodeQL: success (39787350128) | False |
| [#128](https://github.com/emeaexecutive/Cyber-Sentinels-V2/pull/128) | `ab88dbfc848ee09f1ef08d28fd3f1d871981165f` | `swarm/qualification-hardening` | Redacted secret scan: success (40915662194); CodeQL: success (40915662121); Production verification: success (40915662245) | False |
| [#130](https://github.com/emeaexecutive/Cyber-Sentinels-V2/pull/130) | `e155cd35cf8f12fae94186c1fb3e7c55c86a2be8` | `main` | CodeQL: success (41876289740); Production verification: success (41876289724); Redacted secret scan: success (41876289708) | False |
| [#131](https://github.com/emeaexecutive/Cyber-Sentinels-V2/pull/131) | `44b3c04f7f8431524c8a8d93d2f74751d957c2a4` | `main` | CodeQL: success (42485741203); Redacted secret scan: success (42485741199); Production verification: success (42485741196) | False |
| [#132](https://github.com/emeaexecutive/Cyber-Sentinels-V2/pull/132) | `ad4a0e907a48bdb687351672355cddc5e74e2c00` | `fix/approval-single-use-20261106` | Atomic approval consumption: success (42486618392); Production verification: success (42486618522); Redacted secret scan: success (42486618390); CodeQL: success (42486618382) | False |
| [#133](https://github.com/emeaexecutive/Cyber-Sentinels-V2/pull/133) | `13a3485bb8a6ec8af720ec579bcf6b357003dec6` | `main` | Redacted secret scan: success (42498887633); Public website exact-head qualification: success (42498887634); Production verification: success (42498887635); CodeQL: success (42498887630) | False |
| [#134](https://github.com/emeaexecutive/Cyber-Sentinels-V2/pull/134) | `25f82561435be959e4b14b61873fb454cc1aa51a` | `migration/approval-consumption-20261108` | Atomic approval consumption: success (42618127355); Redacted secret scan: success (42618127366); CodeQL: success (42618127401); Production verification: success (42618127345) | False |
| [#135](https://github.com/emeaexecutive/Cyber-Sentinels-V2/pull/135) | `202117ae82a48a7f8d536c29d5d700e8fbf11c70` | `feat/tenente-swarm-authority-control` | Redacted secret scan: success (42613338498); CodeQL: success (42613338615); Production verification: success (42613338558); Watchtower signed warning boundary: success (42613338871) | True |
| [#136](https://github.com/emeaexecutive/Cyber-Sentinels-V2/pull/136) | `582acc889afbe59991ea307bc5e4a2b986b11c0e` | `website/spanish-public-completion-20261108` | CodeQL: success (42618177967); Redacted secret scan: success (42618177964); Production verification: success (42618177812); Public website exact-head qualification: success (42618177723) | False |
| [#137](https://github.com/emeaexecutive/Cyber-Sentinels-V2/pull/137) | `efb3a64036b984c309f4ac45c7a54e819a3c777e` | `main` | Redacted secret scan: success (43073193815); Production verification: success (43073193879); CodeQL: success (43073193874) | False |
| [#138](https://github.com/emeaexecutive/Cyber-Sentinels-V2/pull/138) | `8d31e027921ad046afd9158daaaadba2d9b41c64` | `feat/watchtower-controlled-demos-20261109` | Redacted secret scan: failure (43208182464); CodeQL: success (43208182371); Watchtower signed warning boundary: success (43208182361); Production verification: success (43208182382) | True |
| [#139](https://github.com/emeaexecutive/Cyber-Sentinels-V2/pull/139) | `87fa4ed672bc34d80b2f772cf0c26325903b78d7` | `codex/soc-replay-schema-20261112` | CodeQL: success (43209404158); Redacted secret scan: success (43209404321); Watchtower signed warning boundary: success (43209404409); Production verification: success (43209404522) | True |
| [#140](https://github.com/emeaexecutive/Cyber-Sentinels-V2/pull/140) | `4ae8d2d5e6488773f68d8cd49002ff419d39b5ae` | `codex/governed-soc-runtime-20261112` | Watchtower signed warning boundary: success (43213603183); Production verification: success (43213601498); Redacted secret scan: success (43213601539); CodeQL: success (43213601485) | True |

## Minimal integration instructions

1. Keep the enforcement candidate based on corrected PR140 `4ae8d2d5e6488773f68d8cd49002ff419d39b5ae`. It already carries PR116→118→135→138→139 and the PR137 scratch exclusion. Preserve the actual application/test/generated-route compiler scope. Do not merge the website stack into enforcement.
2. Preserve PR123 delegation properties and enterprise-context interfaces/tests, then preserve every PR128 approval regression and forward migration. PR128 is not an ancestor of PR131. Its final pre-dispatch current-state validation must coexist with the SWARM guard and the durable dispatch claim; retain immutable request snapshots. Do not weaken its observable-write and historical-idempotency assertions.
3. Integrate the reviewed security hunks from PR131: native-enforcement.ts action-bound idempotency conflict, fresh authority/approval check after reservation, mandatory durable claim and UNKNOWN on ambiguous adapter failure; native-enforcement-server.ts approval RPC issuance, payload binding and claim RPC. Preserve all existing SWARM/prevention controls. PR131 contains 97 changed paths including unrelated website recovery artifacts; whole-tree replacement is unsafe.
4. Add PR132 atomic migration `20261108100241_atomic_native_dispatch.sql`, `tests/native-dispatch-postgres.test.mjs`, `tests/fixtures/native-dispatch-database.sql` and `.github/workflows/approval-single-use.yml`. Rehearse alongside PR128 approval migration in dependency order, verifying actual function definitions, grants, RLS, append-only behavior and independent connection races. It is not enough to copy SQL filenames.
5. Preserve PR134 River controlled-destination tests and fixtures. Its branch starts at PR132 and imports a separately pinned watchtower checkout: its green result does not by itself qualify this combined tree or the newer shared-loop scope. Keep the independently observed effect-count assertions.
6. Integrate PR130 workload issuer/subject/tenant/audience/scope binding, three new API routes, three workload modules, binding migration, SDK/PowerShell/docs and tests. Keep existing OpenGraph routes and client methods. This workstream copied only absent new files, then adapted the overlapping contracts/handler/OpenAPI/SDK/docs hunks; direct jose6.2.12 dependency/lockfile is coordinated with the root agent.
7. Run every inherited security suite against one committed integration tree with locked dependencies, then a fresh non-incremental typecheck and production build. Green separate PR heads are not a substitute. Record source SHA separately from evidence-only follow-up commits.

## Security files preserved by this workstream

See EXECUTION03-PR-PRESERVED-FILES.json for exact source SHAs and copied paths. No existing uncommitted file was overwritten. Core native-enforcement and containment reconciliation belongs to the root integration workstream. SDK/OpenAPI adaptation preserves OpenGraph rather than reverting to an older branch.

## PR138 scanner correction

The original exact head8d31e027 has a redacted-secret-scan failure (21 historical metadata findings). Independently reproduced against published origin refs: 18 public-key SHA256 fingerprints and three synthetic idempotency UUIDs. Exact fingerprints only were excepted; zero rule/path exclusions. Corrective commit459be1c12c1c972406634d036dd410c9e532ea44 (parent8d31e027) was pushed to the existing schema PR. Local Gitleaks8.28.0 rescan:894 published commits,36.36MB,exit0,zero findings. Fresh GitHub CI on459be1c must be read separately; snapshot above preserves the failure instead of rewriting history.

## Per-PR actual source delta inventory

### PR116: Harden recovery and governance; rehearse Production migrations

Head `1138150889ec1237a848073f352881d93b72484b`, actual merge base `94a530cfacbc4470a3f02ff8b08dfc60cd3e13de`, head branch `feat/authority-of-record-tenente`.

```text
M	.gitleaksignore
A	.vercelignore
A	app/access-pending/page.tsx
A	app/admin/access-approvals/page.tsx
A	app/admin/employment-governance/page.tsx
M	app/admin/founder-control/page.tsx
M	app/api/admin/data-rights/[id]/status/route.ts
M	app/api/admin/evidence/[id]/decision/route.ts
M	app/api/admin/verification-cases/[id]/decision/route.ts
M	app/api/ai-governance/analyze/route.ts
M	app/api/auth/password-reset/request/route.ts
A	app/api/auth/submit/route.ts
M	app/api/auth/turnstile/route.ts
A	app/api/employment/decisions/route.ts
M	app/api/enterprise-access/route.ts
A	app/api/evidence/download/route.ts
M	app/api/evidence/route.ts
M	app/api/evidence/upload/route.ts
M	app/api/operational-entities/[entityId]/delegated-authority/route.ts
M	app/api/passports/[id]/decision/route.ts
M	app/api/permissions/check/route.ts
M	app/api/ready/route.ts
M	app/api/trust-algorithm/run/route.ts
M	app/api/trust/certifications/route.ts
M	app/api/trust/check/route.ts
M	app/api/trust/decision/route.ts
M	app/api/trust/transactions/[transactionId]/receipt/route.ts
A	app/api/v1/tools/opengraph/site/route.ts
M	app/api/waitlist/route.ts
M	app/back-office/page.tsx
M	app/dashboard/replay/[entityId]/page.tsx
M	app/developers/quickstart/page.tsx
M	app/evidence-vault/page.tsx
M	app/feedback/page.tsx
M	app/login/page.tsx
M	app/operational-entities/[entityId]/page.tsx
M	app/pro-waitlist/page.tsx
M	app/trust-graph-engine/page.tsx
M	app/trust-graph-explorer/page.tsx
M	app/verifier-network/page.tsx
M	app/verify-email/page.tsx
M	app/workspace/page.tsx
A	components/tenente-authority-panel.tsx
M	components/turnstile-field.tsx
M	components/waitlist-form.tsx
M	config/environments/registry.json
M	config/product-capabilities.json
M	docs/API_MATURITY.md
M	docs/CYBER_SENTINELS_CAPABILITY_TRUTH_MATRIX.md
A	docs/architecture/LOCATION_ASSURANCE_POST_GO_DESIGN.md
A	docs/authority-of-record/IMPLEMENTATION_REPORT.md
A	docs/authority-of-record/LOCAL_QUALIFICATION.json
A	docs/authority-of-record/LOCAL_SCHEMA_QUALIFICATION.json
A	docs/authority-of-record/README.md
A	docs/authority-of-record/TEST_MATRIX.md
A	docs/authority-of-record/VALIDATION.json
A	docs/governance/PR-116-QUALIFICATION-EVIDENCE.md
A	docs/governance/SPANISH-EMPLOYMENT-DECISION-GOVERNANCE.md
A	docs/operations/PRODUCTION-BACKUP-VERIFICATION-20261012.md
A	docs/operations/PRODUCTION-MIGRATION-REHEARSAL-20261012.md
A	docs/operations/STAGING-CLOSURE-20261019.md
A	docs/operations/STAGING-TURNSTILE-DIAGNOSIS-20261019.md
A	docs/operations/TURNSTILE-P0-AUDIT-20261019.md
M	docs/operations/disaster-recovery.md
A	docs/operations/isolated-restore-execution-20261009.md
A	docs/operations/isolated-restore-preflight-20261009.md
A	docs/operations/migration-approval-tests-20261012.json
A	docs/operations/migration-authority-tests-20261012.json
A	docs/operations/migration-baselines-20261012.json
A	docs/operations/migration-failure-repair-guarded-20261012.json
A	docs/operations/migration-ledger-reconciliation-20261012.json
A	docs/operations/migration-rehearsal-20261012.json
A	docs/operations/migration-staging-comparison-20261012.json
A	docs/operations/production-recovery-verification-20261012.json
A	docs/operations/recovery-blocker-resolution-20261010.md
A	docs/operations/recovery-capture-runbook.md
A	docs/operations/recovery-closure-20261009.md
A	docs/operations/recovery-closure-20261010.md
A	docs/operations/recovery-extension-classification-20261009.md
A	docs/operations/recovery-restore-validation-20261012.json
A	docs/operations/recovery-storage-verification-20261012.json
M	docs/operations/recovery-test-plan.md
A	docs/operations/recovery-tls-20261012.json
A	docs/operations/staging-session-delta-equivalence-20261019.json
A	docs/operations/storage-recovery-closure-20261010.md
A	docs/operations/templates/production-write-quiescence-attestation.template.json
A	docs/production-recovery-procedure.md
A	docs/release/APPROVED_MODEL_STATE_CLOSURE_20261006.md
A	docs/release/APPROVED_MODEL_STATE_EVIDENCE_20261006.json
A	docs/release/CORE_APPROVAL_BOUNDARY.md
A	docs/release/CORE_CANONICAL_SCHEMA.md
A	docs/release/CORE_CLOSURE_EVIDENCE_20261008.json
A	docs/release/CORE_FINAL_CLOSURE_20261008.md
A	docs/release/CORE_RC_FILESET_20261008.json
A	docs/release/CORE_RELEASE_CLOSURE_20261006.md
A	docs/release/CORE_RELEASE_EVIDENCE_20261006.json
A	docs/release/CORE_SCHEMA_DIFFERENCE_CLOSURE.json
A	docs/release/CORE_SCHEMA_DIFFERENCE_CLOSURE.md
A	docs/release/CORE_SCHEMA_DRIFT_20261006.md
A	docs/release/CORE_TRUST_MEMORY_PROVENANCE.json
A	docs/release/FINAL_STAGING_QUALIFICATION_20261005.md
A	docs/release/RC_SECRET_CLOSURE_20261006.md
A	docs/release/RC_STAGING_SECURITY_PROOF_20261004.md
A	docs/release/STAGING_ORIGIN_CLOSURE_20261005.md
M	examples/agent-gamma/gamma.mjs
M	examples/powershell/agent-gamma.ps1
A	lib/auth/approval-boundary.ts
M	lib/auth/login-experience.ts
M	lib/auth/password-recovery.ts
A	lib/auth/protected-auth.ts
A	lib/auth/update-account-approval.ts
M	lib/bot-protection.ts
A	lib/employment/decision-governance.ts
M	lib/operational-entities/delegated-authority-server.ts
M	lib/operational-entities/delegated-authority.ts
M	lib/operational-entities/federated-evidence.ts
A	lib/operational-entities/http-tool-adapter.ts
M	lib/operational-entities/native-enforcement-server.ts
M	lib/operational-entities/native-enforcement.ts
A	lib/providers/judgeme-route.ts
M	lib/providers/opengraph-executor.ts
A	lib/providers/opengraph-test-adapter.ts
M	lib/public-api/v1/api-key-crypto.ts
M	lib/public-api/v1/authentication.ts
M	lib/public-api/v1/contracts.ts
M	lib/public-api/v1/environment.ts
M	lib/public-api/v1/openapi.ts
A	lib/public-api/v1/opengraph-gateway-input.ts
A	lib/public-api/v1/opengraph-gateway.ts
M	lib/public-api/v1/runtime.ts
A	lib/readiness/project-binding.ts
A	lib/supabase/protected-auth.ts
A	lib/trust-fabric/model-approval.ts
M	lib/trust-fabric/model-state-integrity.ts
A	lib/trust-receipts/authority-signature-server.ts
A	lib/trust-receipts/authority-signature.ts
A	lib/trust-transaction/action-envelope.ts
A	lib/trust-transaction/model-approval-server.ts
M	lib/trust-transaction/server.ts
M	middleware.ts
M	package.json
M	packages/cyber-sentinels-sdk/src/index.ts
M	src/lib/consensus/http.ts
A	src/lib/employment/decision-service.ts
M	src/lib/opengraph/workflow.ts
M	src/lib/trust-transaction/canonical.ts
A	supabase/canonical-schema-contract.json
A	supabase/migrations/202610040001_p0p1_security_closure.sql
A	supabase/migrations/202610040002_account_access_approval.sql
A	supabase/migrations/202610040003_require_approved_accounts_for_data_api.sql
A	supabase/migrations/202610040004_lock_legacy_passport_decision_writes.sql
A	supabase/migrations/20261006105554_model_approval_evidence_lifecycle.sql
A	supabase/migrations/20261006110619_model_state_replay_event_contract.sql
A	supabase/migrations/20261007150222_account_approval_default_deny.sql
A	supabase/migrations/20261007150224_canonical_trust_memory_function_reconciliation.sql
A	supabase/migrations/20261007150835_canonical_workspace_bootstrap.sql
A	supabase/migrations/20261008093614_canonical_application_access_grants.sql
A	supabase/migrations/20261008105722_canonical_application_schema_reconciliation.sql
A	supabase/migrations/20261008112858_evidence_download_approval_revalidation.sql
A	supabase/migrations/20261008120422_authority_of_record_exact_execution.sql
A	supabase/migrations/20261010110000_employment_access_governance_hardening.sql
A	supabase/migrations/20261012084456_audited_account_approval_transition.sql
A	supabase/migrations/20261012122704_require_active_customer_sessions.sql
M	tests/agent-gamma-boundary.test.mjs
A	tests/api-key-stability.test.mjs
A	tests/authority-of-record-http.test.mjs
A	tests/authority-of-record-tenente.test.mjs
A	tests/backup-recovery-security.test.mjs
M	tests/canonical-trust-transaction.test.mjs
M	tests/consolidation-operational-simplification.test.mjs
M	tests/cyber-sentinels-sdk.test.mjs
A	tests/deployment-route-inclusion.test.mjs
A	tests/employment-decision-governance.test.mjs
M	tests/environment-safety.test.mjs
A	tests/evidence-download-approval.test.mjs
M	tests/external-agent-client-parity.test.mjs
M	tests/final-blocker-sweep.test.mjs
M	tests/final-execution-readiness.test.mjs
A	tests/fixtures/account-approval-boundary.sql
A	tests/fixtures/authority-of-record.mjs
A	tests/fixtures/model-approval.mjs
M	tests/fixtures/opengraph-canonical.mjs
M	tests/fixtures/sign-out-session.mjs
M	tests/judgeme-webhook-runtime.test.mjs
A	tests/live/staging-approval-lifecycle.test.mjs
M	tests/live/staging-rls-governance.test.mjs
A	tests/live/staging-security-closure.test.mjs
M	tests/login-experience.test.mjs
M	tests/login-navigation-browser.mjs
M	tests/login-turnstile-browser.mjs
M	tests/migration-namespace-reconciliation.test.mjs
A	tests/model-approval-receipt.test.mjs
A	tests/model-approval.test.mjs
M	tests/native-delegated-authority-integration.test.mjs
M	tests/opengraph-boundary.test.mjs
M	tests/opengraph-executor.test.mjs
A	tests/opengraph-gateway-input.test.mjs
M	tests/password-recovery-flow.test.mjs
A	tests/permissions-check-retired.test.mjs
M	tests/product-capability-registry.test.mjs
M	tests/production-domain-readiness.test.mjs
M	tests/react-19-2-8-compatibility.test.mjs
A	tests/readiness-project-binding.test.mjs
A	tests/readiness-route-binding.test.mjs
M	tests/request-demo-api.test.mjs
A	tests/rls/account-approval-default-deny.test.mjs
A	tests/rls/active-customer-session.test.mjs
A	tests/rls/audited-account-transition.test.mjs
A	tests/rls/legacy-security-closure-runtime.test.mjs
A	tests/rls/legacy-security-closure.test.mjs
M	tests/rls/trust-event-foundation.test.mjs
A	tests/schema-equivalence.test.mjs
M	tests/sign-out.test.mjs
M	tests/supabase-ssr-auth-regression.test.mjs
M	tests/synthetic-interaction-trust.test.mjs
A	tests/turnstile-action-integration.test.mjs
M	tests/turnstile-configuration.test.mjs
A	tests/turnstile-routes-integration.test.mjs
A	tests/waitlist-approval-boundary.test.mjs
M	tests/workspace-owner-creation.test.mjs
M	tools/docker-verify.mjs
A	tools/qualification/authority-of-record-local.mjs
A	tools/qualification/setup-authority-of-record-local.mjs
A	tools/release/application-catalog.mjs
A	tools/release/approval-boundary-inventory.mjs
A	tools/release/backup-production.ps1
A	tools/release/backup-recovery-point.mjs
A	tools/release/backup-storage-current.mjs
A	tools/release/classify-recovery-extensions.mjs
A	tools/release/effective-application-schema.sql
M	tools/release/environment-safety.ts
A	tools/release/generate-production-migration-plan.mjs
M	tools/release/live-staging-guard.ts
A	tools/release/migration-execution.mjs
A	tools/release/migration-rehearsal-approval-worker.mjs
A	tools/release/recovery-application-http.mjs
A	tools/release/recovery-continuity.mjs
A	tools/release/recovery-dependency-probe.mjs
A	tools/release/recovery-drill.mjs
A	tools/release/recovery-extension-catalog.sql
A	tools/release/recovery-extension-probes.sql
A	tools/release/recovery-local-proxy.mjs
A	tools/release/recovery-local-stack.mjs
A	tools/release/recovery-post-hardening.mjs
A	tools/release/recovery-restore-20261009.mjs
A	tools/release/recovery-runtime.mjs
A	tools/release/recovery-security.sql
A	tools/release/recovery-snapshot-catalog.sql
A	tools/release/recovery-storage-file-backend.mjs
A	tools/release/recovery-storage-fixture.mjs
A	tools/release/recovery-storage-payload-drill.mjs
A	tools/release/recovery-storage-stack.mjs
A	tools/release/recovery-storage.mjs
A	tools/release/recovery-structural.mjs
A	tools/release/recovery-tools.Dockerfile
A	tools/release/rehearse-production-migrations.mjs
A	tools/release/reviewed-schema-equivalences.json
A	tools/release/run-migration-approval-tests.mjs
A	tools/release/run-recovery-drill.ps1
A	tools/release/schema-contract.mjs
A	tools/release/schema-equivalence.mjs
A	tools/release/set-staging-qualification-credential.ps1
A	tools/release/storage-backup-credentials.mjs
M	vercel.json
```

### PR118: TENENTE swarm: authority enforcement and authenticated runtime cancellation

Head `f144fd079043c72c981a3a29e029cad39e89a3cc`, actual merge base `1138150889ec1237a848073f352881d93b72484b`, head branch `feat/tenente-swarm-authority-control`.

```text
M	.github/workflows/secret-scan.yml
A	TENENTE_SWARM_CODEX_COMPLETE.md
M	app/about-us/page.tsx
A	app/api/tenente/swarm/route.ts
M	app/api/v1/agents/[agentId]/heartbeat/route.ts
M	app/platform/page.tsx
A	app/tenente/swarm/page.tsx
A	app/tenente/swarm/swarm-console.tsx
A	docs/operations/REQUIREMENTS-EVIDENCE-RECONCILIATION-20261019.md
A	docs/operations/reconciliation-validation-20261019.json
A	docs/swarm-authority/ACCEPTANCE-32-20261020.md
A	docs/swarm-authority/ADVERSARIAL-RESULTS.md
A	docs/swarm-authority/CANCELLATION-QUALIFICATION-20261020.md
A	docs/swarm-authority/CAPABILITY-RECONCILIATION-20261020.md
A	docs/swarm-authority/CONTRACT-QUALIFICATION-20261020.md
A	docs/swarm-authority/CPTO-CLOSURE-20261020.md
A	docs/swarm-authority/IMPLEMENTATION.md
A	docs/swarm-authority/OPERATIONS-RUNBOOK-20261020.md
A	docs/swarm-authority/PR-DISPOSITION-20261020.md
A	docs/swarm-authority/RUNBOOK.md
A	docs/swarm-authority/SWARM-CONTROL-20261019.md
A	docs/swarm-authority/WEBSITE-AUDIT-20261020.md
A	docs/swarm-authority/cancellation-evidence-20261020/build.log.gz
A	docs/swarm-authority/cancellation-evidence-20261020/changed-lint.log.gz
A	docs/swarm-authority/cancellation-evidence-20261020/full-regressions.log.gz
A	docs/swarm-authority/cancellation-evidence-20261020/initial-loopback-port-error.log.gz
A	docs/swarm-authority/cancellation-evidence-20261020/initial-typecheck-errors.log.gz
A	docs/swarm-authority/cancellation-evidence-20261020/lint.log.gz
A	docs/swarm-authority/cancellation-evidence-20261020/manifest.json
A	docs/swarm-authority/cancellation-evidence-20261020/postgres.log.gz
A	docs/swarm-authority/cancellation-evidence-20261020/swarm-focused.log.gz
A	docs/swarm-authority/cancellation-evidence-20261020/typecheck.log.gz
A	docs/swarm-authority/cpto-evidence-20261020/archive-rehash.json
A	docs/swarm-authority/cpto-evidence-20261020/browser-audit.json
A	docs/swarm-authority/cpto-evidence-20261020/browser-final.json
A	docs/swarm-authority/cpto-evidence-20261020/build.log.gz
A	docs/swarm-authority/cpto-evidence-20261020/deployments.json
A	docs/swarm-authority/cpto-evidence-20261020/final-focused.log.gz
A	docs/swarm-authority/cpto-evidence-20261020/final-local-about-desktop.png
A	docs/swarm-authority/cpto-evidence-20261020/final-local-about-mobile.png
A	docs/swarm-authority/cpto-evidence-20261020/final-local-mobile-menu.png
A	docs/swarm-authority/cpto-evidence-20261020/final-local-platform-desktop.png
A	docs/swarm-authority/cpto-evidence-20261020/final-local-platform-mobile.png
A	docs/swarm-authority/cpto-evidence-20261020/final-public-about-desktop.png
A	docs/swarm-authority/cpto-evidence-20261020/final-public-about-mobile.png
A	docs/swarm-authority/cpto-evidence-20261020/final-public-platform-desktop.png
A	docs/swarm-authority/cpto-evidence-20261020/final-public-platform-mobile.png
A	docs/swarm-authority/cpto-evidence-20261020/full-regressions.log.gz
A	docs/swarm-authority/cpto-evidence-20261020/lint.log.gz
A	docs/swarm-authority/cpto-evidence-20261020/manifest.json
A	docs/swarm-authority/cpto-evidence-20261020/postgres-network.log.gz
A	docs/swarm-authority/cpto-evidence-20261020/postgres-rls.log.gz
A	docs/swarm-authority/cpto-evidence-20261020/public-http.json
A	docs/swarm-authority/cpto-evidence-20261020/resource-timeout-attempt.log.gz
A	docs/swarm-authority/cpto-evidence-20261020/schema-readonly.json
A	docs/swarm-authority/cpto-evidence-20261020/storage-rehash.json
A	docs/swarm-authority/cpto-evidence-20261020/typecheck.log.gz
A	docs/swarm-authority/evidence-20261020/build.log.gz
A	docs/swarm-authority/evidence-20261020/lint.log.gz
A	docs/swarm-authority/evidence-20261020/regressions.log.gz
A	docs/swarm-authority/evidence-20261020/swarm.log.gz
A	docs/swarm-authority/evidence-20261020/typecheck.log.gz
A	docs/swarm-authority/proposed-persistence.sql
A	docs/swarm-authority/qualification-evidence-20261019.json
A	docs/swarm-authority/qualification-evidence-20261020.json
A	gitleaks-verified-fixtures.ignore
M	lib/core/authority-graph.ts
M	lib/core/entity-identity.ts
M	lib/operational-entities/delegated-authority-server.ts
M	lib/operational-entities/http-tool-adapter.ts
M	lib/operational-entities/native-enforcement-server.ts
M	lib/operational-entities/native-enforcement.ts
M	lib/public-api/v1/openapi.ts
A	lib/swarm/cancellation.ts
A	lib/swarm/containment-keys-server.ts
A	lib/swarm/containment.ts
A	lib/swarm/evidence-projection-server.ts
A	lib/swarm/evidence-projection.ts
A	lib/swarm/native-guard.ts
A	lib/swarm/native-server-controls.ts
A	lib/swarm/operations.ts
A	lib/swarm/prevention-kit.ts
A	lib/swarm/projection-recovery.ts
A	lib/swarm/rpc-persistence.ts
A	lib/swarm/runtime-heartbeat-server.ts
A	lib/swarm/store.ts
M	package.json
M	packages/cyber-sentinels-sdk/README.md
M	packages/cyber-sentinels-sdk/src/index.ts
A	supabase/migrations/20261020091324_tenente_swarm_authority_control.sql
A	supabase/migrations/20261020100706_tenente_swarm_projection_recovery.sql
M	tests/authority-of-record-tenente.test.mjs
A	tests/fixtures/swarm-control.mjs
A	tests/fixtures/swarm-schema.mjs
A	tests/fixtures/swarm-sql.mjs
M	tests/migration-namespace-reconciliation.test.mjs
A	tests/rls/swarm-authority.test.mjs
A	tests/swarm-authority.test.mjs
A	tests/swarm-budget.test.mjs
A	tests/swarm-cancellation.test.mjs
A	tests/swarm-contract.test.mjs
A	tests/swarm-http-budget.test.mjs
A	tests/swarm-memory-projection.test.mjs
A	tests/swarm-native-server-controls.test.mjs
A	tests/swarm-operations.test.mjs
A	tests/swarm-prevention-kit.test.mjs
A	tests/swarm-projection-recovery.test.mjs
A	tests/swarm-projection-sql.test.mjs
A	tests/swarm-route.test.mjs
A	tests/swarm-runtime-heartbeat.test.mjs
M	vercel.json
```

### PR123: test(swarm): delegation property tests, enterprise-context interface and maturity matrix

Head `43af4fcf96481039fcb920ce7871b3bf39842e2b`, actual merge base `f144fd079043c72c981a3a29e029cad39e89a3cc`, head branch `swarm/qualification-hardening`.

```text
A	artifacts/swarm-demo/ALLOW.json
A	artifacts/swarm-demo/DENY.json
A	artifacts/swarm-demo/REVIEW.json
A	artifacts/swarm-demo/ambiguous-cancellation.json
A	artifacts/swarm-demo/budget-exhaustion.json
A	artifacts/swarm-demo/cross-tenant.json
A	artifacts/swarm-demo/demo-tests.tap
A	artifacts/swarm-demo/forged-delegation.json
A	artifacts/swarm-demo/missing-evidence.json
A	artifacts/swarm-demo/qualification.txt
A	artifacts/swarm-demo/revocation.json
A	artifacts/swarm-demo/summary.json
A	artifacts/swarm-demo/test-results.json
A	docs/swarm-authority/FIVE-AGENT-DEMO.md
A	docs/swarm-authority/MATURITY-MATRIX-20261021.md
A	lib/swarm/enterprise-context.ts
M	package.json
A	tests/swarm-delegation-properties.test.mjs
A	tests/swarm-enterprise-context.test.mjs
A	tests/swarm-five-agent-demo.test.mjs
A	tools/swarm/five-agent-demo.mjs
```

### PR128: Prevent high-consequence approval reuse and revalidate before tool dispatch

Head `ab88dbfc848ee09f1ef08d28fd3f1d871981165f`, actual merge base `43af4fcf96481039fcb920ce7871b3bf39842e2b`, head branch `audit/authority-closure-review`.

```text
A	docs/authority-of-record/TWELVE_SCENARIO_AUDIT_20261029.md
M	lib/operational-entities/native-enforcement.ts
M	package.json
A	supabase/migrations/20261028230354_single_use_high_consequence_approval.sql
M	tests/controlled-provider-outcome-qualification.test.mjs
A	tests/twelve-scenario-approval-sql.test.mjs
A	tests/twelve-scenario-execution.test.mjs
```

### PR130: feat(auth): tenant-bound OIDC workload API

Head `e155cd35cf8f12fae94186c1fb3e7c55c86a2be8`, actual merge base `63a0e0f550f65b4beb3c52afabdba0481b510e69`, head branch `feat/tenente-workload-identity-pr-a`.

```text
A	app/api/v1/agents/[agentId]/workload-bindings/[bindingId]/revoke/route.ts
A	app/api/v1/agents/[agentId]/workload-bindings/route.ts
A	app/api/v1/workloads/[agentId]/decisions/route.ts
M	app/developers/quickstart/page.tsx
A	docs/tenente/WORKLOAD-IDENTITY-PR-A.md
M	examples/powershell/agent-gamma.ps1
M	lib/public-api/v1/contracts.ts
M	lib/public-api/v1/handler.ts
M	lib/public-api/v1/openapi.ts
A	lib/public-api/v1/workload-bindings.ts
A	lib/public-api/v1/workload-identity.ts
A	lib/public-api/v1/workload-token.ts
M	package-lock.json
M	package.json
M	packages/cyber-sentinels-sdk/README.md
M	packages/cyber-sentinels-sdk/src/index.ts
A	supabase/migrations/20261104150000_workload_identity_bindings.sql
M	tests/cyber-sentinels-sdk.test.mjs
M	tests/external-agent-client-parity.test.mjs
A	tests/workload-identity.test.mjs
```

### PR131: fix: require durable single-use approval dispatch claims

Head `44b3c04f7f8431524c8a8d93d2f74751d957c2a4`, actual merge base `63a0e0f550f65b4beb3c52afabdba0481b510e69`, head branch `fix/approval-single-use-20261106`.

```text
M	app/accessibility/page.tsx
M	app/ai-governance/page.tsx
M	app/careers/page.tsx
M	app/cookies/page.tsx
M	app/corporate-sustainability/page.tsx
M	app/data-rights/page.tsx
M	app/demo/page.tsx
M	app/demo/trust-runtime/page.tsx
M	app/enterprise-access/page.tsx
M	app/globals.css
M	app/help/page.tsx
M	app/how-to-use/page.tsx
M	app/layout.tsx
M	app/legal/page.tsx
M	app/media-centre/page.tsx
M	app/modern-slavery-statement/page.tsx
M	app/our-people/page.tsx
M	app/page.tsx
M	app/pricing/page.tsx
M	app/privacy/page.tsx
M	app/regulatory/page.tsx
M	app/security/page.tsx
M	app/solutions/page.tsx
M	app/terms/page.tsx
M	app/transparency/page.tsx
M	app/verification-receipts/page.tsx
M	app/world-id-preview/page.tsx
A	artifacts/recovery-20261103/HANDOFF.md
A	artifacts/recovery-20261103/P0-RELEASE-DECISION.md
A	artifacts/recovery-20261103/P0-SUMMARY.json
A	artifacts/recovery-20261103/P0-VERIFICATION.md
A	artifacts/recovery-20261103/VERIFICATION.md
A	artifacts/recovery-20261103/auth-and-contact.png
A	artifacts/recovery-20261103/environment-names.json
A	artifacts/recovery-20261103/hosted-critical-paths.json
A	artifacts/recovery-20261103/interactions.json
A	artifacts/recovery-20261103/legal-publication-notice.png
A	artifacts/recovery-20261103/legal-review-inventory.json
A	artifacts/recovery-20261103/manifest.txt
A	artifacts/recovery-20261103/native-build-result.json
A	artifacts/recovery-20261103/open-prs.json
A	artifacts/recovery-20261103/p0-browser-results.json
A	artifacts/recovery-20261103/p0-file-manifest.txt
A	artifacts/recovery-20261103/p0-source-manifest.json
A	artifacts/recovery-20261103/prior-proof/REPORT.md
A	artifacts/recovery-20261103/prior-proof/accessibility.json
A	artifacts/recovery-20261103/prior-proof/arabic-navigation.png
A	artifacts/recovery-20261103/prior-proof/header-desktop.png
A	artifacts/recovery-20261103/prior-proof/interactions.json
A	artifacts/recovery-20261103/prior-proof/language-mobile.png
A	artifacts/recovery-20261103/prior-proof/pricing-cards-desktop.png
A	artifacts/recovery-20261103/prior-proof/verification-summary.json
A	artifacts/recovery-20261103/production-audit.json
A	artifacts/recovery-20261103/production-equivalence.json
A	artifacts/recovery-20261103/production-extra-files.json
A	artifacts/recovery-20261103/production-source-manifest.json
A	artifacts/recovery-20261103/proof/arabic-navigation.png
A	artifacts/recovery-20261103/proof/header-desktop.png
A	artifacts/recovery-20261103/proof/language-mobile.png
A	artifacts/recovery-20261103/proof/pricing-1024.png
A	artifacts/recovery-20261103/proof/pricing-1440.png
A	artifacts/recovery-20261103/proof/pricing-390.png
A	artifacts/recovery-20261103/proof/pricing-768.png
A	artifacts/recovery-20261103/proof/pricing-cards-desktop.png
A	artifacts/recovery-20261103/provenance.json
A	artifacts/recovery-20261103/public-mailbox-approval.json
A	artifacts/recovery-20261103/route-smoke.json
A	artifacts/recovery-20261103/source-identity.json
A	artifacts/recovery-20261103/source-manifest.json
A	artifacts/recovery-20261103/verification-summary.json
A	components/auth-unavailable.tsx
M	components/executive-summary.tsx
M	components/global-navigation.tsx
M	components/legal-draft-page.tsx
A	components/pricing-card.tsx
A	components/public-language-selector.tsx
M	components/public-page-adoption-rail.tsx
A	docs/APPROVAL-DISPATCH-SECURITY.md
M	lib/operational-entities/native-enforcement-server.ts
M	lib/operational-entities/native-enforcement.ts
M	next.config.mjs
M	package-lock.json
M	package.json
M	tests/controlled-provider-outcome-qualification.test.mjs
A	tests/enforcement-reservation-contract.test.mjs
M	tests/native-enforcement-outcome-proof.test.mjs
A	tests/public-help-preview.test.mjs
M	tests/public-positioning.test.mjs
M	tests/public-surface-navigation.test.mjs
M	tests/rc3-living-trust-experience.test.mjs
M	tests/rc4-enterprise-proof.test.mjs
A	tests/website-auth-entry.test.mjs
A	tests/website-release-gates.test.mjs
A	tools/release/website-p0-browser-checks.mjs
A	tools/release/website-recovery-build.mjs
A	tools/release/website-recovery-interactions.mjs
A	tools/release/website-recovery-smoke.mjs
```

### PR132: security: add atomic single-use approval consumption

Head `ad4a0e907a48bdb687351672355cddc5e74e2c00`, actual merge base `44b3c04f7f8431524c8a8d93d2f74751d957c2a4`, head branch `migration/approval-consumption-20261108`.

```text
A	.github/workflows/approval-single-use.yml
A	artifacts/approval-single-use/drift-classification.json
A	artifacts/approval-single-use/drift-read-only.json
A	artifacts/approval-single-use/postgres-evidence.json
A	docs/STAGING-RECONCILIATION-20261108.md
A	supabase/migrations/20261108100241_atomic_native_dispatch.sql
A	tests/fixtures/native-dispatch-database.sql
A	tests/native-dispatch-postgres.test.mjs
```

### PR133: website: complete English-Spanish public pages and qualification gates

Head `13a3485bb8a6ec8af720ec579bcf6b357003dec6`, actual merge base `63a0e0f550f65b4beb3c52afabdba0481b510e69`, head branch `website/spanish-public-completion-20261108`.

```text
A	.github/workflows/public-spanish-readonly.yml
M	app/about/mission/page.tsx
M	app/about/page.tsx
M	app/accessibility/page.tsx
M	app/ai-governance/page.tsx
M	app/api/auth/password-reset/request/route.ts
M	app/api/auth/turnstile/route.ts
M	app/api/enterprise-access/route.ts
M	app/api/waitlist/route.ts
M	app/careers/page.tsx
M	app/cookies/page.tsx
M	app/corporate-sustainability/page.tsx
M	app/data-rights/page.tsx
M	app/demo/page.tsx
M	app/demo/trust-runtime/page.tsx
M	app/developers/api-reference/page.tsx
M	app/developers/authentication/page.tsx
M	app/developers/docs/page.tsx
M	app/developers/page.tsx
M	app/developers/quickstart/page.tsx
M	app/documents/operational-trust-whitepaper/page.tsx
M	app/documents/page.tsx
M	app/enterprise-access/page.tsx
M	app/enterprise/agent-governance/page.tsx
M	app/enterprise/buyer-documentation/page.tsx
M	app/enterprise/hiring-security/page.tsx
M	app/enterprise/page.tsx
M	app/enterprise/pilot-checklist/page.tsx
M	app/enterprise/pilot/page.tsx
A	app/es/about/mission/page.tsx
A	app/es/about/page.tsx
A	app/es/accessibility/page.tsx
A	app/es/careers/page.tsx
A	app/es/cookies/page.tsx
A	app/es/developers/api-reference/page.tsx
A	app/es/developers/authentication/page.tsx
A	app/es/developers/docs/page.tsx
A	app/es/developers/page.tsx
A	app/es/developers/quickstart/page.tsx
A	app/es/documents/operational-trust-whitepaper/page.tsx
A	app/es/documents/page.tsx
A	app/es/enterprise-access/page.tsx
A	app/es/enterprise/agent-governance/page.tsx
A	app/es/enterprise/buyer-documentation/page.tsx
A	app/es/enterprise/hiring-security/page.tsx
A	app/es/enterprise/page.tsx
A	app/es/enterprise/pilot-checklist/page.tsx
A	app/es/enterprise/pilot/page.tsx
A	app/es/governance/page.tsx
A	app/es/help/page.tsx
A	app/es/journal/page.tsx
A	app/es/legal/page.tsx
A	app/es/media-centre/page.tsx
A	app/es/methodology/page.tsx
A	app/es/modern-slavery/page.tsx
A	app/es/our-people/page.tsx
A	app/es/page.tsx
A	app/es/platform/page.tsx
A	app/es/pricing/page.tsx
A	app/es/privacy/page.tsx
A	app/es/regulatory/page.tsx
A	app/es/resources/agent-security/[slug]/page.tsx
A	app/es/resources/agent-security/page.tsx
A	app/es/security/page.tsx
A	app/es/solutions/page.tsx
A	app/es/terms/page.tsx
A	app/es/trust/data-sovereignty/page.tsx
A	app/es/trust/page.tsx
A	app/es/unavailable/page.tsx
A	app/es/verification-replay/page.tsx
M	app/globals.css
M	app/governance/page.tsx
M	app/help/page.tsx
M	app/how-to-use/page.tsx
M	app/journal/page.tsx
M	app/layout.tsx
M	app/legal/page.tsx
M	app/login/page.tsx
M	app/media-centre/page.tsx
M	app/methodology/page.tsx
M	app/modern-slavery-statement/page.tsx
M	app/modern-slavery/page.tsx
M	app/our-people/page.tsx
M	app/page.tsx
M	app/platform/page.tsx
M	app/pricing/page.tsx
M	app/privacy/page.tsx
M	app/regulatory/page.tsx
M	app/security/page.tsx
M	app/sitemap.ts
M	app/solutions/page.tsx
M	app/terms/page.tsx
M	app/transparency/page.tsx
M	app/trust/data-sovereignty/page.tsx
M	app/trust/page.tsx
M	app/verification-receipts/page.tsx
M	app/verification-replay/page.tsx
M	app/world-id-preview/page.tsx
A	artifacts/recovery-20261103/HANDOFF.md
A	artifacts/recovery-20261103/P0-RELEASE-DECISION.md
A	artifacts/recovery-20261103/P0-SUMMARY.json
A	artifacts/recovery-20261103/P0-VERIFICATION.md
A	artifacts/recovery-20261103/VERIFICATION.md
A	artifacts/recovery-20261103/auth-and-contact.png
A	artifacts/recovery-20261103/environment-names.json
A	artifacts/recovery-20261103/hosted-critical-paths.json
A	artifacts/recovery-20261103/interactions.json
A	artifacts/recovery-20261103/legal-publication-notice.png
A	artifacts/recovery-20261103/legal-review-inventory.json
A	artifacts/recovery-20261103/manifest.txt
A	artifacts/recovery-20261103/native-build-result.json
A	artifacts/recovery-20261103/open-prs.json
A	artifacts/recovery-20261103/p0-browser-results.json
A	artifacts/recovery-20261103/p0-file-manifest.txt
A	artifacts/recovery-20261103/p0-source-manifest.json
A	artifacts/recovery-20261103/prior-proof/REPORT.md
A	artifacts/recovery-20261103/prior-proof/accessibility.json
A	artifacts/recovery-20261103/prior-proof/arabic-navigation.png
A	artifacts/recovery-20261103/prior-proof/header-desktop.png
A	artifacts/recovery-20261103/prior-proof/interactions.json
A	artifacts/recovery-20261103/prior-proof/language-mobile.png
A	artifacts/recovery-20261103/prior-proof/pricing-cards-desktop.png
A	artifacts/recovery-20261103/prior-proof/verification-summary.json
A	artifacts/recovery-20261103/production-audit.json
A	artifacts/recovery-20261103/production-equivalence.json
A	artifacts/recovery-20261103/production-extra-files.json
A	artifacts/recovery-20261103/production-source-manifest.json
A	artifacts/recovery-20261103/proof/arabic-navigation.png
A	artifacts/recovery-20261103/proof/header-desktop.png
A	artifacts/recovery-20261103/proof/language-mobile.png
A	artifacts/recovery-20261103/proof/pricing-1024.png
A	artifacts/recovery-20261103/proof/pricing-1440.png
A	artifacts/recovery-20261103/proof/pricing-390.png
A	artifacts/recovery-20261103/proof/pricing-768.png
A	artifacts/recovery-20261103/proof/pricing-cards-desktop.png
A	artifacts/recovery-20261103/provenance.json
A	artifacts/recovery-20261103/public-mailbox-approval.json
A	artifacts/recovery-20261103/route-smoke.json
A	artifacts/recovery-20261103/source-identity.json
A	artifacts/recovery-20261103/source-manifest.json
A	artifacts/recovery-20261103/verification-summary.json
A	artifacts/spanish-completion/generated-source-manifest.json
A	artifacts/spanish-completion/messages.json
A	components/auth-unavailable.tsx
M	components/evidence-disclaimer.tsx
M	components/executive-summary.tsx
M	components/global-navigation.tsx
A	components/i18n/es/enterprise-breadcrumbs.tsx
A	components/i18n/es/enterprise-cta-group.tsx
A	components/i18n/es/enterprise-visuals.tsx
A	components/i18n/es/search/security-resource.tsx
M	components/legal-draft-page.tsx
A	components/pricing-card.tsx
A	components/public-disclosure.tsx
A	components/public-language-selector.tsx
M	components/public-page-adoption-rail.tsx
M	components/search/security-resource.tsx
A	components/spanish-publication-notice.tsx
M	components/turnstile-field.tsx
M	components/waitlist-form.tsx
A	docs/PREVIEW-STAGING-BINDINGS.json
A	docs/SPANISH-PUBLIC-WEBSITE.md
M	lib/bot-protection.ts
A	lib/i18n/es-adoption.ts
A	lib/i18n/es-api-copy.ts
A	lib/i18n/es-enterprise-experience.ts
A	lib/i18n/es-metadata.ts
A	lib/i18n/es-public-batches/000.json
A	lib/i18n/es-public-batches/095.json
A	lib/i18n/es-public-batches/1005.json
A	lib/i18n/es-public-batches/225.json
A	lib/i18n/es-public-batches/355.json
A	lib/i18n/es-public-batches/485.json
A	lib/i18n/es-public-batches/615.json
A	lib/i18n/es-public-batches/745.json
A	lib/i18n/es-public-batches/875.json
A	lib/i18n/es-public-batches/source-ids.json
A	lib/i18n/es-search-resources.ts
M	lib/i18n/public-locales.ts
A	lib/i18n/public-notices.ts
A	lib/i18n/request-locale.ts
M	lib/search/metadata.ts
M	middleware.ts
M	next.config.mjs
M	package.json
M	src/components/consent/ConsentBanner.tsx
M	src/components/consent/ConsentManager.tsx
M	src/components/consent/ConsentPreferences.tsx
M	src/components/consent/ConsentPreferencesLink.tsx
M	src/components/consent/ConsentStatus.tsx
M	tests/enterprise-experience.test.mjs
M	tests/enterprise-trust-fabric-api-ui.test.mjs
M	tests/fixtures/sign-out-session.mjs
M	tests/password-recovery-flow.test.mjs
M	tests/production-domain-readiness.test.mjs
A	tests/public-help-preview.test.mjs
M	tests/public-i18n.test.mjs
M	tests/public-positioning.test.mjs
M	tests/public-surface-navigation.test.mjs
M	tests/rc3-living-trust-experience.test.mjs
M	tests/rc4-enterprise-proof.test.mjs
M	tests/request-demo-api.test.mjs
M	tests/search-authority.test.mjs
A	tests/spanish-public-completion.test.mjs
M	tests/turnstile-configuration.test.mjs
M	tests/ui-ux-readiness.test.mjs
A	tests/website-auth-entry.test.mjs
A	tests/website-release-gates.test.mjs
M	tests/whitepaper-publication.test.mjs
A	tools/i18n/complete-public-alternates.mjs
A	tools/i18n/generate-spanish-public.mjs
A	tools/i18n/public-catalog.mjs
A	tools/i18n/verify-public-browser.mjs
A	tools/release/website-p0-browser-checks.mjs
A	tools/release/website-recovery-build.mjs
A	tools/release/website-recovery-interactions.mjs
A	tools/release/website-recovery-smoke.mjs
```

### PR134: test(tenente): prove River Crossing at a controlled destination

Head `25f82561435be959e4b14b61873fb454cc1aa51a`, actual merge base `ad4a0e907a48bdb687351672355cddc5e74e2c00`, head branch `test/watchtower-river-boundary-20261109`.

```text
M	.github/workflows/approval-single-use.yml
M	.gitignore
A	artifacts/watchtowers/river-local.json
A	docs/WATCHTOWER-RIVER-PROOF.md
A	tests/fixtures/watchtower-signal-dependency.mjs
A	tests/watchtower-river-postgres.test.mjs
```

### PR135: feat(tenente): authenticate watchtower warnings without granting authority

Head `202117ae82a48a7f8d536c29d5d700e8fbf11c70`, actual merge base `f144fd079043c72c981a3a29e029cad39e89a3cc`, head branch `feat/watchtower-controlled-demos-20261109`.

```text
A	.github/workflows/watchtower-signals.yml
A	artifacts/watchtowers/torch-local.json
A	docs/tenente/CHIRIVETA-WATCHTOWERS.md
A	lib/swarm/agent-message.ts
A	lib/swarm/file-persistence.ts
M	lib/swarm/store.ts
A	lib/swarm/watchtower-signals.ts
M	package-lock.json
M	package.json
A	tests/watchtower-signals.test.mjs
```

### PR136: feat(website): add bilingual Ribagorza watchtower simulations

Head `582acc889afbe59991ea307bc5e4a2b986b11c0e`, actual merge base `13a3485bb8a6ec8af720ec579bcf6b357003dec6`, head branch `website/watchtowers-ribagorza-20261109`.

```text
M	.github/workflows/public-spanish-readonly.yml
M	.gitignore
A	app/es/tenente-swarm/layout.tsx
A	app/es/tenente-swarm/page.tsx
A	app/es/tenente-swarm/river-crossing/page.tsx
A	app/es/tenente-swarm/torch-code/page.tsx
M	app/platform/page.tsx
A	app/tenente-swarm/layout.tsx
A	app/tenente-swarm/page.tsx
A	app/tenente-swarm/river-crossing/page.tsx
A	app/tenente-swarm/torch-code/page.tsx
M	artifacts/spanish-completion/generated-source-manifest.json
A	components/watchtowers/watchtower-demo.tsx
A	components/watchtowers/watchtower-network.tsx
A	components/watchtowers/watchtower-page.tsx
A	components/watchtowers/watchtowers.css
A	docs/WATCHTOWER-PUBLIC-DEMOS.md
M	lib/i18n/public-locales.ts
M	lib/navigation/route-visibility.ts
A	lib/watchtowers/content.ts
A	lib/watchtowers/local-evidence.json
A	lib/watchtowers/metadata.ts
A	lib/watchtowers/recorded-evidence.ts
M	package.json
M	tests/public-i18n.test.mjs
M	tests/spanish-public-completion.test.mjs
A	tests/watchtowers-public.test.mjs
M	tools/i18n/generate-spanish-public.mjs
M	tools/i18n/public-catalog.mjs
A	tools/watchtowers/import-local-evidence.mjs
A	tools/watchtowers/verify-browser.mjs
```

### PR137: Exclude ignored scratch trees from TypeScript program

Head `efb3a64036b984c309f4ac45c7a54e819a3c777e`, actual merge base `63a0e0f550f65b4beb3c52afabdba0481b510e69`, head branch `codex/p0-typecheck-20261111`.

```text
A	docs/product/TYPESCRIPT-BUILD-QUALIFICATION.md
M	tsconfig.json
```

### PR138: fix(db): support governed SOC records in shared Replay

Head `8d31e027921ad046afd9158daaaadba2d9b41c64`, actual merge base `202117ae82a48a7f8d536c29d5d700e8fbf11c70`, head branch `codex/soc-replay-schema-20261112`.

```text
A	artifacts/soc-persistence-sql-20261112.tap
A	docs/qualification/SOC-DATABASE-RECONCILIATION-20261112.md
A	docs/qualification/STAGING-READONLY-20261112.json
A	supabase/migrations/20261112104809_soc_replay_event_types.sql
A	tests/soc-persistence-sql.test.mjs
```

### PR139: feat(soc): connect signed detection to governed synthetic response

Head `87fa4ed672bc34d80b2f772cf0c26325903b78d7`, actual merge base `8d31e027921ad046afd9158daaaadba2d9b41c64`, head branch `codex/governed-soc-runtime-20261112`.

```text
M	.env.example
M	.github/workflows/watchtower-signals.yml
M	app/api/tenente/swarm/route.ts
M	app/tenente/swarm/swarm-console.tsx
A	artifacts/soc/build-native-exit-20261112.json
A	artifacts/soc/console-1440.png
A	artifacts/soc/console-390.png
A	artifacts/soc/console-browser.json
A	artifacts/soc/destination-1794480850563.json
A	artifacts/soc/gitleaks-diff-20261112.json
A	artifacts/soc/gitleaks-final-20261112.json
A	artifacts/soc/gitleaks-native-20261112-redacted.json
A	artifacts/soc/gitleaks-triage-20261112.json
A	artifacts/soc/incident.json
A	artifacts/soc/production-audit-20261112.json
A	artifacts/soc/typecheck-scope-20261112.json
A	artifacts/soc/verification/soc-browser-locked-20261112.log.gz
A	artifacts/soc/verification/soc-build-locked-20261112.log.gz
A	artifacts/soc/verification/soc-build-native-exit-20261112.log.gz
A	artifacts/soc/verification/soc-demo-frozen-final.log.gz
A	artifacts/soc/verification/soc-dependencies-final-20261112.log.gz
A	artifacts/soc/verification/soc-gitleaks-final-reviewed-20261112.log.gz
A	artifacts/soc/verification/soc-lint-locked-20261112.log.gz
A	artifacts/soc/verification/soc-locked-regression-20261112.log.gz
A	artifacts/soc/verification/soc-route-locked-20261112.log.gz
A	artifacts/soc/verification/soc-typecheck-20261112.log.gz
A	artifacts/soc/verification/soc-typecheck-locked-20261112.log.gz
A	artifacts/soc/verification/soc-workflow-frozen-final.log.gz
A	docs/product/TYPESCRIPT-BUILD-QUALIFICATION.md
A	docs/qualification/AGENT-TOOL-RUNTIME-MATRIX.md
A	docs/qualification/EXECUTION-02-REPORT-20261112.md
A	docs/qualification/GOVERNED-SOC-RUNBOOK.md
A	docs/qualification/HOSTED-METADATA-20261112.json
A	docs/qualification/HOSTED-METADATA-POST-PR139-20261112.json
A	docs/qualification/HOSTED-QUALIFICATION-20261112.md
A	docs/qualification/LANGUAGE-ROUTE-INVENTORY-20261112.json
A	docs/qualification/LANGUAGE-ROUTE-MATRIX-20261112.md
A	docs/qualification/PR-DEPENDENCY-RECONCILIATION-20261112.md
A	docs/qualification/PR-DEPENDENCY-SNAPSHOT-20261112.json
A	docs/qualification/VALIDATION-20261112.json
A	docs/qualification/source-index/focused-tests.log.gz
A	docs/qualification/source-index/runtime-source-index.json.gz
M	gitleaks-verified-fixtures.ignore
A	lib/soc/copilot.ts
A	lib/soc/workflow.ts
M	lib/swarm/operations.ts
M	next.config.mjs
M	package.json
A	tests/fixtures/soc-control.mjs
A	tests/fixtures/soc-operations.mjs
A	tests/soc-console-browser.mjs
A	tests/soc-copilot.test.mjs
A	tests/soc-operations.test.mjs
A	tests/soc-workflow.test.mjs
M	tests/swarm-route.test.mjs
A	tools/localization-inventory-20261112.mjs
A	tools/master-execution-02-inventory.py
A	tools/soc/detection-dataset.mjs
A	tools/soc/incident-demo.mjs
M	tsconfig.json
```

### PR140: fix(swarm): enforce shared retry allowance across delegated agents

Head `4ae8d2d5e6488773f68d8cd49002ff419d39b5ae`, actual merge base `87fa4ed672bc34d80b2f772cf0c26325903b78d7`, head branch `codex/shared-loop-budget-20261112`.

```text
M	lib/swarm/containment.ts
M	package.json
A	tests/swarm-loop-governance.test.mjs
```

