# Release 1.0.2 - Production Workspace Reliability

Release 1.0.2 makes the existing Cyber Sentinels workspace more predictable to build, review, operate and demonstrate.

## Shipped

- Normalized `main` tracking to exactly `origin/main` and documented non-destructive recovery.
- Removed the tracked TypeScript incremental cache and repaired generated-file ignore hygiene.
- Replaced the build-disguised-as-lint script with ESLint, aggregated all ten existing configured test commands and added a combined validation gate.
- Aligned Next.js and its ESLint config at 15.5.20; patched transitive `js-yaml`.
- Preserved the seven-area authenticated workspace and expanded its one context model to the eight required dimensions.
- Refined canonical platform health with Trust Engine and database checks, truthful unknown/degraded handling and build metadata boundaries.
- Added one shared customer-safe degraded-mode guidance surface for eight operational failures.
- Preserved public navigation ownership, protected admin routing, auth/RLS boundaries and existing operational routes.

## Capability truth

The release preserves the explicit labels `Real ML`, `Provider API`, `Heuristic Baseline`, `Runtime Intelligence`, `Human Review`, `Awaiting Credentials`, `Not Implemented` and `Insufficient Validation`. It adds no ML architecture and publishes no metric without dataset version, sample count, ground truth, benchmark version and threshold context.

## Known risks

Two moderate audit findings remain through Next's pinned PostCSS dependency; no forced or breaking remediation was applied. World ID remains optional, awaiting a staged SDK/provider-exchange migration. Process-local health measurements are not fleet telemetry. Full test auto-discovery also finds 14 stale contract failures outside the configured ten-command release suite. See `DEPENDENCY_SECURITY_REVIEW.md` and `SPRINT_10_2_ACCEPTANCE_CRITERIA.md`.
