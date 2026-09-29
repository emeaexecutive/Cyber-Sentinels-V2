# Provider execution qualification

Audit date: 2026-09-29. Baseline: `d40a0a14772af190a2d82e454b6294113ad35bd2`.

**OpenGraph and Judge.me remain BLOCKED_EXTERNAL.** No real provider execution,
webhook delivery, destination observation, or provider database record was created
or qualified in this exercise. Local tests execute the actual boundary/canonical
modules with synthetic dependencies. They do not establish TEST-SANDBOX EXERCISED
or Production qualification. Existing architectural boundaries are retained.

## Credentials and account steps

Names/presence only were checked; no secret values were printed, env files pulled,
accounts created, plugins installed, or paid capabilities selected.

| Location | Observed availability |
| --- | --- |
| Process environment | No `OPENGRAPH_APP_ID`, `OPENGRAPH_API_KEY`, or `OPENGRAPH_IO_API_KEY`; no `JUDGEME_API_TOKEN`, `JUDGEME_PRIVATE_API_TOKEN`, `JUDGEME_PUBLIC_API_TOKEN`, `JUDGEME_ACCESS_TOKEN`, `JUDGEME_OAUTH_CLIENT_ID`, `JUDGEME_OAUTH_CLIENT_SECRET`, `JUDGEME_WEBHOOK_SECRET`, or `JUDGEME_SHOP_DOMAIN`. These are discovery candidates, not newly introduced configuration requirements. |
| `.env.local`, `.env.example`, `.env.docker.example` | No names matching `OPENGRAPH` or `JUDGE.?ME`. |
| Existing Vercel project's Production and Preview environments | `vercel env ls production` and `vercel env ls preview` completed successfully; neither contains names matching `OPENGRAPH` or `JUDGE.?ME`. Metadata only, no values or env pull. |
| Other remote secret stores / provider dashboards | Not inspected by this provider audit. Checked-store absence does not prove universal absence; no usable credential or tenant-bound provider account was established. |

