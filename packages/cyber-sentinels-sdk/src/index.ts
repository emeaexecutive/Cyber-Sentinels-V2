export type Decision = "ALLOW" | "REVIEW" | "DENY";
export const API_VERSION = "2026-08-29" as const;
export type ApiScope =
  | "agents:write"
  | "agents:verify"
  | "authority:read"
  | "authority:write"
  | "trust:request"
  | "trust:read"
  | "evidence:write"
  | "outcomes:write"
  | "review:read"
  | "review:write";

export type RateLimitMetadata = {
  limit: number | null;
  remaining: number | null;
  resetAt: string | null;
  retryAfter: number | null;
};
export type HttpResponseMetadata = {
  status: number;
  requestId: string | null;
  correlationId: string | null;
  apiVersion: string | null;
  rateLimit: RateLimitMetadata;
};
export type RequestOptions = {
  signal?: AbortSignal;
  timeoutMs?: number;
  onResponse?: (metadata: HttpResponseMetadata) => void;
};
export type ApiResponseMetadata = {
  request_id: string;
  correlation_id: string;
  api_version: typeof API_VERSION;
};

export class CyberSentinelsError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly status: number,
    readonly correlationId: string | null,
    readonly retryAfter: number | null = null,
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = "CyberSentinelsError";
  }
}
export class AuthenticationError extends CyberSentinelsError {}
export class PermissionDeniedError extends CyberSentinelsError {}
export class ConflictError extends CyberSentinelsError {}
export class RateLimitError extends CyberSentinelsError {}
export class ServerError extends CyberSentinelsError {}
export class TimeoutError extends CyberSentinelsError {}

export type RegisterAgentInput = {
  display_name: string;
  entity_type: "AI_AGENT";
  owner_reference: string;
  runtime: { environment: string; framework: string };
  model: { provider: string; identifier: string };
};

export type RegisteredAgent = ApiResponseMetadata & {
  agent_id: string;
  operational_entity_id: string;
  status: string;
  next_step: string;
  manifest_context: {
    enterprise_id: string;
    display_name: string;
    accountable_owner_id: string;
    organization_id: string;
    environment: string;
    framework: string;
    model: { provider: string; identifier: string };
    authority_reference: string | null;
  };
};

export type RegisterCredentialInput = {
  public_jwk: JsonWebKey;
  kid: string;
  algorithm: "Ed25519" | "EdDSA";
  expires_at?: string | null;
  rotate_from_credential_id?: string;
};

export type RegisteredCredential = ApiResponseMetadata & {
  credential_id: string;
  kid: string;
  algorithm: "Ed25519";
  fingerprint: string;
  status: string;
  private_key_stored: false;
};

export type PublicManifestClaims = {
  manifest_version: "1.0";
  operational_entity_id: string;
  entity_type: "AI_AGENT";
  owner_reference: string;
  model: { provider: string; identifier: string; version: string | null };
  runtime: {
    framework: string;
    runtime_type: string | null;
    region: string | null;
    version: string | null;
    workload_identifier: string | null;
    deployment_identifier: string | null;
    build_digest: string | null;
  };
  environment: string;
  declared_capabilities: string[];
  credential_id: string;
  issued_at: string;
  expires_at: string;
  nonce: string;
};

export type SignedPublicManifest = PublicManifestClaims & { signature: string };

export type Challenge = ApiResponseMetadata & {
  challenge_id: string;
  nonce: string;
  audience: string;
  issuer: "cyber-sentinels";
  subject: string;
  operational_entity_id: string;
  manifest_digest: string;
  signing_key_id: string;
  issued_at: string;
  expires_at: string;
};

export type ProofSubmission = {
  challenge_id: string;
  credential_id: string;
  signature: string;
  signed_payload: {
    challenge_id: string;
    enterprise_id: string;
    operational_entity_id: string;
    nonce: string;
    audience: string;
    issuer: string;
    subject: string;
    manifest_digest: string;
    signing_key_id: string;
    issued_at: string;
    expires_at: string;
    submitted_at: string;
  };
};

export type DecisionRequest = {
  operational_entity_id: string;
  action: { type: string; target: string; purpose: string; environment: string };
  idempotency_key: string;
  decision_type?: string;
  context?: {
    intent_reference?: string;
    previous_transaction_id?: string;
    authority_version?: string;
    policy_version?: string;
    current_evidence_references?: string[];
    material_change_references?: string[];
    human_approval_reference?: string;
    environment?: string;
    release?: string;
    material_changes?: string[];
    mission?: string;
    monitoring?: Record<string, unknown>;
    sensor_evidence?: Array<Record<string, unknown>>;
    command_target?: string;
    execution_stages?: Array<Record<string, unknown>>;
    oversight?: "HUMAN_IN_THE_LOOP" | "HUMAN_ON_THE_LOOP" | "HUMAN_OVER_THE_LOOP" | "AUTONOMOUS";
  };
};

