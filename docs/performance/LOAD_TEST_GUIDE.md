# Controlled load-test guide

Set `RUN_LOAD_TESTS=true`, choose `LOAD_SCENARIO`, sample count and concurrency, then run `npm run test:load`. Supported scenarios: trust-decision-only, Replay write, Evidence Graph write, Trust Memory write, complete mocked trust flow and readiness dashboard query.

Paid-provider load remains disabled. `ALLOW_PAID_PROVIDER_LOAD_TEST=true` intentionally fails because no paid-provider load implementation is approved. Output is written to ignored `test-results/rc6-load-result.json`. Staging results are not production SLAs.
