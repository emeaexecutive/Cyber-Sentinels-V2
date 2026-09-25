# OpenGraph governed tool boundary

Qualification: **IMPLEMENTED NOT EXERCISED**, live execution **BLOCKED_EXTERNAL**.
No provider calls, credentials, environment changes, tables, migrations, API scopes,
deployment or new decision engine. This is a server composition seam, not a deployed
REST endpoint or an installed MCP proxy. No production qualification is claimed.

## Provider surface audit (2026-09-25)

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

Lexical validation cannot establish DNS safety or prevent a provider from following
redirects or fetching rendering subresources. The reviewed docs did not establish
enforceable per-hop scope controls. Therefore there is deliberately no HTTP/MCP
transport, DNS fetch, credential lookup or environment variable. Before connecting
an executor, qualify DNS/redirect/subresource enforcement, current authorization at
dispatch, safe normalized outcomes, credential handling and durable attempt/outcome
persistence. Merely adding an API key must not enable execution.

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

## Local validation record

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