export type EvidenceSubmission = {
  provider: { key: "self"; class: "APPLICATION_SIGNAL"; event_id: string; finding: string };
  type: string;
  subject: { type: string; id: string };
  evidence: Record<string, unknown>;
  occurred_at?: string;
  expires_at?: string | null;
  digest?: string;
};

export type OutcomeSubmission = {
  transactionId: string;
  outcome: "SUCCEEDED" | "FAILED" | "UNKNOWN";
  evidence: {
    destination: string;
    target: string;
    reference: string;
    actionReference?: string;
    observedAt?: string;
    digest?: string;
  };
};

export type Agent = ApiResponseMetadata & {
  agent_id: string;
  operational_entity_id: string;
  entity_type: string;
  display_name: string;
  lifecycle_state: string;
  accountable_owner_reference?: string;
  authority_reference: string | null;
  authority_version: string | null;
  authority_status: string;
};

export type Authority = ApiResponseMetadata & {
  authority_id: string;
  status: "ACTIVE" | "PENDING_IDENTITY" | "SCHEDULED" | "EXPIRED" | "REVOKED";
  action: string;
  actions: string[];
  targets: string[];
  target: string;
  purpose: string;
  tools: string[];
  environment: string[];
  valid_from: string;
  expires_at: string;
  revoked_at: string | null;
  authority_reference: string;
  authority_version: string | null;
  supersedes_authority_id: string | null;
  issuer: string;
  approver: string;
  delegated_from: string | null;
  delegation_depth: number;
};

export type AuthorityGrantInput = {
  action: string;
  target: string;
  purpose: string;
  environment: string;
  valid_from?: string;
  expires_at: string;
  data_boundary?: "PUBLIC" | "INTERNAL";
  execution_limit?: number;
};

export type AuthorityList = ApiResponseMetadata & { authorities: Array<Omit<Authority, keyof ApiResponseMetadata>> };

export type ReviewResolutionInput = {
  resolution: "APPROVED" | "REJECTED";
  reason: string;
  evidence_reference: string;
};

export type Review = ApiResponseMetadata & {
  review_reference: string;
  status: "REQUESTED" | "ASSIGNED" | "IN_REVIEW" | "APPROVED" | "REJECTED" | "CANCELLED";
  disposition: "APPROVED" | "REJECTED" | null;
  original_decision: "REVIEW";
  original_transaction_id: string;
  agent_id: string;
  resolution_reason: string | null;
  evidence_reference: string | null;
  next_action: "WAIT_FOR_AUTHORIZED_REVIEWER" | "SUBMIT_NEW_CANONICAL_EVALUATION" | "DO_NOT_EXECUTE";
  original_decision_immutable: true;
  history: Array<Record<string, unknown>>;
  [key: string]: unknown;
};

export type Transaction = ApiResponseMetadata & {
  decision_id: string;
  transaction_id: string;
  receipt_id: string;
  replay_id: string;
  agent_id: string;
  decision: Decision;
  reason_codes: string[];
  [key: string]: unknown;
};

export type ConsequenceTime = {
  evaluated_at: string;
  agent_identity_reference: string;
  authority: { reference: string; version: string | null; issuedAt: string; expiresAt: string; revocationState: "active" | "revoked"; scopeValid: boolean };
  delegation_lineage: string[];
  intent: { reference: string | null; action: string; target: string; purpose: string; environment: string; requestDigest: string };
  current_conditions: {
    identity_assurance: "CURRENT" | "STALE_OR_UNAVAILABLE";
    evidence_complete: boolean;
    evidence_fresh: boolean;
    policy_reference: string;
    policy_version: string;
    runtime_authority_state: "MATCH" | "MISMATCH" | "INSUFFICIENT_EVIDENCE" | null;
    destination_authority_state: "MATCH" | "MISMATCH" | "INSUFFICIENT_EVIDENCE" | null;
    authorization_propagation_state: string | null;
    material_changes: string[];
    material_change_references: string[];
    human_approval_required: boolean;
    human_approval_state: "NOT_REQUIRED" | "CURRENT" | "MISSING" | "STALE" | "AGENT_ASSERTED";
    current_condition_references: string[];
  };
  consequence: string;
  canonical_decision: Decision;
  reason_codes: string[];
  previous_evaluation: Record<string, unknown> | null;
  decision_differs_from_previous: boolean;
  previous_allow_standing_authorization: false;
};

