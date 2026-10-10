# Approved model state closure — 2026-10-06

**Subsequent closure:** The cleanup-related NO-GO recorded below is superseded by [RC secret closure](RC_SECRET_CLOSURE_20261006.md). Keith manually removed the six credential exports; the separately assessed generated local OIDC entry was safely removed. The prior qualification and cleanup chronology below are preserved as historical evidence.

Hosted mandatory model proof is closed. Final RC decision and remaining verification are recorded in the completion section below. No Production deployment, promotion, account mutation or Location implementation is authorized by this report.

## Cause and trusted path

The existing model integrity evaluator accepted internal deployment snapshots, but hosted handlers did not provide them: **NOT PROVIDED / SERVER RESOLUTION GAP**. Once connected, hosted persistence exposed a second **SCHEMA GAP**: the canonical Replay event constraint omitted the evaluator's existing model-state event types.

The narrow repair uses the existing service-controlled `evidence_objects` ledger. An operator records reviewed configuration approval under `CYBER_SENTINELS_MODEL_APPROVAL_REGISTRY`. Authenticated customers have no INSERT privilege or write policy on this ledger. A public request, user-editable metadata, signed model declaration, or model identifier alone cannot establish approval. There is no new public approval endpoint or model-governance UI.

Flow: operator-controlled ledger → digest/scope/validity/manifest normalization → existing model integrity assessment → canonical policy gate → persisted decision-time snapshot and evidence digest → bounded portable Receipt → historical Replay → material approval lifecycle and canonical-decision Trust Memory.

Evidence binds tenant, agent, environment, model/provider/version, verified native manifest digest, approval authority/reference, approval timestamp, expiry, configuration baseline, observed configuration and evidence digest. APPROVED requires a current matching configuration. UNKNOWN and EXPIRED require REVIEW when approval is required; UNAPPROVED, REVOKED and CONFLICTED deny. Other mandatory failures can produce a stricter decision. Existing non-model workflows do not acquire an implicit model-approval requirement; contracts can require `MODEL_APPROVAL_STATE`, and existing approval records are enforced.

Controlled configuration observations are explicitly **unsigned**. Hash integrity is not a signature. The qualification used disposable declared model configurations and a controlled runtime digest adapter, not a live LLM, independent model-provider verification, or hardware/runtime attestation. These separate capabilities remain unqualified.

## Hosted proof

Both agents established native identity using fresh Ed25519 keys, signed manifests, single-use challenges and controlled software/runtime observations. A signed and accepted delegation bound action, tool, target and Staging environment. The fixture contract required native identity, model approval and runtime evidence. Its separate environment-domain threshold was `degraded`, consistent with the absence of independent environment certification; explicit runtime evidence remained mandatory.

| Case | Model state | Decision | Execution | Receipt / Replay |
|---|---|---|---|---|
| Missing approval | UNKNOWN | REVIEW | 0 | 200 / 200 |
| Caller self-claimed approval | UNKNOWN | REVIEW | 0 | 200 / 200 |
| Approved model, valid runtime | APPROVED / EXACT_MATCH | ALLOW | No executor configured | 200 / 200 |
| Caller replaces model/source/reference/tenant fields | Server-approved context retained | ALLOW | No executor configured | 200 / 200 |
| Same approved model, failed runtime | APPROVED / EXACT_MATCH | DENY | 0 | 200 / 200 |
| Unapproved model | UNAPPROVED | DENY | 0 | 200 / 200 |
| Naturally expired approval | EXPIRED | REVIEW | 0 | 200 / 200 |
| Nested tenant mismatch | CONFLICTED | DENY | 0 | 200 / 200 |
| Observation bound to another agent | CONFLICTED | DENY | 0 | 200 / 200 |
| Tampered evidence digest | CONFLICTED | DENY | 0 | 200 / 200 |
| Revoked approval | REVOKED | DENY | 0 | 200 / 200 |

The defining DENY retains `MODEL_APPROVAL_APPROVED`, `MODEL_INTEGRITY_EXACT_MATCH`, `DELEGATED_AUTHORITY_VALID` and `AUTHORITY_SCOPE_VALID`. `NEGATIVE_PROVIDER_EVIDENCE` identifies the failed required runtime observation; no model-unknown/unapproved/missing-model or identity-failure reason caused it. Zero rows were verified in external requests, acknowledgements and outcomes, and native enforcement requests and acknowledgements. The delegated path has no provider executor configured. Wrong-scope and tampered ledger records were deliberate service-side fault injections; independent customer INSERT attempts returned 42501.

