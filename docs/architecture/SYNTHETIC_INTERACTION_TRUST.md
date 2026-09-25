# Synthetic Interaction Trust

Audit date: 2026-09-24. Source baseline: `e9a90f973aacbe6967f14a527540208431a2ec13`.

Synthetic Interaction Trust is a reusable workflow category for interactions by humans, services and AI agents across commerce, reviews and marketplaces. Judge.me is a market signal and potential evidence integration, not a replacement product or an authorization authority.

`AUTHENTICATED ACTOR != AUTHORIZED INTERACTION`

`IDENTITY VERIFIED != AUTHORITY VERIFIED != TRANSACTION VERIFIED != EXECUTION AUTHORIZED`

An authenticated purchaser can still lack authority to publish a review. AI-generated content alone is not evidence of fraud. A risk observation is input to an explicit policy; it does not independently issue DENY. ALLOW records authorization at decision time, not proof that the destination executed an action.

## Canonical workflow and audit

The existing sequence remains Agent Registry -> Authority -> Policy -> Decision -> Receipt -> Replay -> Trust Memory. No second engine, registry, evidence ledger, receipt store, or decision outcome store is introduced.

| Primitive | Existing source and reuse | Boundary or gap |
| --- | --- | --- |
| Actor/agent registry | [`operational-entity.ts`](../../lib/operational-entities/operational-entity.ts) supports human, service, service account, API client and AI-agent operational entities; [`trust-fabric/types.ts`](../../src/lib/trust-fabric/types.ts) defines canonical subject classes. | Public [`registerExternalAgent`](../../lib/public-api/v1/runtime.ts) and signed manifest enrollment currently accept AI_AGENT only. Workflow representations do not add public HUMAN/SERVICE onboarding. |
| Native identity | [`lib/operational-entities`](../../lib/operational-entities) and the public API retain credential, possession-proof and manifest bindings. | Identity confidence does not create action scope or execution authority. |
| Authority | `TrustContract` in [`trust-fabric/types.ts`](../../src/lib/trust-fabric/types.ts) carries permitted scope, objective, evidence requirements, policy version, freshness and revocation state. [`canonical.ts`](../../src/lib/trust-transaction/canonical.ts) resolves authority and validates current scope. | Provider attributes and caller assertions cannot grant authority. |
| Delegation | [`delegated-authority.ts`](../../lib/operational-entities/delegated-authority.ts) and [`delegated-authority-server.ts`](../../lib/operational-entities/delegated-authority-server.ts) preserve parent scope, subset checks, signatures, expiry, lineage and revocation. | The workflow composer does not manufacture or activate delegation. A current tenant-bound authority must already resolve through the existing system. |
| Purpose lineage | [`purpose-lineage.ts`](../../src/lib/trust-fabric/purpose-lineage.ts) evaluates declared objective, action purpose, observed purpose and continuity evidence. | A provider purchase or review label does not establish a delegated business purpose. |
| Target and external effect | [`external-effect-boundary.ts`](../../src/lib/trust-fabric/external-effect-boundary.ts) validates tenant, actor, target, action, environment, effect, credential and channel scope. | Every requested external action needs its own bounded authority; a site's public availability grants none. |
| Policy and decision | [`canonical.ts`](../../src/lib/trust-transaction/canonical.ts) calls [`contracts.ts`](../../src/lib/trust-fabric/contracts.ts), evaluates current authority/evidence and owns ALLOW/REVIEW/DENY. [`authority-integrity.ts`](../../lib/trust-fabric/authority-integrity.ts) retains authority observations and provenance. | The new category composes canonical inputs; it does not create a policy evaluator or permit a provider verdict to override the canonical result. |
| Evidence | [`providers/adapters.ts`](../../lib/providers/adapters.ts) defines `ProviderAdapter`, `CanonicalProviderEvidence`, `ProviderNeutralEvidence`; canonical transactions accept `CanonicalContextEvidence`. | Context must retain source, digest, timestamp, mapping/limitations and assertion status. Normalization is not verification. |
| Client API evidence | [`client-evidence.ts`](../../lib/public-api/v1/client-evidence.ts) reserves verified provider classes and stores client submissions as AGENT_ASSERTED. | Public callers cannot claim to be Judge.me or submit provider-verified identity/authority evidence. |
| Receipts | `SafeCanonicalTransactionReceipt` in [`canonical.ts`](../../src/lib/trust-transaction/canonical.ts), reconstructed by [`server.ts`](../../lib/trust-transaction/server.ts), includes policy/authority/evidence references and execution continuity. | A local composed input is not a persisted receipt. |
| Replay and Trust Memory | Existing canonical persistence calls in [`server.ts`](../../lib/trust-transaction/server.ts) append Replay and material Trust Memory through the existing RPCs. | The composer has no persistence side effects; material-memory behavior remains canonical. |
| API scopes | [`contracts.ts`](../../lib/public-api/v1/contracts.ts) already has agents, authority, trust, evidence, outcomes, review and incident scopes. | No new scopes are needed for this local boundary. No API is added or silently broadened. |
| Incoming webhooks | [`event-ledger.ts`](../../lib/webhooks/event-ledger.ts) offers provider/event reservation and processing states; existing provider handlers authenticate before reservation. | There is no qualified Judge.me installation/webhook ingestion path. Signature verification alone is insufficient for freshness, tenant binding and replay prevention. |
| Outgoing webhooks | [`webhooks.ts`](../../lib/public-api/v1/webhooks.ts) and [`webhook-delivery.ts`](../../lib/public-api/v1/webhook-delivery.ts) already provide decision, receipt, outcome, authority and contradiction notifications. | No Judge.me event is made a Cyber Sentinels authorization event. |
| Decision Outcome Review | `normalizeDecisionOutcomeReview` and `attachCanonicalDecisionOutcomeReview` in [`canonical.ts`](../../src/lib/trust-transaction/canonical.ts) and [`server.ts`](../../lib/trust-transaction/server.ts) retain original policy/reasons/decision plus later provider/runtime/destination outcomes or adjudication. | Later observations do not rewrite the original authorization decision. |
| V2 context | [`operational-incidents/model.ts`](../../lib/operational-incidents/model.ts) and [`server.ts`](../../lib/operational-incidents/server.ts) verify referenced evidence, preserve separate outcomes, expose UNKNOWN context and append chronology. | V1 decides. V2 observes, explains and builds context. Correlation is not attribution; absent context cannot silently authorize an action. |

