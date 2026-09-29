# V2 search coverage closure

Reviewed 27 September 2026 against main
`f1c12752a130acfc0721f9b124900c7726c5a26e` after PR #108 merged.

All **36 priority keyword families** and **28 priority questions** have an
explicit owner below. Coverage means a substantive public explanation exists at
the mapped destination; it does not mean the exact phrase must be repeated, a
provider is qualified, or a search engine has indexed or cited the page.

No new public URL is required. The 42 canonical sitemap destinations remain the
same. Existing page-level canonicals exclude fragments; fragments below locate
answers within each owner. A supporting contextual link does not create another
canonical owner.

## Canonical owners

| Reference | Public destination | Owned explanation |
| --- | --- | --- |
| [Hub][hub] | `/resources/agent-security` | Agent-security overview and navigation |
| [Authorization][authorization] | `/resources/agent-security/agent-authorization` | Permission for an identified actor, action, purpose and target |
| [Identity/authority][identity] | `/resources/agent-security/agent-authorization#identity-and-authority` | Identity, authentication and bounded business authority |
| [Runtime][runtime] | `/resources/agent-security/agent-authorization#runtime-authority` | Current authorization, changed authority and revocation |
| [Delegation][delegation] | `/resources/agent-security/agent-authorization#delegation` | Parent grants, narrowed scope and authority lineage |
| [Decisions][decisions] | `/resources/agent-security/agent-authorization#decisions` | Decision semantics and executor enforcement |
| [Least privilege][least-privilege] | `/resources/agent-security/agent-authorization#least-privilege` | Action/target/time limits and permission control |
| [MCP][mcp] | `/resources/agent-security/mcp-tool-authorization` | Securing tool use before external effects |
| [MCP access][transport] | `/resources/agent-security/mcp-tool-authorization#transport-and-action` | HTTP transport authorization versus business-action permission |
| [External APIs][external-apis] | `/resources/agent-security/mcp-tool-authorization#external-apis` | Audience separation, downstream credentials and client consent |
| [Targets][targets] | `/resources/agent-security/mcp-tool-authorization#target-authority` | Tool permission, domain/URL scope and network-safety limits |
| [Gateway][gateway] | `/resources/agent-security/mcp-tool-authorization#gateway` | External-effect authority and governed dispatch lifecycle |
| [Receipts][receipts] | `/verification-replay#action-receipts` | Minimized decision record, provenance and observed outcome |
| [Replay][replay] | `/verification-replay` | Reconstruction of recorded chronology without re-execution |
| [Execution Trust][execution-trust] | `/platform#execution-trust` | Product model and enterprise trust infrastructure |
| [Governance][governance] | `/enterprise/agent-governance` | Enterprise ownership, purpose, policy and review responsibilities |
| [Synthetic interactions][synthetic] | `/resources/agent-security/synthetic-interaction-trust` | Separate identity, transaction, authority, risk and authorization facets |
| [Review actions][review-actions] | `/resources/agent-security/synthetic-interaction-trust#example` | Permission to draft, publish, change a rating or request a refund |

## Priority keyword coverage: 36 of 36 mapped

| # | Requested family | Canonical answer owner |
| --- | --- | --- |
| 1 | AI agent authorization | [Authorization][authorization] |
| 2 | runtime AI authorization | [Runtime][runtime] |
| 3 | runtime agent authorization | [Runtime][runtime] |
| 4 | AI agent security | [Hub][hub] |
| 5 | autonomous agent security | [Hub][hub] |
| 6 | AI agent governance | [Governance][governance] |
| 7 | autonomous agent governance | [Governance][governance] |
| 8 | execution trust | [Execution Trust][execution-trust] |
| 9 | AI agent authority | [Identity/authority][identity] |
| 10 | agent authority | [Identity/authority][identity] |
| 11 | authority lineage | [Delegation][delegation] |
| 12 | AI delegation | [Delegation][delegation] |
| 13 | AI agent delegation | [Delegation][delegation] |
| 14 | AI agent revocation | [Runtime][runtime] |
| 15 | runtime authority | [Runtime][runtime] |
| 16 | continuous authorization for AI agents | [Runtime][runtime] |
| 17 | MCP security | [MCP][mcp] |
| 18 | MCP authorization | [MCP access][transport] |
| 19 | MCP tool authorization | [MCP][mcp] |
| 20 | AI tool authorization | [MCP][mcp] |
| 21 | AI agent audit trail | [Receipts][receipts] |
| 22 | AI action evidence | [Receipts][receipts] |
| 23 | AI decision receipt | [Receipts][receipts] |
| 24 | AI agent action receipt | [Receipts][receipts] |
| 25 | AI agent replay | [Replay][replay] |
| 26 | agent action replay | [Replay][replay] |
| 27 | AI trust infrastructure | [Execution Trust][execution-trust] |
| 28 | enterprise agent trust | [Execution Trust][execution-trust] |
| 29 | synthetic interaction trust | [Synthetic interactions][synthetic] |
| 30 | external-effect authority | [Gateway][gateway] |
| 31 | agent-to-agent delegation | [Delegation][delegation] |
| 32 | agent policy enforcement | [Decisions][decisions] |
| 33 | AI agent least privilege | [Least privilege][least-privilege] |
| 34 | AI agent permission control | [Least privilege][least-privilege] |
| 35 | AI agent access control | [Least privilege][least-privilege] |
| 36 | autonomous agent auditability | [Replay][replay] |

