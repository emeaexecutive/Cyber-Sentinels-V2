const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type ConsentConfigurationErrorCode =
  | "CONSENT_DEFAULT_ENTERPRISE_ID_MISSING"
  | "CONSENT_DEFAULT_ENTERPRISE_ID_INVALID"
  | "CONSENT_COOKIE_SECRET_MISSING"
  | "CONSENT_COOKIE_SECRET_WEAK";

export class ConsentConfigurationError extends Error {
  readonly status = 503;
  readonly code: ConsentConfigurationErrorCode;

  constructor(code: ConsentConfigurationErrorCode, message: string) {
    super(message);
    this.name = "ConsentConfigurationError";
    this.code = code;
  }
}

export type ConsentConfigurationStatus = {
  enterpriseConfigured: boolean;
  enterpriseValid: boolean;
  cookieSecretConfigured: boolean;
  cookieSecretStrong: boolean;
  ready: boolean;
};

function rawEnterpriseId() {
  return process.env.CONSENT_DEFAULT_ENTERPRISE_ID?.trim() ?? "";
}

function rawCookieSecret() {
  return process.env.CONSENT_COOKIE_SECRET?.trim() ?? "";
}

export function getConsentConfigurationStatus(): ConsentConfigurationStatus {
  const enterpriseId = rawEnterpriseId();
  const cookieSecret = rawCookieSecret();
  const enterpriseConfigured = enterpriseId.length > 0;
  const enterpriseValid = enterpriseConfigured && uuidPattern.test(enterpriseId);
  const cookieSecretConfigured = cookieSecret.length > 0;
  const cookieSecretStrong = cookieSecret.length >= 32;
  return {
    enterpriseConfigured,
    enterpriseValid,
    cookieSecretConfigured,
    cookieSecretStrong,
    ready: enterpriseValid && cookieSecretStrong,
  };
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
    enterpriseId: getConsentDefaultEnterpriseId(),
    cookieSecret: getConsentCookieSecret(true),
  };
}