## Governed action vocabulary

The workflow maps the requested names to lowercase canonical action strings and existing external-effect kinds. These are generic interaction capabilities, not claims that Judge.me exposes every action through an API.

| Governed action | Canonical action | Existing effect |
| --- | --- | --- |
| SUBMIT_REVIEW | `submit_review` | ARTIFACT_PUBLICATION |
| EDIT_REVIEW | `edit_review` | DATA_WRITE |
| CREATE_ACCOUNT | `create_account` | ACCOUNT_CREATION |
| POST_CONTENT | `post_content` | ARTIFACT_PUBLICATION |
| MAKE_PURCHASE | `make_purchase` | DATA_WRITE |
| ISSUE_REFUND | `issue_refund` | DATA_WRITE |
| CHANGE_RATING | `change_rating` | DATA_WRITE |
| SEND_MESSAGE | `send_message` | NETWORK_EXTERNAL_COMMUNICATION |
| REQUEST_PAYOUT | `request_payout` | DATA_WRITE |
| CREATE_LISTING | `create_listing` | ARTIFACT_PUBLICATION |
| APPROVE_TRANSACTION | `approve_transaction` | DATA_WRITE |
| EXECUTE_PROMOTION | `execute_promotion` | ARTIFACT_PUBLICATION |

Each request binds an exact target, purpose, environment and payload digest. These effect mappings express the bounded requested operation. Multi-step operations must be split where effects differ: drafting a listing, publishing it, sending a notification and moving funds are separate authority questions. Financial actions require appropriate destination and financial boundary evidence; the generic DATA_WRITE classification is not a payment permission. There is no downstream executor in this change.

The composer requires REVIEW for MAKE_PURCHASE, ISSUE_REFUND, REQUEST_PAYOUT, APPROVE_TRANSACTION and EXECUTE_PROMOTION because a qualified consequential executor and financial/destination bindings are not supplied by this boundary. The canonical engine may still DENY where authority or other constraints fail; the local boundary cannot turn those consequential requests into ALLOW. This is an explicit unqualified-capability constraint, not a provider risk verdict. An unresolved requested delegation likewise requires REVIEW.

