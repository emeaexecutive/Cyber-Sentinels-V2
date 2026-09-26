# Search architecture and intent audit — 25 September 2026

Base: `f9b69ecb173388f84c2789153167f1162b44df4c`, clean main after normal
merge of #107. All meaningful checks passed; Supabase Preview was skipped.
This document records the pre-change audit and planned editorial decisions.

## Evidence and scope

Inspected all 272 App Router page files, route visibility, redirects, middleware,
layouts, public navigation, metadata, public assets and existing content-ownership
records. The complete route register is `SEARCH_INTENT_INVENTORY.md`.
`npx tsx tools/search-audit.mjs --live` fetched the 35 canonical public pages,
robots and sitemap anonymously with three concurrent requests. Every canonical
page returned HTTP 200 without an X-Robots-Tag. No authenticated content was read.
The source inventory and timestamped sanitized response facts are local artifacts;
the script is reproducible. Search-tool cached extracts differed from fresh HTTP
responses, so they are not treated as the current deployment or indexing proof.

Findings:

- The 35 existing canonical pages have self-canonical URLs. Preserve these owners.
- Only three have OpenGraph/Twitter tags; no fetched page has JSON-LD.
- `public/robots.txt` competes with `app/robots.ts`; production currently serves the
  generated policy. Remove the obsolete static copy rather than maintain two.
- Sitemap `lastModified` uses build time for every page, not an editorial update.
  Omit unknown dates; use actual content-review dates only where maintained.
- Robots duplicates rules, blocks some permanent redirects and does not exclude
  the entire private API namespace. Explicit bot groups must repeat restrictions.
- `/developers/api-reference` and `/developers/quickstart` contain substantive
  public technical material but are absent from the sitemap. `/governance` is a
  linked public explanation of accountable review, also absent. Promote these.
- `/documents` and its whitepaper use overlapping titles. Distinguish library
  intent from the paper; keep both canonical. The PDF remains discoverable, with
  an HTTP canonical link to the HTML paper rather than a competing landing page.
- The global loading fallback emits an H1 in streamed HTML alongside the actual
  page H1. Replace only the fallback heading with a paragraph. Critical public
  content is server-rendered; client interactivity is not the source of the answer.
- The journal contains short founder notes, not separate dated research articles.
  Preserve them; link to substantive resources rather than manufacturing posts.
- Existing public team content supplies no consented biography or verified social
  profile. Do not invent a Person, founder attribution, sameAs, customers or ratings.
- Existing HTTPS www canonical host and non-www redirects are retained. Preview
  noindex and all session/tenant/API authorization boundaries must remain intact.

## Search intent map decided before new pages

| Query family | Primary destination | Decision / overlap handling |
| --- | --- | --- |
| AI agent security; autonomous agent security | `/resources/agent-security` | New navigational knowledge hub; links to existing product/docs owners |
| AI agent authorization; identity vs authority; authentication vs authorization | `/resources/agent-security/agent-authorization` | One substantive educational article, not three near-duplicates |
| Runtime authorization; runtime authority continuity; revocation | Same article, `#runtime-authority` | Explain fresh evaluation and revocation; no separate doorway pages |
| Authority; authority lineage; delegation security; agent-to-agent delegation | Same article, `#delegation` | One bounded-authority lifecycle with explicit parent constraints |
| ALLOW / REVIEW / DENY; stopping unauthorized actions | Same article, `#decisions` | Explain authorization vs execution and enforcement prerequisites |
| MCP security; MCP authorization; tool authorization; external-effect authority | `/resources/agent-security/mcp-tool-authorization` | One article separating transport access, action and target authority |
| Synthetic interaction trust | `/resources/agent-security/synthetic-interaction-trust` | One resource with distinct evidence facets and bounded action catalogue |
| Execution trust; enterprise agent trust | `/platform#execution-trust` | Improve existing product owner; no competing product page |
| AI agent governance; enterprise autonomous-agent governance | `/enterprise/agent-governance` | Preserve enterprise use-case owner; link educational hub |
| Accountable human review | `/governance` | Add missing metadata/discovery; preserve focused review model |
| AI action evidence; audit trail; action receipts | `/verification-replay#action-receipts` | Add explicit receipt/evidence section to existing owner |
| AI agent replay; autonomous-agent auditability | `/verification-replay` | Improve answer-first explanation; no new Replay article |
| Trust Memory | `/trust#trust-memory` | Preserve detailed concept owner |
| Agent Registry; machine identity; API lifecycle | `/developers/quickstart` | Promote existing implementation tutorial |
| API contract; integration reference | `/developers/api-reference` | Promote existing generated public OpenAPI reference |
| Technical research / whitepaper | `/documents/operational-trust-whitepaper` | Preserve HTML/PDF discovery and clarify integration qualification |

