import { ProviderError } from "../../errors.ts";
import type { CreateProviderSessionInput } from "../../types.ts";
import type { HopaeProviderConfig } from "./hopae-config.ts";
import { parseHopaeVerificationResponse, recordValue, type HopaeJson } from "./hopae-types.ts";

export class HopaeClient {
  private readonly config: HopaeProviderConfig;
  private readonly fetcher: typeof fetch;

  constructor(config: HopaeProviderConfig, fetcher: typeof fetch = fetch) {
    this.config = config;
    this.fetcher = fetcher;
  }

  private async request(path: string, correlationId: string, init: RequestInit = {}, retryable = false): Promise<{ payload: HopaeJson; requestId: string | null }> {
    let attempt = 0;
    while (true) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), this.config.requestTimeoutMs);
      try {
        const response = await this.fetcher(`${this.config.apiBaseUrl}${path}`, {
          ...init,
          cache: "no-store",
          signal: controller.signal,
          headers: {
            Accept: "application/json",
            Authorization: `Basic ${Buffer.from(`${this.config.clientId}:${this.config.clientSecret}`, "utf8").toString("base64")}`,
            "X-Correlation-ID": correlationId,
            ...(init.body ? { "Content-Type": "application/json" } : {}),
            ...init.headers,
          },
        });
        const requestId = response.headers.get("x-request-id") ?? response.headers.get("x-hopae-request-id");
        const payload = recordValue(await response.json().catch(() => ({})));
        if (response.ok) return { payload, requestId };
        const retry = retryable && attempt < this.config.maxRetries && (response.status === 429 || response.status >= 500);
        if (retry) { attempt += 1; continue; }
        const code = response.status === 401 || response.status === 403
          ? "PROVIDER_AUTHENTICATION_FAILED"
          : response.status === 404
            ? "PROVIDER_SESSION_NOT_FOUND"
            : response.status === 429
              ? "PROVIDER_RATE_LIMITED"
              : response.status >= 500
                ? "PROVIDER_UNAVAILABLE"
                : "PROVIDER_INVALID_RESPONSE";
        throw new ProviderError(code, "Identity provider request could not be completed.", `Hopae returned HTTP ${response.status}.`, code === "PROVIDER_RATE_LIMITED" || code === "PROVIDER_UNAVAILABLE", "hopae_connect", correlationId, { httpStatus: response.status === 404 ? 404 : undefined });
      } catch (error) {
        if (error instanceof ProviderError) throw error;
        if (error instanceof Error && error.name === "AbortError") {
          throw new ProviderError("PROVIDER_TIMEOUT", "Identity provider request timed out.", `Hopae request exceeded ${this.config.requestTimeoutMs} ms.`, true, "hopae_connect", correlationId, { cause: error });
        }
        throw new ProviderError("PROVIDER_UNAVAILABLE", "Identity provider is unavailable.", error instanceof Error ? error.message : "Unknown network error.", true, "hopae_connect", correlationId, { cause: error });
      } finally {
        clearTimeout(timeout);
      }
    }
  }

  async createVerification(input: CreateProviderSessionInput) {
    const body: Record<string, unknown> = { providerId: this.config.providerId, redirectUri: input.redirectUri };
    if (input.requestedAssuranceLevel) body.requestedLoa = input.requestedAssuranceLevel;
    const result = await this.request("/connect/v1/verifications", input.context.correlationId, { method: "POST", body: JSON.stringify(body) }, false);
    const verification = parseHopaeVerificationResponse(result.payload);
    if (!verification) throw new ProviderError("PROVIDER_INVALID_RESPONSE", "Identity provider returned an invalid session.", "Create verification response lacked verificationId or status.", false, "hopae_connect", input.context.correlationId);
    return { ...result, verification };
  }

  async getVerification(providerSessionId: string, correlationId: string) {
    const result = await this.request(`/connect/v1/verifications/${encodeURIComponent(providerSessionId)}`, correlationId, {}, true);
    const verification = parseHopaeVerificationResponse(result.payload);
    if (!verification || verification.verificationId !== providerSessionId) throw new ProviderError("PROVIDER_INVALID_RESPONSE", "Identity provider returned an invalid session.", "Retrieve response did not match the requested provider session.", false, "hopae_connect", correlationId);
    return { ...result, verification };
  }

  async getUserInfo(providerSessionId: string, correlationId: string) {
    return this.request(`/connect/v1/verifications/${encodeURIComponent(providerSessionId)}/userinfo`, correlationId, {}, true);
  }

  async health(correlationId: string) {
    return this.request("/connect/v1/providers", correlationId, {}, true);
  }
}
