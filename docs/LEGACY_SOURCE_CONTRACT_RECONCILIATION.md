# Legacy Source-Contract Reconciliation

The former sweep encoded several product eras. Epic 28 preserves security intent while replacing stale wording and architecture with canonical functional contracts. No test was skipped or deleted. `npm run test:legacy-source-contracts` is in the default `npm test` chain.

| Former failure | Original contract | Current canonical contract | Code change | Test change | Status |
|---|---|---|---|---|---|
| 1. Primary navigation six destinations | Platform, Hiring Security, Trust Center, Enterprise, Pricing, Access | Six public links are Platform, Solutions, Trust, Enterprise, Pricing, Sign In; protected links are role-gated | Central registry consumed by global navigation | Canonical definition and access separation | pass |
| 2. Homepage operational vocabulary | Exact Operational Trust sentences and six workflow labels | Enterprise Trust Infrastructure plus approved continuous-verification statement | Replaced hero/metadata | Semantic markers, not full-paragraph matching | pass |
| 3. Authentication/admin affordances | Login choices plus public-layout admin text | Login choices remain; admin appears only in authenticated role-gated navigation | Centralized admin navigation | Auth controls and role gating retained | pass |
| 4. Historical policy-drop idempotency | Every historical policy needed literal `DROP POLICY IF EXISTS` | Forward guard compares canonical definitions, records decisions and fails closed on drift | Added versioned policy guard without historical edit | Absent, identical, replacement, conflict and repeat | pass |
| 5. Exact demo path | Overview links replay and receipt fixtures | `/demo` canonical, `/replay/demo` deterministic, legacy execution route redirects | Unified route policy | Route, redirect and pre-auth Replay | pass |
| 6. Demo Replay questions | Six hiring-fixture questions | Exact fourteen-question cross-Epic contract | Unified demo and Replay copy | Fourteen required questions | pass |
| 7. Provider runtime state | Live, Simulated, Awaiting Credentials, Disabled | available, degraded, unavailable, contradicted, unknown | Canonical mapper; maturity separate | Five operational states | pass |
| 8. Homepage/auth/admin lock | Old homepage, public admin text, auth controls | Canonical homepage, recovery unchanged, admin protected | Homepage/navigation only | Canonical copy plus access controls | pass |
| 9. Homepage copy and CTA routes | Exact old copy and four route files | Canonical copy, `/demo`, enterprise-demo request | Explicit demo CTA | Semantic statement and route existence | pass |
| 10. Dropdown/admin wiring | Public dropdown and footer admin entry | Shared direct public navigation and role-gated admin link | Desktop/mobile use one registry | Link resolution and public/admin separation | pass |
| 11. Replay unavailable versus empty | Unavailable source warning collapsed with empty evidence | Six distinct availability states | Canonical resolver and UI notice | All states and controlled failure | pass |
| 12. Provider Replay from activity counts | Counts could imply provider evidence | Provider Replay requires attributed evidence references | Provider-signal references only | Count cannot create evidence | pass |
| 13. Positioning, wordmark and beta | Old positioning, strong wordmark, no beta | Enterprise Trust Infrastructure, existing wordmark, no beta language | Canonical positioning | Semantic category/brand/beta exclusions | pass |

## Classification decisions

Failures 1, 3, 5, 8, 9 and 13 were partially stale contracts; 2, 6, 7 and 10 were obsolete product behavior; 4 was historical migration debt; 11 and 12 were implementation regressions. None required restoring obsolete architecture or reducing security coverage.

## Result

`LEGACY SOURCE-CONTRACT SWEEP: 58/58 PASS`

The 58-test sweep has zero skips and remains the source-contract lock. Epic 28 extends the demo expectation without weakening legacy coverage.
