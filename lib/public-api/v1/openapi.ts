import { PUBLIC_API_ERROR_CODES, PUBLIC_API_SCOPES, PUBLIC_API_VERSION } from "./contracts";

const responseMetadataProperties = {
  request_id: { type: "string", format: "uuid", description: "Unique identifier for this HTTP request." },
  correlation_id: { type: "string", format: "uuid", description: "Caller-supplied or generated identifier joining the API request to canonical transaction evidence." },
  api_version: { const: PUBLIC_API_VERSION },
};
const responseMetadataRequired = ["request_id", "correlation_id", "api_version"];
const responseHeaders = {
  "X-Request-Id": { schema: { type: "string", format: "uuid" }, description: "Request identifier returned in the body." },
  "X-Correlation-Id": { schema: { type: "string", format: "uuid" }, description: "Request correlation identifier." },
  "X-Cyber-Sentinels-Api-Version": { schema: { const: PUBLIC_API_VERSION }, description: "Date-pinned V1 contract metadata." },
  "X-RateLimit-Limit": { schema: { type: "integer" }, description: "Configured per-client limit for this operation class." },
  "X-RateLimit-Remaining": { schema: { type: "integer" }, description: "Requests remaining in the current atomic window." },
  "X-RateLimit-Reset": { schema: { type: "string", format: "date-time" }, description: "Current rate-limit window reset time." },
};
const errorExamples = {
  invalidRequest: { value: { error: { code: "INVALID_REQUEST", message: "The request body must be a JSON object.", correlation_id: "11111111-1111-4111-8111-111111111111" }, request_id: "22222222-2222-4222-8222-222222222222", correlation_id: "11111111-1111-4111-8111-111111111111", api_version: PUBLIC_API_VERSION } },
  tenantDenied: { value: { error: { code: "RESOURCE_NOT_FOUND", message: "The resource is unavailable to this API client.", correlation_id: "11111111-1111-4111-8111-111111111111" }, request_id: "22222222-2222-4222-8222-222222222222", correlation_id: "11111111-1111-4111-8111-111111111111", api_version: PUBLIC_API_VERSION } },
};

