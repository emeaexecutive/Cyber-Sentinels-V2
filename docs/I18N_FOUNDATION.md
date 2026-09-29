# Public internationalization foundation

Reviewed 28 September 2026 for the PR #109 release. **English remains the source
language and the only published locale. Spanish is the first planned translation;
no Spanish page is published by this change.** No translation service, dependency,
environment variable, locale cookie or automatic redirect is introduced.

## Readiness audit

| Area | Current evidence | Release treatment |
| --- | --- | --- |
| Framework | Next.js 15.5.25 App Router; unprefixed routes | Preserve existing URLs; no global `[lang]` migration |
| Document language | `app/layout.tsx` emits `lang="en"` | Preserve the English shell during auth fixes |
| Shared interface | Navigation, footer, consent and adoption content use English | Translate public shared content before publishing Spanish pages |
| Public discovery | 42 explicit canonical routes in `lib/navigation/route-visibility.ts` | Preserve the allowlist and sitemap |
| Search resources | Three articles share `lib/search/resources.ts`; a separate hub links them | Reusable first content batch for a later translation pass |
| Metadata | English title/description, `en_GB` OpenGraph locale and `en` structured data | Preserve current values; centralize source-locale metadata |
| Language alternatives | No translated route equivalents exist | Emit no Spanish hreflang or fictional language switch |
| Authenticated values | API names, scopes, decisions, audit records and examples carry technical meaning | Exclude them from automatic translation |

A full Spanish release would need coordinated public-shell, content and document
language changes. Moving every current route under a locale segment would also
touch auth callbacks and protected routing. That is outside this minimal
foundation and would enlarge the password-recovery release unnecessarily.

## Implemented boundary

`lib/i18n/public-locales.ts` defines the source locale (`en`), the initial locale
registry (`en`, `es`) and a deliberately empty registry of published Spanish
equivalents. `es` has `contentStatus: PENDING`; `/es` is a planned prefix, not a
route or a live feature claim.

`getPublishedPublicEquivalents(sourcePath)` accepts an exact existing canonical
public path. It returns only published equivalents. It does not strip locale
prefixes, normalize arbitrary paths, translate slugs, copy query strings or treat
private/authentication/API paths as public content. An unknown path yields no
equivalents.

`publicPageAlternates(sourcePath, locale)` supplies Next.js metadata for a
published equivalent. It keeps the selected page's self-canonical and emits
reciprocal language alternatives only when real equivalents have been registered.
Requesting an unpublished or unsupported locale throws instead of presenting
English content as Spanish. The resource hub and three article pages use this
helper today with their unchanged English canonicals. Shared social metadata and
WebSite structured data use the source-locale registry.

The registry is a publication record, not an authorization mechanism or a
translation engine. Any future entry must be reviewed alongside the real route,
translated content, metadata, document language and discovery allowlist.

## Next Spanish content pass

1. Keep existing English URLs, including `/resources/agent-security`, unchanged.
   Use explicit `/es/...` public routes for reviewed Spanish equivalents. Start
   with the hub and its three articles; translate their actual headings, answers,
   prose, navigation labels, source explanations, title and description together.
   A partially translated heading is not a published equivalent.
2. Give Spanish pages an appropriate server-rendered document language and a
   translated public shell. Review the Next.js layout boundary before publishing;
   do not change `document.lang` after hydration or use browser translation as the
   application architecture. Preserve authentication/recovery routing and guards.
3. Preserve `ALLOW`, `REVIEW`, `DENY`, API field names, action enums, scope strings,
   code examples, product names and technically precise terms such as MCP. Human
   explanations may be translated; persisted evidence and security decisions may
   not be rewritten by a language layer.
4. Register each real equivalent, then add its explicit public route to the
   canonical/indexing allowlist and sitemap. English pages remain self-canonical;
   Spanish pages become self-canonical at their own `/es/...` URL. Use the same
   `en`/`es` alternative set on both pages, including each page itself. Do not
   canonicalize Spanish pages back to English. Do not list pending translations.
5. Add an explicit language selector that links only to published equivalents.
   Keep the visitor's URL choice stable. Do not force redirects based on
   `Accept-Language`, IP, browser locale or an inferred account preference, and do
   not redirect login, recovery links or API requests for localization.
6. Verify translated server HTML, document language, titles/descriptions,
   OpenGraph locale, structured-data language, reciprocal hreflang, self-canonicals,
   sitemap entries, links/fragments and mobile presentation. Confirm unknown
   locales return an unavailable route rather than an English duplicate. Re-run
   search-authority and authentication browser regressions before release.

## Validation

`npm run test:search` includes `tests/public-i18n.test.mjs`. The locale tests verify
English canonical preservation, absence of Spanish alternatives, rejection of
private/malformed/unknown paths and unpublished locales, stable resource metadata,
and the unchanged 42-URL sitemap. Existing search tests continue to verify
server-rendered answers, schema, breadcrumbs, robots and access boundaries.

On 28 September 2026 the combined command passed **11/11 tests** (four locale
tests and seven existing search contracts), with zero failures, skips or
cancellations. Scoped diff checks passed. The metadata-only TSX changes introduce
no client component, hook, request, navigation handler or hydration behavior.

This is **FOUNDATION IMPLEMENTED / SPANISH CONTENT PENDING**, not a claim that the
site now supports Spanish navigation or automatic translation.

## Primary references

- [Next.js 15 internationalization](https://nextjs.org/docs/15/app/guides/internationalization):
  App Router locale segments and server-rendered dictionaries. This project's
  existing English routes are preserved rather than applying a global example
  redirect to authentication routes.
- [Next.js 15 metadata](https://nextjs.org/docs/15/app/api-reference/functions/generate-metadata#alternates):
  Native canonical and language-alternative metadata, resolved with the existing
  production `metadataBase`.
- [Google localized page versions](https://developers.google.com/search/docs/specialty/international/localized-versions):
  Equivalent translated pages need consistent, reciprocal language annotations.
  No language alternative is claimed before its page exists.
