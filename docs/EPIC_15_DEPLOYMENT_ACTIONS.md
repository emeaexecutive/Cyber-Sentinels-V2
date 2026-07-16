# Epic 15 deployment actions

1. Link the intended staging Supabase project and deployment; record environment and build SHA.
2. Apply migrations through `202607160003_release_1_rc6_production_evidence_gate.sql`; verify all five RC6 tables and functions exist.
3. Set server-only Supabase and Hopae variables. Register `${NEXT_PUBLIC_SITE_URL}/api/providers` as the callback.
4. Run `IMPORT_VALIDATION_FIXTURES=true npm run validation:import`; confirm 30 cases remain `pending`.
5. Run `npm run check:hopae`. Missing variable names may be displayed; values must never be logged.
6. Execute one real Hopae target flow and confirm a completed `provider_execution_records` row plus Replay, Graph and Memory references.
7. Run `RUN_RLS_TESTS=true npm run test:rls` with disposable tenant fixtures and short-lived user tokens.
8. Run `RUN_DEPLOYED_SECURITY_TESTS=true npm run test:deployed` with the explicit HTTPS staging URL.
9. Run `RUN_LOAD_TESTS=true npm run test:load`; leave `ALLOW_PAID_PROVIDER_LOAD_TEST=false`.
10. Retain sanitized reports, insert release evidence checks, review all blocker cards, then remove disposable fixtures and revoke test credentials.

Recovery: disable RC6 writers, preserve exported evidence references, revert the application, and remove new tables/functions only after retention and audit owners approve deletion.
