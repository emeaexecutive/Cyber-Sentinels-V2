# EPIC 17.2 Verification Report

Generated: 2026-07-20T18:32:17.266Z
Aggregate exit code: 0

| Check | Status | Critical | Detail |
|---|---|---:|---|
| Artifact: src/lib/consensus/provider-capabilities.ts | PASS | yes | Present |
| Artifact: src/lib/consensus/provider-registry.ts | PASS | yes | Present |
| Artifact: src/lib/consensus/types.ts | PASS | yes | Present |
| Artifact: src/lib/consensus/engine.ts | PASS | yes | Present |
| Artifact: src/lib/consensus/independence.ts | PASS | yes | Present |
| Artifact: src/lib/consensus/freshness.ts | PASS | yes | Present |
| Artifact: src/lib/consensus/conflicts.ts | PASS | yes | Present |
| Artifact: src/lib/consensus/explain.ts | PASS | yes | Present |
| Artifact: src/lib/consensus/decision-lineage.ts | PASS | yes | Present |
| Artifact: src/lib/consensus/replay.ts | PASS | yes | Present |
| Artifact: src/lib/consensus/repository.ts | PASS | yes | Present |
| Artifact: src/lib/consensus/health-service.ts | PASS | yes | Present |
| Artifact: src/components/consensus/ConsensusStatus.tsx | PASS | yes | Present |
| Artifact: src/components/consensus/ConsensusScore.tsx | PASS | yes | Present |
| Artifact: src/components/consensus/ProviderContributionList.tsx | PASS | yes | Present |
| Artifact: src/components/consensus/ConflictPanel.tsx | PASS | yes | Present |
| Artifact: src/components/consensus/DecisionExplanation.tsx | PASS | yes | Present |
| Artifact: src/components/consensus/ProviderHealthGrid.tsx | PASS | yes | Present |
| Artifact: src/components/consensus/ConsensusTimeline.tsx | PASS | yes | Present |
| Artifact: src/components/consensus/PolicySummary.tsx | PASS | yes | Present |
| Artifact: app/dashboard/consensus/page.tsx | PASS | yes | Present |
| Artifact: app/dashboard/consensus/subjects/[subjectId]/page.tsx | PASS | yes | Present |
| Artifact: app/dashboard/consensus/decisions/[decisionId]/page.tsx | PASS | yes | Present |
| Artifact: app/admin/consensus/providers/page.tsx | PASS | yes | Present |
| Artifact: app/admin/consensus/policies/page.tsx | PASS | yes | Present |
| Artifact: app/api/consensus/evaluate/route.ts | PASS | yes | Present |
| Artifact: app/api/consensus/decisions/route.ts | PASS | yes | Present |
| Artifact: app/api/consensus/decisions/[id]/route.ts | PASS | yes | Present |
| Artifact: app/api/consensus/decisions/[id]/explanation/route.ts | PASS | yes | Present |
| Artifact: app/api/consensus/subjects/[subjectId]/route.ts | PASS | yes | Present |
| Artifact: app/api/consensus/subjects/[subjectId]/timeline/route.ts | PASS | yes | Present |
| Artifact: app/api/consensus/providers/route.ts | PASS | yes | Present |
| Artifact: app/api/consensus/providers/health/route.ts | PASS | yes | Present |
| Artifact: app/api/consensus/policies/route.ts | PASS | yes | Present |
| Artifact: app/api/admin/consensus/policies/route.ts | PASS | yes | Present |
| Artifact: app/api/admin/consensus/policies/[id]/route.ts | PASS | yes | Present |
| Artifact: app/api/admin/consensus/simulate/route.ts | PASS | yes | Present |
| Artifact: supabase/migrations/202607200003_provider_consensus_engine.sql | PASS | yes | Present |
| Artifact: docs/implementation/EPIC-17.2-IMPLEMENTATION-REPORT.md | PASS | yes | Present |
| Artifact: docs/architecture/PROVIDER-CONSENSUS-ENGINE.md | PASS | yes | Present |
| Artifact: docs/architecture/CONSENSUS-POLICY-MODEL.md | PASS | yes | Present |
| Artifact: docs/architecture/PROVIDER-INDEPENDENCE.md | PASS | yes | Present |
| Artifact: docs/security/CONSENSUS-INTEGRITY.md | PASS | yes | Present |
| Artifact: docs/operations/PROVIDER-HEALTH-RUNBOOK.md | PASS | yes | Present |
| Artifact: docs/operations/CONSENSUS-DECISION-RUNBOOK.md | PASS | yes | Present |
| Artifact: docs/implementation/EPIC-17.2-TEST-REPORT.md | PASS | yes | Present |
| Branch is main | PASS | yes | Branch: main |
| Merge conflicts | PASS | yes | No conflict markers |
| Secret scan | PASS | yes | No high-confidence secret patterns |
| World ID and placeholder zero weight | PASS | yes | Required invariants present |
| Weighted consensus is not provider voting | PASS | yes | Required invariants present |
| Duplicate and unknown evidence safety | PASS | yes | Required invariants present |
| Correlation and freshness | PASS | yes | Required invariants present |
| Conflict and revocation | PASS | yes | Required invariants present |
| Decision integrity | PASS | yes | Required invariants present |
| Replay simulation | PASS | yes | Required invariants present |
| RLS, append-only, locking and Trust Events | PASS | yes | Required invariants present |
| Required Trust Events | PASS | yes | Required invariants present |
| Mandatory safety regressions | PASS | yes | Required invariants present |
| Lint | PASS | no | Command passed (35050 ms) |
| TypeScript | PASS | no | Command passed (67377 ms) |
| Consensus unit/integration/RLS tests | PASS | no | Command passed (1047 ms) |
| Production build | PASS | no | Command passed (110854 ms) |
| Deployed Supabase migration and live RLS | BLOCKED | no | BLOCKED_BY_EXTERNAL_CONFIGURATION — verifier does not mutate infrastructure |
| Production provider health and credentials | BLOCKED | no | BLOCKED_BY_EXTERNAL_CONFIGURATION — requires direct production evidence |

No deployment, infrastructure mutation, Production data access or secret output was performed.
