# EPIC 17.1B — Test Report

Date: 2026-07-19

## Automated coverage

| Area | Coverage |
| --- | --- |
| Subjects and authorization | Subject route requires authenticated enterprise owner/admin/reviewer; audit correlation persistence is asserted |
| Request creation | Input, tenant selection, idempotency header, persistence and partial response are covered |
| Replay and conflict | Exact replay returns prior details; changed-body key reuse returns HTTP-domain 409 |
| Provider isolation | A deliberately non-resolving provider times out, persists zero-confidence evidence, and returns partial completion |
| Persistence | Transaction/evidence normalized fields, audit writes, confidence version and contradiction count are asserted |
| Hopae | Valid/invalid/expired signatures, deterministic normalization, callback ingress and duplicate ledgers are covered by provider suites |
| World ID | Callback, proof route and adapter cannot return verified or positive confidence |
| Placeholders | Disabled and registry-only providers produce blocked/unsupported zero-confidence evidence |
| Confidence | Signed + server-verified `PASS` contributes; errors contribute zero; contradictions subtract 15 points |
| RLS | All seven tables, tenant reads, operator inserts, server-only writes, append-only audit, composite tenant FKs and provider uniqueness are asserted |

## Focused result

The focused Identity Signal suite passed 12/12 and Identity RLS passed 6/6. Runtime hardening, provider abstraction, and Hopae suites also passed after implementation.

## Quality gates

| Gate | Result |
| --- | --- |
| `npm run lint` | PASS — zero errors; six unrelated pre-existing warnings |
| `npm run typecheck` | PASS |
| `npm test` | PASS — complete repository test chain |
| `npm run build` | PASS — optimized Next.js build and 161 static pages |
| `npm audit --omit=dev` | PASS — zero vulnerabilities |

## Migration validation boundary

Migration tests verify forward-only structure, required tables, RLS enablement, grants, policies, constraints, tenant keys, indexes, allowed status values, banned raw-data columns, and balanced migration source. A local PostgreSQL/Supabase parser is not installed in this environment, so actual application and deployed-policy verification remain required before Production.

## Blocked runtime proof

- No live Hopae credentials or signed target-environment transaction were used.
- World ID server verification remains intentionally unimplemented.
- Supabase deployed migration and RLS state remain externally blocked.
- Cross-tenant denial is proven from migration policy source and domain tests, not from a connected Production database.