OpenGraph requires an owner-authorized account and App ID from the
[dashboard](https://www.opengraph.io/docs/concepts/auth). The documented hosted
MCP endpoint is `https://mcp.opengraph.io/mcp`, authenticated with `x-app-id` or an
account sign-in. Web-data tools accept either; Site Audit/Link Preview require
account sign-in. An assistant's direct MCP connection would bypass the application
gateway and does not qualify Cyber Sentinels enforcement. A legitimate credential
must be supplied through approved server secret storage and bound to the tenant;
do not paste it into an issue, receipt, URL, or chat. [MCP authentication](https://www.opengraph.io/docs/mcp/authentication).

Judge.me requires an authorized test store/installation. Its admin **Settings →
Integrations → View API tokens** supplies the shop domain and private token; the
public widget token does not qualify private review ingestion. Alternatively,
the owner creates an OAuth app with a registered redirect URI, approves minimal
store scopes, and securely provisions its client credentials and store token.
Bind that installation to an authenticated Cyber Sentinels tenant before selecting
credentials or accepting evidence. No OAuth callback, installation resolver or
Judge.me webhook route currently exists here. [API credentials](https://judge.me/help/en/articles/8409180-using-judge-me-api),
[OAuth setup](https://judge.me/help/en/articles/8283047-setting-up-oauth).

Credentials alone would not close the implementation/confinement gaps below.

## OpenGraph contract and execution boundary

The current [API reference](https://www.opengraph.io/docs/api) uses v3.0 and calls
v1.1 deprecated but functional. The bounded internal action `opengraph.site` is
not a provider wire-tool name or version negotiation mechanism. A future transport
must pin and verify its exact REST/MCP operation and schema.

The [Site API](https://www.opengraph.io/docs/api/site) defaults to automatic proxy
selection, rendering and retries. It returns metadata groups and `requestInfo`
with host/status/redirect count; retries can add `retryInfo`. Neither a metadata
URL nor a redirect count attests that each request stayed within an approved scope.
The reviewed REST/MCP contract does not establish enforceable per-hop DNS pinning,
private-address rejection, redirect allowlists/hop bounds, or render-subresource
confinement. This is a qualification blocker, not a claim that the service is
vulnerable. Disabling optional rendering/proxies alone would not prove confinement.

REST authentication documents an `app_id` query parameter; no supported REST
header alternative was established. Hosted MCP documents `x-app-id`, but that
does not solve egress confinement. [REST authentication](https://www.opengraph.io/docs/concepts/auth),
[MCP authentication](https://www.opengraph.io/docs/mcp/authentication).
Concurrent request limits are plan-dependent (Free 1, Developer 5, Production 25,
Enterprise 100), with HTTP 429 on excess. A future qualification must bound account
credits/concurrency and automatic escalation. [Rate limits](https://www.opengraph.io/docs/concepts/rate-limits).
MCP errors can arrive with HTTP success and `isError: true`; raw error text is
untrusted content and may not be persisted as a safe execution reason.
[Error contract](https://www.opengraph.io/docs/concepts/errors).

[`governOpenGraphRequest`](../src/lib/opengraph/workflow.ts) authenticates the actor,
resolves the tenant, composes a constrained canonical request, checks tool permission,
and delegates authority/policy decisions to the existing canonical transaction.
It unconditionally replaces the executor dependency with `configured: false`.
There is no application route importing it. Therefore even a caller-supplied
executor cannot reach OpenGraph through this boundary. The domain filter narrows
canonical exact target/action/environment authority; it does not grant authority.

### Required qualification matrix

Evidence: [`provider-execution-qualification.test.mjs`](../tests/provider-execution-qualification.test.mjs),
[`opengraph-boundary.test.mjs`](../tests/opengraph-boundary.test.mjs), actual
[`canonical.ts`](../src/lib/trust-transaction/canonical.ts). "Local pass" below
means synthetic dependency tests, never a live provider result.

| # | Required case | Actual result / remaining proof |
| --- | --- | --- |
| 1 | Valid actor/authority/tool/domain → ALLOW → provider reached | PARTIAL: local ALLOW and canonical receipt; provider deliberately NOT_CONFIGURED. No real agent/authority/provider chain exercised. |
| 2 | DENY → no provider | Local pass through governed entry point: NOT_REQUESTED, no injected executor call. |
| 3 | REVIEW → no provider | Local pass: unresolved delegation requires REVIEW and cannot dispatch. |
| 4 | Revoked authority → DENY | Local pass, including a fresh attempt after revocation; duplicates return historical receipts without re-execution. |
| 5 | Expired delegation → DENY | Local boundary respects trusted resolver's DELEGATION_EXPIRED denial. Native expiry evaluation has separate tests; no live resolver wiring is claimed. |
| 6 | Wrong domain → DENY | Local pass for out-of-scope hosts and explicit deny. Domain/subdomain matching is label-aware. |
| 7 | Wrong tool → DENY/REVIEW | Unpermitted `opengraph.site` is DENY; unsupported wire action is rejected before persistence. No implicit tool expansion. |
| 8 | Unsafe URL → DENY | Local rejection before execution/persistence: credentials, queries, fragments, address literals, internal/metadata forms, non-HTTPS and ambiguous separators. These are input rejections, not fabricated persisted DENY receipts. |
| 9 | Redirect escapes approved scope → fail closed | BLOCKED_EXTERNAL: absent executor prevents dispatch entirely, including an injected escaping executor. Actual provider redirect/DNS confinement remains unverified. |
| 10 | Provider failure → no fabricated success | Canonical seam regression normalizes executor exceptions to UNKNOWN, preserves receipt/lineage, and invents no request or acknowledgement. OpenGraph transport is absent; real HTTP/MCP/parse failures remain unexercised. |
| 11 | Normalized execution status in receipt | Local pass: ALLOW reports NOT_CONFIGURED with requested=false and null request/acknowledgement/outcome references; DENY/REVIEW report NOT_REQUESTED. |
| 12 | Replay reconstructs original authority/policy/target/tool/decision | Local hook receives exact original references/version/hash/action/decision/digest; mutations to the context resolver's request copy cannot change target. Live persisted Replay not exercised. |
| 13 | Trust Memory preserves material execution/outcome change | PARTIAL: local material authority-version change reaches the existing memory hook. No provider execution/outcome observation exists to qualify post-execution memory. Do not equate a material authorization event with observed external outcome. |
| 14 | Provider content cannot modify authority/policy | Local pass: arbitrary provider content/decision/options are not accepted as managed control, and cannot change an out-of-scope DENY. No result ingestion surface is enabled. |
| 15 | No secrets persisted | Local pass: credential-bearing URLs rejected; extra credential/provider-content fields excluded from persisted records/receipt. No real credential used. |

The boundary tests also verify authentication ordering and cross-tenant authority
rejection. Database persistence, authenticated gateway wiring, real MCP schema/error
parsing, bounded response normalization, account budget, per-hop confinement,
external-effect evidence and destination verification remain qualification work.
Enabling a generic executor solely because an App ID exists would weaken this boundary.

## Judge.me: ingestion and governed action are separate

[`judgeme.ts`](../lib/providers/judgeme.ts) contains a pure HMAC helper and an
unqualified reference adapter. No app route imports either. Normalization retains
only bounded references, event/time, rating, original verification label and
curation/hidden state. It always produces INCONCLUSIVE, serverVerified=false,
cryptographicallyVerified=false and executionAuthorized=false. The signature
helper is separate; successfully calling it does not promote the reference adapter.

| Requirement | Current code-backed classification / blocker |
| --- | --- |
| Credentials/install binding | BLOCKED_EXTERNAL and MISSING wiring: trusted tenant/installation/shop mapping must select the credential before processing. Payload tenant/shop cannot select the installation. |
| Authenticity | WORKING local primitive: exact raw-byte HMAC-SHA256, 64-character hex digest, constant-time comparison, 256 KiB ceiling. Live webhook qualification absent. Use the OAuth app secret for OAuth-created hooks, or matching private token for private-token-created hooks. |
| Durable replay | MISSING for Judge.me. Deterministic evidence IDs do not reserve delivery. Same signed bytes verify repeatedly. Existing ledger is available but not wired. |
| Event identifiers | Local `eventId` is a normalized caller reference, not a verified delivery ID. Provider webhook subscription `id` is not a delivery ID. Confirm the real event envelope; otherwise derive a tenant/installation/event-kind/raw-byte-digest reservation key. |
| Subject binding | Local mismatch rejection works for HUMAN/SERVICE/AI_AGENT. Provider reviewer/email is not the authenticated actor. Trusted relationship resolution remains missing. |
| Product/review binding | Local exact `productExternalId` and provider review ID checks work; internal product IDs and merchant external IDs must stay separate. Cross-product/store responses must be rejected. |
| Freshness | Local normalized ISO timestamps must be current and expire within 24 hours. This local policy does not make unsigned timestamps authentic or prove current provider state. Stale/out-of-order webhook handling requires authenticated reconciliation. |
| API/version/retries | Contract details below; no invented delivery retry schedule or versioned webhook guarantee. |
| Evidence ingestion | PARTIAL pure normalization/context composer. No authenticated webhook → durable reservation → Evidence Graph route. |
| Governed action | PARTIAL generic synthetic-interaction composition; no Judge.me executor. A purchase label, rating, provider OAuth scope or valid HMAC grants no Cyber Sentinels authority. |

The [webhook verification guide](https://judge.me/help/en/articles/8299679-verifying-webhooks-from-judge-me)
specifies the signing-secret distinction and raw-byte hex HMAC. It does not establish
a signed timestamp or unique delivery identifier. Retain only sanitized evidence and
the digest; do not retain review text, contact information, raw payload or secrets.
The existing [`event-ledger.ts`](../lib/webhooks/event-ledger.ts) reserves provider/event
pairs and marks processing status, but its duplicate branch does not compare payload
hashes or retry failed processing. A Judge.me integration must namespace installation
keys, detect changed payloads under the same key, and reconcile failed/stale events
before live enablement; a receipt digest is not durable replay protection.

Current [OpenAPI YAML](https://judge.me/api/docs.yaml) specifies
`https://api.judge.me/api/v1`: private/public keys use `X-Api-Token`; OAuth uses
`Authorization: Bearer` and cannot use `X-Api-Token`. OAuth derives the shop from
the token. Review reads require the corresponding private access/read scope.
POST review creation is asynchronous and publicly callable; provider acceptance
does not prove creation. Review update publishes/hides only, not content/rating
editing. The YAML's update path lacks a leading slash; confirm the real route before
use. It lists `review/created`, `review/updated`, `review/created_fail`, and webhook
`failure_count` for consecutive non-200 responses, but supplies no numeric API rate
limit, delivery retry schedule, signed freshness field or unique delivery ID.
Its `openapi: 3.0.0` describes the schema format, not a versioned webhook contract.

The current [API usage guide](https://judge.me/help/en/articles/8409180-using-judge-me-api)
adds details absent from the YAML: review pagination maximum 100; invalid internal
`product_id` may fall back to every store review; `GET /products/-1` resolves external
to internal product IDs. It also says API-created reviews cannot be made verified
or deleted. These findings supersede the older audit's "no maximum found" and
"products not in current YAML" limitations without pretending the YAML contains
those endpoints. Use conservative bounded reads and verify every returned binding;
do not infer scope from a filter. Rate/retry ceilings still need provider confirmation.

For governed actions, SUBMIT_REVIEW would need independent actor authority,
purpose/target policy, explicit test-store permission, and durable destination
confirmation after background creation. EDIT_REVIEW/CHANGE_RATING are not supported
by the cited update API. No create/update review or review-request email was sent.
Exact verified-status labels remain provider assertions with different provenance;
they are not a transaction proof or action grant.
[Verified-status definitions](https://judge.me/help/en/articles/8403775-verified-status-of-judge-me-reviews).

## Validation and implementation scope

Added 14 tests in `tests/provider-execution-qualification.test.mjs`; no new
provider runtime, transport, environment variables, tables, migrations, API scopes
or dependencies. No provider-specific P0/P1 defect requiring runtime enablement
was demonstrated. The canonical executor-exception/provenance corrections are
tracked separately by the execution-proof work, using the existing abstractions.

Command: `npx tsx --test tests/provider-execution-qualification.test.mjs tests/opengraph-boundary.test.mjs tests/judgeme-boundary.test.mjs`.
Result after the canonical execution/provenance corrections: **66 passed, 0 failed, 0 skipped**.
Focused ESLint passed; local documentation links were checked with no broken targets.
This is local contract/boundary evidence only. Real provider receipt, Replay,
Trust Memory and independent destination proof remain unqualified.
