# Core release closure — 2026-10-06

**NO-GO. No release-candidate commit. No Production changes.**

The remaining mandatory gap is specific: the hosted delegated runtime-failure test has valid native identity, accountable owner, authority, accepted delegation and scope, and correctly denies explicit runtime failure without execution. However, its model is a signed declaration, not a resolved approved-model-state assessment. `modelStateIntegrity` is `null`. The existing delegated handler supplies neither `approvedModelState` nor `currentObservedModelState` to the canonical engine. The complete **MODEL APPROVED → RUNTIME FAILED → DENY** scenario and its model-valid Replay explanation are therefore **not proven**. Do not promote this partial proof to GO or add a new approval feature during this qualification.

Evidence: [retained machine-readable results](CORE_RELEASE_EVIDENCE_20261006.json), [64-function drift and lint assessment](CORE_SCHEMA_DRIFT_20261006.md). Earlier reports remain historical records; their counts are not added to this run.

## A. Release Closure

### 1. API-key root cause and fix

The qualification bootstrap generated a new pepper per deployment. In addition, the pre-existing Preview pepper and rotation secrets were restricted to `feat/authority-runtime-evidence`, so the release branch could not inherit them. Active database rows alone could not compensate for a different KDF pepper. Local hash verification with an old deployment's pepper was not proof that the current hosted verifier used it.

Persistent sensitive Preview `API_KEY_PEPPER` and `API_KEY_ROTATION_SECRET` values are now configured. The existing other-branch overrides and all Production secrets remain unchanged. Vercel rejected a release-branch-specific setting because the local branch does not exist in the connected remote; the new values therefore supply the Preview default. Qualification deployments omit all per-deployment pepper/rotation overrides. Never regenerate these secrets during deployment; intentional pepper rotation needs an explicit key migration/reissuance plan.

Hosted key creation/verification now fails closed without a pepper of at least 32 bytes. Readiness reports CONFIGURATION_INVALID rather than READY when it is absent. The failed configuration probe was reverted immediately before corrected deployment.

### 2. Hosted API-key stability

Two fresh keys passed three authenticated requests each on three successive deployments: **18 successful authentications**. The same persisted key IDs and hashes were reused, with local verification against the persistent pepper. The independent-process regression covers creation, repeated verification, fallback-variable precedence and deliberate pepper change. Keys were then revoked and deleted during cleanup; a retired key returns 401.

### 3–5. Runtime semantics and execution-zero evidence

| Case | Hosted result | Execution evidence |
|---|---|---|
| Required runtime UNKNOWN/MISSING | REVIEW | 0 external requests, acknowledgements, outcomes, native requests and native acknowledgements |
| Controlled runtime digest matches | ALLOW | Authorization established; no live attestation provider claim |
| Required runtime digest explicitly fails | DENY, NEGATIVE_PROVIDER_EVIDENCE | The same five counts are all 0; customer Receipt and Replay available |

The controlled adapter compared an expected SHA-256 runtime artifact digest with an intentionally changed artifact, signed the observation, verified that signature, and inserted the result into the existing Staging canonical evidence ledger. This is disclosed test-adapter qualification, **not** TEE, cloud attestation or a live provider qualification. Unknown was not converted into FAILED.

A discovered explanation bug was fixed: overall evidence freshness previously controlled the identity label. Required native identity freshness is now assessed separately, so runtime failure leaves valid native identity CURRENT in the decision-time snapshot while still producing DENY. Regression tests verify both UNKNOWN and FAILED cannot invoke the executor. The hosted replay after the fix no longer adds IDENTITY_REQUIREMENT_UNSATISFIED to the valid-identity runtime failure.

**Full mandatory scenario remains PARTIAL because approved model state is absent.** The signed manifest's model declaration is not substituted for that missing assessment.

### 6. Authority-negative matrix

| Case | Result | Receipt / Replay | Measured execution |
|---|---|---|---|
| Expired authority | DENY | V1 available | 0 in all five execution tables |
| Expired delegation | DENY; DELEGATION_EXPIRED | Session Receipt / Replay available | 0 |
| Wrong organisation | HTTP 409 IDENTITY_PROOF_FAILED before canonical decision | Intentionally not created; no foreign record disclosed | Aggregate execution counts unchanged |
| Action outside scope | DENY; ACTION_OUT_OF_DELEGATED_SCOPE | Session Receipt / Replay available | 0 |
| Tool outside scope | DENY; TOOL_OUT_OF_DELEGATED_SCOPE | Session Receipt / Replay available | 0 |
| Revoked agent | DENY; ENTITY_REVOKED | V1 available | 0 |
| Invalid/revoked credential | Prior ALLOW, then credential revocation → DENY | V1 available | 0 |
| Revoked authority | DENY | V1 available | 0 |

