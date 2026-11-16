# Original KYA PNG and integration review

Application/checker source: `abe4ae920f787ddab81144e2fe5331dc3eebf55f`.
Original accepted checkpoint `2e2c44d1850b6287762842c81a7554885047e3fc` remains an ancestor; no rewrite or reset occurred.

## Asset and presentation

The user's supplied `KYA™ — AI Agent Trust Flow.png` is copied byte-for-byte to `public/kya-ai-agent-trust-flow.png`. SHA256: `abdace2668833639f32dbf4331928a737ff93c655172280b9a5ba0826b2fe7e8`. Dimensions: 1254 × 1254. No graphic, colour, wording or branding was edited, regenerated or redesigned.

The shared KYA section uses Next Image with intrinsic dimensions, responsive sizes, full width, auto height and object-contain. The diagram occupies its own wide row rather than the narrow text-flow column. Both locales use the same English graphic. Alt text and captions are translated; the approved six-stage accessible text flow, development boundary, narrative, capability descriptions and CTAs remain intact. An explicit full-size original link allows mobile users to zoom into the diagram's English labels. The graphic's financial examples remain conceptual; they do not qualify financial enforcement or treasury execution.

## Integration overlap

Read-only GitHub audit confirms #141 head `f0b0f3258124212b5f0bda96ecdccef4fb0dd803` and #143 head `9b58683a63ce71b7f6d48936dfd71f90f52b15c3`. #143 is an ancestor of this feature branch. Its only delta over #141 is `docs/I18N_FOUNDATION.md`, preserved unchanged by KYA. River simulations and generated translation catalogues are not rewritten. The KYA delta extends locale route ownership and the public navigation label list; it excludes the manually bilingual KYA page from generated translation batches. See PR-OVERLAP-CURRENT.json for raw metadata/status results.

`/platform/kya` and `/es/platform/kya` are real implemented pages in this branch, introduced before the PNG continuation. They have locale-aware copy, canonical/hreflang/social metadata, sitemap entries and shared section ownership. These are local application pages, not proof of publication at the public domain.

The clean integration PR is prepared in INTEGRATION-PR.md, stacked against #143's `codex/integrated-website-20261112` branch. No remote PR was created: the latest instruction prohibits pushing without approval. No PR number or new-head CI result is invented.

## Qualification

- Public-surface tests: 18/18 PASS, zero skips.
- Focused rendering, positioning, route, localization and navigation tests: 36/36 PASS, zero skips; overlap with public-surface tests.
- Uncached typecheck: PASS.
- Full lint and browser-checker lint: PASS.
- Scoped secret scan of the PNG source commit: PASS, no leaks; existing rules unchanged. This does not replace full-history remote CI.
- Production build: PASS, exit 0, 213 generated pages.
- Built-site browser: 8/8 PASS (EN/ES, homepage/landing, 390/1440 widths); zero page errors.
- Image checks: responsive square geometry 358 x 358 on mobile and 1024 x 1024 on desktop, object-contain, decoded pixels, descriptive localized alt, full-size link and byte-identical HTTP-served original. All diagram labels remain within the image bounds. Mobile readers can use the full-size link to zoom.
- Accessibility: 16 scoped axe scans, zero violations. Eight raw incomplete contrast results cover 40 decorative arrows, manually resolved at minimum 13.92:1. Zero unresolved results; this is scoped testing, not full WCAG certification.
- Five repeated Spanish mobile authority-link keyboard navigations: PASS. All existing CTA destinations verified; no enquiry submitted.
- Updated desktop/mobile screenshots visually reviewed: en-1440-landing-section.png, es-390-landing-section.png and en-390-diagram.png. Normal consent controls used; no UI hidden for screenshots.

## CTA destinations

| Control | English | Spanish |
|---|---|---|
| Homepage Explore KYA / public KYA navigation | /platform/kya | /es/platform/kya |
| Request a KYA Pilot | /enterprise-access?intent=pilot | /es/enterprise-access?intent=pilot |
| Explore Agent Authority | /platform#agent-authority | /es/platform#agent-authority |
| Full-size original diagram | /kya-ai-agent-trust-flow.png | /kya-ai-agent-trust-flow.png |

## Separate release decisions

Local KYA integration: COMPLETE and qualified against the existing website candidate ancestry. Publication: HOLD for integration review, approval and exact-head remote CI. PR #141's four returned Actions runs passed; #143's CodeQL, public qualification and verification runs passed, but its redacted-secret-scan run 43479377809 failed. Subsequent inherited metadata corrections are preserved locally; no new-head remote scan is claimed. Vercel success statuses on those existing heads are not a deployment or CI result for this unpublished PNG change.

Production: NO-GO. Hosted recovery remains RESTORE NOT PROVEN; Staging migration HOLD and hosted enforcement qualification remain separate unresolved gates. No hosted SQL, financial controls, Auth/consent persistence, treasury, deployment or Production environment was changed by this task. KYA identity/financial enforcement and treasury work remain separate from the homepage publication decision.
