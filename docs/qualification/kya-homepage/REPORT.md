# KYA homepage and landing-page integration

Verdict: **COMPLETE locally; publication HOLD**. Original PNG integrated unchanged in both locales. See PNG-INTEGRATION.md for the current source, asset, eight-case browser qualification and integration PR status.

## Source and boundaries

- Branch: `feat/kya-homepage-20261116`.
- Worktree: `tmp/kya-homepage`.
- Pre-PNG qualified source: `39eacb144753348d0e0e1e91df083bbf289b1d7f`.
- Original-PNG application source: `abe4ae920f787ddab81144e2fe5331dc3eebf55f`; latest evidence in PNG-INTEGRATION.md.
- Previous homepage checkpoint: `2e2c44d1850b6287762842c81a7554885047e3fc`.
- Original bilingual website base: `baf5ac8e282abec127eda44ba1e1820b6b03db42`.

No database, financial execution control, protected-route policy, consent submission behavior or Production environment was changed. No push, merge, PR closure, enquiry submission or deployment occurred. Production remains NO-GO independently of this local website work.

## Approved content and asset audit

APPROVED-COPY.md records the authoritative narrative, five capability descriptions, key statements and closing. LANDING-VISUAL-SPEC.md records the user's latest visual specification and landing continuation. The latter supersedes the earlier combined identity/authority visual. No separate additional landing-brief file was found; the supplied approved narrative and visual specification form the implemented brief.

The shared text visual displays:

CYBER SENTINELS KYA™

Your AI Agent Has an Identity. But Does It Have Authority?

IDENTIFY · VERIFY · AUTHORISE · ENFORCE · PROVE

AI Agent Requests Action → KYA Identity — Who is acting? → Delegated Authority — Who authorised it? → TENENTE™ Authority Decision — Is this action permitted now? → ALLOW / REVIEW / DENY → Evidence & Replay.

The six stages are an ordered list; the five downward arrows are decorative and hidden from assistive technology. Spanish translates the question, prompts and narrative while retaining KYA, TENENTE™, Replay and ALLOW / REVIEW / DENY as names/protocol outcomes.

The original PNG was initially unavailable. The user subsequently supplied the approved graphic, now integrated byte-for-byte in both locales with Next Image, descriptive alt text and a full-size zoom link. The accessible translated text flow remains. ASSET-STATUS.json and PNG-INTEGRATION.md record the current asset hash and status. QA screenshots are evidence, not replacement product image assets.

## Routes, content and working CTAs

| Surface/control | English | Spanish |
|---|---|---|
| Homepage | / | /es |
| KYA landing page | /platform/kya | /es/platform/kya |
| Public KYA navigation | /platform/kya | /es/platform/kya |
| Homepage Explore KYA | /platform/kya | /es/platform/kya |
| Landing Request a KYA Pilot | /enterprise-access?intent=pilot | /es/enterprise-access?intent=pilot |
| Explore Agent Authority | /platform#agent-authority | /es/platform#agent-authority |

The pilot CTA reuses the existing enquiry page's actual supported pilot intent, opening its Start Pilot / Iniciar un piloto form. No new contact endpoint, mail-sending action, hidden lead submission or implied operational service was introduced. The request remains an enquiry about a developing capability.

The homepage preserves its existing H1 and KYA H2. The landing page has one H1 using the approved identity/authority question and shares the previously approved copy and capability details through one component. Development badges, capability-direction labels and a Production-certification boundary remain visible. No duplicate Agent Registry, Authority Graph, TENENTE control plane or identity database was built.

Existing dark/cyan branding, layout width, button classes, typography and responsive grids are reused. The original homepage hero, V2 evidence narrative, public translations and authority content remain intact.

## Localization, SEO and PR overlap

The new route has real EN/ES ownership, dedicated titles/descriptions, reciprocal hreflang, locale-correct Open Graph metadata and canonical URLs. It is registered in the existing public route manifest and sitemap. There are now 46 canonical public source routes and 92 EN/ES sitemap entries; the unchanged publication-notice limitations elsewhere still apply. The manually bilingual KYA owner is excluded from generated translation batches, like the existing manual Platform owner; old translation IDs and files are preserved.

