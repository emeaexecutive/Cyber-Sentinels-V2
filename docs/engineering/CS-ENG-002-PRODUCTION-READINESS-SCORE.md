# CS-ENG-002 Production Readiness Score

**Assessment date:** 2026-07-19
**Production readiness status:** **NOT READY**
**Final decision:** **AUDIT FAILED - CRITICAL BLOCKERS**

## Domain scores

| Domain | Score | Maturity band | Primary evidence | Why the score is not higher |
| --- | ---: | --- | --- | --- |
| Architecture | 58 | Partial capability | EVID-0004-EVID-0008 | Broad surface and real domain code, but overlapping engines, similar-purpose routes and process-local state lack canonical ownership |
| Authentication | 64 | Functional but incomplete | EVID-0009-EVID-0012 | Server session and admin gates exist; credentialed lifecycle, MFA and provider settings are not proven |
| Authorization | 35 | Early implementation | EVID-0012-EVID-0019 | Workspace RLS exists, but the legacy team model has a critical authenticated-wide policy and enterprise IDs are not trusted context |
| Database | 43 | Partial capability | EVID-0013-EVID-0020 | Large migration history and targeted hardening exist; deployed state, drift, rollback and full RLS coverage are unproven |
| Identity | 34 | Early implementation | EVID-0021-EVID-0027 | Hopae and signal contracts are credible; most identity signals and the canonical confidence service remain incomplete or blocked |
| Trust | 48 | Partial capability | EVID-0028-EVID-0033 | Graph, Replay, Memory, ORI and decisions have meaningful code, but persistence and contracts are fragmented |
| Enterprise Experience | 51 | Partial capability | EVID-0034-EVID-0035 | Broad enterprise UX exists; demo fallback, incomplete tenant authority and absent pilot evidence limit reliance |
| Security | 44 | Partial capability | EVID-0036-EVID-0039 | Server-only secrets, signatures and headers are strengths; critical RLS, process-local rate limits and CSP weakening remain |
| Testing | 54 | Partial capability | EVID-0040-EVID-0042 | Default checks pass, but 15 test files are omitted and browser/live tenancy/provider coverage is absent |
| CI/CD | 20 | Early implementation | EVID-0043 | CI and required checks are documented only; no workflow exists |
| Deployment | 70 | Functional but incomplete | EVID-0044-EVID-0047 | Ready canonical Production deployment and correct live guards are verified; branch/protection/env and edge dashboards remain external |
| Operations | 39 | Early implementation | EVID-0048-EVID-0049 | Health and operational documents exist; centralized telemetry, tested alerts and exercised incident ownership do not |
| Recovery | 28 | Early implementation | EVID-0049 | Rollback and DR are documented; no restore or rollback exercise proves RTO/RPO |

## Composite scores

| Composite | Score | Interpretation |
| --- | ---: | --- |
| Overall Repository Maturity | **45%** | Buildable partial capability with one critical isolation defect and substantial runtime/operations gaps |
| Product Maturity | **48%** | Demonstrable workflows exist, but many identity/trust claims are heuristic, fragmented, demo-backed or provider-blocked |
| Production Readiness | **42%** | Capped below 49% by the critical team-tenancy/RLS issue |
| Security Readiness | **43%** | Useful controls exist, but tenant isolation is not defensible until the critical policy is remediated and verified live |
| Enterprise Readiness | **39%** | Enterprise UX is ahead of enterprise identity, authorization, provider evidence and operational proof |

The arithmetic mean of the 13 domain scores is 45.2%, rounded to 45%. Composite scores are risk-weighted assessments rather than alternative averages. The critical-security rule caps Production Readiness at 49%; the assessed score is lower because CI, live RLS evidence, identity verification, operations and recovery are also incomplete. The build passed, and a Ready Production deployment was verified, so the failed-build and unverified-deployment caps do not apply.

## Gate outcomes

| Gate | Outcome | Basis |
| --- | --- | --- |
| Build | PASS | Lint, type-check, default tests and production build completed successfully |
| Dependency audit | PASS | `npm audit --omit=dev` reported zero production vulnerabilities |
| Tenant isolation | **FAIL** | Authenticated-wide access remains in source for `teams` and `team_members` |
| Authentication | CONDITIONAL | Runtime paths exist; credentialed lifecycle and MFA were not exercised |
| Provider readiness | BLOCKED | Hopae requires credentials; other principal identity providers are incomplete |
| CI enforcement | FAIL | No `.github/workflows` directory |
| Production deployment | PASS WITH EXTERNAL GAPS | Ready canonical deployment verified; branch, env and protection controls remain unverified |
| Cloudflare controls | BLOCKED | Proxying and response headers verified; dashboard controls not verified |
| Operations and recovery | FAIL | Procedures exist without configured/retained operational evidence or exercises |
| EPIC 17 entry | **BLOCKED** | Stage 0 tenant containment and live denial verification must complete first |

## Status rationale

`NOT READY` is required because an authenticated user can be authorized by source RLS to read or change records in the legacy team tables without a tenant predicate. This is a credible cross-tenant scenario on runtime-backed team routes. A successful build and a Ready Vercel deployment do not override that defect.
