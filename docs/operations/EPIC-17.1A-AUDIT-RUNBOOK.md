# EPIC 17.1A — Resilient Audit Runbook

## Purpose

Run the CS-ENG-002 repository audit to completion even when one or more stages fail. The runner writes one Markdown report and a timestamped directory of full stage logs under `reports/`.

## Commands

From the repository root:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\audit-cs-eng-002.ps1 -RepositoryPath . -NonInteractive
```

For an interactive terminal that should remain open after completion:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\audit-cs-eng-002.ps1 -RepositoryPath . -PauseAtEnd
```

Targeted diagnostic run:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\audit-cs-eng-002.ps1 -RepositoryPath . -SkipInstall -SkipTests -SkipBuild -NonInteractive
```

`-SkipInstall`, `-SkipTests`, and `-SkipBuild` record explicit `SKIPPED` stages. They do not turn the run into full release evidence. `-NonInteractive` and `CI=true` always suppress pausing, including when `-PauseAtEnd` is also supplied.

## Stage behavior

Every requested stage runs through the same collector. A failed critical stage does not suppress later tests, inventories, secret scanning, or report generation. Each stage records status, criticality, duration, summary, and a link to its full combined stdout/stderr log.

The stages are:

1. repository validation;
2. Git branch and conflict checks;
3. dependency install;
4. lint;
5. type-check;
6. unit tests;
7. integration tests;
8. security tests;
9. build;
10. npm audit;
11. route inventory;
12. provider inventory;
13. migration and RLS inventory;
14. environment-variable inventory;
15. secret scan;
16. report generation.

## Exit codes

| Code | Meaning |
| ---: | --- |
| `0` | No stage failed. Skipped stages may still mean the run is incomplete. |
| `1` | One or more non-critical stages failed and no critical stage failed. |
| `2` | One or more critical stages failed, including report-generation failure. |

The script contains one process exit, after aggregate evaluation and optional interactive pause.

## Reading the result

Start with the stage table in `reports/cs-eng-002-audit-<timestamp>.md`, then open the linked log for every `FAIL`. Review `SKIPPED` stages before treating the report as release evidence. Do not infer deployed platform state from repository results.

Provider inventory intentionally distinguishes registration from runtime evidence. Migration/RLS inventory proves source text only and retains the known teams/team-members tenant-policy check. Environment inventory lists names and never reads or prints values. The secret scan reports file and line only.

## External blockers

Without authenticated control-plane evidence, record these as `BLOCKED_BY_EXTERNAL_CONFIGURATION`:

- Vercel Production branch policy and Production environment completeness;
- Cloudflare WAF, DNSSEC, bot controls, and durable rate limiting;
- Supabase deployed migration state and Production RLS state.

Do not edit external configuration or apply migrations as part of this audit.
