# EPIC 17.2 Test Report

`npm run test:consensus-engine` covers strict schemas, capability truth, Hopae positive eligibility, invalid-signature zero weighting, World ID hard-zero behavior, placeholder/provider-count regressions, duplicate suppression, correlation penalties, independent-group thresholds, freshness expiry, high-assurance negative overrides, authoritative revocation, deterministic decision hashing, replay exclusions/outages, API tenancy/security contracts, enterprise UI requirements, Trust Event registration and all ten RLS tables.

The verifier runs artifact and invariant scans, lint, TypeScript, the focused suite and a production build. The complete repository suite remains the cross-Epic regression gate. Live database execution/RLS, production health, credentials and external controls remain `BLOCKED_BY_EXTERNAL_CONFIGURATION` until directly tested against approved infrastructure.

No verifier action deploys, installs dependencies, reads production data or prints secrets. Timestamped reports are written under `reports/` and remain operational evidence rather than source artifacts.

## Final local validation — 2026-07-20

- Focused consensus unit/integration/API/UI/RLS suite: `25/25` passed.
- Complete repository regression suite: passed.
- TypeScript: passed.
- ESLint: passed with no new errors; six pre-existing warnings remain outside this Epic.
- Next.js production build: passed.
- `npm run verify:17.2`: passed with aggregate exit code `0`.
- `npm audit --omit=dev`: `0` vulnerabilities.
- `git diff --check`: passed with platform line-ending notices only.

Rendered interaction automation was unavailable in this session. A browser/assistive-technology pass therefore remains a production release gate rather than being represented as completed evidence.
