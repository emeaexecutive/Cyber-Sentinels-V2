import type { AuthorizationGatewayResult } from "./authorization-gateway.ts";

export type TrustEnforcementDecision = "ALLOW" | "DENY" | "APPROVAL REQUIRED" | "STEP-UP REQUIRED";

export type TrustEnforcementInput = {
  workflowId: string;
  purpose: string;
  allowedPurposes: string[];
  arguments: Record<string, unknown>;
  requiredArguments?: string[];
  delegationValid: boolean;
  nonce: string | null;
  seenNonces?: string[];
  timestamp: string;
  maxClockSkewMs?: number;
  authorization: AuthorizationGatewayResult;
  policyVersion?: string;
};

export type TrustEnforcementResult = {
  decision: TrustEnforcementDecision;
  defaultDeny: boolean;
  checks: Array<{
    name: string;
    passed: boolean;
    detail: string;
  }>;
  executionReceipt: {
    receiptId: string;
    workflowId: string;
    policyVersion: string;
    authorizationDecision: AuthorizationGatewayResult["decision"];
    enforcementDecision: TrustEnforcementDecision;
    replayRequired: true;
  };
};

function checkTimestamp(value: string, maxClockSkewMs: number) {
  const parsed = new Date(value).getTime();
  if (!Number.isFinite(parsed)) return false;
  return Math.abs(Date.now() - parsed) <= maxClockSkewMs;
}

export function evaluateTrustEnforcement(input: TrustEnforcementInput): TrustEnforcementResult {
  const requiredArgs = input.requiredArguments ?? [];
  const checks = [
    {
      name: "policy lookup",
      passed: Boolean(input.policyVersion),
      detail: input.policyVersion ? `Policy ${input.policyVersion} loaded.` : "No policy version was supplied.",
    },
    {
      name: "argument validation",
      passed: requiredArgs.every((key) => input.arguments[key] !== undefined && input.arguments[key] !== null),
      detail: requiredArgs.length ? `Required arguments: ${requiredArgs.join(", ")}.` : "No required arguments configured.",
    },
    {
      name: "delegation validation",
      passed: input.delegationValid,
      detail: input.delegationValid ? "Delegation is inside declared limits." : "Delegation is missing or outside declared limits.",
    },
    {
      name: "purpose validation",
      passed: input.allowedPurposes.includes(input.purpose),
      detail: `Purpose requested: ${input.purpose}.`,
    },
    {
      name: "nonce validation",
      passed: Boolean(input.nonce) && !(input.seenNonces ?? []).includes(String(input.nonce)),
      detail: input.nonce ? "Nonce is present and unused." : "Nonce is missing.",
    },
    {
      name: "timestamp validation",
      passed: checkTimestamp(input.timestamp, input.maxClockSkewMs ?? 300000),
      detail: `Timestamp checked: ${input.timestamp}.`,
    },
  ];
  const allPassed = checks.every((check) => check.passed);
  const decision = !allPassed
    ? "DENY"
    : input.authorization.decision;

  return {
    decision,
    defaultDeny: !allPassed || input.authorization.decision === "DENY",
    checks,
    executionReceipt: {
      receiptId: `exec_${input.workflowId}_${String(input.nonce ?? "missing").replace(/[^a-zA-Z0-9_-]/g, "_")}`,
      workflowId: input.workflowId,
      policyVersion: input.policyVersion ?? "not_loaded",
      authorizationDecision: input.authorization.decision,
      enforcementDecision: decision,
      replayRequired: true,
    },
  };
}
