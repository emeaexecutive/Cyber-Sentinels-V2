import "server-only";

export const dataClassifications = [
  "public",
  "internal",
  "confidential",
  "regulated",
  "restricted",
] as const;

export type DataClassification = (typeof dataClassifications)[number];

export type AIProviderPolicy = {
  providerId: string;
  trainingAllowed: false;
  externalRetentionAllowed: false;
  piiRedactionRequired: true;
  restrictedDataEgressAllowed: false;
  enterpriseModeRequired: true;
  enterpriseControlEnabled: true;
  verifiedEnterpriseControls: boolean;
  allowedClassifications: DataClassification[];
};

export type ProviderPolicyDecision = {
  allowed: boolean;
  classification: DataClassification;
  reason: string;
  requiresRedaction: true;
  policy: AIProviderPolicy;
};

const sensitiveKeyPattern =
  /(email|phone|address|name|subject[_-]?label|token|secret|credential|authorization|api[_-]?key|document|file[_-]?url|biometric|passport|evidence|recent_|permissions)/i;
const emailPattern = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const bearerPattern = /\b(Bearer\s+)?[A-Za-z0-9_-]{24,}\b/g;
const passportPattern = /\b(?:passport|verification)[\s_-]?(?:id|number)?\s*[:#-]?\s*[A-Z0-9-]{6,}\b/gi;
const secretAssignmentPattern = /\b(?:api[_-]?key|token|secret|password)\s*[:=]\s*\S+/gi;

export function normalizeDataClassification(value: unknown): DataClassification {
  const candidate = String(value ?? "").trim().toLowerCase();
  return dataClassifications.includes(candidate as DataClassification)
    ? (candidate as DataClassification)
    : "internal";
}

export function getDefaultAIProviderPolicy(
  providerId = process.env.AI_GOVERNANCE_PROVIDER ?? "configured_enterprise_provider"
): AIProviderPolicy {
  const verifiedEnterpriseControls =
    String(process.env.AI_PROVIDER_ENTERPRISE_CONTROLS_VERIFIED ?? "").toLowerCase() === "true";

  return {
    providerId,
    trainingAllowed: false,
    externalRetentionAllowed: false,
    piiRedactionRequired: true,
    restrictedDataEgressAllowed: false,
    enterpriseModeRequired: true,
    enterpriseControlEnabled: true,
    verifiedEnterpriseControls,
    allowedClassifications: verifiedEnterpriseControls
      ? ["public", "internal", "confidential", "regulated"]
      : ["public", "internal"],
  };
}

export function evaluateAIProviderPolicy(input: {
  classification: DataClassification;
  policy?: AIProviderPolicy;
}): ProviderPolicyDecision {
  const policy = input.policy ?? getDefaultAIProviderPolicy();

  if (input.classification === "restricted") {
    return {
      allowed: false,
      classification: input.classification,
      reason: "Restricted operational data cannot leave governed enterprise boundaries.",
      requiresRedaction: true,
      policy,
    };
  }

  if (!policy.allowedClassifications.includes(input.classification)) {
    return {
      allowed: false,
      classification: input.classification,
      reason:
        "This classification requires verified enterprise provider controls before external processing.",
      requiresRedaction: true,
      policy,
    };
  }

  return {
    allowed: true,
    classification: input.classification,
    reason: "Provider use is allowed with mandatory redaction and enterprise policy controls.",
    requiresRedaction: true,
    policy,
  };
}

export function redactForAIProvider(value: unknown, key = ""): unknown {
  if (sensitiveKeyPattern.test(key)) {
    return "[redacted]";
  }

  if (Array.isArray(value)) {
    return value.map((item) => redactForAIProvider(item));
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([entryKey, entryValue]) => [
        entryKey,
        redactForAIProvider(entryValue, entryKey),
      ])
    );
  }

  if (typeof value === "string") {
    return value
      .replace(emailPattern, "[redacted-email]")
      .replace(passportPattern, "[redacted-verification-id]")
      .replace(secretAssignmentPattern, "[redacted-secret]")
      .replace(bearerPattern, "[redacted-token]")
      .slice(0, 1000);
  }

  return value;
}

export function providerPolicyAuditMetadata(decision: ProviderPolicyDecision) {
  return {
    provider_id: decision.policy.providerId,
    workflow_classification: decision.classification,
    provider_policy_allowed: decision.allowed,
    provider_policy_reason: decision.reason,
    training_allowed: decision.policy.trainingAllowed,
    external_retention_allowed: decision.policy.externalRetentionAllowed,
    pii_redaction_required: decision.policy.piiRedactionRequired,
    restricted_data_egress_allowed: decision.policy.restrictedDataEgressAllowed,
    enterprise_mode_required: decision.policy.enterpriseModeRequired,
    enterprise_control_enabled: decision.policy.enterpriseControlEnabled,
    verified_enterprise_controls: decision.policy.verifiedEnterpriseControls,
    restricted_data_egress_protected: true,
    enterprise_owned_operational_memory: true,
    provider_interaction_tracking_required: true,
  };
}