Service-role UPDATE and DELETE attempts against model approval history were rejected by the new append-only trigger. Lifecycle records are appended, never overwritten. The Replay migration adds only the existing evaluator's five event types and preserves all earlier allowed types. Both new migrations were applied only to Staging.

The original ALLOW snapshot and decision digest remained unchanged after revocation. Historical Replay explicitly labels model state **at decision time**; it does not replace historical approval with current state. Current registry state was independently verified REVOKED. Customer Trust Memory showed approval → model-used ALLOW transaction → approval revoked → subsequent DENY in timestamp order. Cross-tenant Receipt returned 404.

## Signup, providers and retained limits

Public signup transport returned an upstream non-JSON error and remains unqualified. Disposable authenticated PENDING accounts, including user-editable claims of approval/admin role, received protected API 403 and dashboard 307 to `/access-pending`. Trusted fixture approval was required before product use. This proves server-enforced product authorization separately from signup availability; it is not a claim that public email signup completed.

OpenGraph gateway remains PROVEN_STAGING; OpenGraph live provider remains UNQUALIFIED. Judge.me remains locally implemented/provider-unqualified. No other provider was upgraded. Product Truth adds only the bounded controlled model approval capability and corrects the account-gate description without promoting the full administrator lifecycle.

Staging security advisors report existing intentional service-only tables without client policies, existing authorization-helper SECURITY DEFINER warnings, and existing password/MFA configuration warnings. The new functions use SECURITY INVOKER, an empty search path and no client EXECUTE grant. No new critical security finding was identified. References: [Supabase RLS guidance](https://supabase.com/docs/guides/database/postgres/row-level-security), [function privilege advisory](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable), [password protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection), [MFA](https://supabase.com/docs/guides/auth/auth-mfa).

## Scratch and Production accounts

The prior scratch directory contains 120 files. A credential-pattern and non-fixture-email scan found no matches; Git confirms it is ignored, untracked and unstaged. Automatic approval review rejected its bounded recursive deletion as "blocked by policy". It remains local-only, excluded from Vercel uploads and the RC.

Production recommendations remain unchanged: `3C4640273A` and `8810E679F6` — HUMAN REVIEW REQUIRED; `79AE566A9B` and `B2C264D681` — TEST/UNUSED CLASSIFICATION REQUIRED; `A1D7358B44` — STALE-ACCOUNT REVIEW REQUIRED. Keith decides these separately before Production transition. No Production account was changed.

## Completion

The mandatory hosted model behavior is proven. Sanitized case references, decision digests, zero-execution counts, chronology and cleanup results are retained in [machine-readable evidence](APPROVED_MODEL_STATE_EVIDENCE_20261006.json). The final Staging alias points to READY deployment `dpl_MgjfRzN66qXqcGJwGNYGjhe1WWtv`. Final hosted Receipt/Replay checks returned 200 for approved-runtime-valid, approved-runtime-failed and revoked transactions; model state and decision digests matched their original snapshots. The failed-runtime snapshot retains identity assurance `CURRENT`. Readiness returned 200 against the Staging project.

Fresh full `npm test`: **1,973 passed, 0 failed, 0 skipped, 87 suite invocations**. These are test executions, not unique tests; overlapping suites and reruns are not added. Targeted model/canonical/authentication coverage passed **117/117**. The final standalone model suite passed **37/37**, portable Receipt **1/1**, Product Truth **13/13**, and explicit security closure **13/13**. The earlier canonical run passed 236/236; the full final run includes its additional portable Receipt test. Gamma completed its public-API end-to-end flow, and the fresh direct Storage/security matrix passed **83/83**. Prior 18-authentication/three-deployment API-key stability evidence is retained; the final read check correctly rejected the now-expired Gamma key with `API_KEY_EXPIRED`, and is not counted as successful authentication.

TypeScript typecheck, ESLint (with the new ignored qualification scratch scripts explicitly excluded), optimized Next.js build (208 static pages), and `git diff --check` passed. The final build also performed its own lint/type checks. Source, migrations, tests, capability claims and the preserved release baseline were reviewed. No new critical security finding was identified. The exact-value secret scan checked 2,922 tracked and non-ignored files against 29 captured credential values and found zero matches.

Remote fixture cleanup deleted both new Auth accounts, the Gamma API key and its API binding; revoked all three native signing credentials, two delegations and three remaining parent authorities; verified no remaining matching disposable Auth accounts or active native credentials; and retained 22 canonical history records. The retired key returns 401. Separate checks verified removal of the Storage fixtures' three users, workspaces, cases and uploaded objects. The model evidence ledger remains append-only and its latest approval state is REVOKED.

**Final decision: NO-GO for RC creation, solely because local credential cleanup is incomplete.** Automatic approval review rejected the bounded, non-recursive deletion of six new credential exports and an alias metadata log as **"blocked by policy"**. These files remain in `tmp/model-closure`, ignored, untracked, unstaged and excluded from Vercel uploads. This is distinct from the previously inspected harmless `tmp/hosted-qualification` directory: the new directory still contains real credential material and is not described as secret-free. The disposable customer credentials have been retired, but local copies of operational Staging service/configuration secrets remain. No alternative deletion mechanism was used to bypass the rejection.

Branch remains `fix/p0p1-production-security-closure`; HEAD remains `94a530cfacbc4470a3f02ff8b08dfc60cd3e13de`. **No RC commit was created.** All intended changes remain uncommitted. Complete the blocked local credential cleanup and verify it before creating the RC; the successful model proof does not need to be replaced by another implementation.

Production remains untouched. A final read-only check confirmed `www.cybersentinels.com` still targets `dpl_3aKJiNZB6jQssp9Urm8uDG1zBsyp`. Public signup transport, optional live providers and existing password/MFA advisor warnings retain their disclosed limits. Five Production-account decisions remain with Keith before any Production transition.

**LOCATION ASSURANCE DESIGN RETAINED — POST-GO IMPLEMENTATION ONLY.**

## Cleanup verification addendum — 2026-10-06

The six credential exports reported manually deleted were rechecked by filename, existence, size and attributes without reading their contents. **All six are still present** under `tmp/model-closure`: `accounts-credential-export.json` (540 bytes), `deployment-config-credential-export.json` (2,757 bytes), `gamma-key-credential-export.json` (1,176 bytes), `native-agents-credential-export.json` (6,747 bytes), `project-credential-export.json` (207,156 bytes), and `staging-keys-credential-export.json` (3,620 bytes). Do not recreate them; the reported manual deletion has not taken effect in this workspace.

Git confirms zero tracked or staged credential-export files and an empty staged index. Each of the six paths is ignored by `.gitignore`; `tmp/model-closure` is also excluded by `.vercelignore` and `.dockerignore`. The six files remain local sensitive material, however, so ignored status does not satisfy cleanup.

The exact-value scan loaded 29 captured values in memory and checked 2,922 tracked/untracked non-ignored candidate files; it found zero matches and emitted no values. The older `tmp/hosted-qualification` scratch scan found zero pattern/email findings across 120 files and confirmed ignored/untracked/unstaged. The repository scoped scanner reports one REAL_SECRET_CANDIDATE at `lib/readiness/project-binding.ts:36`, manually confirmed to be the computed status label `PRESENT`/`INVALID`, not credential material; it also flags one synthetic test fixture. The scanner was not weakened. A supplemental scratch-pattern scan did not run because of a PowerShell quoting error; no contents were emitted or changed.

Final targeted sanity gates on the current tree: model state/approval **37/37 PASS**, security closure **13/13 PASS**, Product Truth **13/13 PASS**, external-agent/V1/API-key stability **149/149 PASS**, TypeScript typecheck PASS, optimized build PASS, `git diff --check` PASS with a Git line-ending advisory. ESLint had zero errors and three warnings, all in ignored `tmp/model-closure/*.mjs` helper scripts. No broad 1,973-execution suite rerun was performed.

**RC STATUS: RC NO-GO.** The exports remain present, so no files were staged and no RC commit was created. Branch remains `fix/p0p1-production-security-closure`, HEAD remains base `94a530cfacbc4470a3f02ff8b08dfc60cd3e13de`; RC SHA: none. No Production deployment, migration, DNS change, or account modification occurred.
