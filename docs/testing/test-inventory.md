# Test Inventory

**Status:** Current repository inventory with proposed enforcement<br>
**Inventory date:** 2026-07-19

## Summary

| Measure | Count |
| --- | ---: |
| Test files | 46 |
| Test declarations discovered | 296 |
| Files reached by default `npm test` | 31 |
| Files outside the default chain | 15 |
| Files with source/file assertions | 31 |
| Files with direct library imports | 30 |
| Files containing network calls | 2 |

Counts describe structure, not coverage or production evidence.

## Default test families

`npm test` currently runs provider abstraction, Hopae assurance/integration, provider SQL/RLS source checks, detection sovereignty, ML validation, ORI and ORI RLS source checks, trust explanation, decision intelligence, standards readiness, trust lifecycle, continuous-trust validation, public navigation, Trust OS, Trust Fabric, enterprise storytelling/readiness/adoption/experience, release-candidate hardening, design-partner/category checks, RC1 performance, and RC1 through RC7 evidence suites.

## Files outside the default chain

| File | Character | Required action |
| --- | --- | --- |
| `consolidation-operational-simplification.test.mjs` | Source contract | Decide whether canonical or historical |
| `final-blocker-sweep.test.mjs` | Source/migration contract | Add to CI or retire with evidence |
| `final-demo-readiness-lock.test.mjs` | Demo/source contract | Keep separate from production gates |
| `final-execution-readiness.test.mjs` | Source/route contract | Add relevant checks to CI |
| `load/trust-execution-load.test.mjs` | In-process load | Move under explicit performance job |
| `network-intelligence.test.mjs` | Domain/source | Assign canonical owner |
| `operational-excellence-lockdown.test.mjs` | Source contract | Reconcile with Part 6 controls |
| `pilot-templates.test.mjs` | Documentation/template | Keep as docs validation if current |
| `production-domain-readiness.test.mjs` | Source/deployment contract | Add to release validation |
| `production-readiness.test.mjs` | Source contract | Add to release validation |
| `provider-hardening.test.mjs` | Provider source contract | Merge into provider gate |
| `real-world-workflow-hardening.test.mjs` | Domain/source | Add to domain gate |
| `receipt-verification.test.mjs` | Domain/source | Add to trust receipt gate |
| `rls/rc6-denial.test.mjs` | Live Supabase | Run only in isolated credentialed job |
| `trust-assurance.test.mjs` | Domain | Add to trust gate |

## Non-default harnesses

- `scripts/deployed-security-harness.mjs`: approved HTTPS target only; writes `test-results/rc6-deployed-security.json`.
- `scripts/rc6-load-harness.mjs`: explicit scenario and sample controls; provider-paid load is prohibited.
- `scripts/hopae-live-sandbox.mjs`: approved Hopae sandbox/target credentials only.
- `scripts/hopae-deployment-readiness.mjs`: configuration readiness, not a successful transaction.

## Inventory policy

Every new test must declare owner, layer, data class, default/opt-in status, environment requirements and release effect. Historical tests must not remain indefinitely outside the default chain without an explicit reason.
