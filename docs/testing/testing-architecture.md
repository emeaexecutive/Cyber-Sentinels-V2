# Testing Architecture

**Status:** Approved Blueprint specification; partially implemented<br>
**Evidence baseline:** `main` at `e3fe37a`, audited 2026-07-19

## Purpose

Testing protects identity, evidence, authority, trust decisions, tenant isolation and recovery. A green source-level suite is necessary but does not certify a deployment. Evidence must always identify the revision, environment, data class and operator or automated workflow.

## Test layers

| Layer | Current evidence | Required target | Release effect |
| --- | --- | --- | --- |
| Static quality | ESLint and strict TypeScript | Zero errors; reviewed warning budget | Blocks merge |
| Domain unit | Provider security, ORI, authority, trust lifecycle and reporting logic | Deterministic success, failure and boundary cases | Blocks merge |
| Source contract | File, route and migration assertions | Retain only where compilation/runtime tests cannot express the contract | Blocks merge when intentional |
| API integration | Limited direct handler/source coverage | HTTP requests with auth, schemas, idempotency, audit and safe errors | Blocks release |
| Database integration | SQL-source assertions; credential-gated RLS calls | Fresh ephemeral schema plus multi-tenant allow/deny tests | Blocks release |
| Browser journey | Not implemented | Public, authenticated, admin and accessibility journeys | Blocks production release |
| Provider integration | Mock/Test Mode plus Hopae harness | Approved sandbox/target transaction and signed callback | Blocks provider enablement |
| Performance | In-process and opt-in load harnesses | Representative protected, database and provider workloads | Blocks scale claims |
| Security | Source tests and opt-in deployed harness | CI scans plus deployed denial-path suite | Blocks release |
| Recovery | Not implemented | Application rollback, database restore and DR exercises | Blocks operational-readiness claims |

## Environments

- **Local:** deterministic unit, source-contract and mocked integration tests. No production data.
- **CI:** isolated build, all non-live tests, ephemeral database, scans and artifacts. CI does not use Production credentials.
- **Approved test target:** credentialed Supabase/provider/deployed security tests using dedicated tenants and cleanup rules.
- **Production:** bounded read-only smoke tests and safe anonymous denials. Mutating tests require an approved synthetic tenant and release owner.

## Evidence contract

Every retained run records commit SHA, environment, test command, start/end time, result, skipped/blocked tests, dataset or fixture version, and non-secret artifact location. A blocked test is not a pass. Missing measurements are not zero.

## Current limitations

The repository has 46 test files, but only 31 are in the default `npm test` chain. Thirty-one files contain source/file assertions, browser automation is absent, and live RLS/provider/deployed suites require external configuration. These gaps are tracked in `CS-ENG-001_GAP_ANALYSIS.md`.

## Ownership

The Quality owner maintains this architecture. Domain owners maintain assertions, Security approves security and RLS tests, the Data owner approves fixtures and cleanup, and the Release owner verifies evidence before go/no-go.