Expiry fixtures were issued valid and allowed to expire naturally. Revoked-agent lifecycle setup used the service role on a disposable Staging entity; the decision used the real customer API. Credential/authority revocation used supported application APIs. Some negative decisions contain additional evidence failures; the specific tested denial reason is retained. HTTP rejection before a transaction is not mislabelled as a canonical DENY with a Receipt.

### 7–8. Customer Replay and historical preservation

The V1 SDK retrieved Transaction, Receipt and Replay for customer API decisions. Another tenant received 404. Original ALLOW decision/evidence digests remained unchanged after runtime evidence expiry and authority revocation. The equivalent delegated session flow retained its original ALLOW Receipt digest after runtime failure and parent/delegation revocation.

V1 transaction reads are intentionally scoped to both tenant and API client actor. A human-session delegated transaction is not readable using an API-client key merely because both belong to the same tenant. Its supported session Receipt and Replay surfaces were used; this boundary was not weakened for the test.

### 9. Trust Memory chronology

Supported authenticated native-verification history and Trust Memory timeline jointly preserve six ordered events: canonical agent registration, native verification, delegation activation, ALLOW, runtime-failure DENY and delegation revocation. Foreign-tenant access returns 403. Registration is recorded as ENTITY_CHANGED with CANONICAL_OPERATIONAL_ENTITY_REGISTERED, not an invented event type. The evidence artifact retains the source IDs and timestamps. Historical ALLOW Receipt and Replay remained available after the final revocation.

### 10. Application Storage

Own-tenant uploads succeeded; foreign-case uploads and forged foreign-case metadata were rejected. Both owners saw their uploaded evidence on their passport pages, and neither could see the other's file. The bounded application run contains 14 observations, including eight tenant-contract API checks; four additional passport-read observations specifically cover evidence visibility. These are not all called Storage assertions.

No application evidence download, signing, signed-URL, replace or delete API is exposed. Those absent operations are classified as non-exposure, not invented endpoint tests. The separate admin-only support-screenshot signer is not an evidence-file customer route. The fresh direct Supabase security matrix passed **83/83**, including Storage list/read/sign/upload/overwrite/delete boundaries.

### 11. OpenGraph gateway

**Gateway: PROVEN_STAGING. Live OpenGraph provider: UNQUALIFIED.**

The real V1 gateway returned ALLOW, REVIEW and DENY on the final qualified deployment. ALLOW recorded one durable external request and one UNKNOWN outcome; the deterministic adapter recorded no provider acknowledgement. REVIEW and DENY recorded zero requests, acknowledgements and outcomes.

The hosted failure was caused by invoking the adapter without first persisting its execution request; the outcome RPC correctly rejected the missing request. The workflow now reserves the request before dispatch and stops if persistence fails. Receipt outcome text explicitly identifies the deterministic adapter and does not claim a live provider HTTP response. The gateway remains Staging-only; live provider execution is disabled.

### 12–13. Schema drift and DB lint

All 64 functions are classified individually in the linked report: 63 equivalent normalized bodies; one known archived Staging repair; nine CREATE-versus-later-ALTER search-path differences explained. All live owners are postgres; security/language attributes match. Untrusted roles cannot CREATE in either relevant schema. No hosted schema normalization or migration was performed.

Five application functions produce six warnings and no application lint errors: two unused variables, three empty-array casts, and a timestamp helper's IMMUTABLE/STABLE metadata mismatch. The latter deserves a maintenance correction, but no privilege or tenant-isolation defect was demonstrated. Two Storage vendor dynamic-record false positives and additional dynamic-SQL OUT-variable warnings remain documented. The lint CLI exits 1 for vendor findings; it is not represented as an entirely clean exit.

### 14. SDK, raw HTTP, Quickstart and OpenAPI

A signed-in customer's SDK canonical request and equivalent raw documented HTTP request used the same idempotency key, returned the same transaction and REVIEW decision, and the raw retry returned 200 with `idempotent_replay: true`. Hosted OpenAPI returned 200. Local client-parity/OpenAPI/Quickstart tests pass. The actual Gamma example completed its public-API-only flow, including ALLOW → REVIEW → reviewer approval → new ALLOW, out-of-scope DENY, Receipt/Replay, agent-asserted outcome, authority revocation DENY, challenge replay rejection and wrong-private-key rejection.

