const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type ConsentConfigurationErrorCode =
  | "CONSENT_DEFAULT_ENTERPRISE_ID_MISSING"
  | "CONSENT_DEFAULT_ENTERPRISE_ID_INVALID"
  | "CONSENT_SUPABASE_URL_MISSING"
  | "CONSENT_SUPABASE_ANON_KEY_MISSING"
  | "CONSENT_SUPABASE_SERVICE_ROLE_KEY_MISSING"
  | "CONSENT_COOKIE_SECRET_MISSING"
  | "CONSENT_COOKIE_SECRET_WEAK";

export type ConsentConfigurationInternalCode =
  | "CONSENT_CONFIG_SUPABASE_URL_MISSING"
  | "CONSENT_CONFIG_SUPABASE_ANON_KEY_MISSING"
  | "CONSENT_CONFIG_SERVICE_ROLE_KEY_MISSING"
  | "CONSENT_CONFIG_ENTERPRISE_ID_MISSING"
  | "CONSENT_CONFIG_ENTERPRISE_ID_INVALID"
  | "CONSENT_CONFIG_COOKIE_SECRET_MISSING"
  | "CONSENT_CONFIG_COOKIE_SECRET_WEAK";

const defaultInternalCodeByErrorCode: Record<ConsentConfigurationErrorCode, ConsentConfigurationInternalCode> = {
  CONSENT_DEFAULT_ENTERPRISE_ID_MISSING: "CONSENT_CONFIG_ENTERPRISE_ID_MISSING",
  CONSENT_DEFAULT_ENTERPRISE_ID_INVALID: "CONSENT_CONFIG_ENTERPRISE_ID_INVALID",
  CONSENT_SUPABASE_URL_MISSING: "CONSENT_CONFIG_SUPABASE_URL_MISSING",
  CONSENT_SUPABASE_ANON_KEY_MISSING: "CONSENT_CONFIG_SUPABASE_ANON_KEY_MISSING",
  CONSENT_SUPABASE_SERVICE_ROLE_KEY_MISSING: "CONSENT_CONFIG_SERVICE_ROLE_KEY_MISSING",
  CONSENT_COOKIE_SECRET_MISSING: "CONSENT_CONFIG_COOKIE_SECRET_MISSING",
  CONSENT_COOKIE_SECRET_WEAK: "CONSENT_CONFIG_COOKIE_SECRET_WEAK",
};

export class ConsentConfigurationError extends Error {
  readonly status = 503;
  readonly code: ConsentConfigurationErrorCode;
  readonly internalCode: ConsentConfigurationInternalCode;

  constructor(code: ConsentConfigurationErrorCode, message: string, internalCode?: ConsentConfigurationInternalCode) {
    super(message);
    this.name = "ConsentConfigurationError";
    this.code = code;
    this.internalCode = internalCode ?? defaultInternalCodeByErrorCode[code];
  }
}

export type ConsentConfigurationStatus = {
  supabaseUrlConfigured: boolean;
  supabaseAnonKeyConfigured: boolean;
  serviceRoleKeyConfigured: boolean;
  enterpriseConfigured: boolean;
  enterpriseValid: boolean;
  cookieSecretConfigured: boolean;
  cookieSecretStrong: boolean;
  persistenceReady: boolean;
  signedCookieReady: boolean;
  ready: boolean;
};

type ConsentConfigEnvName =
  | "NEXT_PUBLIC_SUPABASE_URL"
  | "NEXT_PUBLIC_SUPABASE_ANON_KEY"
  | "SUPABASE_SERVICE_ROLE_KEY"
  | "CONSENT_DEFAULT_ENTERPRISE_ID"
  | "CONSENT_COOKIE_SECRET";

function rawEnv(name: ConsentConfigEnvName) {
  return process.env[name]?.trim() ?? "";
}

function rawEnterpriseId() {
  return rawEnv("CONSENT_DEFAULT_ENTERPRISE_ID");
}

function rawCookieSecret() {
  return rawEnv("CONSENT_COOKIE_SECRET");
}

function rawSupabaseUrl() {
  return rawEnv("NEXT_PUBLIC_SUPABASE_URL");
}

function rawSupabaseAnonKey() {
  return rawEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
}

function rawServiceRoleKey() {
  return rawEnv("SUPABASE_SERVICE_ROLE_KEY");
}

