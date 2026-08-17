export type Decision = "ALLOW" | "REVIEW" | "DENY";
export type ApiScope =
  | "agents:write"
  | "agents:verify"
  | "authority:read"
  | "trust:request"
  | "trust:read"
  | "outcomes:write";

export type RequestOptions = { signal?: AbortSignal; timeoutMs?: number };

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

export type RegisteredAgent = {
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
    authority_reference: string;
  };
};

export type RegisterCredentialInput = {
  public_jwk: JsonWebKey;
  kid: string;
  algorithm: "Ed25519" | "EdDSA";
  expires_at?: string | null;
  rotate_from_credential_id?: string;
};

export type RegisteredCredential = {
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

export type Challenge = {
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
};

export type DecisionResult = {
  transaction_id: string;
  decision: Decision;
  reason_codes: string[];
  consequence: string;
  confidence: string;
  authority_reference: string;
  policy_version: string;
  transaction_url: string;
  receipt_url: string;
  replay_url: string;
  review_required: boolean;
  review_reference: string | null;
  blocking_reason_codes: string[];
  required_evidence: string[];
  human_approval_required: boolean;
  execution_authorization: Record<string, unknown> | null;
  idempotent_replay: boolean;
};

type ClientOptions = {
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
  const baseUrl = new URL(options.baseUrl ?? "https://cybersentinels.com");
  const local = ["localhost", "127.0.0.1", "::1"].includes(baseUrl.hostname);
  if (baseUrl.protocol !== "https:" && !local) throw new TypeError("baseUrl must use HTTPS outside local development.");
  return baseUrl.toString().replace(/\/$/, "");
}

export class CyberSentinels {
  readonly agents: {
    register: (input: RegisterAgentInput, options?: RequestOptions) => Promise<RegisteredAgent>;
    registerCredential: (agentId: string, input: RegisterCredentialInput, options?: RequestOptions) => Promise<RegisteredCredential>;
    registerManifest: (agentId: string, input: SignedPublicManifest, options?: RequestOptions) => Promise<Record<string, unknown>>;
    issueChallenge: (agentId: string, options?: RequestOptions) => Promise<Challenge>;
    submitProof: (agentId: string, input: ProofSubmission, options?: RequestOptions) => Promise<Record<string, unknown>>;
    getAuthority: (agentId: string, options?: RequestOptions) => Promise<Record<string, unknown>>;
    getTrustState: (agentId: string, options?: RequestOptions) => Promise<Record<string, unknown>>;
  };
  readonly trust: {
    requestDecision: (input: DecisionRequest, options?: RequestOptions) => Promise<DecisionResult>;
    authorize: (input: DecisionRequest, options?: RequestOptions) => Promise<DecisionResult>;
    getTransaction: (id: string, options?: RequestOptions) => Promise<Record<string, unknown>>;
    getReplay: (id: string, options?: RequestOptions) => Promise<Record<string, unknown>>;
    getReceipt: (id: string, options?: RequestOptions) => Promise<Record<string, unknown>>;
    submitOutcome: (id: string, input: Record<string, unknown>, options?: RequestOptions) => Promise<Record<string, unknown>>;
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
    this.agents = {
      register: (input, requestOptions) => this.#request("POST", "/api/v1/agents", input, requestOptions),
      registerCredential: (agentId, input, requestOptions) => this.#request("POST", `/api/v1/agents/${encodeURIComponent(agentId)}/credentials`, input, requestOptions),
      registerManifest: (agentId, input, requestOptions) => this.#request("POST", `/api/v1/agents/${encodeURIComponent(agentId)}/manifest`, input, requestOptions),
      issueChallenge: (agentId, requestOptions) => this.#request("POST", `/api/v1/agents/${encodeURIComponent(agentId)}/challenge`, {}, requestOptions),
      submitProof: (agentId, input, requestOptions) => this.#request("POST", `/api/v1/agents/${encodeURIComponent(agentId)}/proof`, input, requestOptions),
      getAuthority: (agentId, requestOptions) => this.#request("GET", `/api/v1/agents/${encodeURIComponent(agentId)}/authority`, undefined, requestOptions),
      getTrustState: (agentId, requestOptions) => this.#request("GET", `/api/v1/agents/${encodeURIComponent(agentId)}/trust-state`, undefined, requestOptions),
    };
    const requestDecision = (input: DecisionRequest, requestOptions?: RequestOptions) =>
      this.#request<DecisionResult>("POST", "/api/v1/trust/decisions", input, requestOptions, input.idempotency_key);
    this.trust = {
      requestDecision,
      authorize: requestDecision,
      getTransaction: (id, requestOptions) => this.#request("GET", `/api/v1/trust/transactions/${encodeURIComponent(id)}`, undefined, requestOptions),
      getReplay: (id, requestOptions) => this.#request("GET", `/api/v1/trust/transactions/${encodeURIComponent(id)}/replay`, undefined, requestOptions),
      getReceipt: (id, requestOptions) => this.#request("GET", `/api/v1/trust/transactions/${encodeURIComponent(id)}/receipt`, undefined, requestOptions),
      submitOutcome: (id, input, requestOptions) => this.#request("POST", `/api/v1/trust/transactions/${encodeURIComponent(id)}/outcomes`, input, requestOptions),
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
