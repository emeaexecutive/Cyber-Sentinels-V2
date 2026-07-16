# RC1 Operational Trust Demo

Duration: about six minutes. Public guided animation: 16.2 seconds.

1. Open `/` and show the reduced six-block enterprise story.
2. Run `See Trust in Action`: Establish Trust → Resolve Identity → Confirm Authority → Collect Evidence → Evaluate Trust → Enforce Decision → Write Replay → Update Trust Memory™ → Produce Evidence Pack.
3. Explain `Live`, `Test Mode`, `Simulated`, `Awaiting Credentials`, `Unavailable`. The current public provider step is `Awaiting Credentials`; no live call is implied.
4. Open `/demo/trust-execution-flow` and demonstrate allow, review and block paths.
5. For a seeded authenticated workspace, initiate the existing Trust Assessment and inspect provider status, Replay and receipt.
6. Download JSON/PDF from `/api/audit/export?workflow_id=<uuid>&format=pack-json|pack-pdf`.

Fallback: run `npm run test:rc1` and `npm run test:rc1-performance`. Fixtures mock approved responses and make no paid calls. Never describe animation, fixtures, process-local latency or credential presence as production health.