HUMAN maps to the existing human subject; SERVICE uses the existing machine-identity/service operational entity representation; AI_AGENT uses the existing AI-agent subject. This category does not change the public enrollment restriction described above. Delegated actions remain bounded by the current parent and child authority, not by the actor label.

## Separate evidence dimensions

| Dimension | Meaning | Does not establish |
| --- | --- | --- |
| TRANSACTION_VERIFIED | Attributed evidence about a specific commerce transaction and its binding to the relevant subject/product/order. | Review authority, genuine identity, content truth, or successful execution. |
| IDENTITY_VERIFIED | Evidence accepted through the existing identity or native-possession verification path. | Permission to buy, post, rate, refund or delegate. |
| AUTHORITY_VERIFIED | Current tenant-bound authority, delegation, purpose, target and action scope accepted by the canonical evaluator. | Purchase provenance or execution completion. |
| CONTENT_INTERACTION_RISK | Attributed content/behavior/context observations, with uncertainty and source limitations. | An automatic DENY or a finding of fraud. AI authorship is not an adverse verdict. |
| EXECUTION_AUTHORIZED | The canonical decision allows this precise request under current conditions. | A provider receipt, command acknowledgement, destination outcome, or standing authorization for later requests. |

The implementation adds a pure canonical-input composer in [`src/lib/synthetic-interaction-trust/workflow.ts`](../../src/lib/synthetic-interaction-trust/workflow.ts) and a neutral, unqualified Judge.me provider boundary in [`lib/providers/judgeme.ts`](../../lib/providers/judgeme.ts). Neither makes a network request, invokes an external action, persists a decision, or starts provider qualification. A caller cannot set a verified authority state through these inputs.

`composeSyntheticInteraction(request, serverContext)` returns the existing `CanonicalTrustTransactionInput`. The request carries actor type and references, action, purpose, target, environment, content digest, idempotency key and optional credential/channel/delegation references. The trusted server context supplies evaluation time, purpose lineage, typed observations and any versioned-policy authorization result through the existing managed authorization hook. A separate `serverContext.delegation` carries the exact delegation reference and existing native evaluator's authorization result; it must match the requested reference. A policy ALLOW cannot substitute for a missing delegation evaluation. The caller must resolve these results through trusted server services, not deserialize server context from a public request.

The composer does not accept a client identity/authority-verified boolean or arbitrary `managedControl` passthrough. Request, observation and constraint bindings contribute to the payload digest so a changed request cannot inherit an earlier idempotency receipt. All four observation facets carry attributed claims with `serverVerified = false`; their names identify the question addressed, not an achieved verification state. They cannot satisfy configured identity/authority proof requirements. The four facets plus the existing canonical ALLOW authorization distinguish all five dimensions without introducing another receipt or projection architecture.

The Judge.me builder and workflow composer remain separate local boundaries. A future trusted integration layer must authenticate and bind provider material before attaching it to a real canonical request; calling a normalization helper is not that qualification.

Existing canonical behavior needs care: `StoredProviderEvidence.outcome = FAILED` contributes to a hard denial, and some context type names trigger review. Content risk must therefore remain neutral context with explicit policy interpretation, rather than being mapped to a failed identity/provider result or an arbitrary decision-driving type. The provider-neutral display normalizer also derives identity continuity from some outcome strings; a purchase assertion must not be mislabeled as verified identity. Tests must protect these distinctions without weakening the canonical engine.

## Judge.me public integration audit