### 15. External controls

`externalControls = BLOCKED / AUTHORITATIVE_CONTROL_PLANE_EVIDENCE_REQUIRED` is a constant conservative field in the readiness response builder, not a measured aggregate provider-health result. Core READY certifies the configured Core data/API contract; it does not authorize an external action or certify a provider.

| Control | Classification for this qualification |
|---|---|
| Supabase binding, API authentication, canonical persistence, authority and policy resolution | CORE REQUIRED; verified |
| Current signed first-party configuration/heartbeat where action policy requires them | CORE REQUIRED per action; checked during decisions; absence remains fail-closed |
| Arbitrary external action relay | OPTIONAL / DISABLED BY DESIGN in qualification configuration |
| Native controlled destination adapter | OPTIONAL; test-only key removed during cleanup; no live destination qualification claimed |
| OpenGraph live provider | OPTIONAL / PROVIDER UNQUALIFIED; disabled |
| OpenGraph deterministic adapter | Staging gateway test only; not a Production provider |
| Judge.me | OPTIONAL / PROVIDER UNQUALIFIED; local synthetic/webhook tests only |
| `world_id` | OPTIONAL / PROVIDER UNQUALIFIED; disabled in this Staging configuration |
| `stripe_identity` | OPTIONAL / PROVIDER UNQUALIFIED; placeholder/disabled here |
| `hopae_connect` | OPTIONAL / PROVIDER UNQUALIFIED by this run; credentials/enablement absent here |
| `persona`, `entrust`, `onfido` | OPTIONAL / DISABLED BY DESIGN; unqualified placeholder adapters |
| `fingerprint_device_risk` | OPTIONAL / DISABLED BY DESIGN; unqualified placeholder |
| `cloudflare_turnstile` | OPTIONAL for these authenticated Core flows; disabled in this Staging configuration; public-form qualification not claimed |
| `external_unattributed` | DISABLED BY DESIGN; cannot supply attributed provider qualification |

No optional provider's absence was converted into a Core-wide outage. No unqualified provider was labelled Production-live. The discovered pepper misconfiguration was Core-required and was corrected.

### 16. Final regression

Full `npm test`: **1,947 passed, 0 failed, 0 skipped, 87 suite invocations**. This is a count of test executions: the command repeats some files across suites, so it is not claimed to be 1,947 unique tests. Reruns are not added. Two new independent-process API-key stability tests also pass and are now included in the external-agent script; that latest suite is **149/149**. The final canonical suite is **214/214**, OpenGraph **86/86**, and actual readiness-route test **1/1**; these overlap the full run and are not summed again.

Fresh hosted results are separately retained: direct security 83 assertions; API-key stability 18 authentications; authority matrix eight cases; runtime UNKNOWN/ALLOW/FAILED; V1/session historical preservation; six chronology milestones; application evidence access; OpenGraph decisions and measured table counts; and completed Gamma. Historical Oct 4/5 totals are not added.

Typecheck passed. Final lint/build/diff-check results and cleanup deployment identity are recorded in the completion addendum below.

### 17. Product Truth

Only the OpenGraph canonical gateway is advanced to PROVEN_STAGING, with this report as evidence. Its provider remains UNQUALIFIED. No runtime attestation provider, approved-model-state integration or Production capability is promoted by inference. Other preserved capability classifications are unchanged by this continuation.

### 18. Production accounts — HUMAN DECISION REQUIRED

These are the retained read-only classifications from the prior production review; no account was changed. Keith/CPTO must decide each account before Production migration.

| Account | Evidence basis | Recommendation |
|---|---|---|
| ACCOUNT-3C4640273A | Has signed in; not inactive over 90 days | PENDING until individual review |
| ACCOUNT-79AE566A9B | Never signed in | PENDING; establish whether test/unused |
| ACCOUNT-8810E679F6 | Has signed in; not inactive over 90 days | PENDING until individual review |
| ACCOUNT-A1D7358B44 | Inactive over 90 days | PENDING; review stale/disabled status |
| ACCOUNT-B2C264D681 | Never signed in | PENDING; establish whether test/unused |

### 19. Remaining risks and cleanup

The approved-model-state proof gap above is mandatory and unresolved. Live provider qualification remains outside this result. Public self-signup previously timed out; this run used disclosed disposable approved accounts and does not upgrade public signup to proven. Native session transactions and V1 client transactions retain their distinct actor boundaries.

