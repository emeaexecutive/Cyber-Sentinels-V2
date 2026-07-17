# Sprint 16.1A Controlled Demo

1. Confirm `ML_RISK_ENABLED=false` and `ML_RISK_MODE=off`; open `/admin/trust-execution` and show `OFF`.
2. Run `npm run test:ori` to show deterministic feature extraction, validation, hash verification, and inference.
3. Inspect `lib/operational-risk/synthetic-dataset.ts`; label every row `SYNTHETIC`.
4. Show the seven-feature registry and prohibited-data boundary.
5. Show model `1.0.0` and artifact hash `1af58c672114a0aeccd91f3c8c750054087cc73f02a92739bf21a9fcc0596b8a`.
6. Demonstrate the two low, two moderate, and two high controlled fixtures.
7. Demonstrate the two insufficient-evidence fixtures and `ABSTAIN`.
8. Show risk-increasing and risk-reducing contributions.
9. Set an approved non-production environment to `ML_RISK_ENABLED=true`, `ML_RISK_MODE=shadow`.
10. Run a tenant-scoped trust case and show that the Trust Decision completes before ORI.
11. Compare ORI with the authoritative decision; do not collapse unlike decisions into a boolean.
12. Open Replay, Evidence Graph, and Trust Memory references retained by the existing workflow.
13. Open `/admin/reviews`, record usefulness and caution alignment, and show immutable history.
14. Open `/dashboard/validation` and show `ML Validation Incomplete` with null accuracy metrics.
15. Inspect the model and feature registries in an approved Supabase target.
16. On Windows, run `$env:RUN_ORI_RLS_TESTS='true'; npm.cmd run test:ori-rls` only with approved tenant A/B identities and target variables.

The demo proves controlled behavior, not deployed production accuracy or certification.
