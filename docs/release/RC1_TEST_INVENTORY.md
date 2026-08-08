# RC1 test inventory

This inventory classifies the npm gates relevant to the Enterprise Trust Platform RC1. Live and deployed harnesses are not part of the default suite and are not reported as passed without their explicit environment and credentials.

| Classification | npm scripts | RC1 use |
| --- | --- | --- |
| Unit/contract — providers and identity | `test:providers`, `test:hopae`, `test:identity-signals`, `test:identity-runtime-hardening`, `test:identity-signals-ui` | Provider normalization, evidence and identity boundaries |
| RLS/security — providers and identity | `test:provider-rls`, `test:identity-signal-rls` | Tenant and role controls |
| Trust events, consent and consensus | `test:trust-events`, `test:consent`, `test:consensus-engine` | Canonical evidence/recommendation inputs |
| Canonical architecture | `test:trust-architecture`, `test:trust-os`, `test:trust-fabric`, `test:enterprise-trust-fabric`, `test:epic-26-27-integration` | Trust Object, contracts, state, Fabric, graph and RLS |
| Continuous trust | `test:continuous-trust`, `test:continuous-trust-engine`, `test:continuous-trust-validation` | Runtime state and transition safety |
| Intelligence and explanation | `test:trust-intelligence`, `test:trust-explanation`, `test:decision-intelligence`, `test:trust-decision-intelligence` | Existing intelligence plus Epic 38 canonical explanation |
| Enterprise platform | `test:enterprise-platform`, `test:trust-centre`, `test:enterprise-storytelling`, `test:enterprise-readiness`, `test:enterprise-adoption`, `test:enterprise-experience`, `test:ui-ux` | Epic 36 coordination and UI truth |
| Graph, DNA, Replay and continuity | `test:enterprise-trust-graph`, `test:trust-dna`, `test:replay`, `test:scope-continuity`, `test:epic-26-lease-hash` | Evidence, chronology, lineage, environment and scope |
| Incident and risk | `test:serious-incidents`, `test:detection`, `test:ml-validation`, `test:ori`, `test:ori-rls` | Incident evidence and bounded deterministic risk |
| Public/security experience | `test:request-demo`, `test:public-surface`, `test:pricing-surface`, `test:technical-truth`, `test:public-positioning` | Turnstile/request safety, navigation, pricing and claims |
| Migration/release | `test:provider-health-reconciliation`, `test:trust-relationships-reconciliation`, `test:migration-namespace`, `test:release-manager`, `test:staging-migration-audit`, `test:staging-release`, `test:staging-reconstruction`, `test:release-health`, `test:staging-application`, `test:release-qualification` | Static migration namespace and release controls |
| Observability/security tooling | `test:observability`, `test:security-tooling`, `test:security-zap-config` | Safe telemetry, secret scanning and ZAP configuration |
| Release/readiness suites | `test:release-candidate`, `test:design-partner`, `test:category-leadership`, `test:rc1`, `test:rc1-performance`, `test:rc2`, `test:rc3`, `test:rc4`, `test:rc5`, `test:rc6`, `test:rc7` | Historical release contracts and compatibility |
| Compatibility debt | `test:legacy-source-contracts` | Explicit non-default sweep included by the current default suite |
| Live/deployed opt-in | `test:hopae-live`, `test:deployed`, `test:rls`, `test:load`, `test:live-rls`, `test:live-governance`, `security:zap:staging` | Environment-bound; never inferred from static tests |
| Security artifacts | `security:sbom` | Regenerates deterministic SBOM and licence inventory |
| Full gates | `lint`, `typecheck`, `test`, `build`, `validate` | Mandatory local RC1 qualification |

## Default-suite change

`test:enterprise-platform` and `test:trust-decision-intelligence` are included in `npm test`, so the new RC1 contracts cannot silently bypass the default release chain.
