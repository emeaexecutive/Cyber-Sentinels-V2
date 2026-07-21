# EPIC 17.1D Verification Report

Generated: 2026-07-21T09:02:25.631Z
Aggregate exit code: 0

| Check | Status | Critical | Detail |
|---|---|---:|---|
| Required artifact: src/lib/trust-events/types.ts | PASS | yes | Present |
| Required artifact: src/lib/trust-events/canonicalize.ts | PASS | yes | Present |
| Required artifact: src/lib/trust-events/hash.ts | PASS | yes | Present |
| Required artifact: src/lib/trust-events/gateway.ts | PASS | yes | Present |
| Required artifact: src/lib/trust-events/provider-registry.ts | PASS | yes | Present |
| Required artifact: src/lib/trust-events/normalize.ts | PASS | yes | Present |
| Required artifact: src/lib/trust-events/redaction.ts | PASS | yes | Present |
| Required artifact: supabase/migrations/202607200001_canonical_trust_event_foundation.sql | PASS | yes | Present |
| Required artifact: app/api/trust-events/ingest/[provider]/route.ts | PASS | yes | Present |
| Required artifact: app/api/trust-events/route.ts | PASS | yes | Present |
| Required artifact: app/api/trust-events/[id]/route.ts | PASS | yes | Present |
| Required artifact: app/api/trust-events/[id]/integrity/route.ts | PASS | yes | Present |
| Required artifact: app/api/trust-events/subjects/[subjectId]/route.ts | PASS | yes | Present |
| Required artifact: app/api/trust-events/workflows/[workflowId]/route.ts | PASS | yes | Present |
| Required artifact: app/api/trust-events/sessions/[sessionId]/route.ts | PASS | yes | Present |
| Required artifact: app/api/trust-events/providers/health/route.ts | PASS | yes | Present |
| Required artifact: docs/implementation/EPIC-17.1D-IMPLEMENTATION-REPORT.md | PASS | yes | Present |
| Required artifact: docs/architecture/TRUST-EVENT-V1.md | PASS | yes | Present |
| Required artifact: docs/architecture/PROVIDER-ENVELOPE-CONTRACT.md | PASS | yes | Present |
| Required artifact: docs/security/TRUST-EVENT-INTEGRITY.md | PASS | yes | Present |
| Required artifact: docs/security/EVIDENCE-MINIMISATION.md | PASS | yes | Present |
| Required artifact: docs/operations/EPIC-17.1D-RUNBOOK.md | PASS | yes | Present |
| Required artifact: docs/implementation/EPIC-17.1D-TEST-REPORT.md | PASS | yes | Present |
| World ID safety invariant | PASS | yes | Required invariants present |
| Placeholder zero-contribution invariant | PASS | yes | Required invariants present |
| Per-enterprise locking | PASS | yes | Required invariants present |
| Evidence minimisation | PASS | yes | Required invariants present |
| Strict persisted Trust Event model | PASS | yes | Required invariants present |
| Finalized envelope immutability | PASS | yes | Required invariants present |
| Rejected envelope audit fidelity | PASS | yes | Required invariants present |
| Complete runtime event validation | PASS | yes | Required invariants present |
| Stable compound pagination | PASS | yes | Required invariants present |
| Established Hopae callback bridge | PASS | yes | Required invariants present |
| Lint | PASS | no | Command passed (21886 ms) |
| TypeScript | PASS | no | Command passed (7322 ms) |
| Trust Event tests | PASS | no | Command passed (1711 ms) |
| Production build | PASS | no | Command passed (116612 ms) |
| Vercel control proof | BLOCKED | no | BLOCKED_BY_EXTERNAL_CONFIGURATION — not inferred from source code |
| Cloudflare control proof | BLOCKED | no | BLOCKED_BY_EXTERNAL_CONFIGURATION — not inferred from source code |
| Supabase migration deployment proof | BLOCKED | no | BLOCKED_BY_EXTERNAL_CONFIGURATION — verifier does not alter infrastructure |

External controls remain blocked until directly proven. No deployment, infrastructure mutation, Production data access, or secret output was performed.
