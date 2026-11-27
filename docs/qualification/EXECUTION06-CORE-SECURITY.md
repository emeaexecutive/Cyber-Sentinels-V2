# Execution06 core security

Track A source: **17055a082112c1c8f134f5132ee97100a68b0cf9**, branch codex/execution06-core-20261115, local Windows / Node22.23.1. No push or hosted release. Execution05 source and evidence commits are retained.

All five workload findings are corrected locally; individual tests/dispositions are in EXECUTION06-BASELINE-AND-PR-TRUTH.md. The API-client decision factory now defaults to no relay; execution requires a separate controlled boundary. Recovery cookies remain quarantined even on the external-workload route. Active binding selection, expiry validation, request schema and 8–120-character idempotency bounds are verified.

| Check | Result / limits |
|---|---|
| Production build at final source | PASS, exit0, 209/209 static pages; compiled in84s, generated-type validation and traces completed |
| Uncached generated-route typecheck after build | PASS, exit0; 2,728 files;113.11s; no heap override/exclusion change |
| Full ESLint | PASS, exit0;10 inherited warnings,0 errors |
| API/workload/recovery/SDK parity suite | PASS65/65, zero skips |
| Auth browser suite | PASS32/32, zero skips; real components with synthetic service edges |
| Enforcement/watchtower/delegation/approval/Replay SQL suite | PASS67/67, zero skips, exit0; no hosted proof |
| Production dependency audit | PASS,0 advisories in locked production dependencies; network-restricted attempt failed before approved endpoint query |
| Gitleaks | PASS over refreshed published refs plus exact local candidates, unchanged rules; exact reviewed fixture fingerprints only |
| CodeQL / remote CI at new source | NOT RUN / NOT AVAILABLE: unpublished local branch. Existing PR heads have separate results; they do not qualify this SHA |
| Full npm test | NOT RUN in Execution06; targeted suites above are not represented as the full suite |

Initial failures are retained, not rewritten: restricted auth browser setup7PASS/25FAIL (esbuild directory access), then approved rerun32PASS; concurrent Next regeneration caused TS6053 missing-generated-file errors, then sequential uncached check PASS; TrackB initially used unsupported BigInt literal syntax, then corrected without compiler weakening. Tests regenerate torch-local.json; its original tracked blob was restored and its generated proof preserved separately. No application/lib imports that test output.

Scanner triage: website failure is the deliberate SCRAM wrong-password fixture at a9bffc15:63. A separate Execution05 idempotency identifier at35a979f:tests/workload-decision-boundary.test.mjs:62 cannot authenticate and is classified by its exact fingerprint. No paths/rules/workflows disabled. An exploratory all-local-ref scan found15,176 findings across unpublished historical branches; these are untriaged and excluded from any claim of machine-wide cleanliness. Release-scope published/candidate history is separately scanned. Remote #143 remains failing until an authorized update and new CI.

Final uncached core compiler memory:2,223,506K. Core and TrackB use read-only local junctions to the Execution05 locked node_modules; no dependency package changed, and lockfile digests are checked in the evidence manifest. This is local build proof; fresh remote npm ci / Docker / CodeQL at the published candidate remain gates. Logs are under tmp/execution06-core/artifacts/execution06-core.

No cross-tenant hosted test, managed-service recovery, real gateway qualification or current Production source binding is established. NO-GO for Production remains appropriate.

