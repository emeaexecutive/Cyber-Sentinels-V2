# RC1 Performance Evidence

Measured 2026-07-16 with `npm run test:rc1-performance`.

Environment: local approved Test Mode, in-process only; no external provider, network or database calls. Sample count: 100. Ten samples injected provider unavailability.

| Metric | Result |
| --- | ---: |
| Average | 0.161 ms |
| p50 | 0.108 ms |
| p95 | 0.348 ms |
| Injected unavailable rate | 10% |
| Execution error rate | 0% |

Stage averages (ms): provider 0.006; consensus 0.016; entity identity 0.006; Trust Decision 0.028; authority 0.003; enforcement 0.009; Replay 0.002; governance below 0.001; Trust Memory 0.021; Evidence Graph 0.008; Evidence Pack 0.015.

p95 is reported because 100 samples were collected. These are deterministic in-process engineering measurements, not guarantees, production APM, provider latency, database latency or fleet telemetry. Real provider and database p50/p95 remain a Release 1.0 blocker.
