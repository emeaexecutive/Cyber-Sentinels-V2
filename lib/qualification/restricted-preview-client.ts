const allowedOperations = new Set([
  "qualification.schema.read",
  "qualification.agent.register",
  "qualification.authority.read",
  "qualification.decision.create",
  "qualification.review.read",
  "qualification.replay.read",
]);

export type RestrictedPreviewClientOptions = {
  gatewayUrl: string;
  capabilityToken: string;
  runId: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
};

function normalizedGatewayUrl(value: string) {
  const url = new URL(value);
  if (
    url.protocol !== "https:"
    && !(url.protocol === "http:" && ["127.0.0.1", "localhost"].includes(url.hostname))
  ) {
    throw new Error("GATEWAY_ORIGIN_INSECURE");
  }
  if (url.username || url.password || url.search || url.hash) {
    throw new Error("GATEWAY_ORIGIN_INVALID");
  }
  if (url.pathname !== "/api/restricted-preview/v1/execute") {
    throw new Error("GATEWAY_PATH_INVALID");
  }
  return url;
}

export class RestrictedPreviewClient {
  private readonly options: RestrictedPreviewClientOptions;

  constructor(options: RestrictedPreviewClientOptions) {
    this.options = options;
  }

  async execute(operation: string, body: Record<string, unknown>) {
    if (!allowedOperations.has(operation)) throw new Error("GATEWAY_OPERATION_NOT_ALLOWED");
    if (
      !process.env.ACCEPTANCE_GATEWAY_URL
      || process.env.SUPABASE_SERVICE_ROLE_KEY
      || process.env.SUPABASE_ACCESS_TOKEN
    ) {
      throw new Error("ACCEPTANCE_GATEWAY_CREDENTIAL_BOUNDARY_INVALID");
    }
    const url = normalizedGatewayUrl(this.options.gatewayUrl);
    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      this.options.timeoutMs ?? 10_000,
    );
    try {
      const response = await (this.options.fetchImpl ?? fetch)(url, {
        method: "POST",
        redirect: "error",
        signal: controller.signal,
        headers: {
          authorization: `Bearer ${this.options.capabilityToken}`,
          "content-type": "application/json",
          "x-acceptance-run-id": this.options.runId,
        },
        body: JSON.stringify({ operation, payload: body }),
      });
      if (!response.ok) throw new Error("GATEWAY_OPERATION_REJECTED");
      const text = await response.text();
      if (Buffer.byteLength(text, "utf8") > 64 * 1024) {
        throw new Error("GATEWAY_RESPONSE_TOO_LARGE");
      }
      return JSON.parse(text) as unknown;
    } finally {
      clearTimeout(timeout);
    }
  }
}

