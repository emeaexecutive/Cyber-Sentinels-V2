# Website design and UX cleanup — 2 November 2026

Base candidate: `4922c579d4438628f2ebae02c8a3c808ba37f3a3`. Final commit: see post-commit `RELEASE-CANDIDATE.json`.

Local preview: http://127.0.0.1:4322/pricing. Investor walkthrough remains http://127.0.0.1:4322/investor. Founder services and worktree on 4318/4320 are unchanged.

## Pages and changes

The exact discovered routes and query variants are in [REVIEWED-PAGES.md](REVIEWED-PAGES.md), `route-inventory.json` and the fresh `before/pages.json` / `after/pages.json`. All public pages receive the shared navigation, footer, focus, reading-width and spacing changes. Authenticated workspaces do not receive the public presentation scope. No new marketing route was invented.

Page-specific and shared improvements:

- `/pricing`: one shared PricingCard, four equal desktop cards, equal 64px white CTAs at the bottom, smaller consistent offer text, fewer dividers, restrained Pilot Access emphasis. Original offers, feature limits, eligibility and enquiry intents remain intact. No new prices or subscription/checkout claims.
- `/`, `/solutions`, `/about` (including `/about-us` redirect): remove repeated supporting copy/badges; reduce competing About actions while keeping additional engagement actions in disclosure.
- All ExecutiveSummary consumers, including Platform, Solutions, Developers, Enterprise, Trust, Governance, Documents and public investor material: remove repeated summary labels and decorative outer box; preserve all technical bullets under “At a glance”; demote secondary actions to readable links.
- Public adoption rail: retain audience/problem/differentiation content under “Is this right for your team?”; retain enquiry destinations with one dominant button.
- Shared legal/security/company template: clear reading layout instead of a wall of boxes. All legal sections, review warnings, responsible-disclosure anchor and links remain.
- Developer quickstart and public Replay scenario pages: fix grid intrinsic-width overflow. API-reference endpoint labels wrap within the viewport. Code remains scrollable and unchanged. Evidence and security identifiers remain unchanged.
- `/help`: fix a proven local render failure when Supabase is absent by rendering static public guidance independently. Account-backed reads remain unavailable and are labelled accurately; question submission still requires Auth. Configured infrastructure failures still throw. Replace nonfunctional video placeholder with existing demo/docs links; collapse FAQ answers.
- Public footer: retain all seven labelled navigation groups in a readable four-column desktop grid.

## Language selector and honest coverage

The final control follows Sign In in the shared desktop header and at the end of mobile navigation. It has a globe, language indicator, labelled buttons, current-selection state, arrow/Home/End navigation, Escape/focus return, outside-click and focus-leave dismissal. Selection closes the dropdown and persists across route changes and refresh, subject to browser storage availability.

English, Spanish, French, German, Portuguese, Italian, Arabic and Chinese **navigation labels** are implemented and exercised. The selector and non-English state explicitly say page content is English. Full translated product/legal/resource pages are not published. English document metadata and canonical URLs remain unchanged; no false hreflang is advertised. Arabic labels/options use `lang="ar"` and `dir="rtl"`; English content stays LTR. No DOM-wide machine translation, external translation service, API example/payload, security identifier or immutable evidence is changed. Full-site localisation and native-language editorial review remain separate work.

## Screenshot evidence and interactions

- [Desktop pricing cards](proof/pricing-cards-desktop.png): all four bottom-aligned CTAs.
- [Desktop header](proof/header-desktop.png): Platform → Solutions → Developers → Enterprise → Pricing → Sign In → Translate.
- [Mobile language selector](proof/language-mobile.png).
- [Arabic navigation](proof/arabic-navigation.png).
- Pricing viewport proofs: [1440](proof/pricing-1440.png), [1024](proof/pricing-1024.png), [768](proof/pricing-768.png), [390](proof/pricing-390.png).
- Fresh before/after captures and route/link results are stored in the matching folders. Desktop review sheets and their cell-to-route index record visual review beyond the main landing pages.

`interactions.json` records measured card/CTA geometry, all eight selections, automatic closing, persistence, keyboard dismissal/navigation, mobile menu, enquiry destinations, required-field validity and progressive disclosure. Missing local CAPTCHA/delivery configuration remains fail-closed; no live enquiry/email was sent. A local consent-receipt rejection notification was observed after rejecting optional cookies; it was dismissed using its existing Dismiss control for clean proof screenshots, not hidden or removed from the product.

## Verification and limits

Final results are recorded in `verification-summary.json`, `build-result.json`, `interactions.json`, `accessibility.json` and `after/link-results.json`. Automated axe A/AA checks do not certify full accessibility compliance. Keyboard, labels, selected state and responsive geometry are exercised separately. Existing protected destinations are reported separately from broken public links. Sign-in and enquiry provider configuration are not bypassed.

The attachment referenced a founder pricing screenshot but supplied text only; current local pricing was captured before editing and used as the visible defect baseline. No claim is made that an unavailable screenshot was inspected.

No provisioned infrastructure, subscription change, spending, deployment, migration, DNS edit, Git push or merge. The investor HTTPS and Production release decisions remain NO-GO. Historical hosted 500 investigation remains OPEN. Vercel commercial Hobby eligibility remains unresolved. A separate exact-SHA deployment approval, eligible hosting/budget, isolated Auth/database/runtime qualification and rollback acceptance are required before any hosted release.

## Final journey results

1. Pricing — PASS: all four desktop card heights and CTA baselines align; all CTAs are 64px high. Verified at 1440, 1024, 768 and 390 pixels.
2. Header and language — PASS within stated navigation-only coverage: correct order, all eight selections, close-on-selection, persistence, keyboard and mobile menu.
3. Public page and navigation review — 150 URLs, 107 public responses across 92 paths (including aliases); zero public link failures, public render-error pages or horizontal overflow. Raw link checks retain 26 unavailable protected assertions; source-based classification does not turn them into successful authenticated journeys.
4. Enquiry — LIMITED: destinations/forms and required-field validation pass; local CAPTCHA/delivery remain unconfigured. No message was sent.
5. Accessibility — zero axe A/AA violations on 12 principal pages; keyboard and responsive interactions pass. This is not a complete WCAG certification.
6. Build and regression — PASS: final build exit 0 (210 static pages), 73/73 targeted tests, changed TSX lint without warnings/errors, 16 browser interaction checks. The old footer test assertion for seven physical columns was removed; all seven navigation groups/labels remain asserted.

## Remaining local limitations

- Three existing authenticated-entry pages show a generic render error without Supabase: `/access-pending`, `/demo/trust-runtime`, `/world-id-preview`. Their source explicitly requires an authenticated user; no bypass or fake data was added. They are not public marketing-page passes.
- `/demo/track-block-candidate-alice` and `/supplier-sign-in` intentionally return not-found outside their permitted demo environments. Both guards remain intact; the founder supplier service remains on 4318.
- Full product/legal localisation is not published. Only navigation labels are translated.
- CAPTCHA, consent-receipt delivery and account/provider operations require configured, qualified backends. Local UI checks do not prove hosted delivery.
