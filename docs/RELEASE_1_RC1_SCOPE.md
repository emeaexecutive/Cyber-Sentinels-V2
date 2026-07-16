# Release 1.0 RC1 Scope Freeze

Release: `1.0 RC1` — frozen 2026-07-16.

RC1 proves one controlled Trust Assessment in approved Hopae Test Mode. It adds no Trust Engine and no public product route.

## Only critical path

1. Trust Assessment initiated through authenticated `POST /api/trust/execute`.
2. Tenant and workflow resolved through existing workspace/case RLS.
3. Entity identity resolved.
4. Authority evaluated independently of identity evidence.
5. Hopae provider evidence collected in approved Test Mode or a configured deployment.
6. Evidence mapped to the provider-neutral contract.
7. Evidence quality evaluated before decision use.
8. Trust Decision generated and policy outcome enforced.
9. Replay, Evidence Graph and Trust Memory™ written.
10. Governance action retained where required.
11. Trust Evidence Pack generated through the existing authenticated audit export.

## Classification

| Capability | Classification | Boundary |
| --- | --- | --- |
| Hopae adapter, callback, normalization and approved fixtures | RC1 required | Primary provider; `Test Mode` until real credentials and health evidence exist. |
| Authority, policy, enforcement, Replay, Evidence Graph, Trust Memory and Evidence Pack | RC1 required | Existing canonical seams only. |
| Turnstile, runtime profiler, admin provider status and governance queues | RC1 supporting | Turnstile is abuse control, never identity proof; metrics are process-local. |
| Stripe Identity and World ID | post-RC1 | Placeholder or workflow-incomplete; not selected. |
| Other detection/media providers | post-RC1 | Require endpoint-specific evidence. |
| ML calibration and public accuracy metrics | post-RC1 | Blocked until reviewed ground truth meets the existing gate. |
| Public guided demo | experimental | Truthfully labelled; does not write customer data. |
| Legacy duplicate/hidden experimental surfaces | archived/hidden | Outside RC1 and the buyer promise. |

Scope may shrink to address a critical defect. It must not expand during RC1 implementation.

## RC2 handoff

RC1 remains the provider evidence gate. RC2 composes its normalized evidence into a contextual Living Trust Profile and reauthorization proof. RC2 does not widen RC1 provider claims, create another provider path or change the rule that `Live` requires deployed credentials plus successful real health evidence.