Existing website PR overlap is preserved in PR-AUDIT.json: #133, #136, #141 and #143. No remote actions were taken and previous remote checks are not presented as qualification of this unpublished source.

## Exact changed source files in this continuation

| File | Change |
|---|---|
| app/platform/kya/page.tsx | Dedicated locale-aware landing page and metadata |
| app/es/platform/kya/page.tsx | Real Spanish route ownership |
| components/kya-homepage-section.tsx | Shared home/landing modes, approved six-stage visual, translated prompts and pilot CTA |
| lib/i18n/public-locales.ts | Published EN/ES route mapping |
| lib/navigation/canonical-navigation.ts | KYA navigation targets the landing page |
| lib/navigation/route-visibility.ts | Public/indexable landing-route registration only; protected policies unchanged |
| tools/i18n/public-catalog.mjs | Register the shared bilingual owner outside generated batches |
| tests/kya-homepage.test.mjs | Home/landing rendering, exact visual, six stages, CTAs and metadata in both locales |
| tests/public-i18n.test.mjs | New landing sitemap entry/count |
| tests/public-surface-navigation.test.mjs | Intentional KYA landing navigation destination |
| tests/spanish-public-completion.test.mjs | Validate all 46 real Spanish route owners |
| tools/kya-homepage-browser.mjs | Eight route/language/viewport cases, keyboard CTAs, language switch, axe and screenshots |

Qualification documents, logs, hash manifests and artifacts are updated separately. Earlier homepage integration files remain in the feature branch; no unrelated security work was imported.

## Verification

- Focused rendering/navigation/positioning/localization/route tests: 36/36 PASS, zero skips.
- Existing test:public-surface command: 18/18 PASS, zero skips. Suites overlap; counts are not unique totals.
- Uncached typecheck: PASS, exit 0.
- Full lint: PASS, exit 0.
- Final production build: PASS, exit 0; 213 generated pages.
- Actual-site browser: 8/8 PASS across EN/ES, homepage/landing and 390/1440 widths; zero page errors.
- Five repeated Spanish mobile authority-fragment keyboard activations: PASS.
- Accessibility: 16 scoped axe scans, zero violations. Eight raw incomplete contrast results cover 40 decorative arrows; all manually resolved at minimum 13.92:1, zero unresolved.
- Screenshot capture uses document coordinates from scroll position zero, avoiding sticky-header overlap without changing UI behavior. Desktop and mobile captures were visually reviewed.

The browser checker covers actual production Next rendering at local loopback, not a component mock. It verifies both homepage and landing page in EN/ES at 390/1440 widths, correct headings, six flow stages, five capabilities, canonical/hreflang/title/description, no overflow, landing navigation, keyboard Enter on every CTA, real pilot form destinations and landing language switching. No enquiry is submitted.

Axe checks WCAG 2 A/AA, 2.1 A/AA and 2.2 AA tagged rules on KYA and the public header, including expanded mobile navigation. Automated results are scoped evidence, not complete WCAG certification. Reference: https://github.com/dequelabs/axe-core/blob/develop/doc/API.md.

The existing consent receipt notice is dismissed through its normal button before screenshots. Consent behavior is unchanged; local receipt persistence is not qualified. The earlier obscured provisional screenshot is retained under history/. No hosted credentials or env files are configured for this preview. The owned server is stopped after verification.

The former PNG asset limitation is resolved by the supplied original; the accessible text flow is retained. Publication and Production actions remain outside this task.

## Navigation and contrast findings retained

An initial Spanish mobile keyboard check intermittently stayed on the landing page when activating the client-routed authority fragment link. The destination itself returned HTTP 200. The secondary CTA now uses a native anchor to that existing locale-specific page/fragment, preserving full-document navigation. Failed browser logs, URL diagnostics and screenshot remain in the evidence; a five-repeat Spanish mobile regression is included in the final checker. No rule or target assertion was removed.

Axe cannot automatically measure the decorative downward arrow glyphs. Raw color-contrast incomplete findings are retained. The checker only accepts this explicit glyph profile, verifies opaque rendered foreground/background colors, computes their relative luminance/contrast and requires at least 4.5:1. Any other incomplete result, unsupported composition or insufficient ratio still fails. The final results distinguish these manual reviews from automated passes; no axe rule is disabled.
