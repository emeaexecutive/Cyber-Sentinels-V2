# OpenGraph governed tool boundary

Qualification: **IMPLEMENTED NOT EXERCISED**, live execution **BLOCKED_EXTERNAL**.
No provider calls, credentials, environment changes, tables, migrations, API scopes,
deployment or new decision engine. This is a server composition seam, not a deployed
REST endpoint or an installed MCP proxy. No production qualification is claimed.

## Provider surface audit (rechecked 2026-09-27)

[OpenGraph REST reference](https://www.opengraph.io/docs/api) documents the v3 base
URL, App ID authentication and site, scrape, screenshot, extract, query, oEmbed and
Markdown operations. The [site endpoint](https://www.opengraph.io/docs/api/site)
accepts an encoded target URL; automatic rendering, proxying and retries default on.
[MCP documentation](https://www.opengraph.io/docs/mcp) describes hosted Streamable
HTTP at `https://mcp.opengraph.io/mcp`, browser sign-in or `x-app-id`, and local
stdio using `opengraph-io-mcp`. Its endpoint table still lists v1.1 for extract/query;
those operations are deliberately outside this implementation.

The bounded internal action is `opengraph.site`. It represents metadata retrieval,
not identity assurance or an authoritative trust decision. Image generation, local
file export, crawling, arbitrary tools and provider-specific options are excluded.

| Contract | Current primary-source finding | Integration consequence |
| --- | --- | --- |
| REST authentication | The [authentication guide](https://www.opengraph.io/docs/concepts/authentication) documents `app_id` in the query string. No REST header alternative was established by the reviewed docs. | No REST transport is added under this task's no-query-string-secrets rule. |
| MCP authentication | [Signing in](https://www.opengraph.io/docs/mcp/authentication) supports hosted browser sign-in or `x-app-id`. Site Audit/Link Preview require account sign-in; the web-data group accepts API keys. | A future MCP transport must keep credentials server-side and bind installation/account to tenant. Direct model access is not a governed gateway. |
| Rate limit | [Limits](https://www.opengraph.io/docs/concepts/rate-limits) are simultaneous requests: Free 1, Developer 5, Production 25, Enterprise 100. The documented rejection is HTTP 429. These are not requests-per-second figures. | Qualification needs an account-specific concurrency/budget bound and bounded backoff. No plan or paid capability was selected. |
| Response shape | [Site reference](https://www.opengraph.io/docs/api/site) returns metadata groups (`hybridGraph`, `openGraph`, `twitterCard`, `htmlInferred`) and `requestInfo` with host/response code/redirect count; retries can add `retryInfo`. | Provider metadata is untrusted content, not authority, DNS attestation or evidence every hop stayed in scope. |
| Failure model | [Errors](https://www.opengraph.io/docs/concepts/errors) documents REST 400/401/403/404/429/5xx and error objects. MCP tool failures can have transport success with `isError: true` and textual content. | HTTP 200 alone must never mark tool success; normalize transport, tool and parsing failures separately. Raw error text is not safe receipt content. |

Provider-side redirects, DNS answer validation/pinning, per-hop allowlists, maximum
redirects, private-address rejection and rendering-subresource restrictions are **not
established** by the reviewed API/MCP contracts. `requestInfo.redirects` is result
metadata; it cannot prevent a forbidden request that already happened. Automatic
rendering/proxy/retry defaults further require explicit cost and egress qualification.
Disabling those options alone is not a documented SSRF guarantee. No DNS probes or
generic SSRF scanner were introduced.

## Existing architecture reused

`src/lib/opengraph/workflow.ts` composes a canonical transaction. The server handler
must supply existing authenticated canonical dependencies and resolve target policy,
purpose observations and any delegated-action evaluation from current tenant state.
The context resolver receives the authenticated actor and session tenant. It must
not deserialize policy or delegation decisions from an agent/MCP request.

The canonical engine resolves the tenant trust object, operational entity, current
Trust Contract, exact policy/version, authority expiry/revocation, purpose lineage,
and external-effect boundary. Explicit tool permission is additionally required by
the governed entry point. Existing native delegation evaluation supplies the matched
delegation reference and result; unresolved delegation requires REVIEW. This module
does not issue or accept delegations.

Target filters narrow authority: exact domains, proper subdomains, exact normalized
URLs/paths and denied domains (including their descendants). They do not grant
authority. The current canonical exact URL/action/environment scope must ALSO match.
Public reachability and a domain filter never prove ownership. Invalid scope fails
closed. There is no wildcard target expansion or implicit path-prefix permission.

Only the existing canonical ALLOW gate reaches the executor hook. This increment
replaces that hook with NOT_CONFIGURED; even an injected generic executor cannot
make an OpenGraph call. REVIEW and DENY never execute. A prior receipt is historical
evidence, not a new grant. New attempts require fresh idempotency keys and reload
current authority and policy. Provider failure is never evidence of successful
execution and cannot override the Cyber Sentinels decision.

## URL and execution limits

HTTPS only; reject address literals (including alternative numeric IPv4 and IPv6),
localhost/internal/link-local/metadata forms, credentials, query strings, fragments,
nonstandard ports, malformed URLs, control characters and ambiguous encoded slashes.
All IP literals are conservatively excluded, including public IPs. Queries are
excluded to avoid retaining URL secrets. Evidence retains the bounded URL/path,
domain and target-scope digest, not page content or provider payloads.

The input limit is 300 characters. WHATWG URL parsing normalizes host casing and
path serialization before exact URL comparison; ambiguous encoded separators and
control bytes are rejected. Domain policy distinguishes exact hosts from proper
subdomains and applies denied-domain descendants first. Localhost, numeric loopback,
RFC1918, link-local and metadata IPs are rejected as address literals; known internal
and metadata hostname forms are rejected lexically. An otherwise public-looking
hostname can still resolve privately, so lexical acceptance never establishes safe
network execution or protection against DNS rebinding. Redirect scope escape remains
blocked by the absent executor, not claimed prevented by lexical validation.

Lexical validation cannot establish DNS safety or prevent a provider from following
redirects or fetching rendering subresources. The reviewed docs did not establish
enforceable per-hop scope controls. Therefore there is deliberately no HTTP/MCP
transport, DNS fetch, credential lookup or environment variable. Before connecting
an executor, qualify DNS/redirect/subresource enforcement, current authorization at
dispatch, safe normalized outcomes, credential handling and durable attempt/outcome
persistence. Merely adding an API key must not enable execution.

A future normalized outcome should retain the attempted action, original authorized
URL/domain, provider operation/request reference when available, observation time,
bounded status/reason, result digest, and separately established final target/redirect
facts. Optional titles/descriptions require length bounds and inert rendering; image,
favicon and embedded URLs must not trigger secondary fetching. Raw HTML, Markdown,
screenshots, arbitrary metadata and provider text are outside today's receipt/evidence
contract. No provider result normalizer or successful result is claimed in this branch.

## Evidence and verification

Canonical persistence provides actor/entity/tenant, action/purpose/target, authority,
policy/version, reasons, timestamp, decision digest and receipt. The request evidence
marks execution unattempted and qualification blocked. Existing graph extension,
Replay and material-change Trust Memory retain the same transaction lineage.
No OpenGraph result is fed into provider identity evidence or promoted to a decision.

Focused tests exercise the real canonical engine with synthetic dependencies and
the actual logout route/middleware with a synthetic Supabase Auth service. Browser
tests render the actual navigation with application CSS at desktop/mobile sizes,
submit its form, check session removal, Back/direct-route denial, preference retention
and subsequent password login. These are local fixture results, not hosted-provider
or production sign-in qualification.

Sign Out posts the existing server route using Supabase local scope, clears the
session-start marker and existing session/admin cookies, then redirects to `/login`.
Native navigation discards in-memory client state; restored pages reload through
middleware. Recovery quarantine and remembered-device preferences remain intact.

## Historical PR #107 local validation record

Base main: `62822a6742551bdbe53c904a03e7096c07eec071` (PR #106 merged normally
after passing reported checks; Supabase Preview skipped; no required checks configured).

- `npm test`: 1,766 passed, zero failed/skipped, including 41 OpenGraph cases.
- `npm run test:sign-out-browser`: passed at 1280px and 390px, including Back.
- `npm run lint` and final changed-file lint: passed.
- `npm run typecheck`: passed.
- `npm run build`: passed (204 static pages generated).
- Password-recovery and normal-login regressions: passed with synthetic Auth.

Supabase's [signOut reference](https://supabase.com/docs/reference/javascript/auth-signout)
defines local scope as the current session. This revokes its refresh grant; already
issued JWTs retain their normal expiry. Browser cookie removal and middleware
revalidation enforce the tested post-logout route behavior.
