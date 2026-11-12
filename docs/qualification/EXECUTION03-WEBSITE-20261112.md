# Execution 03 website candidate — 12 November 2026

Branch: `codex/execution03-website-20261112`. Isolated checkout: `tmp/execution03-website`. Base: PR136 exact head `582acc889afbe59991ea307bc5e4a2b986b11c0e`, independently confirmed through the connected GitHub plugin. PR136 remains separate from the enforcement, schema and AI SOC stacks. This work does not merge or deploy anything.

## Interactive River Crossing loop mode

English `/tenente-swarm/river-crossing#loop-limit` and Spanish `/es/tenente-swarm/river-crossing#loop-limit` add a standalone fourth loop-limit demonstration. Both prominently show **ILLUSTRATIVE SIMULATION** (Spanish additionally **SIMULACIÓN ILUSTRATIVA**).

`lib/watchtowers/loop-simulation.ts` is an executable browser-only teaching model. Two failed tool attempts consume two of three shared slots; a handoff grants no new allowance. Two distinct requests then compete for the final serialized browser reservation: one ALLOW and one DENY / COLLECTIVE_LIMIT_EXCEEDED. A separate in-memory destination ledger is read to observe one successful synthetic effect and zero effects for the denied request. This is **not** the server gateway, a multi-connection database test, independent third-party observation or a hosted security guarantee.

The model records SHA-256-linked decisions, failures, handoffs, destination observations, emergency stop and recovery. A simulated lost acknowledgement retains UNKNOWN; reconciliation reads the existing destination ledger and never redispatches. Recovery explicitly preserves consumed quota. The UI provides labelled controls, keyboard interaction, polite status updates, reduced-motion-compatible styling, responsive 44px controls and inspectable technical Replay. The cumulative 0.003 USD maximum is a labelled **illustrative estimate**, not actual token accounting, spend enforcement or observed provider billing. There are no model calls or API/storage/payment requests from the demonstration.

UI source: `components/watchtowers/loop-limit-demo.tsx`, composed into `components/watchtowers/watchtower-page.tsx`; responsive styles in `components/watchtowers/watchtowers.css`. The existing signed-fixture viewer and its evidence bundles remain intact. The fixture importer now tolerates Windows CRLF in the generated TypeScript wrapper while still verifying the original signed canonical fixture manifest; this fixes a demonstrated checkout-only test failure without changing signed evidence.

## Publication approval provenance: all eleven pages remain blocked

The approved-content requirement cannot be satisfied by translating hidden drafts or inventing legal sign-off. Inspection of every English owner, its Spanish equivalent, `components/legal-draft-page.tsx`, `lib/legal/draftPages.ts` and the existing privacy/content governance documents found **no underlying content publication approval** for these eleven routes. The source deliberately hides draft sections and says no approved version is published. PR136's route mapping is approval of a translation of that status notice, not approval of the hidden underlying policies.