The official [OpenAPI document](https://judge.me/api/docs.yaml) describes the REST base `https://api.judge.me/api/v1`, review and product resources, widgets and webhook management. Review read/context surfaces and documented review creation are candidate integration points; webhook keys include `review/created`, `review/updated` and `review/created_fail`. An observation arriving after a review was submitted cannot act as a pre-execution authorization gate. Such a gate must sit in a controlled caller before the destination action.

The [API guide](https://judge.me/help/en/articles/8409180-using-judge-me-api) separates public widget access from private server-side read/write access. It states that API-created reviews cannot be marked verified, and existing reviews cannot be promoted to verified through the API. Do not create reviews as a qualification workaround or infer private access from a public widget response.

The [OAuth guide](https://judge.me/help/en/articles/8283047-setting-up-oauth) describes merchant authorization with least-privilege scopes such as `read_reviews` and `read_orders`. These are external Judge.me grants, not new Cyber Sentinels API scopes or authority to perform a customer's business action. A future installation must bind the authorized shop and credentials to an existing tenant with authenticated ownership; payload shop names must not choose the tenant.

Judge.me's [verified-status documentation](https://judge.me/help/en/articles/8403775-verified-status-of-judge-me-reviews) distinguishes `confirmed-buyer`, `buyer`, `verified-purchase`, `semi-verified-purchase`, `admin` and non-verified states. These labels have different provenance: `confirmed-buyer` need not identify the same order, while `verified-purchase` has a stricter order relation. Preserve the original provider label; do not flatten all labels to TRANSACTION_VERIFIED or Cyber Sentinels identity verification. Its [verified-review guide](https://judge.me/help/en/articles/8376284-verified-reviews) also states that editing review content does not change verification status. A purchase-related badge therefore cannot prove that edited content is accurate or authorized. The status document includes an `admin` category while the current review guide describes automatic verification; retaining exact source labels avoids resolving that documentation difference by inventing a guarantee.

The official [webhook verification guide](https://judge.me/help/en/articles/8299679-verifying-webhooks-from-judge-me) specifies a hexadecimal HMAC-SHA256 over the raw request body, compared against `JUDGEME-HMAC-SHA256`. The secret is the OAuth application's secret for OAuth-created webhooks, or the private API token for webhooks created with that token. The cited examples use hex, not Base64. A valid signature establishes possession of that secret for those bytes. It does not establish freshness, a unique delivery, actor identity, transaction-to-subject binding, or delegated execution authority. The documented signature scheme does not itself provide a signed timestamp freshness guarantee.

Before any real ingestion, a future implementation must supply durable installation-to-tenant binding, authenticated event/source retrieval as appropriate, bounded schemas and metadata, exact raw-body verification, safe secret handling, provider/event-or-digest replay reservation, stale-event/current-state handling, and reference bindings to the authorized subject and target. The existing ledger is a reusable primitive; this audit does not claim that these installation and replay requirements have been implemented or qualified for Judge.me.

## Delivered boundary and remaining gaps

The reusable action/actor mapping and canonical-input composition are local implementation work. Judge.me normalization is a reference boundary: it retains provider assertions with `serverVerified = false` and `cryptographicallyVerified = false`. No live token, OAuth installation, webhook endpoint, provider-owned record, verified purchase proof or real external execution is asserted. Real Judge.me qualification remains BLOCKED_EXTERNAL until legitimate credentials/access and an authorized qualification are available.

No new tables, migrations, API scopes, environment variables or Production deployment are required or performed. The existing trust stores can represent the proposed workflow. Future authenticated provider ingestion and action execution remain distinct work; any newly demonstrated storage or scope gap must be audited before expanding either.

This delivery is a library/request boundary, not a wired merchant gateway. Canonical decisions still use the caller's established authentication, tenant, authority, policy and persistence dependencies. Real governed deployment and external integration qualification have not been exercised.

The [Stripe Identity qualification record](../providers/STRIPE_IDENTITY_QUALIFICATION.md) remains separate and unchanged by Judge.me work: implementation WORKING, session lifecycle/webhook IMPLEMENTED, real provider qualification BLOCKED_EXTERNAL, Production exercised NO.

## Validation criteria

Focused tests cover the action/actor mappings, immutable canonical request bindings, provider assertion limits, unknown or stale/mismatched evidence, and preservation of the five dimensions. Canonical integration tests must show that identity or purchase evidence cannot replace authority, missing/revoked/out-of-scope authority is still enforced, and neutral AI-content/risk observations do not automatically DENY. Receipts, Replay and Trust Memory remain the existing canonical projections.

Repository full tests, lint, typecheck and build are required for the implementation branch. Their actual results belong in the PR and release report; this architecture document is not a declaration that a provider was exercised or a deployment occurred.
