# Search and AI visibility operations

Reviewed 25 September 2026. This is an internal measurement and release guide,
not evidence of ranking gains. The search-authority branch has not been deployed.

## Crawl and training policy

`app/robots.ts` is the single robots source. Googlebot, Bingbot, OAI-SearchBot,
Claude-SearchBot and PerplexityBot may crawl public explanations. Named groups
repeat all private-path exclusions; no crawler receives authenticated access.
GPTBot and ClaudeBot are blocked as dedicated training crawlers. User-fetch agent
names receive the same exclusions, although robots compliance is not guaranteed
for user-triggered retrieval. Authentication, authorization and tenant isolation
remain the security controls. All API paths are disallowed; noncanonical pages
receive `X-Robots-Tag: noindex, nofollow, noarchive`. Preview deployments retain
global noindex. Existing redirects remain crawlable so canonical signals can flow.

Google-Extended is allowed deliberately: Google couples Gemini grounding and
future training under this control. This permits both uses of public material.
Blocking it would also restrict Gemini grounding; it does not control Google
Search inclusion or ranking. This default prioritizes the requested AI visibility.
Revisit it if the owner prefers to exclude both Gemini uses. No robots policy
guarantees inclusion, attribution, model behavior or deletion of previously used data.

Primary policy references, checked 25 September 2026:

