# Release 1.0 enterprise evidence brief

## Current readiness

| Area | Status | Proven | Under review |
| --- | --- | --- | --- |
| Validation | Blocked | Approved-only metric gate and protected review workflow | 0/30 approved cases |
| Provider | Awaiting Credentials | Hopae Test path and callback controls | Real target run and reviewed result |
| Security | Blocked | Source controls and evidence contract | Deployed auth, RLS and tenant denials |
| Performance | Awaiting Data | Durable sanitized schema and local instrumentation | Retained target samples and staging load run |

## Readiness timeline

Migration and credentials → controlled target run → accountable evidence review → blocker-card approval → controlled pilot decision.

## Proof table

| Proof | Evidence location | Limitation |
| --- | --- | --- |
| Validation review | `/admin/reviews` | No approved cohort yet |
| Provider posture | `/admin/provider-status` | Not Live without retained real proof |
| Security checks | `/admin/runtime-validation` | Deployment run required |
| Performance | `/admin/trust-execution` | No production SLA |

Pilot prerequisites: approved dataset, target credentials, applied migrations, deployed denial evidence, retained representative timings, named reviewer and incident/support owner.

Primary next step: **Request a controlled pilot evidence review** through `/enterprise/pilot`.