## Priority question coverage: 28 of 28 mapped

| # | Requested question | Canonical answer owner | Answer to verify |
| --- | --- | --- | --- |
| 1 | What is AI agent authorization? | [Authorization][authorization] | Current permission for an actor, action, target and purpose |
| 2 | What is runtime authorization for AI agents? | [Runtime][runtime] | Evaluate current grants before consequential effects |
| 3 | How do you stop an AI agent performing an unauthorized action? | [Decisions][decisions] | Gate the executor and remove bypass paths; REVIEW/DENY do not dispatch |
| 4 | What is AI agent authority? | [Identity/authority][identity] | Bounded permission from an accountable grantor |
| 5 | What is authority lineage? | [Delegation][delegation] | Accountable parent-to-delegate grant chain with scope and lifecycle state |
| 6 | How does AI agent delegation work? | [Delegation][delegation] | Child scope stays within parent authority and is checked at action time |
| 7 | How can AI agent authority be revoked? | [Runtime][runtime] | Check revoked grants before future effects; completed effects are not undone |
| 8 | What is continuous authorization for AI agents? | [Runtime][runtime] | Re-evaluate permission at consequential workflow boundaries |
| 9 | How should MCP tool calls be secured? | [MCP][mcp] | Protect transport and independently authorize action and target |
| 10 | What is MCP authorization? | [MCP access][transport] | Protected HTTP-server access is distinct from enterprise business permission |
| 11 | What is an AI agent action receipt? | [Receipts][receipts] | Minimized decision projection with integrity digest, not proof of execution |
| 12 | What should an AI agent audit trail contain? | [Receipts][receipts] | Actor, authority, purpose, target, policy, decision, reasons and separate outcome |
| 13 | How can an AI agent action be replayed? | [Replay][replay] | Reconstruct persisted chronology; do not repeat the action |
| 14 | What is Execution Trust? | [Execution Trust][execution-trust] | Current authorization connected to explanatory evidence |
| 15 | Authentication vs authorization for AI agents | [Identity/authority][identity] | Credential/identity validation does not grant permission for every action |
| 16 | AI agent identity vs AI agent authority | [Identity/authority][identity] | Who is acting and what that actor may do are separate questions |
| 17 | AI agent governance vs AI agent security | [Governance][governance] | Ownership/policy/review responsibilities and action/target enforcement |
| 18 | How should enterprises govern autonomous agents? | [Governance][governance] | Accountable ownership, declared purpose, sensitive-action review and replayable evidence |
| 19 | How do ALLOW / REVIEW / DENY decisions work? | [Decisions][decisions] | Context-bound permission, held review or non-authorization |
| 20 | How is evidence preserved behind autonomous actions? | [Receipts][receipts] | Source provenance and decision references with minimized data and separate outcomes |
| 21 | What happens when authority changes during execution? | [Runtime][runtime] | Fresh checks before the next effect; previous ALLOW is historical |
| 22 | How can agent-to-agent delegation be controlled? | [Delegation][delegation] | Narrow scope, constrain redelegation, inspect parent expiry/revocation |
| 23 | How should AI tools be authorized per target/domain? | [Targets][targets] | Distinguish domain, subdomain and exact URL; qualify every network hop |
| 24 | How can enterprises enforce least privilege for AI agents? | [Least privilege][least-privilege] | Limit actions, targets and time; enforce at execution and test bypasses |
| 25 | What is Synthetic Interaction Trust? | [Synthetic interactions][synthetic] | Separate evidence facets from current execution authorization |
| 26 | How should AI-generated reviews or actions be governed? | [Review actions][review-actions] | Bind actor, content, product/review and purpose to the exact authorized action |
| 27 | How do you govern AI agents using external tools? | [Gateway][gateway] | Current canonical decision before qualified dispatch, then separate evidence/outcome |
| 28 | How do you secure MCP access to external APIs? | [External APIs][external-apis] | Separate token audiences and downstream account binding; preserve per-client consent |

