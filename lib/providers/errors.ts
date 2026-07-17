import type { IdentityProviderId } from "./types.ts";

export type ProviderErrorCode =
  | "PROVIDER_NOT_CONFIGURED"
  | "PROVIDER_DISABLED"
  | "PROVIDER_UNAVAILABLE"
  | "PROVIDER_TIMEOUT"
  | "PROVIDER_RATE_LIMITED"
  | "PROVIDER_AUTHENTICATION_FAILED"
  | "PROVIDER_INVALID_RESPONSE"
  | "PROVIDER_SESSION_NOT_FOUND"
  | "PROVIDER_SESSION_EXPIRED"
  | "CALLBACK_SIGNATURE_INVALID"
  | "CALLBACK_TIMESTAMP_INVALID"
  | "CALLBACK_REPLAY_DETECTED"
  | "CALLBACK_DUPLICATE"
  | "NORMALIZATION_FAILED"
  | "EVIDENCE_PERSISTENCE_FAILED";

const statusByCode: Record<ProviderErrorCode, number> = {
  PROVIDER_NOT_CONFIGURED: 503,
  PROVIDER_DISABLED: 503,
  PROVIDER_UNAVAILABLE: 503,
  PROVIDER_TIMEOUT: 504,
  PROVIDER_RATE_LIMITED: 429,
  PROVIDER_AUTHENTICATION_FAILED: 502,
  PROVIDER_INVALID_RESPONSE: 502,
  PROVIDER_SESSION_NOT_FOUND: 404,
  PROVIDER_SESSION_EXPIRED: 410,
  CALLBACK_SIGNATURE_INVALID: 401,
  CALLBACK_TIMESTAMP_INVALID: 401,
  CALLBACK_REPLAY_DETECTED: 409,
  CALLBACK_DUPLICATE: 200,
  NORMALIZATION_FAILED: 422,
  EVIDENCE_PERSISTENCE_FAILED: 500,
};

export class ProviderError extends Error {
  readonly code: ProviderErrorCode;
  readonly safeMessage: string;
  readonly diagnosticMessage: string;
  readonly retryable: boolean;
  readonly provider: IdentityProviderId;
  readonly correlationId: string;
  readonly httpStatus: number;

  constructor(
    code: ProviderErrorCode,
    safeMessage: string,
    diagnosticMessage: string,
    retryable: boolean,
    provider: IdentityProviderId,
    correlationId: string,
    options?: { cause?: unknown; httpStatus?: number }
  ) {
    super(safeMessage, { cause: options?.cause });
    this.name = "ProviderError";
    this.code = code;
    this.safeMessage = safeMessage;
    this.diagnosticMessage = diagnosticMessage;
    this.retryable = retryable;
    this.provider = provider;
    this.correlationId = correlationId;
    this.httpStatus = options?.httpStatus ?? statusByCode[code];
  }

  toSafeResponse() {
    return {
      ok: false,
      error: this.code,
      message: this.safeMessage,
      retryable: this.retryable,
      provider: this.provider,
      correlationId: this.correlationId,
    };
  }
}
