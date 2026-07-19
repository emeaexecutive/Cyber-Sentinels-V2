# Release Process

**Status:** Approved process; CI automation and operational exercises remain proposed

## Release lifecycle

```text
Scope -> Evidence plan -> Implementation -> Review -> Candidate
-> Quality/security/migration gates -> Go/No-Go -> Deploy
-> Production smoke -> Observe -> Close or Roll back -> Review
```

## Roles

The Release owner coordinates scope and decision. Engineering owns build/application evidence, Data owns migrations and restoration, Security owns security gates, Quality owns test evidence, Operations owns deployment/incident readiness, and the Product owner accepts customer-facing scope.

## Candidate requirements

- Immutable expected commit SHA and release version.
- Change list, affected capabilities and explicit exclusions.
- Migration/environment/provider changes identified.
- Test inventory and results linked, including blocked/skipped checks.
- Security, privacy, accessibility and performance impact reviewed.
- Application/database rollback and communication owners assigned.
- Known limitations use the CS-ENG status vocabulary.

## Go/No-Go

The decision meeting reviews `production-readiness-checklist.md` and records `go-no-go-template.md`. Any cross-tenant exposure, authentication bypass, destructive migration uncertainty, wrong deployment target, missing rollback path or unbounded critical error is an automatic `NO-GO`.

## Deployment and closure

Follow `docs/engineering/production-deployment.md`, then run production smoke tests. Observe the release for the declared window. Close only after the expected SHA, health, security boundaries, migrations and smoke artifacts are recorded. If rollback occurs, open an incident/change review and preserve both failed and recovery evidence.

## Versioning

Release notes describe behavior and evidence, not aspiration. Demo/Test Mode, provider-sandbox and Production states remain distinct. A documentation-complete release does not imply pilot or GA approval.