export type Receipt = Transaction & { receipt_version: string; authority_version: string | null; current_condition_references: string[]; material_change_references: string[]; consequence_time: ConsequenceTime };
export type Replay = ApiResponseMetadata & {
  replay_id: string;
  decision_id: string;
  transaction_id: string;
  receipt_id: string;
  agent_id: string;
  authority_version: string | null;
  consequence_time: ConsequenceTime;
  decision_comparison: Record<string, unknown> | null;
  outcome_evidence: Record<string, unknown>;
  events: Array<Record<string, unknown>>;
  [key: string]: unknown;
};
export type EvidenceResult = ApiResponseMetadata & { evidence_id: string; status: "RECORDED" | "DUPLICATE"; classification: "AGENT_ASSERTED"; server_verified: false; evidence_digest: string; [key: string]: unknown };
export type OutcomeResult = ApiResponseMetadata & { submission_id: string | null; transaction_id: string; status: "RECORDED" | "DUPLICATE"; evidence_independence: "AGENT_ASSERTED"; independent_destination_evidence: false; submission_digest: string };

export type DecisionResult = ApiResponseMetadata & {
  decision_id: string;
  transaction_id: string;
  receipt_id: string;
  replay_id: string;
  agent_id: string;
  decision: Decision;
  reason_codes: string[];
  consequence: string;
  confidence: string;
  authority_reference: string;
  authority_version: string | null;
  policy_reference: string;
  policy: { id: string; version: string };
  policy_version: string;
  correlation_id: string;
  created_at: string;
  transaction_url: string;
  receipt_url: string;
  replay_url: string;
  review_required: boolean;
  review_reference: string | null;
  blocking_reason_codes: string[];
  required_evidence: string[];
  human_approval_required: boolean;
  consequence_time: ConsequenceTime;
  execution_authorization: Record<string, unknown> | null;
  idempotent_replay: boolean;
};

export type ClientOptions = {
  apiKey: string;
  baseUrl?: string;
  timeoutMs?: number;
  fetch?: typeof fetch;
};

function canonicalize(value: unknown, seen = new Set<object>()): string {
  if (value === null) return "null";
  if (typeof value === "string" || typeof value === "boolean") return JSON.stringify(value);
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new TypeError("Canonical JSON rejects non-finite numbers.");
    return Object.is(value, -0) ? "0" : JSON.stringify(value);
  }
  if (typeof value !== "object" || value === null) throw new TypeError("Canonical JSON accepts JSON values only.");
  if (seen.has(value)) throw new TypeError("Canonical JSON rejects cycles.");
  seen.add(value);
  try {
    if (Array.isArray(value)) return `[${value.map((item) => canonicalize(item, seen)).join(",")}]`;
    const object = value as Record<string, unknown>;
    return `{${Object.keys(object).sort().map((key) => `${JSON.stringify(key)}:${canonicalize(object[key], seen)}`).join(",")}}`;
  } finally {
    seen.delete(value);
  }
}