- [Google AI features](https://developers.google.com/search/docs/appearance/ai-features): ordinary search eligibility and helpful accessible content remain the foundation; no special AI markup guarantees inclusion.
- [Google common crawlers](https://developers.google.com/crawling/docs/crawlers-fetchers/google-common-crawlers): Google-Extended has a separate, combined Gemini training/grounding purpose.
- [OpenAI bots](https://developers.openai.com/api/docs/bots): OAI-SearchBot and GPTBot serve separate search and training purposes.
- [Anthropic crawler policy](https://privacy.claude.com/en/articles/8896518-does-anthropic-crawl-data-from-the-web-and-how-can-site-owners-block-the-crawler): distinguishes training, search and user retrieval agents.
- [Perplexity crawlers](https://docs.perplexity.ai/docs/resources/perplexity-crawlers): documents search and user-fetch agents.
- [Bing Webmaster Guidelines](https://www.bing.com/webmasters/help/bing-webmaster-guidelines-30fba23a): crawlable, accurate content and consistent metadata support Bing/Copilot eligibility; do not fabricate authority signals.
- [Bing robots guidance](https://www.bing.com/webmasters/help/how-to-create-a-robots-txt-file-cb7c31ec): repeat restrictions in specific bot groups rather than assuming wildcard inheritance.

There is no paid SEO service, bot-specific content, hidden text, keyword doorway,
automated backlink scheme, invented review, or special `llms.txt` ranking promise.
Answer-first server HTML, stable URLs, contextual links and source-supported
technical explanations serve readers and retrieval systems alike.

## Free webmaster setup

Google Search Console and Bing Webmaster ownership have **NOT YET BEEN VERIFIED
in this task**. No account session or verification token was supplied. Do not
invent a verification meta tag or claim that sitemap submission has occurred.

1. In Google Search Console, add the `cybersentinels.com` Domain property. Complete
   the exact DNS TXT challenge issued to the owner. Alternatively use a www HTTPS
   URL-prefix property and its supplied HTML verification method. Preserve tokens
   after verification; they are not application authentication secrets.
2. In Bing Webmaster Tools, import the verified Search Console property or add
   `https://www.cybersentinels.com` and complete its issued verification challenge.
3. After this PR is separately approved and released, submit
   `https://www.cybersentinels.com/sitemap.xml` in both consoles. The generated
   sitemap has 42 deliberate public URLs, including the hub and three resources.
4. Inspect homepage, hub, three resources, API reference, quickstart, whitepaper,
   Replay and governance URLs. Compare submitted versus selected canonical,
   crawler HTTP response, rendered main text, indexing status and crawl date.
   Request indexing only where the console supports it; avoid repeated submissions.
5. Check Page Indexing / Site Explorer and sitemap reports after crawling. A public
   HTTP 200 is crawl readiness, not proof of indexing. Keep preview hosts excluded.
6. Export performance by page and query monthly. Investigate robots, canonical,
   server or content issues before adding more pages. Maintain a dated change log.

No verification integration is added until a real owner-issued token is available.
The current canonical host, sitemap and anonymous server-rendered content are ready
for that setup. Owner-console access and a later release remain external steps.

## Measurement contract

Record one row per date, engine/product, locale, device, query, intended URL and
observation type. Store the exact observed URL, position when the interface exposes
it, citation URL/text when applicable, and a screenshot or export reference. Keep
account exports internal. Distinguish branded from unbranded queries and paid
placements from organic results. Reuse the same query/locale/device monthly.

Allowed statuses describe separate observations:

| Status | Required evidence |
| --- | --- |
| INDEXED | Owner URL inspection/index report identifies the URL as indexed at the recorded time |
| RANKING OBSERVED | Dated organic result and query, engine, locale, device and observed position |
| AI ANSWER CITATION OBSERVED | Dated answer that visibly cites the exact public URL; a brand mention alone is insufficient |
| NOT OBSERVED | A specified check was performed and yielded no matching observation; never proof of absence everywhere |
| NOT YET MEASURED | No qualifying check or owner-console evidence exists |

Report search impressions/clicks/CTR and organic position from console exports;
report AI citations separately by product. Compare equivalent periods and URLs,
record release dates and confounders, and do not infer causation from a single answer.
No automated query scraping or paid measurement service is required.

## Baseline — 25 September 2026, before branch release

Fresh anonymous HTTP checks: all 35 previously canonical pages returned 200 with
self-canonicals; 3 had social metadata, none had JSON-LD. This is technical evidence,
not an INDEXED or RANKING OBSERVED status. Cached search extracts differed from the
fresh page responses and are not used as the deployment baseline.

A limited search-tool sample used `site:cybersentinels.com "AI agent authorization"`,
`site:cybersentinels.com "MCP"` and `"Cyber Sentinels" "execution trust"`.
No matching site result was returned: **NOT OBSERVED in that sample only**. The
tool did not expose a reproducible Google/Bing position or locale, so this is not
a search-engine ranking baseline. No AI-answer citation experiment was performed.

| Query family | Intended destination | Google/Bing index & ranking | AI citation |
| --- | --- | --- | --- |
| AI agent authorization | resource: agent-authorization | NOT YET MEASURED | NOT YET MEASURED |
| runtime AI authorization | resource: agent-authorization#runtime-authority | NOT YET MEASURED | NOT YET MEASURED |
| AI agent security | /resources/agent-security | NOT YET MEASURED | NOT YET MEASURED |
| autonomous agent governance | /enterprise/agent-governance | NOT YET MEASURED | NOT YET MEASURED |
| MCP authorization | resource: mcp-tool-authorization | NOT YET MEASURED | NOT YET MEASURED |
| MCP security | resource: mcp-tool-authorization | NOT YET MEASURED | NOT YET MEASURED |
| agent authority | resource: agent-authorization | NOT YET MEASURED | NOT YET MEASURED |
| agent delegation security | resource: agent-authorization#delegation | NOT YET MEASURED | NOT YET MEASURED |
| AI agent audit trail | /verification-replay#action-receipts | NOT YET MEASURED | NOT YET MEASURED |
| AI agent action receipt | /verification-replay#action-receipts | NOT YET MEASURED | NOT YET MEASURED |
| AI agent replay | /verification-replay | NOT YET MEASURED | NOT YET MEASURED |
| execution trust AI | /platform#execution-trust | NOT YET MEASURED | NOT YET MEASURED |
| AI agent revocation | resource: agent-authorization#runtime-authority | NOT YET MEASURED | NOT YET MEASURED |
| synthetic interaction trust | resource: synthetic-interaction-trust | NOT YET MEASURED | NOT YET MEASURED |
| AI tool authorization | resource: mcp-tool-authorization | NOT YET MEASURED | NOT YET MEASURED |

`resource:` means `/resources/agent-security/`. All new pages are unreleased;
no indexing, ranking, traffic or citation improvement is claimed.

## Reproducible technical checks

Run `npm run test:search`, then the normal full test/lint/typecheck/build gates.
`npx tsx tools/search-audit.mjs --live` records sanitized, anonymous public HTTP
facts under ignored `artifacts/search/`. It does not log in or probe private APIs.
Keep baseline and post-release runs separately before rerunning (output overwrites).
Review content dates when meaning changes; do not stamp every sitemap entry at build.
