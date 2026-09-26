export const RESOURCE_ROOT = "/resources/agent-security";
export const RESOURCE_REVIEWED = "2026-09-25";

export type SecurityResource = {
  slug: string; title: string; answer: string; description: string;
  sections: { id: string; title: string; paragraphs: string[]; example?: string }[];
  related: { href: string; label: string }[];
  sources: { href: string; label: string; supports: string }[];
};

export const securityResources: SecurityResource[] = [
  {
    slug: "agent-authorization", title: "What is AI agent authorization?",
    description: "How agent identity, bounded authority, delegation, purpose and current policy determine whether an autonomous action may proceed.",
    answer: "AI agent authorization determines whether an identified agent may perform a specific action on a specific target, for a stated purpose, under current authority and policy. Authentication establishes who is connecting; it does not establish permission for every action the agent can technically perform.",
    sections: [
      { id: "identity-and-authority", title: "Identity is not authority", paragraphs: [
        "A registry gives an agent an operational identity and accountable owner. A credential can establish possession of a key. Neither registration nor successful authentication grants business authority. The authority grant is a separate, bounded record of permitted actions, targets, purpose, environment and time.",
        "For example, an agent authenticated to a document service may be authorized to read a public handbook but not export a customer archive. Both requests use the same identity. The target, purpose and requested effect make the authorization questions different. A valid credential is not unlimited authority.",
        "A useful authorization request identifies the actor and enterprise, the proposed action, the resource, the environment and the purpose. The decision service resolves current grants and policy from trusted state. An agent's assertion that its owner approved the action is evidence to evaluate, not a grant the agent may issue to itself.",
      ] },
      { id: "decisions", title: "How do ALLOW, REVIEW and DENY stop unauthorized actions?", paragraphs: [
        "ALLOW authorizes the evaluated action in its evaluated context. REVIEW requires the workflow to stop for additional evidence or accountable intervention. DENY means the action is not authorized. REVIEW is not a softer ALLOW, and neither a timeout nor a provider error should be treated as permission.",
        "Enforcement requires the component that can actually cause the external effect to honor the result. Place the decision before dispatch, bind it to the exact action and target, and prevent the agent from reaching the same executor through an uncontrolled path. A decision record alone does not prove a downstream system was blocked.",
        "Separate the decision from the execution outcome. Record whether an attempt was made, acknowledged, failed, succeeded or remains unknown. A successful tool response cannot retroactively authorize an action. An ALLOW receipt cannot prove that the requested consequence occurred.",
      ], example: "Illustrative decision, not an API payload\nActor: reporting agent\nAuthority: read approved public handbook\nRequest: export customer archive\nTarget scope: outside grant\nDecision: DENY\nExecution attempted: no" },
      { id: "delegation", title: "How do delegation and authority lineage work?", paragraphs: [
        "Authority lineage connects the accountable grantor to the agent and any subsequent delegate. It should retain parent grants, scope, versions, expiry, acceptance and revocation state. The chain answers who could delegate, to whom, for what purpose and within which constraints.",
        "A delegate must not receive more authority than its parent can confer. Limit actions and tools independently, restrict targets and environments, and preserve time and execution limits. Permission to delegate once does not imply unlimited redelegation. Agent-to-agent delegation needs the same accountable chain as a human-to-agent grant.",
        "At action time, evaluate the delegation against the parent authority and current identity state. A matching delegation identifier is not enough if its parent expired, the delegate changed, or the requested target falls outside the delegated scope. Missing or unresolved delegation should stop unattended execution rather than invite the agent to guess.",
      ] },
      { id: "runtime-authority", title: "What happens when authority changes during execution?", paragraphs: [
        "Runtime authorization checks whether authority still applies when a consequential action is about to occur. Long-running work can encounter a revoked grant, a changed target, a new policy or evidence that no longer supports the original decision. A previous ALLOW is historical evidence, not permanent authority.",
        "Revocation prevents future use of the revoked grant when the enforcing path checks current state. It does not undo a completed action. A queued or in-flight operation needs a defined cancellation boundary and a fresh check before its next external effect; claiming universal retroactive revocation would be misleading.",
        "Idempotent retry is also distinct from new authority. Returning a prior receipt can make retries safe, but that receipt should not launch another action. Give a genuinely new attempt its own evaluation and retain a link to the previous transaction so an auditor can understand the change.",
      ] },
      { id: "evidence", title: "What should the audit trail contain?", paragraphs: [
        "Preserve the actor, accountable owner, authority and delegation references, purpose, target, action, policy version, decision reasons, timestamp and evidence provenance. Add the execution attempt and observed outcome separately. Retain enough context to reconstruct the decision without copying secrets or unnecessary source documents.",
        "Cyber Sentinels connects Agent Registry, Authority, Policy, Decision, Receipt, Replay and Trust Memory. Its canonical decisions are ALLOW, REVIEW and DENY. The public API documentation describes the supported contract; actual external enforcement depends on the connected execution boundary and its qualification. The product governs the action rather than substituting a generic governance opinion for authorization.",
      ] },
    ],
    related: [
      { href: "/developers/quickstart", label: "Agent Registry and authority lifecycle" },
      { href: "/verification-replay#action-receipts", label: "Action receipts and audit evidence" },
      { href: "/enterprise/agent-governance", label: "Enterprise governance and accountable ownership" },
      { href: `${RESOURCE_ROOT}/mcp-tool-authorization`, label: "MCP tools and target authority" },
    ],
    sources: [
      { href: "https://csrc.nist.gov/pubs/sp/800/207/final", label: "NIST SP 800-207: Zero Trust Architecture", supports: "Separates authentication and authorization and rejects implicit trust based on network location. It is architectural context, not a Cyber Sentinels certification." },
      { href: "https://genai.owasp.org/llmrisk/llm062025-excessive-agency/", label: "OWASP: Excessive Agency", supports: "Explains risks from excessive functionality, permissions and autonomy; supports limiting what an agent can cause." },
    ],
  },
  {
    slug: "mcp-tool-authorization", title: "How should MCP tool calls be authorized?",
    description: "Separate MCP transport access from tool, action and target authority; understand the governed OpenGraph boundary and its current limits.",
    answer: "Secure MCP tool use requires both authenticated access to the server and authorization for the proposed action and target. A client allowed to call a tool is not automatically allowed to use every URL, account or resource the tool can reach. Evaluate current authority, delegation, purpose and policy before the external effect.",
    sections: [
      { id: "transport-and-action", title: "Transport access and business authority are different checks", paragraphs: [
        "The MCP authorization specification defines an authorization flow for HTTP transports. It addresses access to protected MCP servers, including token audience and scope. That transport permission does not by itself express every enterprise rule about a tool's target, data, purpose or consequence.",
        "Keep credentials at the intended service boundary, validate the token's intended recipient, and request only necessary privileges. Then apply the business decision to the exact tool invocation. Do not interpret successful MCP authentication, an available network connection or an agent's model identity as blanket permission to act.",
        "Stdio tools have a different credential and process boundary from hosted HTTP servers. The surrounding application still needs an accountable owner and restrictions on what the tool can do. A local process can have substantial external effects; being local does not make it authorized.",
      ] },
      { id: "target-authority", title: "Authorize the target independently of the tool", paragraphs: [
        "A URL is security-sensitive input. First identify the intended target and compare it with the current grant. A domain, a proper subdomain and an exact URL/path are different scopes. Permission for a domain must not silently become permission for a similarly named domain or every subdomain.",
        "Target authority and network safety answer different questions. Public reachability does not prove ownership or permission. Conversely, an authorized-looking hostname is not enough to establish a safe destination if DNS, redirects or rendering subresources can take the request elsewhere.",
        "Reject unsupported schemes, embedded credentials and internal or metadata destinations. Apply target constraints to every relevant network hop. If the external provider does not expose controls that can be qualified, do not assume that validating the initial URL prevents later scope escape. Stop execution until the required boundary can be demonstrated.",
      ] },
      { id: "gateway", title: "A governed tool request lifecycle", paragraphs: [
        "An agent or MCP client presents an intended action to the trust gateway. The gateway resolves identity and enterprise context, current authority, delegated authority, purpose, requested tool, target URL/domain and policy. The canonical decision remains ALLOW, REVIEW or DENY; the provider is an execution target, not the decision authority.",
        "Only ALLOW may reach an executor, and ALLOW alone cannot make an unconfigured executor available. REVIEW and DENY must stop dispatch. Preserve an acknowledgement and a normalized outcome only when they actually exist. A provider failure or timeout is not evidence that the action succeeded.",
      ], example: "Illustrative control chain\nAI agent / MCP client → Trust Gateway\nIdentity → Authority → Delegation → Purpose\nTarget → Tool/action → Policy\nALLOW / REVIEW / DENY\nQualified executor, only if allowed\nEvidence → Receipt → Replay → Trust Memory" },
      { id: "opengraph", title: "OpenGraph: implemented boundary, unqualified live execution", paragraphs: [
        "OpenGraph provides web metadata and related retrieval tools. Cyber Sentinels models the bounded opengraph.site action as an external governed tool. OpenGraph is not a trust provider, and OPENGRAPH_RESULT != CYBER_SENTINELS_DECISION.",
        "The current Cyber Sentinels implementation is IMPLEMENTED NOT EXERCISED / BLOCKED_EXTERNAL. It composes requests through the existing canonical decision engine, narrows domain/subdomain/exact-URL scope and requires explicit tool permission. It is not an installed MCP proxy or a public OpenGraph endpoint, and it has not been qualified with the real provider.",
        "Live execution is deliberately unavailable while credentials and provider-side DNS, redirect and subresource enforcement remain unqualified. An ALLOW result returns an unconfigured execution state rather than making a provider call. This boundary does not promise arbitrary web scanning or universal third-party enforcement.",
      ] },
      { id: "evidence", title: "Keep useful evidence without retaining the webpage", paragraphs: [
        "A tool decision should retain the actor and enterprise, the requested action and normalized target scope, the authority used, policy/version, reasons, timestamp and whether execution was attempted. Evidence provenance should distinguish an agent assertion, a provider observation and the Cyber Sentinels decision.",
        "Link the receipt and Replay chronology to the original request. Store only the safe outcome needed to explain the action. API keys, authentication headers and unnecessary raw webpage content do not belong in an audit receipt. Trust Memory can preserve material change without making past permission permanent.",
      ] },
    ],
    related: [
      { href: `${RESOURCE_ROOT}/agent-authorization#delegation`, label: "Delegated authority and revocation" },
      { href: "/developers/docs#integrations", label: "Public integration documentation" },
      { href: "/verification-replay", label: "Replay and outcome evidence" },
    ],
    sources: [
      { href: "https://modelcontextprotocol.io/specification/2025-11-25/basic/authorization", label: "MCP authorization specification", supports: "Defines HTTP transport authorization, audience binding and scope handling; business-action policy remains a separate implementation concern." },
      { href: "https://www.rfc-editor.org/rfc/rfc9700", label: "IETF RFC 9700: OAuth 2.0 Security Best Current Practice", supports: "Supports restricting token privileges and binding access tokens to their intended resource servers." },
      { href: "https://www.opengraph.io/docs/mcp", label: "OpenGraph MCP documentation", supports: "Describes OpenGraph's own hosted and local integration surfaces, not Cyber Sentinels production qualification." },
    ],
  },
  {
    slug: "synthetic-interaction-trust", title: "What is synthetic interaction trust?",
    description: "Evaluate authority behind human, service and AI-agent interactions without confusing identity, transaction evidence, content risk or permission to execute.",
    answer: "Synthetic interaction trust evaluates whether a human, service or AI agent is authorized to perform a particular interaction, such as posting content or requesting a refund. It keeps transaction evidence, identity evidence, authority, content risk and execution authorization separate. Evidence that an interaction is genuine does not automatically grant permission to perform it.",
    sections: [
      { id: "evidence-facets", title: "Five questions that must not collapse into one score", paragraphs: [
        "TRANSACTION_VERIFIED asks whether evidence supports a transaction. IDENTITY_VERIFIED asks what is known about the actor. AUTHORITY_VERIFIED asks whether the actor has an applicable grant. CONTENT_INTERACTION_RISK concerns the content or interaction. EXECUTION_AUTHORIZED is the current decision about this action. These labels answer different questions and cannot safely substitute for one another.",
        "A verified purchaser may have useful evidence for a review, but that does not authorize an agent to change a rating or issue a refund. An authenticated service may still lack authority for the requested target. A low content-risk observation is not a business approval. Each facet needs its own provenance and meaning.",
        "The current composition model carries transaction, identity, authority and content-risk observations separately. An asserted observation is not automatically server-verified. Execution authorization comes from the canonical policy and authority evaluation, not from adding another favorable provider label.",
      ] },
      { id: "actions", title: "Bound the interaction and its external effect", paragraphs: [
        "Cyber Sentinels models HUMAN, SERVICE and AI_AGENT actors. Its bounded interaction vocabulary covers SUBMIT_REVIEW, EDIT_REVIEW, CREATE_ACCOUNT, POST_CONTENT, MAKE_PURCHASE, ISSUE_REFUND, CHANGE_RATING, SEND_MESSAGE, REQUEST_PAYOUT, CREATE_LISTING, APPROVE_TRANSACTION and EXECUTE_PROMOTION.",
        "These are requested action categories, not a claim that twelve live provider executors are installed. Publishing an artifact, writing data, creating an account and communicating externally have different effects. Authorizing a broad workflow must not silently authorize every consequential subaction it could contain.",
        "Money movement and other consequential operations require more than a generic effect label. The current boundary holds purchase, refund, payout, transaction-approval and promotion actions for execution qualification. It does not infer amount, currency, recipient, budget or provider capability from the action name.",
      ] },
      { id: "example", title: "Example: a review request is not refund authority", paragraphs: [
        "Consider an agent asked to draft a review after a purchase. Transaction evidence can support the purchase context, and identity evidence can identify the requester. The authority grant still needs to permit the proposed review action for the relevant target and purpose. Changing the request to ISSUE_REFUND creates a different authorization question.",
        "If authority is revoked, the target is out of scope or the effect is unauthorized, the canonical result is DENY. Missing delegated evaluation or unresolved execution qualification can require REVIEW. Neither state may silently dispatch the action. An ALLOW decision remains distinct from provider execution and proof of the outcome.",
      ], example: "Illustrative interaction\nActor: AI_AGENT\nTransaction evidence: observed\nGranted action: draft review for approved target\nRequested action: ISSUE_REFUND\nApplicable refund authority: absent\nDecision: DENY\nProvider execution: not attempted" },
      { id: "judgeme", title: "Judge.me is an integration target, not the authority source", paragraphs: [
        "Judge.me is a review-market signal and integration target in this model. Cyber Sentinels is not a Judge.me clone. A review-provider observation may describe an interaction, but the provider does not decide whether the enterprise's actor has current authority to cause a new external effect.",
        "The repository implements a bounded Judge.me evidence adapter and a synthetic-interaction composition boundary. This is not a claim of live review publication, a commercial partnership or completed provider qualification. Provider evidence never grants authority by itself, and synthetic tests are not real customer outcomes.",
      ] },
      { id: "audit", title: "Preserve the decision and its limits", paragraphs: [
        "Retain the actor class and identifier, action, purpose, target, content digest, applicable authority, delegation reference, policy version, decision and reasons. Keep observations linked to their sources. Record attempted execution and normalized outcome only when supported by actual evidence, then connect the receipt, Replay and material Trust Memory change.",
        "Minimizing content is part of a useful evidence design. A content digest can bind a request without retaining an unnecessary copy of a review or message. Do not store provider credentials or promote a raw payload into a trust verdict. A later action must receive a fresh evaluation even if a similar interaction was previously allowed.",
      ] },
    ],
    related: [
      { href: `${RESOURCE_ROOT}/agent-authorization`, label: "Identity, authority and execution authorization" },
      { href: `${RESOURCE_ROOT}/mcp-tool-authorization`, label: "External tools and target boundaries" },
      { href: "/verification-replay#action-receipts", label: "Evidence facets in the audit trail" },
      { href: "/developers/docs#integrations", label: "Integration boundaries and qualification" },
    ],
    sources: [
      { href: "https://genai.owasp.org/llmrisk/llm062025-excessive-agency/", label: "OWASP: Excessive Agency", supports: "Provides external context for limiting permissions and autonomy when agents can trigger consequential actions; it does not certify this implementation." },
    ],
  },
];

export const conceptDestinations = [
  ["Agent Registry and machine identity", "/developers/quickstart"],
  ["Authority, delegation and authority lineage", `${RESOURCE_ROOT}/agent-authorization#delegation`],
  ["Purpose, target and authorization", `${RESOURCE_ROOT}/agent-authorization#identity-and-authority`],
  ["Runtime authority and revocation", `${RESOURCE_ROOT}/agent-authorization#runtime-authority`],
  ["Policy and ALLOW / REVIEW / DENY", `${RESOURCE_ROOT}/agent-authorization#decisions`],
  ["Execution Trust and Enterprise Trust Fabric", "/platform#execution-trust"],
  ["Evidence, receipts and Replay", "/verification-replay#action-receipts"],
  ["Trust Memory", "/trust#trust-memory"],
  ["AI Agent Operations and governance", "/enterprise/agent-governance"],
  ["MCP, tool authorization and external effects", `${RESOURCE_ROOT}/mcp-tool-authorization`],
  ["Synthetic interaction trust", `${RESOURCE_ROOT}/synthetic-interaction-trust`],
  ["Integration contracts", "/developers/docs#integrations"],
] as const;
