# Deployed security test guide

Use an approved HTTPS staging target and disposable fixtures. Set `RUN_DEPLOYED_SECURITY_TESTS=true`, `STAGING_BASE_URL`, build version and operator, then run `npm run test:deployed`. Deployment-specific denial URLs and short-lived tokens are optional inputs but required for their named checks.

Run RLS separately with `RUN_RLS_TESTS=true npm run test:rls`. Never use production customer records. Reports write to ignored `test-results/`. Inspect and move only sanitized evidence references into the release evidence store. Revoke tokens and remove fixtures after completion.
