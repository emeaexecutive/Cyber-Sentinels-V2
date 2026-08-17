export const PASSWORD_RECOVERY_PATH = "/account/reset-password";
export const PASSWORD_RECOVERY_COOKIE = "cyber_password_recovery";
export const PASSWORD_RESET_GENERIC_MESSAGE =
  "If an account exists for that email, we've sent password reset instructions.";
export const PASSWORD_MIN_LENGTH = 8;

const correlationIdPattern = /^[A-Za-z0-9_.:-]{1,128}$/;

export function normalizePasswordResetCorrelationId(value: string | null | undefined) {
  const candidate = String(value ?? "").trim();
  return correlationIdPattern.test(candidate) ? candidate : null;
}

export function validateNewPassword(password: string) {
  if (password.length < PASSWORD_MIN_LENGTH) {
    return `Use at least ${PASSWORD_MIN_LENGTH} characters.`;
  }

  return null;
}

function normalizeConfiguredOrigin(value: string | null | undefined) {
  const candidate = String(value ?? "").trim();
  if (!candidate) return null;

  try {
    const url = new URL(candidate);
    if (!(["http:", "https:"] as const).includes(url.protocol as "http:" | "https:")) {
      return null;
    }
    return url.origin;
  } catch {
    return null;
  }
}

export function getApprovedAuthOrigin(requestUrl: string) {
  const requestOrigin = new URL(requestUrl).origin;
  const configuredOrigin = normalizeConfiguredOrigin(
    process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL,
  );

  if (process.env.VERCEL_ENV === "production") {
    return configuredOrigin === requestOrigin ? requestOrigin : null;
  }

  if (process.env.VERCEL_ENV === "preview") {
    const vercelOrigin = normalizeConfiguredOrigin(
      process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null,
    );
    if (requestOrigin === vercelOrigin || requestOrigin === configuredOrigin) {
      return requestOrigin;
    }
    return null;
  }

  const hostname = new URL(requestOrigin).hostname;
  if (["localhost", "127.0.0.1", "::1"].includes(hostname)) {
    return requestOrigin;
  }

  return configuredOrigin === requestOrigin ? requestOrigin : null;
}

export function isApprovedSameOriginRequest(request: Request) {
  const approvedOrigin = getApprovedAuthOrigin(request.url);
  if (!approvedOrigin) return false;

  const suppliedOrigin = request.headers.get("origin");
  return suppliedOrigin === approvedOrigin;
}

export function passwordRecoveryCookieOptions(maxAge = 15 * 60) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  };
}

export function getAuthErrorCode(error: unknown) {
  if (!error || typeof error !== "object") return "unknown";
  const code = (error as { code?: unknown }).code;
  return typeof code === "string" && /^[a-z0-9_:-]{1,80}$/i.test(code)
    ? code.toLowerCase()
    : "unknown";
}

export function getAuthErrorStatus(error: unknown) {
  if (!error || typeof error !== "object") return null;
  const status = (error as { status?: unknown }).status;
  return typeof status === "number" && Number.isInteger(status) ? status : null;
}

export function isAuthRateLimitError(error: unknown) {
  const status = getAuthErrorStatus(error);
  if (status === 429) return true;
  const message =
    error instanceof Error
      ? error.message.toLowerCase()
      : typeof error === "string"
        ? error.toLowerCase()
        : "";
  return message.includes("rate limit") || message.includes("too many requests");
}
