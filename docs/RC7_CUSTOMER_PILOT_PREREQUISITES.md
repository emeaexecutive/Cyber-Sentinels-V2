# RC7 customer pilot prerequisites

Before the evidence gate can be rerun, provide and approve:

1. An HTTPS staging or production-candidate URL and deployed build identifier.
2. The target Supabase project with migrations applied through `202607160003_release_1_rc6_production_evidence_gate.sql`.
3. Controlled tenant A and tenant B, plus ordinary, reviewer and verified-admin test identities.
4. Two authorized validation reviewers, dataset/tenant scope and an adjudication owner.
5. Server-only Hopae credentials, intentional enable flag, configured callback URL and approved webhook test secret.
6. Approved non-customer test data, retention boundary and sanitized evidence location.
7. Explicit opt-ins for deployed, RLS and load tests; paid-provider load remains disabled unless separately authorized.
8. Named pilot operator, security owner, rollback owner and acceptable abort thresholds.

Secrets, tokens, passwords, raw identity payloads and customer data must not be placed in reports or source control.
