# CS-ENG-002 Quick Wins

Quick wins are material, low-risk XS/S changes. They improve evidence and guardrails but do not clear CRIT-001 or make the repository Production-ready.

| Priority | Improvement | Evidence/gap | Effort | Expected outcome |
| ---: | --- | --- | --- | --- |
| 1 | Add all referenced runtime/test environment names to `.env.example`, with required/optional and server/public comments | EVID-0038 | S | Eliminates configuration-name ambiguity without adding values |
| 2 | Resolve Stripe price-name drift by documenting one canonical name and a deprecation window | EVID-0038 | XS | Prevents checkout/runtime mismatch |
| 3 | Declare the supported Node engine and align local/CI/Vercel versions | EVID-0004, EVID-0045 | XS | Reduces build/runtime variance |
| 4 | Remove six lint warnings | EVID-0041 | XS | Restores a clean warning baseline for future fail-on-warning CI |
| 5 | Add an explicit Production guard that prevents silent demo fallback on team and enterprise operational pages | EVID-0034 | S | Makes missing data visible instead of credible-looking |
| 6 | Add a static migration check for duplicate prefixes, empty files and newly introduced permissive RLS patterns | EVID-0020 | S | Detects a narrow class of migration regressions before review |
| 7 | Add a repository route/security inventory command using `scripts/audit-cs-eng-002.ps1 -SkipQualityChecks` | EVID-0050 | XS | Makes audit drift visible without external access |
| 8 | Add a top-level `not-found.tsx` and verify route error/loading ownership | EVID-0005-EVID-0006 | S | Improves predictable application failure handling |
| 9 | Document which 15 test files are excluded from the default chain and why | EVID-0040 | XS | Prevents a green default test result from being overstated |
| 10 | Add source tests asserting `/governance` cannot regress to Login content | EVID-0007 | XS | Protects the resolved duplication defect |
| 11 | Mark World ID, non-Hopae providers and heuristic detections with one shared runtime evidence-state component | EVID-0024-EVID-0027 | S | Reduces unsupported “verified/live” claims |
| 12 | Add `Cache-Control: private, no-store` to every authenticated download/API response through a shared helper | EVID-0035, EVID-0039 | S | Reduces sensitive response caching drift |
| 13 | Add correlation-ID response headers to health and high-risk APIs | EVID-0048 | S | Improves incident correlation before full APM exists |
| 14 | Record Vercel/Cloudflare/Supabase dashboard review dates and owners in the go/no-go template | EVID-0044-EVID-0049 | XS | Makes external-control evidence expire explicitly |
| 15 | Add a `CODEOWNERS` rule for migrations, auth, middleware and audit documents | EVID-0043 | XS | Establishes review ownership before full CI/branch enforcement |

## Exclusions

The team RLS fix, canonical enterprise membership, CI implementation, durable rate limiting, provider completion, trust-runtime consolidation, centralized observability and recovery exercises are not quick wins. Treating them as XS/S work would understate migration, privacy, operational and regression risk.