New content budget: **one hub and three articles**. Existing strong content and
redirects remain. Unpromoted legacy/demo/transaction surfaces retain access behavior
but receive noindex outside the deliberate canonical public allowlist. This is
indexing policy, not an authentication mechanism. The inventory records individual
topics, overlap owners and actions; no operational route is made public.

## Entity and evidence plan

Use stable `#organization`, `#website` and `/platform#software` identifiers.
Organization/WebSite describe the existing business and site. SoftwareApplication
describes the visible platform, without invented offers or ratings. TechArticle and
BreadcrumbList reflect each new article's visible title, answer, sections, reviewed
date, organizational author and sources. Link concepts contextually. No FAQ spam,
hidden text, search-action schema for a nonexistent search box, or paid tactics.

Provider statements must retain their actual boundary: Judge.me observations never
grant authority; OpenGraph is IMPLEMENTED NOT EXERCISED / BLOCKED_EXTERNAL; Stripe
Identity is BLOCKED_EXTERNAL and PRODUCTION EXERCISED = NO. No new page markets
password recovery or Sign Out. Examples are illustrative, contain no customer data,
and expose no internal endpoint, credential, infrastructure ID or test fixture.

## Validation and external limits

Validate generated robots, sitemap, canonical/social tags, JSON-LD graph references,
links/fragments and single-H1 server HTML. Run local desktop/mobile browser checks,
auth/recovery regressions, focused tests, full tests, lint, typecheck and build.
Public crawlability is not proof of indexing, rank, citation or performance gains.
Search Console/Bing verification and post-release URL inspection need the owner's
accounts; no verification tokens were supplied. No deployment is part of this PR.

## Completed validation — 26 September 2026

- `npm test`: **1,773 passed, zero failed or skipped**, including the seven new
  search contracts and existing session, recovery, tenant and provider tests.
- `npm run lint`, `npm run typecheck`, `npm run build`: passed. The build emitted
  webpack cache-size performance notices, not compilation errors.
- Scoped secret scan: passed, zero real-secret candidates; one existing test fixture.
- Built local server: inspected all 42 canonical URLs, generated sitemap/robots,
  PDF canonical header, JSON-LD, social metadata, links and anchor targets.
  41 public pages passed substantive server-HTML/single-H1 checks with browser
  JavaScript disabled. `/help` depends on missing local Supabase configuration.
- Hub and all three resources: desktop 1440px and mobile 390px screenshots,
  zero horizontal overflow, working article/breadcrumb/section navigation and
  zero uncaught browser errors. Reviewed the actual screenshots.
- Link audit covered 20 additional destinations. No available destination or
  fragment was broken. Configuration-dependent `/status`, `/trust-replay`,
  `/developers/api-keys`, `/dashboard/governance` and `/data-rights` returned 503;
  their live integration checks remain blocked in this local environment.
- Built-server auth redirects for dashboard/workspace/admin/API-key pages were
  also blocked by missing configuration. `/operational-entities` streamed a
  server error after HTTP 200, without rendering its protected page content.
  Middleware/page guards remain unchanged and isolated auth regressions passed;
  the built-server checks are not represented as successful login integration.

Automatic approval review rejected the attempted local-server command supplying
fixture Supabase environment values, with only “blocked by policy” as its reason.
No alternate credential-injection path was attempted. Public checks continued
with the unchanged environment. Reproduce them with
`npm run build`, `npm run start -- --hostname 127.0.0.1 --port 3107`, then
`npx tsx tools/search-verify.mjs`; results and screenshots stay in ignored artifacts.
The script reports blocked checks separately from failures.

The pre-existing PDF is preserved as the versioned V1 artifact; updated provider
qualification wording is in the canonical HTML paper and current integration docs.
No dependency, authorization policy, provider executor, production data or external
enforcement behavior was added or changed. All 35 original canonical destinations
remain, with three existing public pages promoted and four new resource URLs.
