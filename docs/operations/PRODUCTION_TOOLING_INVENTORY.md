# Production tooling inventory

| Tool/capability | Present | Configured | Used in CI | Live evidence | Gap | Recommended action |
| --- | --- | --- | --- | --- | --- | --- |
| Sentry | No | No | No | None in this workspace | Gap | Do not add in this pass; owner approval required for any paid service |
| OpenTelemetry-compatible tracing | Partial | Partial | No | Existing correlation IDs and release-health helpers | Gap | Add a minimal in-repo observability adapter and trace contract |
| Vercel logs and observability | Unknown | Unknown | No | Not verified from this workspace | Gap | Keep as external validation only; do not add paid tooling |
| Supabase logs | Partial | Partial | No | Existing release-health and operational measurements scaffolding | Gap | Preserve staging-only evidence and document operational health |
| CodeQL | No | No | No | None | Gap | Add workflow |
| Dependabot | No | No | No | None | Gap | Add configuration |
| GitHub secret scanning | Partial | Partial | Yes | Existing secret-scan workflow | Gap | Keep with redacted Gitleaks workflow and document secret guidance |
| Gitleaks | Yes | Yes | Yes | Existing workflow | None | Keep |
| Branch protection / rulesets | No | No | No | Not configured in this workspace | Gap | Document recommended ruleset and require owner approval before applying |
| Required status checks | Partial | Partial | Yes | Existing production verify workflow | Gap | Align checks to current workflows and document mandatory checks |
| OWASP ZAP | No | No | No | None | Gap | Add staging-only plan and guard tests |
| Playwright | Unknown | Unknown | No | Not verified from this workspace | Gap | Keep out of scope for this pass |
| Vitest/Jest/Node test runner | Yes | Yes | Yes | Existing Node test runner in package scripts | None | Keep |
| Load testing | Partial | Partial | No | Existing load test files | Gap | Keep as future optional work |
| SBOM generation | No | No | No | None | Gap | Defer; optional later |
| Dependency audit reporting | Partial | Partial | No | Existing release-health tooling | Gap | Use GitHub Dependabot and CodeQL for now |
| Uptime/health checks | Partial | Partial | Yes | Existing release-health API and staging checks | Gap | Preserve and expand with staging health outputs |
