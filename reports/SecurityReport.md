# Security report

- Timestamp: 2026-07-22T16:20:49.881Z
- Status: PASS WITH WARNINGS
- Checks: tracked secrets, service-role exposure, committed production environment files, environment ignore rules, wildcard CORS, production cookie security, auth bypass flags, debug routes
- Exact failure stage: None
- Actionable remediation: Review warnings and confirm each production boundary before release.
- Limitation: These static checks are not a security certification, penetration test, or proof that deployed configuration is safe.
- Secret handling: Suspected values are never included in this report.

## Findings

- **WARNING** debug-route - app/api/demo/seed/route.ts: A debug, test, or demo API route is tracked; verify production authorization and exposure.

## Production dependency audit

- Production dependency advisories: 0 critical, 2 high, 0 moderate, 0 low.
- Critical advisories block release; lower severities remain explicit warnings requiring review.