const errorResponse = {
  description: "Developer-safe error. Internal stack traces and secrets are never returned.",
  headers: responseHeaders,
  content: { "application/json": { schema: { $ref: "#/components/schemas/Error" }, examples: errorExamples } },
};
const json = (schema: Record<string, unknown>, description = "Successful response", examples?: Record<string, unknown>) => ({
  description,
  headers: responseHeaders,
  content: { "application/json": { schema, ...(examples ? { examples } : {}) } },
});
const agentParameter = { name: "agentId", in: "path", required: true, schema: { type: "string", maxLength: 180 } };
const transactionParameter = { name: "transactionId", in: "path", required: true, schema: { type: "string", format: "uuid" } };
const authorityParameter = { name: "authorityId", in: "path", required: true, schema: { type: "string", format: "uuid" } };
const reviewParameter = { name: "reviewReference", in: "path", required: true, schema: { type: "string", format: "uuid" } };
const rateLimitResponse = {
  ...errorResponse,
  description: "Atomic tenant/client rate limit exceeded.",
  headers: { ...responseHeaders, "Retry-After": { schema: { type: "integer", minimum: 1 }, description: "Seconds until this request class can be retried." } },
};
const errors = { "400": errorResponse, "401": errorResponse, "403": errorResponse, "404": errorResponse, "409": errorResponse, "413": errorResponse, "415": errorResponse, "422": errorResponse, "429": rateLimitResponse, "500": errorResponse, "503": errorResponse };
const decisionResponseSchema = {
  allOf: [
    { $ref: "#/components/schemas/Decision" },
    {
      type: "object",
      required: ["policy_reference", "review_reference", "blocking_reason_codes", "required_evidence", "human_approval_required", "consequence_time", "idempotent_replay", ...responseMetadataRequired],
      properties: {
        policy_reference: { type: "string", description: "Stable policy identifier used by the canonical evaluator." },
        review_reference: { type: ["string", "null"], format: "uuid", description: "Governed review reference when REVIEW; null otherwise. It is not an approval token." },
        blocking_reason_codes: { type: "array", items: { type: "string" }, description: "Reasons that block execution for REVIEW." },
        required_evidence: { type: "array", items: { type: "string" }, description: "Evidence categories required before a later independent evaluation could allow; clients cannot self-assert these as verified." },
        human_approval_required: { type: "boolean", description: "True for REVIEW. Retrieve and resolve the linked review through the review lifecycle; resolution never rewrites this decision." },
        consequence_time: { $ref: "#/components/schemas/ConsequenceTime" },
        idempotent_replay: { type: "boolean", description: "True when this response replays the original canonical transaction for the same key and semantic request." },
        ...responseMetadataProperties,
      },
    },
  ],
};
const allowDecisionExample = { decision_id: "decision:allow", transaction_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", receipt_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", replay_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", agent_id: "agent:alpha", decision: "ALLOW", reason_codes: ["AUTHORITY_SCOPE_VALID"], authority_reference: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", authority_version: "external-agent-authority-v1", policy_reference: "external-agent-trust-v1", policy_version: "0.1.0", policy: { id: "external-agent-trust-v1", version: "0.1.0" }, correlation_id: "11111111-1111-4111-8111-111111111111", request_id: "22222222-2222-4222-8222-222222222222", api_version: PUBLIC_API_VERSION, created_at: "2026-08-29T09:00:00.000Z", transaction_url: "https://example.test/api/v1/trust/transactions/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", receipt_url: "https://example.test/api/v1/trust/transactions/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/receipt", replay_url: "https://example.test/api/v1/trust/transactions/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/replay", review_required: false, review_reference: null, blocking_reason_codes: [], required_evidence: [], human_approval_required: false, execution_authorization: { scope: "exact_evaluated_action" }, idempotent_replay: false };
const decisionExamples = {
  allow: { summary: "Allowed", value: allowDecisionExample },
  review: { summary: "Human review required; stop execution", value: { ...allowDecisionExample, decision_id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc", decision: "REVIEW", reason_codes: ["EVIDENCE_INCOMPLETE"], review_required: true, review_reference: "cccccccc-cccc-4ccc-8ccc-cccccccccccc", blocking_reason_codes: ["EVIDENCE_INCOMPLETE"], required_evidence: ["NATIVE_ENTITY_IDENTITY_PROOF"], human_approval_required: true, execution_authorization: null } },
  deny: { summary: "Denied; stop execution", value: { ...allowDecisionExample, decision_id: "decision:deny", decision: "DENY", reason_codes: ["AUTHORITY_SCOPE_INVALID"], review_required: false, execution_authorization: null } },
};

export const publicApiOpenApi = {
  openapi: "3.1.0",
  info: {
    title: "Cyber Sentinels External Agent Trust API",
    version: PUBLIC_API_VERSION,
    description: `Server-side trust decisions for external AI agents. Identity answers who is acting; authority defines permitted scope; intent identifies the exact action; current conditions capture relevant facts known now; consequence describes what proceeding would affect; the canonical decision is ALLOW, REVIEW, or DENY. Authority is continuously evaluated, so a valid authority or ALLOW at T1 is not standing authorization at T2. Cyber Sentinels never executes the customer action. VERIFIED is not AUTHORIZED; REVIEW and DENY never permit execution; no HTTP response is never an ALLOW. URL version /api/v1 is the breaking-contract boundary and response metadata is date-pinned to ${PUBLIC_API_VERSION}.`,
  },
  externalDocs: { description: "Customer quickstart, terminology, and error handling", url: "/developers/docs#error-guide" },
  servers: [{ url: "https://www.cybersentinels.com", description: "Canonical Production host. Obtain the exact approved non-Production base URL through customer onboarding; do not guess Preview hostnames or test on Production." }],
  security: [{ bearerApiKey: [] }],
  tags: [{ name: "Agents" }, { name: "Authority" }, { name: "Review" }, { name: "Evidence" }, { name: "Trust" }],
  paths: {
    "/api/v1/agents": {
      post: {
        operationId: "registerAgent", tags: ["Agents"], summary: "Register an external AI agent", "x-required-scopes": ["agents:write"],
        description: "The server derives tenant and canonical identifiers. Registration creates PENDING_IDENTITY_PROOF identity state only and grants no business authority. After Ed25519 verification, an authorized tenant-admin API principal must explicitly grant bounded authority. Caller-supplied trust, verification, authority, score, or decision fields are rejected. Registration limit: 20/minute/client.",
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/RegisterAgentRequest" } } } },
        responses: { "201": json({ $ref: "#/components/schemas/RegisteredAgent" }), ...errors },
      },
    },
    "/api/v1/agents/{agentId}": {
      get: { operationId: "getAgent", tags: ["Agents"], summary: "Retrieve an API-client-bound agent", "x-required-scopes": ["authority:read"], parameters: [agentParameter], responses: { "200": json({ $ref: "#/components/schemas/Agent" }), ...errors } },
    },
    "/api/v1/agents/{agentId}/credentials": {
      post: { operationId: "registerAgentCredential", tags: ["Agents"], summary: "Register or rotate an Ed25519 public credential", "x-required-scopes": ["agents:write"], parameters: [agentParameter], requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/RegisterCredentialRequest" } } } }, responses: { "201": json({ type: "object" }), ...errors } },
    },
    "/api/v1/agents/{agentId}/manifest": {
      post: { operationId: "registerAgentManifest", tags: ["Agents"], summary: "Register a signed Manifest v1", "x-required-scopes": ["agents:write"], description: "The signature covers the canonical public manifest. The server derives tenant-only claims and the manifest digest.", parameters: [agentParameter], requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/SignedManifest" } } } }, responses: { "201": json({ type: "object" }), ...errors } },
    },
    "/api/v1/agents/{agentId}/challenge": {
      post: { operationId: "issueAgentChallenge", tags: ["Agents"], summary: "Issue a short-lived single-use challenge", "x-required-scopes": ["agents:verify"], description: "Challenge limit: 30/minute/client. The body must be an empty JSON object.", parameters: [agentParameter], requestBody: { required: true, content: { "application/json": { schema: { type: "object", additionalProperties: false } } } }, responses: { "201": json({ $ref: "#/components/schemas/Challenge" }), ...errors } },
    },
    "/api/v1/agents/{agentId}/proof": {
      post: { operationId: "submitAgentProof", tags: ["Agents"], summary: "Prove possession of the manifest-bound Ed25519 key", "x-required-scopes": ["agents:verify"], description: "Proof limit: 30/minute/client. A challenge is tenant-, agent-, credential-, manifest-, audience-, and time-bound and can be consumed once.", parameters: [agentParameter], requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/Proof" } } } }, responses: { "200": json({ type: "object" }), ...errors } },
    },
    "/api/v1/agents/{agentId}/authority": {
      get: { operationId: "getAgentAuthority", tags: ["Authority"], summary: "Resolve developer-safe current authority", "x-required-scopes": ["authority:read"], description: "Compatibility projection of the newest authority version. ACTIVE means current identity and authority are both usable; every other state is non-authorizing. No authority returns 404 AUTHORITY_NOT_FOUND.", parameters: [agentParameter], responses: { "200": json({ $ref: "#/components/schemas/Authority" }), ...errors } },
    },
    "/api/v1/agents/{agentId}/authorities": {
      get: { operationId: "listAgentAuthorities", tags: ["Authority"], summary: "List immutable authority history", "x-required-scopes": ["authority:read"], parameters: [agentParameter], responses: { "200": json({ $ref: "#/components/schemas/AuthorityList" }), ...errors } },
      post: { operationId: "grantAgentAuthority", tags: ["Authority"], summary: "Grant bounded customer authority", "x-required-scopes": ["authority:write"], description: "Requires a current owner/admin key with an explicit authority-management boundary established when the key was issued. The agent must already have current verified identity. A grant creates a new immutable Trust Contract version and supersedes the previous version; API scope alone is never business authority.", parameters: [agentParameter], requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/AuthorityGrantRequest" } } } }, responses: { "201": json({ $ref: "#/components/schemas/Authority" }), ...errors } },
    },
    "/api/v1/agents/{agentId}/authorities/{authorityId}": {
      get: { operationId: "getAgentAuthorityVersion", tags: ["Authority"], summary: "Retrieve one authority version", "x-required-scopes": ["authority:read"], parameters: [agentParameter, authorityParameter], responses: { "200": json({ $ref: "#/components/schemas/Authority" }), ...errors } },
    },
    "/api/v1/agents/{agentId}/authorities/{authorityId}/revoke": {
      post: { operationId: "revokeAgentAuthority", tags: ["Authority"], summary: "Revoke authority monotonically", "x-required-scopes": ["authority:write"], description: "Revocation preserves immutable history and propagates through the existing authority/delegation architecture. Future canonical evaluations fail closed.", parameters: [agentParameter, authorityParameter], requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["reason"], properties: { reason: { type: "string", minLength: 1, maxLength: 500 } }, additionalProperties: false } } } }, responses: { "200": json({ type: "object" }), ...errors } },
    },
    "/api/v1/agents/{agentId}/trust-state": {
      get: { operationId: "getAgentTrustState", tags: ["Agents"], summary: "Read the current multi-dimensional trust state", "x-required-scopes": ["authority:read"], parameters: [agentParameter], responses: { "200": json({ type: "object" }), ...errors } },
    },
    "/api/v1/trust/decisions": {
      post: { operationId: "requestTrustDecision", tags: ["Trust"], summary: "Request a canonical ALLOW, REVIEW, or DENY for an exact action", "x-required-scopes": ["trust:request"], description: "A 200/201 response is a fresh consequence-time evaluation and may be ALLOW, REVIEW, or DENY. Only ALLOW carries transaction-bound execution authorization. REVIEW requires the caller to stop and use the linked governed review lifecycle. Review resolution never mutates the original decision and never bypasses authority. DENY is not a generic HTTP 403. The server resolves current authority for operational_entity_id; authority_reference is not accepted. A prior ALLOW remains the historical T1 result and is never standing authorization or proof for T2: submit a new request with a new idempotency key, optionally referencing the prior transaction for comparison. Decision limit: 60/minute/client. Idempotency is scoped to the authenticated API client. Same key plus same semantic body returns the same canonical transaction under sequential or concurrent submission; changed reuse returns 409 IDEMPOTENCY_CONFLICT. Context references and expected versions are matched against server-owned state and cannot self-assert trust. Inline trust-bearing assurance or signed-intent claims are not public request fields; verified evidence must enter through server-controlled ingestion boundaries.", parameters: [{ name: "Idempotency-Key", in: "header", required: true, description: "Random non-secret key for one logical decision. Reuse only for an unchanged retry after an uncertain result; a later action requires a new key and fresh evaluation.", schema: { type: "string", minLength: 8, maxLength: 120 } }], requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/DecisionRequest" } } } }, responses: { "200": json(decisionResponseSchema, "Idempotent replay", decisionExamples), "201": json(decisionResponseSchema, "Decision created", decisionExamples), ...errors } },
    },
    "/api/v1/reviews/{reviewReference}": {
      get: { operationId: "getReview", tags: ["Review"], summary: "Retrieve governed review status and disposition", "x-required-scopes": ["review:read"], description: "Returns only reviews created for this tenant/client's canonical transactions. The original canonical decision remains REVIEW after resolution.", parameters: [reviewParameter], responses: { "200": json({ $ref: "#/components/schemas/Review" }), ...errors } },
    },
    "/api/v1/reviews/{reviewReference}/resolve": {
      post: { operationId: "resolveReview", tags: ["Review"], summary: "Resolve a review as APPROVED or REJECTED", "x-required-scopes": ["review:write"], description: "Requires a current owner/admin/reviewer principal. The subject agent cannot call this operation with agent credentials. Resolution is immutable governance evidence linked to the original transaction. APPROVED means submit a new canonical evaluation; it is not a new ALLOW.", parameters: [reviewParameter], requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/ReviewResolutionRequest" } } } }, responses: { "200": json({ $ref: "#/components/schemas/Review" }), ...errors } },
    },
    "/api/v1/evidence": {
      post: { operationId: "submitAgentAssertedEvidence", tags: ["Evidence"], summary: "Submit client-owned agent-asserted evidence", "x-required-scopes": ["evidence:write"], description: "The subject must be an agent bound to the authenticated API client. The server stores the record as AGENT_ASSERTED and INCONCLUSIVE. It cannot satisfy independent, SERVER_VERIFIED, provider-verified, or native evidence requirements. Authenticated provider evidence uses the existing private provider ingestion paths, not this route.", requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/EvidenceRequest" } } } }, responses: { "201": json({ type: "object" }), ...errors } },
    },
    "/api/v1/trust/transactions/{transactionId}": {
      get: { operationId: "getTrustTransaction", tags: ["Trust"], summary: "Retrieve a sanitized canonical transaction", "x-required-scopes": ["trust:read"], parameters: [transactionParameter], responses: { "200": json({ type: "object" }), ...errors } },
    },
    "/api/v1/trust/transactions/{transactionId}/replay": {
      get: { operationId: "getTrustTransactionReplay", tags: ["Trust"], summary: "Retrieve chronological canonical Replay events", "x-required-scopes": ["trust:read"], description: "Returns canonical transaction events ordered by occurred_at. Every event source is canonical_trust_transaction; public clients cannot create Replay/session records through V1.", parameters: [transactionParameter], responses: { "200": json({ $ref: "#/components/schemas/Replay" }), ...errors } },
    },
    "/api/v1/trust/transactions/{transactionId}/receipt": {
      get: { operationId: "getTrustTransactionReceipt", tags: ["Trust"], summary: "Retrieve the minimized canonical receipt", "x-required-scopes": ["trust:read"], description: "The receipt is a digested canonical decision projection, not proof of downstream execution, a signed certificate, or regulatory certification.", parameters: [transactionParameter], responses: { "200": json({ $ref: "#/components/schemas/Receipt" }), ...errors } },
    },
    "/api/v1/trust/transactions/{transactionId}/outcomes": {
      post: { operationId: "submitTrustTransactionOutcome", tags: ["Trust"], summary: "Submit an approved-source outcome assertion", "x-required-scopes": ["outcomes:write"], description: "Outcome limit: 60/minute/client. Agent assertions are explicitly classified AGENT_ASSERTED and never become independent destination evidence.", parameters: [transactionParameter], requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/OutcomeRequest" } } } }, responses: { "201": json({ type: "object" }), ...errors } },
    },
  },
  components: {
    securitySchemes: { bearerApiKey: { type: "http", scheme: "bearer", bearerFormat: "Cyber Sentinels API key", description: `Server-issued cs_test_ or cs_live_ API key. Operation-specific least-privilege scopes are listed in x-required-scopes. Available V1 scopes: ${PUBLIC_API_SCOPES.join(", ")}.` } },
    schemas: {
      Error: { type: "object", required: ["error", ...responseMetadataRequired], properties: { error: { type: "object", required: ["code", "message", "correlation_id"], properties: { code: { type: "string", "x-stable-codes": PUBLIC_API_ERROR_CODES }, message: { type: "string" }, correlation_id: { type: "string", format: "uuid" } }, additionalProperties: false }, ...responseMetadataProperties }, additionalProperties: false },
      RegisterAgentRequest: { type: "object", required: ["display_name", "entity_type", "owner_reference", "runtime", "model"], properties: { display_name: { type: "string", maxLength: 120 }, entity_type: { const: "AI_AGENT" }, owner_reference: { type: "string", maxLength: 180 }, runtime: { type: "object", required: ["environment", "framework"], properties: { environment: { type: "string" }, framework: { type: "string" } }, additionalProperties: false }, model: { type: "object", required: ["provider", "identifier"], properties: { provider: { type: "string" }, identifier: { type: "string" } }, additionalProperties: false } }, additionalProperties: false },
      RegisteredAgent: { type: "object", required: ["agent_id", "operational_entity_id", "status", "next_step", "manifest_context", ...responseMetadataRequired], properties: { agent_id: { type: "string" }, operational_entity_id: { type: "string" }, status: { type: "string" }, next_step: { type: "string" }, manifest_context: { type: "object" }, ...responseMetadataProperties }, additionalProperties: false },
      Agent: { type: "object", required: ["agent_id", "operational_entity_id", "entity_type", "display_name", "lifecycle_state", "authority_reference", "authority_status", ...responseMetadataRequired], properties: { agent_id: { type: "string" }, operational_entity_id: { type: "string" }, entity_type: { type: "string" }, display_name: { type: "string" }, lifecycle_state: { type: "string" }, accountable_owner_reference: { type: "string" }, authority_reference: { type: ["string", "null"], format: "uuid" }, authority_version: { type: ["string", "null"] }, authority_status: { enum: ["UNASSIGNED", "SCHEDULED", "PENDING_IDENTITY", "ACTIVE", "EXPIRED", "REVOKED"] }, ...responseMetadataProperties }, additionalProperties: false },
      RegisterCredentialRequest: { type: "object", required: ["public_jwk", "kid", "algorithm"], properties: { public_jwk: { type: "object", required: ["kty", "crv", "x"], properties: { kty: { const: "OKP" }, crv: { const: "Ed25519" }, x: { type: "string" }, kid: { type: "string" }, alg: { const: "EdDSA" }, use: { const: "sig" }, key_ops: { type: "array", prefixItems: [{ const: "verify" }], maxItems: 1 } }, not: { required: ["d"] }, additionalProperties: false }, kid: { type: "string" }, algorithm: { enum: ["Ed25519", "EdDSA"] }, expires_at: { type: ["string", "null"], format: "date-time" }, rotate_from_credential_id: { type: "string" } }, additionalProperties: false },
      SignedManifest: { type: "object", required: ["manifest_version", "operational_entity_id", "entity_type", "owner_reference", "model", "runtime", "environment", "declared_capabilities", "credential_id", "issued_at", "expires_at", "nonce", "signature"], properties: { manifest_version: { const: "1.0" }, operational_entity_id: { type: "string" }, entity_type: { const: "AI_AGENT" }, owner_reference: { type: "string" }, model: { type: "object" }, runtime: { type: "object" }, environment: { type: "string" }, declared_capabilities: { type: "array", items: { type: "string" }, maxItems: 128 }, credential_id: { type: "string" }, issued_at: { type: "string", format: "date-time" }, expires_at: { type: "string", format: "date-time" }, nonce: { type: "string" }, signature: { type: "string" } }, additionalProperties: false },
      Challenge: { type: "object", required: ["challenge_id", "nonce", "audience", "operational_entity_id", "manifest_digest", "issued_at", "expires_at", ...responseMetadataRequired], properties: { challenge_id: { type: "string", format: "uuid" }, nonce: { type: "string" }, audience: { type: "string" }, issuer: { const: "cyber-sentinels" }, subject: { type: "string" }, operational_entity_id: { type: "string" }, manifest_digest: { type: "string", pattern: "^[a-f0-9]{64}$" }, signing_key_id: { type: "string" }, issued_at: { type: "string", format: "date-time" }, expires_at: { type: "string", format: "date-time" }, ...responseMetadataProperties }, additionalProperties: false },
      Proof: { type: "object", required: ["challenge_id", "credential_id", "signature", "signed_payload"], properties: { challenge_id: { type: "string", format: "uuid" }, credential_id: { type: "string" }, signature: { type: "string" }, signed_payload: { type: "object" } }, additionalProperties: false },
      Authority: { type: "object", required: ["authority_id", "status", "action", "actions", "target", "targets", "purpose", "tools", "environment", "valid_from", "expires_at", "revoked_at", "authority_reference", "authority_version", "supersedes_authority_id", "issuer", "approver", "delegated_from", "delegation_depth", ...responseMetadataRequired], properties: { authority_id: { type: "string", format: "uuid" }, status: { enum: ["ACTIVE", "PENDING_IDENTITY", "SCHEDULED", "EXPIRED", "REVOKED"] }, action: { type: "string" }, actions: { type: "array", items: { type: "string" } }, target: { type: "string" }, targets: { type: "array", items: { type: "string" } }, purpose: { type: "string" }, tools: { type: "array", items: { type: "string" } }, environment: { type: "array", items: { type: "string" } }, valid_from: { type: "string", format: "date-time" }, expires_at: { type: "string", format: "date-time" }, revoked_at: { type: ["string", "null"], format: "date-time" }, authority_reference: { type: "string", format: "uuid" }, authority_version: { type: ["string", "null"] }, supersedes_authority_id: { type: ["string", "null"], format: "uuid" }, issuer: { type: "string" }, approver: { type: "string" }, delegated_from: { type: ["string", "null"] }, delegation_depth: { type: "integer", minimum: 0 }, ...responseMetadataProperties }, additionalProperties: false },
      AuthorityList: { type: "object", required: ["authorities", ...responseMetadataRequired], properties: { authorities: { type: "array", items: { $ref: "#/components/schemas/Authority" }, maxItems: 100 }, ...responseMetadataProperties }, additionalProperties: false },
      AuthorityGrantRequest: { type: "object", required: ["action", "target", "purpose", "environment", "expires_at"], properties: { action: { type: "string", minLength: 1, maxLength: 120 }, target: { type: "string", minLength: 1, maxLength: 240 }, purpose: { type: "string", minLength: 1, maxLength: 180 }, environment: { type: "string", minLength: 1, maxLength: 120 }, valid_from: { type: "string", format: "date-time", description: "Optional; cannot be backdated and may be at most five minutes ahead." }, expires_at: { type: "string", format: "date-time", description: "Required. Indefinite authority is unsupported and the issuing key's max TTL applies." }, data_boundary: { enum: ["PUBLIC", "INTERNAL"] }, execution_limit: { type: "integer", minimum: 1, maximum: 10000 } }, additionalProperties: false },
      DecisionRequest: {
        type: "object",
        required: ["operational_entity_id", "action", "idempotency_key"],
        properties: {
          operational_entity_id: { type: "string" },
          action: { type: "object", required: ["type", "target", "purpose", "environment"], properties: { type: { type: "string" }, target: { type: "string" }, purpose: { type: "string" }, environment: { type: "string" } }, additionalProperties: false },
          idempotency_key: { type: "string", minLength: 8, maxLength: 120 },
          decision_type: { type: "string" },
          context: {
            type: "object",
            description: "Structured, non-secret consequence-time context. References and expected versions are correlation/pinning inputs only: the server resolves and verifies current identity, authority, policy, evidence and approvals. AGENT_ASSERTED observations cannot establish positive eligibility.",
            properties: {
              intent_reference: { type: "string", maxLength: 240, description: "Customer intent correlation reference; not authorization proof." },
              previous_transaction_id: { type: "string", format: "uuid", description: "Optional same-client/same-agent historical comparison. Its ALLOW, if any, is never reused as permission." },
              authority_version: { type: "string", maxLength: 180, description: "Expected authority version. The evaluator compares it with server-resolved current authority; the caller value is not proof." },
              policy_version: { type: "string", maxLength: 180, description: "Expected policy version. The server-resolved current policy remains authoritative." },
              current_evidence_references: { type: "array", maxItems: 32, items: { type: "string", maxLength: 240 }, description: "References that must resolve through existing evidence storage; unresolved or AGENT_ASSERTED evidence cannot restore eligibility." },
              material_change_references: { type: "array", maxItems: 32, items: { type: "string", maxLength: 240 }, description: "References to known changes. Client submission triggers evaluation but does not independently prove the change." },
              human_approval_reference: { type: "string", format: "uuid", description: "Reference to an existing governed approval. It is effective only when the server resolves a current APPROVED review for this exact agent/action." },
              environment: { type: "string" }, release: { type: "string" },
              material_changes: { type: "array", maxItems: 32, items: { type: "string" }, description: "Agent-asserted change labels; never authoritative positive evidence." },
              mission: { type: "string" }, monitoring: { type: "object" }, sensor_evidence: { type: "array", items: { type: "object" } }, command_target: { type: "string" }, execution_stages: { type: "array", items: { type: "object" } },
              oversight: { enum: ["HUMAN_IN_THE_LOOP", "HUMAN_ON_THE_LOOP", "HUMAN_OVER_THE_LOOP", "AUTONOMOUS"] },
            },
            additionalProperties: false,
          },
        },
        additionalProperties: false,
        examples: [{ operational_entity_id: "agent:alpha", action: { type: "read_repository", target: "repository:acme-demo", purpose: "deployment_evidence_review", environment: "staging" }, idempotency_key: "decision-alpha-t2-001", context: { intent_reference: "intent:deployment-review:42", previous_transaction_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", authority_version: "customer-authority:v2" } }],
      },
      ReviewResolutionRequest: { type: "object", required: ["resolution", "reason", "evidence_reference"], properties: { resolution: { enum: ["APPROVED", "REJECTED"] }, reason: { type: "string", minLength: 1, maxLength: 1000 }, evidence_reference: { type: "string", minLength: 1, maxLength: 240 } }, additionalProperties: false },
      Review: { type: "object", required: ["review_reference", "status", "disposition", "original_decision", "original_transaction_id", "agent_id", "reason", "resolution_reason", "evidence_reference", "reviewer_principal_id", "created_at", "expires_at", "resolved_at", "next_action", "original_decision_immutable", "history", ...responseMetadataRequired], properties: { review_reference: { type: "string", format: "uuid" }, status: { enum: ["REQUESTED", "ASSIGNED", "IN_REVIEW", "APPROVED", "REJECTED", "CANCELLED"] }, disposition: { type: ["string", "null"], enum: ["APPROVED", "REJECTED", null] }, original_decision: { const: "REVIEW" }, original_transaction_id: { type: "string", format: "uuid" }, agent_id: { type: "string" }, reason: { type: "string" }, resolution_reason: { type: ["string", "null"] }, evidence_reference: { type: ["string", "null"] }, reviewer_principal_id: { type: ["string", "null"], format: "uuid" }, created_at: { type: "string", format: "date-time" }, expires_at: { type: "string", format: "date-time" }, resolved_at: { type: ["string", "null"], format: "date-time" }, next_action: { enum: ["WAIT_FOR_AUTHORIZED_REVIEWER", "SUBMIT_NEW_CANONICAL_EVALUATION", "DO_NOT_EXECUTE"] }, original_decision_immutable: { const: true }, history: { type: "array", items: { type: "object" } }, ...responseMetadataProperties }, additionalProperties: false },
      EvidenceRequest: { type: "object", required: ["provider", "type", "subject", "evidence"], properties: { provider: { type: "object", required: ["key", "class", "event_id", "finding"], properties: { key: { enum: ["self"], description: "The authenticated API client; arbitrary provider identities are rejected." }, class: { const: "APPLICATION_SIGNAL" }, event_id: { type: "string" }, finding: { type: "string", description: "An agent assertion, never the canonical trust decision." } }, additionalProperties: false }, type: { type: "string", description: "A non-reserved client assertion type. Native, provider-verified, policy, runtime-authority, and independent evidence types are rejected." }, subject: { type: "object", required: ["type", "id"], properties: { type: { enum: ["AI_AGENT", "OPERATIONAL_ENTITY"] }, id: { type: "string", description: "An agent registered to this authenticated API client." } }, additionalProperties: false }, evidence: { type: "object" }, occurred_at: { type: "string", format: "date-time" }, expires_at: { type: ["string", "null"], format: "date-time" }, digest: { type: "string", pattern: "^[a-f0-9]{64}$", description: "Optional assertion checked against the server-computed canonical digest." } }, additionalProperties: false },
      ConsequenceTime: {
        type: "object",
        description: "Immutable action-time projection of identity, current authority, exact intent, independently resolved current conditions, consequence and canonical decision. A prior ALLOW is historical context only.",
        required: ["evaluated_at", "agent_identity_reference", "authority", "delegation_lineage", "intent", "current_conditions", "consequence", "canonical_decision", "reason_codes", "previous_evaluation", "decision_differs_from_previous", "previous_allow_standing_authorization"],
        properties: {
          evaluated_at: { type: "string", format: "date-time" },
          agent_identity_reference: { type: "string" },
          authority: { type: "object", required: ["reference", "version", "issuedAt", "expiresAt", "revocationState", "scopeValid"], properties: { reference: { type: "string" }, version: { type: ["string", "null"] }, issuedAt: { type: "string", format: "date-time" }, expiresAt: { type: "string", format: "date-time" }, revocationState: { enum: ["active", "revoked"] }, scopeValid: { type: "boolean" } }, additionalProperties: false },
          delegation_lineage: { type: "array", items: { type: "string" } },
          intent: { type: "object", required: ["reference", "action", "target", "purpose", "environment", "requestDigest"], properties: { reference: { type: ["string", "null"] }, action: { type: "string" }, target: { type: "string" }, purpose: { type: "string" }, environment: { type: "string" }, requestDigest: { type: "string" } }, additionalProperties: false },
          current_conditions: { type: "object", required: ["identity_assurance", "evidence_complete", "evidence_fresh", "policy_reference", "policy_version", "runtime_authority_state", "destination_authority_state", "authorization_propagation_state", "material_changes", "material_change_references", "human_approval_required", "human_approval_state", "current_condition_references"], properties: { identity_assurance: { enum: ["CURRENT", "STALE_OR_UNAVAILABLE"] }, evidence_complete: { type: "boolean" }, evidence_fresh: { type: "boolean" }, policy_reference: { type: "string" }, policy_version: { type: "string" }, runtime_authority_state: { type: ["string", "null"] }, destination_authority_state: { type: ["string", "null"] }, authorization_propagation_state: { type: ["string", "null"] }, material_changes: { type: "array", items: { type: "string" } }, material_change_references: { type: "array", items: { type: "string" } }, human_approval_required: { type: "boolean" }, human_approval_state: { enum: ["NOT_REQUIRED", "CURRENT", "MISSING", "STALE", "AGENT_ASSERTED"] }, current_condition_references: { type: "array", items: { type: "string" } } }, additionalProperties: false },
          consequence: { type: "string" }, canonical_decision: { enum: ["ALLOW", "REVIEW", "DENY"] }, reason_codes: { type: "array", items: { type: "string" } },
          previous_evaluation: { type: ["object", "null"], description: "Historical comparison only; never reusable authorization." }, decision_differs_from_previous: { type: "boolean" }, previous_allow_standing_authorization: { const: false },
        },
        additionalProperties: false,
      },
      Decision: { type: "object", required: ["decision_id", "transaction_id", "receipt_id", "replay_id", "agent_id", "decision", "reason_codes", "authority_reference", "authority_version", "policy", "correlation_id", "created_at", "transaction_url", "replay_url", "receipt_url", "review_required"], properties: { decision_id: { type: "string" }, transaction_id: { type: "string", format: "uuid" }, receipt_id: { type: "string", format: "uuid" }, replay_id: { type: "string", format: "uuid" }, agent_id: { type: "string" }, decision: { enum: ["ALLOW", "REVIEW", "DENY"] }, reason_codes: { type: "array", items: { type: "string" } }, consequence: { type: "string" }, confidence: { type: "string" }, authority_reference: { type: "string" }, authority_version: { type: ["string", "null"] }, policy: { type: "object", required: ["id", "version"], properties: { id: { type: "string" }, version: { type: "string" } }, additionalProperties: false }, policy_version: { type: "string" }, correlation_id: { type: "string", format: "uuid" }, created_at: { type: "string", format: "date-time" }, continuity: { type: "object", properties: { identity_continuity: { enum: ["continuous", "review_required", "interrupted"] }, monitoring_coverage: { enum: ["covered", "partial", "not_observed"] }, signed_human_intent: { enum: ["provided", "not_provided", "pending"] }, consequential_impact_lineage: { type: "object", properties: { target: { type: "string" }, consequence: { type: "string" }, evidence_provider: { type: "string" }, human_review_required: { type: "boolean" } }, additionalProperties: false } }, additionalProperties: false }, deployment_gate: { type: ["object", "null"], properties: { decision_type: { type: "string" }, material_changes: { type: "array", items: { type: "string" } }, assurance_freshness: { type: "string" }, assurance_evidence_count: { type: "integer" }, current_assurance_count: { type: "integer" }, stale_evidence_count: { type: "integer" }, reauthorization_required: { type: "boolean" }, pending_revalidation: { type: "array", items: { type: "string" } } }, additionalProperties: false }, provider_neutral_evidence: { type: "array", items: { type: "object", properties: { provider_id: { type: "string" }, provider_name: { type: "string" }, evidence_type: { type: "string" }, observed_at: { type: "string", format: "date-time" }, outcome: { type: "string" }, evidence_digest: { type: "string" }, correlation_id: { type: ["string", "null"] }, monitoring_coverage: { enum: ["covered", "partial", "not_observed"] }, identity_continuity: { enum: ["continuous", "review_required", "interrupted"] }, signing_boundary: { enum: ["provider_signed", "human_signed", "unsigned"] }, provider_class: { type: ["string", "null"] }, provider_key: { type: ["string", "null"] }, environment: { type: ["string", "null"] }, scope: { type: ["string", "null"] }, model_version: { type: ["string", "null"] }, permission_context: { type: ["string", "null"] }, assurance: { type: ["number", "null"] }, confidence: { type: ["string", "null"] }, finding_references: { type: "array", items: { type: "string" } }, retest_reference: { type: ["string", "null"] } }, additionalProperties: false } }, execution_continuity: { type: "array", items: { type: "object", required: ["stage", "status"], properties: { stage: { enum: ["INTENDED_ACTION", "REQUESTED_ACTION", "AUTHORIZED_ACTION", "COMMAND_SENT", "COMMAND_ACKNOWLEDGED", "ACTION_EXECUTED", "WORLD_STATE_CHANGED", "CONSEQUENCE_OBSERVED"] }, status: { enum: ["observed", "asserted", "missing", "not_applicable"] }, occurredAt: { type: ["string", "null"], format: "date-time" }, evidenceReference: { type: ["string", "null"] } }, additionalProperties: false } }, transaction_url: { type: "string", format: "uri" }, replay_url: { type: "string", format: "uri" }, receipt_url: { type: "string", format: "uri" }, review_required: { type: "boolean" }, execution_authorization: { type: ["object", "null"] } }, additionalProperties: true },
      Receipt: {
        type: "object",
        description: "Minimized projection of the persisted canonical decision. Digested but not advertised as a signed certificate; it does not prove downstream execution or regulatory compliance.",
        required: ["receipt_version", "receipt_id", "decision_id", "transaction_id", "replay_id", "agent_id", "correlation_id", "decision", "timestamp", "action", "reason_codes", "evidence_references", "authority_reference", "authority_version", "authority_lineage_references", "policy", "decision_digest", "current_condition_references", "material_change_references", "consequence_time", ...responseMetadataRequired],
        properties: {
          receipt_version: { const: "canonical-trust-transaction-v1" }, receipt_id: { type: "string", format: "uuid" }, decision_id: { type: "string" }, transaction_id: { type: "string", format: "uuid" }, replay_id: { type: "string", format: "uuid" }, agent_id: { type: "string" }, decision: { enum: ["ALLOW", "REVIEW", "DENY"] }, timestamp: { type: "string", format: "date-time" }, action: { type: "object", description: "The exact evaluated action and request digest." }, reason_codes: { type: "array", items: { type: "string" } }, evidence_references: { type: "array", items: {} }, authority_reference: { type: "string" }, authority_version: { type: ["string", "null"] }, authority_lineage_references: { type: "array", items: {} }, policy: { type: "object", required: ["id", "version", "hash"], properties: { id: { type: "string" }, version: { type: "string" }, hash: { type: ["string", "null"] } } }, decision_digest: { type: ["string", "null"], description: "Canonical decision integrity reference; not a receipt signature." }, current_condition_references: { type: "array", items: { type: "string" } }, material_change_references: { type: "array", items: { type: "string" } }, consequence_time: { $ref: "#/components/schemas/ConsequenceTime" }, ...responseMetadataProperties,
        },
        additionalProperties: true,
      },
      Replay: {
        type: "object",
        description: "Canonical transaction chronology ordered by event timestamp. Customer assertions and logs do not become canonical Replay records.",
        required: ["replay_id", "decision_id", "transaction_id", "receipt_id", "agent_id", "authority_reference", "authority_version", "correlation_id", "consequence_time", "decision_comparison", "outcome_evidence", "events", ...responseMetadataRequired],
        properties: {
          replay_id: { type: "string", format: "uuid" }, decision_id: { type: "string" }, transaction_id: { type: "string", format: "uuid" }, receipt_id: { type: "string", format: "uuid" }, agent_id: { type: "string" }, authority_reference: { type: "string" }, authority_version: { type: ["string", "null"] }, consequence_time: { $ref: "#/components/schemas/ConsequenceTime" }, decision_comparison: { type: ["object", "null"], description: "Why the current evaluation may differ from the referenced historical evaluation." }, outcome_evidence: { type: "object", description: "Outcome observations, if any. Absence does not prove execution." }, events: { type: "array", items: { type: "object", required: ["timestamp", "actor", "entity", "event_type", "source", "references"], properties: { timestamp: { type: "string", format: "date-time" }, actor: { type: "string" }, entity: { type: "string" }, event_type: { type: "string" }, source: { const: "canonical_trust_transaction" }, references: { type: "object", required: ["event_id", "authority", "evidence", "policy", "digest"], properties: { event_id: { type: "string" }, authority: { type: ["string", "null"] }, evidence: { type: "array", items: {} }, policy: { type: "string" }, digest: { type: ["string", "null"] } } } } } }, ...responseMetadataProperties,
        },
        additionalProperties: false,
      },
      OutcomeRequest: { type: "object", required: ["source_id", "destination", "action_reference", "target", "result", "observed_at", "evidence_reference"], properties: { source_id: { type: "string" }, destination: { type: "string" }, action_reference: { type: "string" }, target: { type: "string" }, result: { enum: ["SUCCEEDED", "FAILED", "UNKNOWN"] }, observed_at: { type: "string", format: "date-time" }, evidence_reference: { type: "string" }, digest: { type: "string", pattern: "^[a-f0-9]{64}$", description: "Optional client-supplied assertion digest, never an authoritative server digest." } }, additionalProperties: false },
    },
  },
  "x-cyber-sentinels": {
    apiVersionDate: PUBLIC_API_VERSION,
    urlVersion: "v1",
    breakingChangePolicy: "Breaking request or response changes require a new URL major version. Additive compatible changes may retain /api/v1 with a new date-pinned version.",
    deprecationPolicy: "Deprecated V1 operations are marked in OpenAPI before removal; no V1 operation is currently deprecated.",
    evidenceClassifications: {
      AGENT_ASSERTED: "Submitted by the authenticated API client and never treated as independent proof.",
      SERVER_VERIFIED: "Verified by an existing authenticated server integration boundary.",
      providerVerifiedIndependent: "Provider evidence is decision-eligible only when the implemented provider path establishes the required independence and verification properties.",
    },
    stableErrorCodes: PUBLIC_API_ERROR_CODES,
    errorFormat: { error: { code: "STRING", message: "STRING", correlation_id: "UUID" }, request_id: "UUID", correlation_id: "UUID", api_version: PUBLIC_API_VERSION },
    rateLimits: { registration: "20/min", challenge: "30/min", proof: "30/min", authority: "60/min", review: "60/min", decision: "60/min", read: "240/min", evidence: "120/min", outcome: "60/min" },
    authorityBoundary: "Registration grants no authority. A currently authorized owner/admin API principal with authority:write and a server-persisted management boundary may grant a verified client-owned agent a bounded, expiring Trust Contract. The decision route resolves it server-side; public V1 never accepts authority_reference in the decision request.",
    reviewBoundary: "REVIEW remains the immutable canonical decision. Authorized human/admin principals may record APPROVED or REJECTED as a subsequent governed resolution; APPROVED requires a new canonical evaluation and never bypasses current authority.",
    availabilityRule: "NO RESPONSE != ALLOW. DNS failure, timeout, 429, 500, and 503 require the customer's bounded retry and escalation policy; a timed-out decision retry uses the same key and unchanged semantic request.",
    retentionDisclosure: "No public V1 retention duration, deletion guarantee, receipt signature, or regulatory-certification claim is made by this contract.",
    webhooks: { events: ["decision.created", "decision.review_required", "decision.denied", "authority.changed", "monitoring.coverage_gap", "deployment.reauthorization_required", "intent.execution_mismatch", "execution.outcome", "data.impact_detected", "receipt.available"], signatureHeader: "X-Cyber-Sentinels-Signature", idempotencyHeader: "X-Cyber-Sentinels-Event-Id", replayProtection: "Reject duplicate event_id values and timestamps outside your tolerance window.", retryPolicy: "Exponential backoff from the durable tenant-scoped queue." },
  },
} as const;
