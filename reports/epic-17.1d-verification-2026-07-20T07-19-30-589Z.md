# EPIC 17.1D Verification Report

Generated: 2026-07-20T07:19:30.591Z
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
| Required artifact: app/api/trust-events/[id]/integrity/route.ts | PASS | yes | Present |
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
| Lint | PASS | no | Command passed (28832 ms) |
| TypeScript | PASS | no | Command passed (79984 ms) |
| Trust Event tests | PASS | no | Command passed (3388 ms) |
| Production build | PASS | no | Command passed (200368 ms) |
| Vercel control proof | BLOCKED | no | BLOCKED_BY_EXTERNAL_CONFIGURATION — not inferred from source code |
| Cloudflare control proof | BLOCKED | no | BLOCKED_BY_EXTERNAL_CONFIGURATION — not inferred from source code |
| Supabase migration deployment proof | BLOCKED | no | BLOCKED_BY_EXTERNAL_CONFIGURATION — verifier does not alter infrastructure |

External controls remain blocked until directly proven. No deployment, infrastructure mutation, Production data access, or secret output was performed.