| Route (EN and `/es` equivalent) | Exact English source | Evidence and unfinished cause | Publication decision |
|---|---|---|---|
| `/regulatory` | `app/regulatory/page.tsx` | LegalDraftPage hides draft governance/GDPR/AI Act text; no formal compliance certification or legal sign-off | Retain translated review notice; regulatory owner review needed |
| `/media-centre` | `app/media-centre/page.tsx` | Draft explicitly requires communications review of boilerplate, contacts and assets; approved resources absent | Retain notice; remove metadata claim that approved resources are available |
| `/our-people` | `app/our-people/page.tsx` | Bios, advisors and leadership publication explicitly await consent/communications review | Retain notice; named subject consent and owner approval needed |
| `/careers` | `app/careers/page.tsx` | No approved public roles, hiring process or candidate privacy text | Retain notice; hiring owner and privacy review needed |
| `/accessibility` | `app/accessibility/page.tsx` | WCAG intent is a draft; support ownership, contact timelines and formal review incomplete | Retain notice; audited statement and accountable contact approval needed |
| `/privacy` | `app/privacy/page.tsx` | English owner explicitly says approved privacy notice not published; controls are separate operational routes | Retain notice; controller/processor/retention and legal approval needed |
| `/terms` | `app/terms/page.tsx` | Liability, warranty, dispute and governing-law text requires drafting | Retain notice; legal approval needed |
| `/cookies` | `app/cookies/page.tsx` | Draft includes analytics placeholder; actual controls/catalogue do not constitute an approved cookie policy | Retain notice; reconcile actual technology and approve policy |
| `/legal` | `app/legal/page.tsx` | Jurisdiction placeholder and draft service/legal notices | Retain notice; entity/jurisdiction and legal approval needed |
| `/modern-slavery` | `app/modern-slavery/page.tsx`, underlying `app/modern-slavery-statement/page.tsx` | Existing statement is presented through LegalDraftPage; no recorded formal statement approval | Retain notice; applicable reporting scope and accountable approval needed |
| `/security` | `app/security/page.tsx` | Security/contact text is hidden draft, not current independently qualified operational guarantees | Retain notice; security owner approval and accurate runtime evidence needed |

All eleven English descriptions and social metadata now state the real review status, matching Spanish notice metadata. This removes a demonstrated discovery mismatch without publishing unapproved content. Their `noindex` treatment remains. No approver identity or legal conclusion is fabricated.

## Measured language and product boundaries

The inherited canonical public registry contains **45 routes**: EN source owners 45/45; ES registered equivalents 45/45. Eleven of each are publication status notices. Thus **34/45 = 75.56%** have non-notice public content ownership; this is **not** a human semantic review completion score. Underlying approved content completion for the eleven notice routes is **0/11**, and those approvals remain missing. The new loop panel translates both locales on existing routes and does not change these denominators.

English/Spanish public route availability is not complete Spanish SaaS support. Protected SOC, Agent Registry, Authority Graph, Evidence Vault, billing/onboarding, validation/errors and notification/email templates still lack a reviewed complete locale catalogue and corresponding authenticated end-to-end proof. English-only account/demo/download fallbacks remain explicit. A public `/es/pricing` or explanatory `/es/verification-replay` page does not translate protected billing or Replay tools.

Public French, German, Portuguese, Italian, Arabic and Chinese each have **0/45** public equivalents. They remain disabled and marked unavailable; they are not supported-language claims. Limited French supplier-configuration labels in other branches do not establish a French public site or product. The selector now additionally explains that some publication notices remain under review. Explicit locale URLs are preserved; no location-forced locale change was introduced.

## Validation and qualification boundary

Tests: `tests/river-loop-simulation.test.mjs` (final-slot race, separately observed effects, 240 rejected further requests, idempotent replay, UNKNOWN/reconciliation, stop/recovery, tamper detection); `tests/execution03-publication-status.test.mjs`; inherited public-i18n, Spanish generation and signed-fixture contracts. Built-site browser proof: `tools/watchtowers/verify-loop-browser.mjs`, restricted to an unbound localhost origin. It exercises both languages at 390px/1440px, keyboard and touch targets, positive/negative effects, Replay hashes, emergency stop and UNKNOWN reconciliation while rejecting demo API writes. Screenshots and machine-readable results go in `artifacts/execution03-website/`.

The initial focused run on the temporary shared dependency junction passed **21/21**. This is preliminary evidence; final locked-install, typecheck/build and built-route browser outcomes must be appended at the immutable website candidate SHA before release conclusions. Full protected Auth, consent persistence, positive Turnstile, hosted provider/model execution, commercial billing and Production security remain separately unqualified.

Release verdict: a reviewable **local illustrative website demonstration**, not an operational SOC release or complete multilingual product. Full publication and hosted release remain **NO-GO** pending the explicit content, protected-flow and hosted verification gaps above.
