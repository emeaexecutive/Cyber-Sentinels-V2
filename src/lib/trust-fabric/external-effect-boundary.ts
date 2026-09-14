export const externalEffectKinds = [
  "ACCOUNT_CREATION",
  "ARTIFACT_CREATION",
  "ARTIFACT_PUBLICATION",
  "CREDENTIAL_API_KEY_INTERACTION",
  "NETWORK_EXTERNAL_COMMUNICATION",
  "DATA_READ",
  "DATA_WRITE",
] as const;

export type ExternalEffectKind = (typeof externalEffectKinds)[number];
export type BoundaryDecision = "ALLOW" | "REVIEW" | "DENY";
export type BoundaryReasonCode =
  | "TARGET_AUTHORITY_VERIFIED"
  | "TARGET_OUT_OF_SCOPE"
  | "EXTERNAL_EFFECT_UNAUTHORIZED"
  | "ACTION_SCOPE_EXCEEDED"
  | "CREDENTIAL_ACCESS_UNAUTHORIZED"
  | "EXTERNAL_CHANNEL_UNAUTHORIZED"
  | "AGENT_AUTHORITY_UNRESOLVED"
  | "TENANT_BOUNDARY_MISMATCH"
  | "TASK_AUTHORITY_UNRESOLVED";

export type ExternalEffectAuthority = {
  tenantId: string;
  agentId: string;
  declaredTask: string;
  permittedEnvironments: string[];
  permittedTargets: string[];
  permittedActions: string[];
  permittedExternalEffects: ExternalEffectKind[];
  permittedCredentialReferences?: string[];
  permittedExternalChannels?: string[];
};

export type ExternalEffectRequest = {
  tenantId: string;
  agentId: string;
  target: string;
  action: string;
  environment: string;
  externalEffect: ExternalEffectKind;
  credentialReference?: string | null;
  externalChannel?: string | null;
};

export type ExternalEffectBoundaryResult = {
  decision: BoundaryDecision;
  reasonCodes: BoundaryReasonCode[];
  authorized: boolean;
  targetAuthorized: boolean;
  actionAuthorized: boolean;
  effectAuthorized: boolean;
};

function includesScope(scope: string[], value: string) {
  return scope.includes("*") || scope.includes(value);
}

function includesReferenceScope(scope: string[], value: string, prefix: string) {
  return includesScope(scope, value) || includesScope(scope, `${prefix}${value}`);
}

export function evaluateExternalEffectBoundary(
  authority: ExternalEffectAuthority | null,
  request: ExternalEffectRequest,
): ExternalEffectBoundaryResult {
  if (!authority) {
    return { decision: "REVIEW", reasonCodes: ["AGENT_AUTHORITY_UNRESOLVED"], authorized: false, targetAuthorized: false, actionAuthorized: false, effectAuthorized: false };
  }

  const reasonCodes: BoundaryReasonCode[] = [];
  if (authority.tenantId !== request.tenantId) reasonCodes.push("TENANT_BOUNDARY_MISMATCH");
  if (authority.agentId !== request.agentId) reasonCodes.push("AGENT_AUTHORITY_UNRESOLVED");
  if (!authority.declaredTask) reasonCodes.push("TASK_AUTHORITY_UNRESOLVED");

  const targetAuthorized = includesScope(authority.permittedTargets, request.target);
  const actionAuthorized = includesScope(authority.permittedActions, request.action) && includesScope(authority.permittedEnvironments, request.environment);
  const effectAuthorized = authority.permittedExternalEffects.includes(request.externalEffect);

  if (!targetAuthorized) reasonCodes.push("TARGET_OUT_OF_SCOPE");
  if (!actionAuthorized) reasonCodes.push("ACTION_SCOPE_EXCEEDED");
  if (!effectAuthorized) reasonCodes.push("EXTERNAL_EFFECT_UNAUTHORIZED");

  if (request.credentialReference && !includesReferenceScope(authority.permittedCredentialReferences ?? [], request.credentialReference, "credential:")) {
    reasonCodes.push("CREDENTIAL_ACCESS_UNAUTHORIZED");
  }
  if (request.externalChannel && !includesReferenceScope(authority.permittedExternalChannels ?? [], request.externalChannel, "channel:")) {
    reasonCodes.push("EXTERNAL_CHANNEL_UNAUTHORIZED");
  }

  const hardDeny = reasonCodes.some((code) => [
    "TENANT_BOUNDARY_MISMATCH",
    "AGENT_AUTHORITY_UNRESOLVED",
    "TARGET_OUT_OF_SCOPE",
    "ACTION_SCOPE_EXCEEDED",
    "EXTERNAL_EFFECT_UNAUTHORIZED",
    "CREDENTIAL_ACCESS_UNAUTHORIZED",
    "EXTERNAL_CHANNEL_UNAUTHORIZED",
  ].includes(code));
  const authorized = reasonCodes.length === 0;
  return {
    decision: hardDeny ? "DENY" : authorized ? "ALLOW" : "REVIEW",
    reasonCodes: authorized ? ["TARGET_AUTHORITY_VERIFIED"] : reasonCodes,
    authorized,
    targetAuthorized,
    actionAuthorized,
    effectAuthorized,
  };
}
