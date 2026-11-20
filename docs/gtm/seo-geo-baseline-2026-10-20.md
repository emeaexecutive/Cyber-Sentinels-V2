# SEO and GEO baseline — 20 October 2026

## Technical SEO evidence

The local production build was run from the content-only branch based on
`2cb8dcad232de7c4a510e6f55e92810442524f4b`. It is local evidence only and does
not describe the deployed site.

Anonymous Production GET checks on 20 Oct 2026 returned HTTP 200 for
`https://www.cybersentinels.com/about`, `/platform`, `/robots.txt` and
`/sitemap.xml`. The live About and Platform pages retained their existing
self-canonicals, and neither contained the approved Aragón headline or exact
Platform positioning. This is evidence that the new wording is **not live**;
the Production deployment SHA was not exposed by these checks and is not
claimed.

| Check | Local result | Scope |
|---|---|---|
| `/about` and `/platform` server-rendered HTML | HTTP 200; approved TENENTE wording present in HTML | Local Next.js production build |
| Canonical, title, description and Open Graph | Self-canonical `https://www.cybersentinels.com/about` and `/platform`; page title and description emitted | Local HTML |
| Organization/WebSite structured data | Existing Organization and WebSite graph remains at the root layout | Source/build inspection |
| SoftwareApplication structured data | Present on Platform; description aligned to the approved customer-facing positioning; no offer, price or rating added | Local HTML/source |
| BreadcrumbList | Not added: these page templates do not display breadcrumb navigation, so hidden breadcrumb markup would be misleading | Source inspection |
| Sitemap | HTTP 200; `/about` and `/platform` included; generated from canonical public-route list | Local production server |
| Robots | HTTP 200; canonical sitemap referenced; public search groups retained; private paths remain excluded | Local production server |
| Deprecated `/about-us` path | HTTP 308 to `/about` | Local production server |
| Internal destinations linked from the pages | Nine representative destinations returned HTTP 200 | Local production server |
| Desktop/mobile layout | 1440px and 390px viewports; no horizontal overflow; one visible main landmark and one visible H1 per page | Local Playwright check |
| Basic accessibility | Visible heading hierarchy, named links and image alt checks passed; mobile navigation expanded with its `aria-expanded` state | Local Playwright check; not a full WCAG audit |
| Performance | No Lighthouse or field Core Web Vitals measurement performed | NOT_MEASURED |

Existing `app/robots.ts`, `app/sitemap.ts`, canonical-host policy and page-level
metadata were reviewed. No robots, sitemap, bot-training, Search Console or Bing
verification policy was changed. The live host's existing policy permits
public search/user-fetch groups including OAI-SearchBot and PerplexityBot, while
GPTBot and ClaudeBot remain disallowed as training crawlers.

## Public search and AI discovery observations

Checks were made on 20 Oct 2026. These observations are limited to the exact
public queries and tools below; they do not prove that a site is absent from
all indexes.

| Surface | Query / access | Observation | Classification |
|---|---|---|---|
| Bing public web search | `site:cybersentinels.com "Cyber Sentinels"` | No results returned | NOT OBSERVED in this query only |
| Bing public web search | `Cyber Sentinels TENENTE AI agent authority` | No results returned | NOT OBSERVED in this query only |
| Bing public web search | `Cyber Sentinels AI agent authority` | No results returned | NOT OBSERVED in this query only |
| Google Search | Same branded query via public search URL | Fetch exposed only the Search page shell; no result list or AI Overview could be verified | NOT_MEASURED |
| Bing/Copilot | Copilot public URL returned a product bootstrap/redirect, not an answer to the query | No citation could be inspected | NOT_MEASURED |
| Perplexity | Public query URL returned HTTP 403 | No access attempt was bypassed | NOT_MEASURED |
| ChatGPT Search | Direct public search URL returned HTTP 404 | No sign-in or alternate route was attempted | NOT_MEASURED |

No AI answer citation was observed. This is not evidence of zero impressions,
zero traffic or universal absence. The verified site SEO document
[`docs/SEARCH_VISIBILITY.md`](../SEARCH_VISIBILITY.md) records that Google
Search Console and Bing Webmaster ownership were not verified and that no
verification token or owner account was supplied.

## External account and indexing status

- Google Search Console ownership: **NOT VERIFIED**.
- Bing Webmaster Tools ownership: **NOT VERIFIED**.
- Sitemap submission, URL inspection and indexing request: **NOT PERFORMED**.
- IndexNow: **NOT IMPLEMENTED**; no owner-approved key or indexing instruction
  was available, and no external submission was authorized.
- Search impressions, clicks, branded queries, referring domains, qualified
  enquiries, conversion rate and AI citations: **NOT_MEASURED**.

The content branch is not merged or deployed. Public Production therefore
continues to represent the previously verified website baseline. Do not quote
local build results as live evidence.
