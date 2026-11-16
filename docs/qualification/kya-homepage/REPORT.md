# Cyber Sentinels KYA homepage integration

Verdict: **IN PROGRESS — final verification pending**. The authoritative English copy and Spanish translation are implemented. **ASSET MISSING:** the original KYA PNG is unavailable; the accessible conceptual text flow is the explicitly authorized fallback. This supersedes the earlier provisional-copy checkpoint.

## Exact source and scope

- Branch: `feat/kya-homepage-20261116`.
- Worktree: `tmp/kya-homepage`.
- Approved-copy application source: `4dd241f779c6e6a7927bb3a2ae4bea6f5b3d8241`.
- Browser checker: `c10d1e454bb33c1c54ada41aa35e78ae07adcd48`; application source unchanged.
- Original website base: `baf5ac8e282abec127eda44ba1e1820b6b03db42`.

No database schema, migration, financial execution control, protected authorization, Production environment or unrelated security source was changed. No push, merge, PR closure or deployment occurred. Production remains NO-GO; local website completion is not a Production release decision.

## Content and design

The user's authoritative English source is preserved in APPROVED-COPY.md and rendered in components/kya-homepage-section.tsx, alongside its Spanish translation. It includes the section brand/subtitle, complete main headline and four supporting paragraphs, all five capability labels/descriptions, three key statements, closing line and both requested CTA labels.

The five capability descriptions are visibly marked as a development direction. The section also displays an “In development” / “En desarrollo” badge and a clear development/Production-certification boundary. The approved “KYA verifies the agent” positioning is presented within that developing-capability context, not as completed hosted verification or certification.

The accessible ordered flow follows the supplied model:

AI Agent Requests Action → KYA Identity + Delegated Authority → TENENTE™ Authority Decision → ALLOW / REVIEW / DENY → Evidence & Replay.

Spanish retains ALLOW / REVIEW / DENY and the TENENTE™/KYA brands while translating the surrounding explanations. The layout uses the existing dark/cyan styling, typography, button classes, content width and responsive grid. Existing hero, authority example, evidence narrative, public translations and TENENTE content remain intact. No duplicate Agent Registry, Authority Graph, identity database or protected product was introduced.

## Original PNG availability

**ASSET MISSING.** Searches of repository public assets, available attachments, tracked PNG names and KYA-named workspace files did not identify the original KYA PNG. The unrelated public/cyber-sentinels-hero.png was inspected and remains unchanged. ASSET-STATUS.json records its hash and the search boundary.

No original filename was invented, no broken image reference was added, and no replacement raster was silently presented as the original. The user explicitly authorized continuing with accessible text when the image is absent; therefore this asset note does not by itself block completion of the requested integration.

## Working CTAs and navigation

| Control | English destination | Spanish destination |
|---|---|---|
| Public KYA navigation | /#know-your-agent | /es#know-your-agent |
| Explore KYA / Explorar KYA | /#kya-capabilities | /es#kya-capabilities |
| Explore Agent Authority / Explorar la autoridad de los agentes | /platform#agent-authority | /es/platform#agent-authority |

The primary CTA explores the five KYA capability details on the same homepage. The secondary opens the existing agent-authority section. No placeholder route, submitted lead form or implied operational KYA service is involved. The public header and both language label arrays remain aligned; protected/admin navigation is unchanged.

## Homepage/PR audit and SEO

The existing website stack is preserved: #133 at 13a3485bb8a6ec8af720ec579bcf6b357003dec6, #136 at 582acc889afbe59991ea307bc5e4a2b986b11c0e, #141 at f0b0f3258124212b5f0bda96ecdccef4fb0dd803 and #143 at 9b58683a63ce71b7f6d48936dfd71f90f52b15c3. Read-only metadata is retained in PR-AUDIT.json. No remote actions were taken and no old remote workflow result qualifies this local source.

English `/` and Spanish `/es` continue to share the existing request-locale/page ownership. Titles preserve Operational Trust Intelligence branding and include KYA. Descriptions explicitly identify KYA as developing. Existing metadata helpers provide canonical URLs, reciprocal language alternatives and locale-correct Open Graph values; no certification/rating schema was added.

## Changed files

| File | Purpose |
|---|---|
| app/page.tsx | Single KYA section integration and bilingual metadata |
| components/kya-homepage-section.tsx | Authoritative EN copy, Spanish translation, five capabilities, key/closing statements, accessible flow and CTAs |
| components/public-language-selector.tsx | EN/ES KYA navigation label |
| lib/navigation/canonical-navigation.ts | Public KYA homepage anchor |
| package.json | Include KYA regression in existing test:public-surface; no dependency/lockfile changes |
| tests/kya-homepage.test.mjs | Actual rendered EN/ES copy, destinations and metadata |
| tests/public-surface-navigation.test.mjs | Expected intentional KYA navigation addition |
| tools/kya-homepage-browser.mjs | Actual Next desktop/mobile, keyboard, axe, SEO and screenshot checks |
| docs/qualification/kya-homepage/* | Approved source, audit, asset status, logs and hash manifest |
| artifacts/kya-homepage/* | Local browser/a11y results and screenshots |
| .gitattributes | Preserve evidence bytes and checksums |

## Verification and limits

Current approved-copy checks:

- Focused homepage/navigation/positioning/EN-ES tests: 33/33 PASS, zero skips.
- Uncached typecheck: PASS, exit 0.
- Full lint: PASS, exit 0.
- Final production build: PASS, exit 0; 212 static pages.
- Actual local production Next browser cases: 4/4 PASS (EN/ES, 390/1440 pixels); both CTAs activated by keyboard Enter, expected targets reached, correct language/canonical/hreflang/title, zero overflow and zero page errors.
- Axe accessibility: zero violations and zero incomplete checks in all eight scope/viewport/language scans. The KYA section passed 14 applicable rules and the header passed 13 in each case. Expanded mobile navigation was included.
- Final screenshots: four section and four full-page captures saved; English desktop and Spanish mobile section captures visually inspected. No notice obstruction.
- Preview server stopped after testing.

Tests use this website's exact npm-ci lockfile dependencies. No heap override, weakened scanner rules or source exclusion was added. The earlier provisional-copy tests/logs remain historical; they are not substituted for the approved-copy checks. Suites overlap and counts must not be added as unique tests.

Browser checks cover the actual local production Next site, not a component mock: EN/ES at 390 and 1440 pixels, navigation anchors, keyboard Enter on both CTAs, target content, canonical/hreflang/title, overflow and page errors. Axe runs WCAG 2 A/AA, 2.1 A/AA and 2.2 AA tagged rules on the KYA section and public header, including the expanded mobile menu. Automated checks are bounded evidence, not complete WCAG certification; incomplete results require review. API reference: https://github.com/dequelabs/axe-core/blob/develop/doc/API.md.

The inherited local consent receipt notice is dismissed using its actual “Dismiss saved preferences notification” button before clean screenshots. Consent code/behavior is unchanged. An earlier obscured screenshot is retained as historical evidence; clean final captures are separate from any claim about consent persistence. No hosted credentials/env files are configured in this worktree, no hosted SQL was run, and no lead form was submitted.

The owned preview server was stopped after verification. Original PNG remains the only known asset gap. Further publication, push, merge or Production action requires separate approval.
