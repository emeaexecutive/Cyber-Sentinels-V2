# KYA homepage integration — P1 review

Status: **PARTIAL**. The focused website implementation is present. The separate referenced directive/approved copy and original KYA PNG were not available in the visible messages or discovered attachments; final copy/asset matching cannot be asserted. No deployment is authorized by this report.

## Isolated source and audit

Branch: `feat/kya-homepage-20261116`. Worktree: `tmp/kya-homepage`. Feature source commit: `3e3d3e903f84c7a1759a431e592b5099861a0321`. Browser-checker commit: `ab0088745f0352de575178db099470e571c6a4be` (application source unchanged). Base: `baf5ac8e282abec127eda44ba1e1820b6b03db42`, the existing bilingual website candidate. No core/security/account or treasury implementation was cherry-picked into this branch.

The homepage already owns English `/` and Spanish `/es` through the request-locale infrastructure and shared page export. Its existing hero, authority decision example, V2 evidence narrative, TENENTE section and product clarity remain. Public navigation uses one shared link array and aligned EN/ES labels for desktop and mobile. The new KYA link uses the existing locale URL mapper.

Read-only PR inspection confirms the overlapping website stack: #133 (`13a3485bb8a6ec8af720ec579bcf6b357003dec6`), #136 (`582acc889afbe59991ea307bc5e4a2b986b11c0e`), #141 (`f0b0f3258124212b5f0bda96ecdccef4fb0dd803`) and #143 (`9b58683a63ce71b7f6d48936dfd71f90f52b15c3`). All remain open/mergeable in returned metadata. This task preserves that stack rather than recreating its translations or watchtower simulations. Raw exact-head/base records are in PR-AUDIT.json. Existing remote CI results do not qualify this unpublished feature source.

Asset search covered attachments and repository public assets, plus KYA-named files in the workspace. The existing `public/cyber-sentinels-hero.png` was visually inspected: it is a general identity/security illustration, not an identified original KYA PNG. It was not replaced or misrepresented. The new visual is accessible HTML/CSS, explicitly labelled conceptual and not a live agent record. No original raster image is claimed.

## Actual implementation

| File | Change |
|---|---|
| app/page.tsx | One KYA section insertion and bilingual SEO title/description; existing category branding and canonical/hreflang behavior retained |
| components/kya-homepage-section.tsx | EN/ES development status, bounded positioning, responsive conceptual visual and two real CTAs |
| lib/navigation/canonical-navigation.ts | One public homepage KYA anchor; protected/admin navigation unchanged |
| components/public-language-selector.tsx | Aligned KYA label in both navigation label arrays |
| tests/kya-homepage.test.mjs | Actual server-rendered EN/ES content, conceptual status, destinations and metadata |
| tests/public-surface-navigation.test.mjs | Updated expected public link set for the intentional KYA addition |
| package.json | New regression included in the existing test:public-surface command; dependencies/lockfile unchanged |
| tools/kya-homepage-browser.mjs | Actual local Next desktop/mobile and bilingual CTA/SEO verification, with screenshots |

KYA is presented as **in development**. Identity does not grant authority. The section describes integration with existing identity/authority controls, not a new Agent Registry, Authority Graph, TENENTE implementation or duplicate identity database. No Production certification, universal trust, financial execution readiness, partner endorsement or autonomous-execution guarantee is claimed. Copy is grounded in the current Execution 06 implementation evidence; it is not represented as the missing separately approved wording.

## CTA and navigation destinations

| Action | English | Spanish |
|---|---|---|
| Public KYA navigation | /#know-your-agent | /es#know-your-agent |
| Discuss KYA / Hablemos de KYA | /enterprise-access?intent=demo | /es/enterprise-access?intent=demo |
| Explore agent authority | /platform#agent-authority | /es/platform#agent-authority |

The demo CTA reaches the existing enterprise-access form; it does not imply a dedicated KYA service or submit a request automatically. The secondary CTA reaches the existing agent-authority section in both locales. No placeholder route or new protected workflow was introduced.

SEO uses the existing metadata helper, correct locale-specific description, reciprocal English/Spanish alternates and canonical ownership. The English title preserves Operational Trust Intelligence™ and adds KYA. Descriptions explicitly state that KYA is developing. No unsupported certification schema or rating was added.

## Verification

- Installed this website's exact package-lock dependencies with npm ci. The core branch's node_modules was deliberately not reused because its lockfile differs. No dependency or lockfile change is part of the feature.
- Uncached typecheck: PASS, exit 0.
- Full ESLint: exit 0; one unused React import in the new test was then removed. Follow-up changed-file ESLint: PASS, zero warnings/errors.
- Focused homepage/navigation/positioning/EN-ES suite: 33/33 PASS, zero skips.
- Existing test:public-surface command with the new regression wired in: 16/16 PASS, zero skips. Suites overlap; do not add their counts as unique tests.
- Initial focused test failure exposed removal of the existing category trademark from the SEO title. Branding was restored and the full focused set rerun successfully; failed log retained.
- Feature-range secret scan: zero findings, unchanged scanner rules.
- Production build: PASS, exit 0; 212 static pages. No heap override or source exclusions added.
- Actual local production Next site at 127.0.0.1:3137: four EN/ES x 390/1440 viewport cases PASS, zero page errors and no horizontal overflow. Real header anchor and both CTA destinations were exercised; no form was submitted. Canonical/hreflang/title checks passed. Local preview server stopped after verification.
- Screenshot review: English desktop section and full page, Spanish mobile section visually inspected. Four full-page and four section captures retained.
- A first browser assertion compared two equivalent root canonical URL spellings literally; comparison now normalizes URLs. The failed log is retained.
- Local unbound consent receipt persistence was rejected, producing an inherited English notice on Spanish UI. The notice was dismissed through its actual button for clean screenshots; an obscured capture is retained too. This is not consent persistence qualification.
- Runtime credential-variable-name inventory was empty for Supabase/database/Stripe/OpenAI, with no .env or .env.local files. No hosted SQL or credential changes occurred.

Browser scope is local rendering/navigation only. No hosted Auth, database, provider, financial execution or form submission is qualified. Existing upstream English-only account/consent surfaces are not made bilingual by this focused section.

## Boundaries and remaining issues

No schema, migration, financial execution control, protected authorization, Production environment or unrelated security file changed. No remote push, PR merge/closure or deployment occurred. Production remains NO-GO independently of this website work.

Remaining input: locate the original KYA PNG and provide/identify the separate approved directive/copy. The current native conceptual visual and evidence-bounded EN/ES copy are reviewable provisional implementation, not proof that those missing inputs were followed exactly. Preserve existing website PR provenance when proposing a later reviewed integration.

## Resume checkpoint

The previously review-blocked account-copy commit was saved separately as 54e5782e3a5b53ac45bc5dfe0d546f446c5a2e35 after normal approval review resumed. That account work is not part of this website branch. Staging migration remains HOLD and Production NO-GO.