## Changes and claim limits

- Improve the existing authorization article with explicit authority definition,
  least-privilege guidance and continuous-authorization semantics.
- Improve the existing MCP article with external-API authorization and explicit
  external-effect authority. Cite the versioned [MCP authorization specification](https://modelcontextprotocol.io/specification/2025-11-25/basic/authorization)
  and [MCP security guidance](https://modelcontextprotocol.io/docs/2025-11-25/tutorials/security/security_best_practices),
  checked 27 September 2026. These describe integration requirements, not proof
  that Cyber Sentinels operates a live MCP proxy.
- Improve the existing synthetic-interaction article with review-action binding
  and explicit Judge.me `BLOCKED_EXTERNAL` / executor `NOT_CONFIGURED` limits.
  OpenGraph retains `IMPLEMENTED NOT EXERCISED` / `BLOCKED_EXTERNAL`.
- Add hub links to the existing least-privilege and external-API answer fragments.
  Article contents navigation, breadcrumbs, social metadata and TechArticle source
  references already derive from the shared resource model.
- Keep the three existing articles, hub, product, enterprise and Replay owners.
  No near-duplicate FAQ, new schema type, keyword landing page or robots change is
  required. Editorial dates must agree across visible text, schema and sitemap.

The enterprise page owns governance comparisons; the security hub remains an
overview. The authorization article may summarize evidence but directs receipt
detail to Replay. Synthetic interactions own the evidence-facet model, while the
MCP article owns external-tool controls. These distinctions avoid adding competing
pages for synonymous wording.

Google/Bing indexing and AI citations are **NOT YET MEASURED** for this closure.
Search Console/Bing verification and URL inspection require owner access. No
ranking, citation, traffic, compliance or live-provider qualification is promised.
Use [SEARCH_VISIBILITY.md](SEARCH_VISIBILITY.md) for the observation contract.

## Focused validation

On 27 September 2026, `npm run test:search` passed **7/7 tests**, with zero failed,
skipped or cancelled. The suite checks sitemap ownership and editorial dates,
robots exclusions, preview noindex, anonymous/public versus protected access,
server-rendered answers, canonical/social metadata, JSON-LD, breadcrumbs and
resource links. A separate local comparison against the original request verified
all 36 keyword rows and 28 question rows exactly, with 18 valid answer destinations
across seven canonical pages and no missing route or fragment. The complete sitemap
still contains 42 URLs. Scoped `git diff --check` passed. These are repository
checks; post-release crawl/index/citation observation remains unperformed.

[hub]: /resources/agent-security
[authorization]: /resources/agent-security/agent-authorization
[identity]: /resources/agent-security/agent-authorization#identity-and-authority
[runtime]: /resources/agent-security/agent-authorization#runtime-authority
[delegation]: /resources/agent-security/agent-authorization#delegation
[decisions]: /resources/agent-security/agent-authorization#decisions
[least-privilege]: /resources/agent-security/agent-authorization#least-privilege
[mcp]: /resources/agent-security/mcp-tool-authorization
[transport]: /resources/agent-security/mcp-tool-authorization#transport-and-action
[external-apis]: /resources/agent-security/mcp-tool-authorization#external-apis
[targets]: /resources/agent-security/mcp-tool-authorization#target-authority
[gateway]: /resources/agent-security/mcp-tool-authorization#gateway
[receipts]: /verification-replay#action-receipts
[replay]: /verification-replay
[execution-trust]: /platform#execution-trust
[governance]: /enterprise/agent-governance
[synthetic]: /resources/agent-security/synthetic-interaction-trust
[review-actions]: /resources/agent-security/synthetic-interaction-trust#example
