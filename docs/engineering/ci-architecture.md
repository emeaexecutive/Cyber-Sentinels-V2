# Continuous Integration Architecture

**Status:** Proposed; no repository CI workflow exists at the publication baseline

## Objective

CI must make the local quality contract reproducible, isolate untrusted pull-request code from secrets, and produce durable evidence before a change can reach `main` or Production.

## Event model

| Event | Jobs | Secrets |
| --- | --- | --- |
| Pull request | Dependency install, lint, typecheck, non-live tests, ephemeral database, build, scans | None beyond read-only package access |
| Merge queue / `main` candidate | All PR jobs plus full test inventory and release artifact | Environment-scoped test secrets only |
| Approved release | Deployed smoke, live RLS/provider checks in isolated jobs | Protected environment secrets with approval |
| Scheduled | Dependency/security scans, recovery reminders and drift checks | Minimum scoped credentials |

## Job graph

```text
metadata -> install -> lint + typecheck + unit/source tests
                    -> ephemeral migration/RLS tests
                    -> security/dependency/secret scans
                    -> production build
all required jobs -> release-evidence artifact
approved deployment -> production smoke -> release decision
```

Jobs use a pinned Node/npm version, `npm ci`, least-privilege permissions, concurrency cancellation for superseded PRs and immutable action versions. Build/test artifacts must not contain `.env` values or customer data.

## Permissions and secrets

- Default workflow token permissions are read-only.
- Write permissions are scoped per job and never available to untrusted fork code.
- Production, provider and RLS credentials are protected by an approved environment.
- Pull-request jobs do not receive Production secrets.
- Secrets are referenced by name, masked, rotated and excluded from artifacts.
- Deployment requires release-owner approval and the expected commit SHA.

## Caching and artifacts

Cache npm data by lockfile, never `.next` output across trust boundaries. Retain test summaries, migration results, dependency reports, build metadata and smoke evidence for the release retention period. Redact URLs/tokens where they reveal sensitive topology.

## Current gap

`.github/workflows` and `CODEOWNERS` are absent. This document specifies the required architecture; it does not claim enforcement. Implementation is a P0 prerequisite before CS-ENG-001 can describe CI/CD as operational.
