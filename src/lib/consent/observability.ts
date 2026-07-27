import "server-only";

type ErrorWithMetadata = Error & {
  code?: string;
  internalCode?: string;
  status?: number;
  operation?: string;
  details?: string;
  hint?: string;
  supabaseCode?: string;
  supabaseMessage?: string;
  supabaseDetails?: string;
  supabaseHint?: string;
};

function redactSensitive(value: string) {
  return value
    .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, "Bearer [redacted]")
    .replace(/\b(?:eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9._-]{10,})\b/g, "[redacted-jwt]")
    .replace(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g, "[redacted-ip]")
    .replace(/\b(?:[a-f0-9]{32,}|[A-Za-z0-9+/]{40,}={0,2})\b/g, "[redacted-token]");
}

export function sanitizeErrorText(value: unknown) {
  if (typeof value !== "string") return undefined;
  const normalized = value.replace(/\s+/g, " ").trim();
  if (!normalized) return undefined;
  return redactSensitive(normalized).slice(0, 240);
}

export function sanitizeErrorCode(value: unknown) {
  if (typeof value !== "string") return undefined;
  const normalized = value.replace(/[^A-Za-z0-9_.:-]/g, "").trim();
  if (!normalized) return undefined;
  return normalized.slice(0, 80);
}

export function consentErrorTelemetry(error: unknown, fallbackOperation: string) {
  const candidate = (error instanceof Error ? error : new Error("Unexpected error")) as ErrorWithMetadata;
  const errorCode = sanitizeErrorCode(candidate.code) ?? "CONSENT_API_FAILED";
  return {
    operation: candidate.operation ?? fallbackOperation,
    errorName: candidate.name,
    errorCode,
    internalCode: sanitizeErrorCode(candidate.internalCode),
    status: candidate.status ?? 500,
    supabaseCode: sanitizeErrorCode(candidate.supabaseCode ?? candidate.code),
    message: sanitizeErrorText(candidate.supabaseMessage ?? candidate.message),
    details: sanitizeErrorText(candidate.supabaseDetails ?? candidate.details),
    hint: sanitizeErrorText(candidate.supabaseHint ?? candidate.hint),
  };
}