export function getConsentConfigurationStatus(): ConsentConfigurationStatus {
  const supabaseUrl = rawSupabaseUrl();
  const supabaseAnonKey = rawSupabaseAnonKey();
  const serviceRoleKey = rawServiceRoleKey();
  const enterpriseId = rawEnterpriseId();
  const cookieSecret = rawCookieSecret();
  const supabaseUrlConfigured = supabaseUrl.length > 0;
  const supabaseAnonKeyConfigured = supabaseAnonKey.length > 0;
  const serviceRoleKeyConfigured = serviceRoleKey.length > 0;
  const enterpriseConfigured = enterpriseId.length > 0;
  const enterpriseValid = enterpriseConfigured && uuidPattern.test(enterpriseId);
  const cookieSecretConfigured = cookieSecret.length > 0;
  const cookieSecretStrong = cookieSecret.length >= 32;
  const persistenceReady = supabaseUrlConfigured && supabaseAnonKeyConfigured && serviceRoleKeyConfigured && enterpriseValid;
  const signedCookieReady = cookieSecretStrong;
  return {
    supabaseUrlConfigured,
    supabaseAnonKeyConfigured,
    serviceRoleKeyConfigured,
    enterpriseConfigured,
    enterpriseValid,
    cookieSecretConfigured,
    cookieSecretStrong,
    persistenceReady,
    signedCookieReady,
    ready: persistenceReady && signedCookieReady,
  };
}

export function assertConsentPublicSupabaseConfiguration() {
  if (!rawSupabaseUrl()) {
    throw new ConsentConfigurationError(
      "CONSENT_SUPABASE_URL_MISSING",
      "Consent Supabase URL is not configured.",
    );
  }
  if (!rawSupabaseAnonKey()) {
    throw new ConsentConfigurationError(
      "CONSENT_SUPABASE_ANON_KEY_MISSING",
      "Consent Supabase anon key is not configured.",
    );
  }
}

export function getConsentDefaultEnterpriseId() {
  const value = rawEnterpriseId();
  if (!value) {
    throw new ConsentConfigurationError(
      "CONSENT_DEFAULT_ENTERPRISE_ID_MISSING",
      "Consent default enterprise ID is not configured.",
    );
  }
  if (!uuidPattern.test(value)) {
    throw new ConsentConfigurationError(
      "CONSENT_DEFAULT_ENTERPRISE_ID_INVALID",
      "Consent default enterprise ID is invalid.",
    );
  }
  return value;
}

export function getConsentCookieSecret(required = true) {
  const value = rawCookieSecret();
  if (!required) return value;
  if (!value) {
    throw new ConsentConfigurationError(
      "CONSENT_COOKIE_SECRET_MISSING",
      "Consent cookie secret is not configured.",
    );
  }
  if (value.length < 32) {
    throw new ConsentConfigurationError(
      "CONSENT_COOKIE_SECRET_WEAK",
      "Consent cookie secret is too short.",
    );
  }
  return value;
}

export function getConsentRuntimeConfig() {
  return {
    supabaseUrlConfigured: rawSupabaseUrl().length > 0,
    supabaseAnonKeyConfigured: rawSupabaseAnonKey().length > 0,
    serviceRoleKeyConfigured: rawServiceRoleKey().length > 0,
    enterpriseId: getConsentDefaultEnterpriseId(),
    cookieSecret: getConsentCookieSecret(true),
  };
}

export function inferConsentConfigInternalCode(error: unknown): ConsentConfigurationInternalCode | undefined {
  const candidate = error as { internalCode?: unknown; message?: unknown };
  if (typeof candidate.internalCode === "string") {
    return candidate.internalCode as ConsentConfigurationInternalCode;
  }
  const message = typeof candidate.message === "string" ? candidate.message : "";
  if (!message.includes("Missing required environment variables")) return undefined;
  if (message.includes("NEXT_PUBLIC_SUPABASE_URL")) return "CONSENT_CONFIG_SUPABASE_URL_MISSING";
  if (message.includes("NEXT_PUBLIC_SUPABASE_ANON_KEY")) return "CONSENT_CONFIG_SUPABASE_ANON_KEY_MISSING";
  if (message.includes("SUPABASE_SERVICE_ROLE_KEY")) return "CONSENT_CONFIG_SERVICE_ROLE_KEY_MISSING";
  return undefined;
}
