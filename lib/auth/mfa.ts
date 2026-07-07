export type MfaProviderState = "Live" | "Simulated" | "Awaiting Credentials" | "Disabled";

export type MfaMethod = "sms_otp" | "authenticator_app" | "recovery_code";

export type MfaChallenge = {
  id: string;
  method: MfaMethod;
  provider_state: MfaProviderState;
  status: "created" | "awaiting_credentials" | "verification_required";
  expires_at: string;
  delivery_hint: string;
  replay_safe: true;
  limitations: string[];
};

export type MfaStatus = {
  sms_otp: MfaProviderState;
  authenticator_app: MfaProviderState;
  trusted_device: MfaProviderState;
  recovery_flow: MfaProviderState;
  step_up_available: boolean;
  summary: string;
};

function hasEnv(name: string) {
  return Boolean(String(process.env[name] ?? "").trim());
}

export function getMfaStatus(): MfaStatus {
  const smsConfigured =
    hasEnv("SUPABASE_AUTH_SMS_PROVIDER") ||
    hasEnv("TWILIO_ACCOUNT_SID") ||
    hasEnv("TWILIO_AUTH_TOKEN");
  const authenticatorConfigured =
    process.env.SUPABASE_AUTH_MFA_TOTP_ENABLED?.trim().toLowerCase() === "true";

  return {
    sms_otp: smsConfigured ? "Live" : "Awaiting Credentials",
    authenticator_app: authenticatorConfigured ? "Live" : "Awaiting Credentials",
    trusted_device: "Simulated",
    recovery_flow: "Simulated",
    step_up_available: smsConfigured || authenticatorConfigured,
    summary: smsConfigured || authenticatorConfigured
      ? "MFA provider configuration is present. Challenge verification remains provider governed."
      : "MFA structure is ready, but SMS/authenticator provider credentials are not configured.",
  };
}

export function generateMfaChallenge(input: {
  userId: string;
  method: MfaMethod;
  purpose?: string;
}): MfaChallenge {
  const status = getMfaStatus();
  const providerState =
    input.method === "sms_otp"
      ? status.sms_otp
      : input.method === "authenticator_app"
        ? status.authenticator_app
        : status.recovery_flow;

  return {
    id: crypto.randomUUID(),
    method: input.method,
    provider_state: providerState,
    status: providerState === "Live" ? "verification_required" : "awaiting_credentials",
    expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    delivery_hint:
      providerState === "Live"
        ? "Challenge created through configured provider path."
        : "Awaiting Credentials",
    replay_safe: true,
    limitations: [
      "Challenge metadata is a readiness structure, not proof that an SMS or authenticator message was delivered.",
      "Recovery and trusted-device behavior require provider-backed enrollment before production enforcement.",
      input.purpose ? `Purpose: ${input.purpose}` : "Purpose: step-up authentication.",
      `Subject: ${input.userId}`,
    ],
  };
}

export function verifyMfaChallenge(input: {
  challengeId?: string | null;
  code?: string | null;
  providerState?: MfaProviderState;
}) {
  const providerState = input.providerState ?? "Awaiting Credentials";
  const structurallyValid = Boolean(input.challengeId && input.code && input.code.length >= 6);
  const verified = providerState === "Live" && structurallyValid;

  return {
    verified,
    decision: verified ? "allow" : providerState === "Live" ? "step_up" : "review",
    provider_state: providerState,
    reason: verified
      ? "Provider-backed MFA challenge can continue."
      : providerState === "Live"
        ? "Challenge code is missing or incomplete."
        : "MFA provider is awaiting credentials; route to governed review or alternate verification.",
  };
}

export function getTrustedDeviceStatus(input: {
  hasKnownDeviceCookie?: boolean;
  deviceFingerprintProviderState?: MfaProviderState;
}) {
  const providerState = input.deviceFingerprintProviderState ?? "Awaiting Credentials";
  return {
    provider_state: providerState,
    trusted: Boolean(input.hasKnownDeviceCookie) && providerState !== "Disabled",
    reason: input.hasKnownDeviceCookie
      ? "Known-device marker is present; treat as continuity context only."
      : "No trusted-device marker is present.",
    limitations: [
      "Trusted-device status is a continuity signal, not a device identity guarantee.",
      "Provider-backed device risk remains required for production-grade device trust.",
    ],
  };
}
