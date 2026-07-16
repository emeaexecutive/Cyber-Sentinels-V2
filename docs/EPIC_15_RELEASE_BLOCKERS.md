# Epic 15 Release 1.0 blockers

Release 1.0 RC6 is a production-evidence gate, not a feature release. Source controls are necessary but cannot clear a target-environment blocker.

| Blocker | Before RC6 | RC6 implementation | Retained evidence | Status |
| --- | --- | --- | --- | --- |
| Validation | Metadata scaffolds; 0 approved reviewed cases | Strict schema, 30 pending fixtures, protected dual review and approved-only scoped metrics | 0/30 approved cases | Human Review Required |
| Provider | Hopae Test Mode path and durable callback record | Provider execution records, unified intake ledger and readiness command | No credentials or real target execution supplied | Deployment Required |
| Security | Source and local denial controls | Opt-in deployed and RLS denial harnesses plus evidence contract | No deployed denial run supplied | Deployment Required |
| Performance | Process-local instrumentation | Durable mapped telemetry, pruning, redacted aggregation and opt-in load harness | 0 retained target samples; no staging load run | Pilot Traffic Required |

General Availability is not approved. Controlled Pilot is not approved until all four cards point to retained target-environment evidence.
