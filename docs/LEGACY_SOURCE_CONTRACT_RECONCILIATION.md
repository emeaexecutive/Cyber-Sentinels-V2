# Legacy Source-Contract Reconciliation

The former non-default source sweep encoded several mutually inconsistent product eras. Epic 28 preserves security intent while replacing stale wording and architecture with canonical functional contracts. No test is skipped or deleted. The corrected suite is `npm run test:legacy-source-contracts` and is part of `npm test`.

| Former failure | Original contract | Classification | Current canonical contract | Code change | Test change | Status |
|---|---|---|---|---|---|---|
| 1. Primary navigation six destinations | Platform, Hiring Security, Trust Center, Enterprise, Pricing, Access | partially stale contract | Six public links are Platform, Solutions, Trust, Enterprise, Pricing, Sign In; protected links are role-gated | added one navigation definition and consumed it in global navigation | asserts the canonical definition and access separation | pass |
| 2. Homepage operational vocabulary | exact Operational Trust sentences and six workflow labels | obsolete product behavior | Enterprise Trust Infrastructure plus the approved continuous-verification statement | replaced hero/metadata with bounded canonical positioning | semantic markers; no paragraph-length match | pass |
| 3. Authentication/admin affordances | login choices plus public-layout admin text | partially stale contract | login choices remain; admin entry exists only in authenticated role-gated navigation | centralized admin navigation; public layout stays clean | preserves auth assertions and tests access gating | pass |
| 4. Historical policy-drop idempotency | every historical `CREATE POLICY` must have literal `DROP POLICY IF EXISTS` | historical migration debt | future policy guard compares canonical definitions and raises on drift | added `ensure_policy_definition_v1`; no historical migration edit | forward-only guard/contradiction assertions | pass |
| 5. Exact demo path | overview must link replay and receipt fixtures | partially stale contract | `/demo` is canonical; `/replay/demo` is its deterministic replay; old execution entry redirects | rebuilt demo and redirect policy | asserts canonical route, redirect and pre-auth replay path | pass |
| 6. Demo Replay six questions | six markers tied to one hiring fixture | obsolete product behavior | eight-question Enterprise Trust Fabric demonstration contract | added eight attributed questions to demo and Replay | replaced six-question assertions | pass |
| 7. Provider four-state runtime | Live, Simulated, Awaiting Credentials, Disabled | obsolete product behavior | available, degraded, unavailable, contradicted, unknown | added canonical runtime mapper; retained adapter maturity separately | asserts all five operational states | pass |
| 8. Homepage/auth/admin lock | old homepage sentences, public admin text, auth controls | partially stale contract | canonical homepage, unchanged account recovery, protected admin code | homepage/navigation changes only; admin pages remain protected | replaced stale copy/public-admin assertions | pass |
| 9. Homepage copy and CTA routes | exact old copy and four route files | partially stale contract | canonical copy; `/demo` and enterprise-demo request CTAs resolve | added explicit demo CTA | tests semantic statement and route existence | pass |
| 10. Dropdown/admin wiring | public dropdown mechanics and discreet footer admin entry | obsolete product behavior | direct six-link public navigation and role-gated admin link | removed dependency on dropdown source shape; centralized links | tests direct navigation and public/admin separation | pass |
| 11. Replay unavailable versus empty | unavailable source warning plus snapshot wording | implementation regression | ready, empty, evidence_missing, source_unavailable, generation_failed, access_denied | added canonical resolver and UI evidence-state notice | tests all six states and fail-closed messages | pass |
| 12. Provider Replay from activity counts | workflow counts could imply provider evidence | implementation regression | provider-backed Replay requires actual provider evidence references | Replay uses `provider_signals` references; empty panel states no inference | asserts no count inference and missing-evidence outcome | pass |
| 13. Homepage positioning/wordmark/beta | exact old positioning, strong wordmark, no beta | partially stale contract | Enterprise Trust Infrastructure statement; strong wordmark; no beta language | canonical copy retained existing wordmark styling | semantic positioning plus brand and beta exclusions | pass |

## Result

`LEGACY SOURCE-CONTRACT SWEEP: 58/58 PASS`

The 58-test suite includes the reconciled contract files plus provider hardening, production-domain readiness, production readiness, real-world workflow hardening and public-surface navigation. It contains zero skips and zero failures.
