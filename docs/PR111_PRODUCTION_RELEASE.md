# PR #111 Production release evidence

Released 2026-09-29 through the existing GitHub, Supabase and Vercel integrations.

| Gate | Result |
| --- | --- |
| CodeQL alert #14 | Test-only serialized-domain assertion matched `js/incomplete-url-substring-sanitization`; runtime parsed-host/label-aware checks showed no demonstrated substring bypass. Test now asserts exact canonical target and the complete structured non-execution state, retaining zero dispatch/redirect assertions. No suppression or dismissal. |
| Fixed PR head | `94137cd69f0548f872124921be19fac1e9c9dbef` |
| CodeQL workflow | PASS: [run 36579429676](https://github.com/emeaexecutive/Cyber-Sentinels-V2/actions/runs/36579429676) |
| CodeQL findings gate | PASS: [check 109443904853](https://github.com/emeaexecutive/Cyber-Sentinels-V2/runs/109443904853); most recent alert instance fixed; no open alert on the branch |
| Remaining merge gates | Production verification, Docker build, redacted secret scan and Supabase Preview all SUCCESS before merge |
| Merge | [PR #111](https://github.com/emeaexecutive/Cyber-Sentinels-V2/pull/111), normal merge without bypass, 14:07:46 UTC |
| Merge / clean main SHA | `64d02b581aedc2eb77a0b4d9357f515d17a41b24` |
| Main CI | Production verification, Docker build, CodeQL analysis, secret scan and Supabase integration SUCCESS |
| Supabase | Production project `kecgtsfibkypjuaxqbjx`; integration applied `20260929084417_repair_execution_proof_sql_lint.sql` |
| Hosted database lint | PASS, exit 0, `[]`, after migration observed in the hosted ledger |
| Production deployment | `dpl_67ja3xn2AefhrMJaQwPeSCdoPxeS`, READY, target production |
| Deployment source | Existing GitHub integration, `gitSource.ref=main` and `gitSource.sha=64d02b581aedc2eb77a0b4d9357f515d17a41b24`; returned commit metadata matches |
| Deployment URL | [Pinned deployment](https://cyber-sentinels-v2-a29fwnna3-keith-speres-projects.vercel.app) |
| Production aliases | `www.cybersentinels.com` and `cybersentinels.com` attached to this deployment |
| Public smoke | PASS at 14:14:36 UTC; public routes, anonymous protection, streamed login redirect, single-tab callback recovery and mobile sign-in layout |

The hosted ledger increased from 117 to 118 entries. Every prior version, name and
statement hash is unchanged. The live definitions of `persist_rc1_trust_assessment`,
`ingest_continuous_trust_signal_v1`, `persist_scope_continuity_decision_v1` and
`persist_serious_incident_case_v1` match exactly the four reviewed expression repairs.
Owners, ACLs, SECURITY DEFINER and search paths are unchanged; PUBLIC, anon and
authenticated do not gain execution privileges. All 243 public table/RLS records,
350 policies and 154 noninternal triggers retain the pre-release fingerprints.
The four previously restricted helper functions retain their restrictions. No
reset, manual DDL, database push or migration-history rewrite was performed.

Local pre-merge validation: focused 82 tests, full 1,877 tests, lint, typecheck,
production build, scoped secret scan and redacted gitleaks all passed. The separate
SQL/helper behavior suite passed 14 tests. Public smoke does not certify authenticated
logout/backoffice or a real email recovery; those still need owner-session proof.

Ignored local evidence is retained under `artifacts/auth-production/pr111-release/`:
`green-checks.json`, `catalog-baseline.json`, `catalog-after.json`,
`catalog-comparison.json`, `lint-after.json`, `POST_MERGE_PROOF.md`, the pinned Git
deployment request/result and build log. Public smoke is in
`artifacts/auth-production/result.json`. These are verification artifacts, not
application data or new Production endpoints.

`feat/real-provider-qualification` was created only after the migration, hosted
lint and READY deployment/aliases were verified. Its changes are not part of this
Production deployment. See [real provider qualification](REAL_PROVIDER_QUALIFICATION.md)
for provider credentials, implementation limits and the new review scope.