Cleanup removed 13 API keys, 11 API bindings, three disposable Auth users, two memberships, four cases/passports and their uploaded evidence objects; the separate lint object was also removed. Ten remaining active native public credentials were revoked. A retired key and prior browser session both return 401. Canonical decisions, native public evidence, Replay, Trust Memory and related history remain append-only; no trigger was disabled. Persistent Preview API-key secrets are operational configuration and are intentionally retained; temporary local copies are removed. Disposable admin allowlisting/access code and native destination-adapter key are cleared in the cleanup Preview deployment.

### 20–21. Release candidate and decision

Branch: `fix/p0p1-production-security-closure`.

Base HEAD: `94a530cfacbc4470a3f02ff8b08dfc60cd3e13de`.

**RC SHA: none. Working tree intentionally remains uncommitted. NO-GO.**

Mandatory approved-model-state evidence and its full Replay explanation must be qualified before creating the RC commit. The local model-state engine's unit coverage is not a substitute for this missing hosted input binding. No Production deployment, promotion, migration or account mutation occurred. Both Production domains remain on `dpl_3aKJiNZB6jQssp9Urm8uDG1zBsyp`.

## Completion addendum

Final local gates passed: TypeScript typecheck, ESLint, optimized Next.js build (208 static pages), and `git diff --check`. The full regression command passed 1,947 test executions with no failures or skips; overlapping suite executions are not unique-test counts. The additional API-key stability tests are included in the passing 149-test external-agent suite.

Canonical Staging now points to cleanup Preview `dpl_7Dh9WFJQEsQbudh1W22W99XiaY3f` (`https://cyber-sentinels-v2-df7ajdlyi-keith-speres-projects.vercel.app`). Hosted readiness returned 200 READY against the Staging project. Disposable admin and destination-adapter secrets are cleared. The known-secret scan checked 2,913 tracked and untracked non-ignored files and found zero captured-secret matches. Twenty-five local credential exports were deleted. Automatic approval review rejected recursive deletion of the remaining `tmp/hosted-qualification` scratch directory as "blocked by policy"; that directory remains outside the committed evidence. Earlier workspace changes and historical reports were preserved.

These passing gates do not resolve the mandatory hosted approved-model-state gap. The release decision remains NO-GO, with no RC commit and no Production changes.

## B. Location Assurance

No finding changes the retained architecture.

**LOCATION ASSURANCE DESIGN RETAINED — POST-GO IMPLEMENTATION ONLY.**

## Credential cleanup verification addendum — 2026-10-06

The earlier approved-model-state gap above is **closed by the subsequent hosted qualification** recorded in [APPROVED_MODEL_STATE_CLOSURE_20261006.md](APPROVED_MODEL_STATE_CLOSURE_20261006.md); retain its 37/37 model suite, hosted ALLOW/failed-runtime DENY evidence and historical Replay findings. The 1,973-execution full regression remains prior proven evidence; it was not rerun for this cleanup-only continuation.

RC creation is now blocked solely by the six credential exports that were reported manually deleted but still exist on disk under ignored `tmp/model-closure`: `accounts-credential-export.json`, `deployment-config-credential-export.json`, `gamma-key-credential-export.json`, `native-agents-credential-export.json`, `project-credential-export.json`, and `staging-keys-credential-export.json`. Their sizes and verification details are in the linked addendum. Do not stage or commit while they remain.

The six files are all ignored, untracked and unstaged; `tmp/model-closure` is excluded from Git, Vercel and Docker. The exact-value scan found no matches in 2,922 tracked/untracked non-ignored files. A scoped regex scanner has one manually reviewed false positive at `lib/readiness/project-binding.ts` (a computed credential status) and one synthetic test fixture. No secret values were printed. The old `tmp/hosted-qualification` directory is pattern-clean, ignored and excluded from Git.

Current cleanup target counts: **local disposable credential exports 6; tracked credential exports 0; staged credential exports 0**. `git diff --cached` is empty. The candidate is at base HEAD `94a530cfacbc4470a3f02ff8b08dfc60cd3e13de`; **no RC SHA**. Targeted model 37/37, security 13/13, Product Truth 13/13 and external-agent/V1 149/149 suites pass; typecheck/build pass. Lint has three warnings in ignored `tmp/model-closure` helper scripts and no errors. No Production changes occurred.

**RC STATUS: RC NO-GO. PRODUCTION: NO-GO pending RC creation and five separate human account decisions.** No Production deployment or migration is authorized. Location Assurance remains design-only and post-GO.
