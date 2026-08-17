export const loginExperienceStates = [
  "SIGNED_OUT",
  "SIGNING_IN",
  "EMAIL_VERIFICATION_REQUIRED",
  "AUTHENTICATED",
  "AUTHENTICATION_FAILED",
  "SECURITY_VERIFICATION_FAILED",
  "RATE_LIMITED",
] as const;

export type LoginExperienceState = (typeof loginExperienceStates)[number];

export type SafeAuthFailure = {
  state: Extract<
    LoginExperienceState,
    "EMAIL_VERIFICATION_REQUIRED" | "AUTHENTICATION_FAILED" | "RATE_LIMITED"
  >;
  message: string;
};

export const rateLimitedMessage =
  "Too many attempts. Please wait a moment and try again.";

export function classifyAuthFailure(error: unknown, fallback: string): SafeAuthFailure {
  const raw = error instanceof Error ? error.message : typeof error === "string" ? error : "";
  const message = raw.toLowerCase();

  if (
    message.includes("rate limit") ||
    message.includes("email rate limit exceeded") ||
    message.includes("too many requests")
  ) {
    return { state: "RATE_LIMITED", message: rateLimitedMessage };
  }

  if (message.includes("email not confirmed")) {
    return {
      state: "EMAIL_VERIFICATION_REQUIRED",
      message: "Please verify your email to continue.",
    };
  }

  if (message.includes("invalid login credentials")) {
    return {
      state: "AUTHENTICATION_FAILED",
      message: "Email or password is incorrect.",
    };
  }

  if (message.includes("user already registered")) {
    return {
      state: "AUTHENTICATION_FAILED",
      message: "An account already exists for this email. Sign in or reset your password.",
    };
  }

  return { state: "AUTHENTICATION_FAILED", message: fallback };
}

export function maskEmailAddress(email: string) {
  const normalized = email.trim();
  const separator = normalized.lastIndexOf("@");
  if (separator <= 0 || separator === normalized.length - 1) return "your email address";
  const local = normalized.slice(0, separator);
  const domain = normalized.slice(separator + 1);
  return `${local.slice(0, 1)}${"*".repeat(Math.max(3, Math.min(8, local.length - 1)))}@${domain}`;
}
