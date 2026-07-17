# Sprint 15.2 precondition audit

Audit date: 2026-07-17. Source baseline: `ad68977` on `main`. Audit scope: Release 1.0 RC7 controlled-pilot evidence gate.

| Prerequisite | Classification | Evidence and boundary |
| --- | --- | --- |
| Validation case schema | READY | `lib/validation/release-case.ts` and `release_validation_cases` define the strict versioned case contract. |
| Validation review workflow | DEPLOYMENT_REQUIRED, HUMAN_REVIEW_REQUIRED | Protected `/admin/reviews`, append-only `release_validation_reviews`, attribution, rationale, confidence and dual-review disagreement controls exist. The RC6 migration is not verified on a target and no human review occurred. |
| Release 1 fixture manifest | READY | `data/validation/release-1-candidate/cases.json` and the manifest contain 30 pending cases, version `1.0.0-rc6-pending`. |
| Provider execution records | DEPLOYMENT_REQUIRED | The durable schema and writer exist; target migration state is unverified. |
| Hopae integration path | CREDENTIALS_REQUIRED | Request, callback, signature/timestamp checks, normalization and canonical Trust Fabric execution are source-tested. Required credentials and enable flag are absent. |
| Signed provider callback | CREDENTIALS_REQUIRED, DEPLOYMENT_REQUIRED | Verification is implemented; no reachable configured callback or target event was supplied. |
| Webhook idempotency ledger | DEPLOYMENT_REQUIRED | Provider-neutral ledger and Hopae/Stripe reservations exist; migration and target replay proof are unverified. |
| Deployed security harness | READY | `npm run test:deployed` is HTTPS-targeted and requires `RUN_DEPLOYED_SECURITY_TESTS=true`. |
| RLS denial tests | DEPLOYMENT_REQUIRED | Opt-in suite exists; target URL, anon key, controlled JWT and tenant B ID are absent. |
| Durable performance measurements | DEPLOYMENT_REQUIRED | Sanitized persistent measurement schema and forwarding exist; target migration and restart persistence are unverified. |
| Load-test harness | READY | Safe mocked-provider harness is opt-in; paid-provider load is rejected. |
| Blocker dashboard | READY | Protected deployment-readiness view renders validation, provider, security and performance cards from retained evidence. |
| Deployment and reviewer runbooks | READY | RC6 deployment, provider, review, security and load guidance exists and is reused for RC7. |

No critical source prerequisite is missing. External execution could not start because no approved target, credentials, controlled identities, reviewer accounts or opt-in flags were supplied. Source inspection was not promoted to target evidence.

Precondition verdict: **SOURCE READY; EXTERNAL INPUTS REQUIRED**.