function base64url(value: ArrayBuffer) {
  const bytes = new Uint8Array(value);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function signCanonical(value: Record<string, unknown>, privateKey: CryptoKey) {
  if (privateKey.type !== "private" || privateKey.algorithm.name !== "Ed25519") {
    throw new TypeError("An Ed25519 private CryptoKey is required.");
  }
  const signature = await crypto.subtle.sign("Ed25519", privateKey, new TextEncoder().encode(canonicalize(value)));
  return base64url(signature);
}

export async function signManifest(claims: PublicManifestClaims, privateKey: CryptoKey): Promise<SignedPublicManifest> {
  const normalized: PublicManifestClaims = {
    ...claims,
    declared_capabilities: [...new Set(claims.declared_capabilities)].sort(),
  };
  return { ...normalized, signature: await signCanonical(normalized as unknown as Record<string, unknown>, privateKey) };
}

export async function signChallenge(
  challenge: Challenge,
  enterpriseId: string,
  credentialId: string,
  privateKey: CryptoKey,
): Promise<ProofSubmission> {
  const signaturePayload = {
    challengeId: challenge.challenge_id,
    enterpriseId,
    operationalEntityId: challenge.operational_entity_id,
    nonce: challenge.nonce,
    audience: challenge.audience,
    issuer: challenge.issuer,
    subject: challenge.subject,
    manifestDigest: challenge.manifest_digest,
    signingKeyId: challenge.signing_key_id,
    issuedAt: new Date(challenge.issued_at).toISOString(),
    expiresAt: new Date(challenge.expires_at).toISOString(),
  };
  return {
    challenge_id: challenge.challenge_id,
    credential_id: credentialId,
    signature: await signCanonical(signaturePayload, privateKey),
    signed_payload: {
      challenge_id: challenge.challenge_id,
      enterprise_id: enterpriseId,
      operational_entity_id: challenge.operational_entity_id,
      nonce: challenge.nonce,
      audience: challenge.audience,
      issuer: challenge.issuer,
      subject: challenge.subject,
      manifest_digest: challenge.manifest_digest,
      signing_key_id: challenge.signing_key_id,
      issued_at: challenge.issued_at,
      expires_at: challenge.expires_at,
      submitted_at: new Date().toISOString(),
    },
  };
}

function validateOptions(options: ClientOptions) {
  if (!options.apiKey || !/^cs_(test|live)_/.test(options.apiKey)) throw new TypeError("A Cyber Sentinels API key is required.");
  const baseUrl = new URL(options.baseUrl ?? "https://www.cybersentinels.com");
  const local = ["localhost", "127.0.0.1", "::1"].includes(baseUrl.hostname);
  if (baseUrl.protocol !== "https:" && !local) throw new TypeError("baseUrl must use HTTPS outside local development.");
  return baseUrl.toString().replace(/\/$/, "");
}

function positiveHeaderNumber(value: string | null) {
  if (value === null || value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

export class CyberSentinels {
  readonly agents: {
    register: (input: RegisterAgentInput, options?: RequestOptions) => Promise<RegisteredAgent>;
    create: (input: RegisterAgentInput, options?: RequestOptions) => Promise<RegisteredAgent>;
    get: (agentId: string, options?: RequestOptions) => Promise<Agent>;
    authority: (agentId: string, options?: RequestOptions) => Promise<Authority>;
    registerCredential: (agentId: string, input: RegisterCredentialInput, options?: RequestOptions) => Promise<RegisteredCredential>;
    registerManifest: (agentId: string, input: SignedPublicManifest, options?: RequestOptions) => Promise<Record<string, unknown>>;
    issueChallenge: (agentId: string, options?: RequestOptions) => Promise<Challenge>;
    submitProof: (agentId: string, input: ProofSubmission, options?: RequestOptions) => Promise<Record<string, unknown>>;
    verify: (agentId: string, input: ProofSubmission, options?: RequestOptions) => Promise<Record<string, unknown>>;
    getAuthority: (agentId: string, options?: RequestOptions) => Promise<Authority>;
    getTrustState: (agentId: string, options?: RequestOptions) => Promise<Record<string, unknown>>;
  };
  readonly decisions: {
    create: (input: DecisionRequest, options?: RequestOptions) => Promise<DecisionResult>;
  };
  readonly transactions: {
    get: (id: string, options?: RequestOptions) => Promise<Transaction>;
    receipt: (id: string, options?: RequestOptions) => Promise<Receipt>;
    replay: (id: string, options?: RequestOptions) => Promise<Replay>;
  };
  readonly trust: {
    requestDecision: (input: DecisionRequest, options?: RequestOptions) => Promise<DecisionResult>;
    authorize: (input: DecisionRequest, options?: RequestOptions) => Promise<DecisionResult>;
    getTransaction: (id: string, options?: RequestOptions) => Promise<Transaction>;
    getReplay: (id: string, options?: RequestOptions) => Promise<Replay>;
    getReceipt: (id: string, options?: RequestOptions) => Promise<Receipt>;
    submitOutcome: (id: string, input: Record<string, unknown>, options?: RequestOptions) => Promise<Record<string, unknown>>;
  };
  readonly authority: {
    get: (agentId: string, options?: RequestOptions) => Promise<Authority>;
    list: (agentId: string, options?: RequestOptions) => Promise<AuthorityList>;
    grant: (agentId: string, input: AuthorityGrantInput, options?: RequestOptions) => Promise<Authority>;
    getVersion: (agentId: string, authorityId: string, options?: RequestOptions) => Promise<Authority>;
    revoke: (agentId: string, authorityId: string, reason: string, options?: RequestOptions) => Promise<Record<string, unknown>>;
  };
  readonly reviews: {
    get: (reviewReference: string, options?: RequestOptions) => Promise<Review>;
    resolve: (reviewReference: string, input: ReviewResolutionInput, options?: RequestOptions) => Promise<Review>;
  };
  readonly evidence: {
    submit: (input: EvidenceSubmission, options?: RequestOptions) => Promise<EvidenceResult>;
  };
  readonly outcomes: {
    submit: (input: OutcomeSubmission, options?: RequestOptions) => Promise<OutcomeResult>;
  };

  readonly #apiKey: string;
  readonly #baseUrl: string;
  readonly #timeoutMs: number;
  readonly #fetch: typeof fetch;

  constructor(options: ClientOptions) {
    this.#baseUrl = validateOptions(options);
    this.#apiKey = options.apiKey;
    this.#timeoutMs = options.timeoutMs ?? 10_000;
    this.#fetch = options.fetch ?? globalThis.fetch;
    if (!this.#fetch) throw new TypeError("A Fetch API implementation is required.");
    const registerAgent = (input: RegisterAgentInput, requestOptions?: RequestOptions) => this.#request<RegisteredAgent>("POST", "/api/v1/agents", input, requestOptions);
    const getAuthority = (agentId: string, requestOptions?: RequestOptions) => this.#request<Authority>("GET", `/api/v1/agents/${encodeURIComponent(agentId)}/authority`, undefined, requestOptions);
    this.agents = {
      register: registerAgent,
      create: registerAgent,
      get: (agentId, requestOptions) => this.#request("GET", `/api/v1/agents/${encodeURIComponent(agentId)}`, undefined, requestOptions),
      authority: getAuthority,
      registerCredential: (agentId, input, requestOptions) => this.#request("POST", `/api/v1/agents/${encodeURIComponent(agentId)}/credentials`, input, requestOptions),
      registerManifest: (agentId, input, requestOptions) => this.#request("POST", `/api/v1/agents/${encodeURIComponent(agentId)}/manifest`, input, requestOptions),
      issueChallenge: (agentId, requestOptions) => this.#request("POST", `/api/v1/agents/${encodeURIComponent(agentId)}/challenge`, {}, requestOptions),
      submitProof: (agentId, input, requestOptions) => this.#request("POST", `/api/v1/agents/${encodeURIComponent(agentId)}/proof`, input, requestOptions),
      verify: (agentId, input, requestOptions) => this.#request("POST", `/api/v1/agents/${encodeURIComponent(agentId)}/proof`, input, requestOptions),
      getAuthority,
      getTrustState: (agentId, requestOptions) => this.#request("GET", `/api/v1/agents/${encodeURIComponent(agentId)}/trust-state`, undefined, requestOptions),
    };
    const requestDecision = (input: DecisionRequest, requestOptions?: RequestOptions) =>
      this.#request<DecisionResult>("POST", "/api/v1/trust/decisions", input, requestOptions, input.idempotency_key);
    const getTransaction = (id: string, requestOptions?: RequestOptions) => this.#request<Transaction>("GET", `/api/v1/trust/transactions/${encodeURIComponent(id)}`, undefined, requestOptions);
    const getReplay = (id: string, requestOptions?: RequestOptions) => this.#request<Replay>("GET", `/api/v1/trust/transactions/${encodeURIComponent(id)}/replay`, undefined, requestOptions);
    const getReceipt = (id: string, requestOptions?: RequestOptions) => this.#request<Receipt>("GET", `/api/v1/trust/transactions/${encodeURIComponent(id)}/receipt`, undefined, requestOptions);
    this.decisions = { create: requestDecision };
    this.transactions = { get: getTransaction, replay: getReplay, receipt: getReceipt };
    this.trust = {
      requestDecision,
      authorize: requestDecision,
      getTransaction,
      getReplay,
      getReceipt,
      submitOutcome: (id, input, requestOptions) => this.#request("POST", `/api/v1/trust/transactions/${encodeURIComponent(id)}/outcomes`, input, requestOptions),
    };
    this.authority = {
      get: getAuthority,
      list: (agentId, requestOptions) => this.#request("GET", `/api/v1/agents/${encodeURIComponent(agentId)}/authorities`, undefined, requestOptions),
      grant: (agentId, input, requestOptions) => this.#request("POST", `/api/v1/agents/${encodeURIComponent(agentId)}/authorities`, input, requestOptions),
      getVersion: (agentId, authorityId, requestOptions) => this.#request("GET", `/api/v1/agents/${encodeURIComponent(agentId)}/authorities/${encodeURIComponent(authorityId)}`, undefined, requestOptions),
      revoke: (agentId, authorityId, reason, requestOptions) => this.#request("POST", `/api/v1/agents/${encodeURIComponent(agentId)}/authorities/${encodeURIComponent(authorityId)}/revoke`, { reason }, requestOptions),
    };
    this.reviews = {
      get: (reviewReference, requestOptions) => this.#request("GET", `/api/v1/reviews/${encodeURIComponent(reviewReference)}`, undefined, requestOptions),
      resolve: (reviewReference, input, requestOptions) => this.#request("POST", `/api/v1/reviews/${encodeURIComponent(reviewReference)}/resolve`, input, requestOptions),
    };
    this.evidence = {
      submit: (input, requestOptions) => this.#request("POST", "/api/v1/evidence", input, requestOptions),
    };
    this.outcomes = {
      submit: (input, requestOptions) => this.#request("POST", `/api/v1/trust/transactions/${encodeURIComponent(input.transactionId)}/outcomes`, {
        source_id: "self",
        destination: input.evidence.destination,
        action_reference: input.evidence.actionReference ?? `transaction:${input.transactionId}`,
        target: input.evidence.target,
        result: input.outcome,
        observed_at: input.evidence.observedAt ?? new Date().toISOString(),
        evidence_reference: input.evidence.reference,
        ...(input.evidence.digest ? { digest: input.evidence.digest } : {}),
      }, requestOptions),
    };
  }

  async #request<T>(
    method: string,
    path: string,
    body?: unknown,
    options: RequestOptions = {},
    idempotencyKey?: string,
  ): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(new DOMException("Request timed out", "TimeoutError")), options.timeoutMs ?? this.#timeoutMs);
    const onAbort = () => controller.abort(options.signal?.reason);
    options.signal?.addEventListener("abort", onAbort, { once: true });
    try {
      const headers: Record<string, string> = {
        authorization: `Bearer ${this.#apiKey}`,
        accept: "application/json",
      };
      if (body !== undefined) headers["content-type"] = "application/json";
      if (idempotencyKey) headers["idempotency-key"] = idempotencyKey;
      const response = await this.#fetch(`${this.#baseUrl}${path}`, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: controller.signal,
      });
      options.onResponse?.({
        status: response.status,
        requestId: response.headers.get("x-request-id"),
        correlationId: response.headers.get("x-correlation-id"),
        apiVersion: response.headers.get("x-cyber-sentinels-api-version"),
        rateLimit: {
          limit: positiveHeaderNumber(response.headers.get("x-ratelimit-limit")),
          remaining: positiveHeaderNumber(response.headers.get("x-ratelimit-remaining")),
          resetAt: response.headers.get("x-ratelimit-reset"),
          retryAfter: positiveHeaderNumber(response.headers.get("retry-after")),
        },
      });
      const responseVersion = response.headers.get("x-cyber-sentinels-api-version");
      if (responseVersion && responseVersion !== API_VERSION) {
        throw new CyberSentinelsError("The server returned an incompatible V1 contract version.", "API_VERSION_MISMATCH", 409, response.headers.get("x-correlation-id"));
      }
      const parsed = await response.json().catch(() => ({})) as {
        error?: { code?: string; message?: string; correlation_id?: string };
      };
      if (!response.ok) {
        const code = parsed.error?.code ?? `HTTP_${response.status}`;
        const message = parsed.error?.message ?? "The Cyber Sentinels API rejected the request.";
        const correlation = parsed.error?.correlation_id ?? response.headers.get("x-correlation-id");
        const retryAfter = Number(response.headers.get("retry-after"));
        const args = [message, code, response.status, correlation, Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : null] as const;
        if (response.status === 401) throw new AuthenticationError(...args);
        if (response.status === 403) throw new PermissionDeniedError(...args);
        if (response.status === 409) throw new ConflictError(...args);
        if (response.status === 429) throw new RateLimitError(...args);
        if (response.status >= 500) throw new ServerError(...args);
        throw new CyberSentinelsError(...args);
      }
      return parsed as T;
    } catch (error) {
      if (error instanceof CyberSentinelsError) throw error;
      if (controller.signal.aborted && !options.signal?.aborted) {
        throw new TimeoutError("The Cyber Sentinels request timed out.", "REQUEST_TIMEOUT", 408, null, null, error);
      }
      throw error;
    } finally {
      clearTimeout(timeout);
      options.signal?.removeEventListener("abort", onAbort);
    }
  }
}
