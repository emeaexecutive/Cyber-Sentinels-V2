# Tooling cost and ownership

| Tool | Purpose | Current plan | Expected initial cost | Expected pilot cost | Data sent | Data residency | Retention | Owner | Deletion process | Lock-in risk | Replacement path |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Sentry | Application error monitoring | Not added in this pass | UNKNOWN | UNKNOWN | Error metadata and stack traces | OWNER CONFIRMATION REQUIRED | OWNER CONFIRMATION REQUIRED | OWNER CONFIRMATION REQUIRED | OWNER CONFIRMATION REQUIRED | Medium | Replace with any OpenTelemetry-compatible exporter |
| OpenTelemetry-compatible tracing | Server tracing | Minimal in-repo adapter | $0 | $0 | Safe trace metadata only | Local / staging only | Short-lived local retention | Engineering lead | Remove adapter and tests | Low | Any OTLP-compatible collector |
| CodeQL | Static security analysis | Added via workflow | $0 | $0 | Repository contents and workflow metadata | GitHub-hosted | GitHub retention | Engineering lead | Remove workflow | Low | Other static analyzers |
| Dependabot | Dependency update automation | Added via config | $0 | $0 | Dependency metadata | GitHub-hosted | GitHub retention | Engineering lead | Remove config | Low | Other update automation |
| Gitleaks | Secret scanning | Existing workflow kept | $0 | $0 | Repository contents and commit history | GitHub-hosted | GitHub retention | Security owner | Remove workflow | Low | Other secret scanners |
| OWASP ZAP staging scan | Staging security scan plan | Added as config only | $0 | $0 | Staging target metadata and report | Staging environment only | Short-lived report retention | Security owner | Remove plan and workflow | Medium | Other DAST tools |
