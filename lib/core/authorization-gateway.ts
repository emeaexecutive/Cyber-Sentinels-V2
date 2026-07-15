export type AuthorizationGatewayDecision =
  | "ALLOW"
  | "DENY"
  | "APPROVAL REQUIRED"
  | "STEP-UP REQUIRED";

export type AuthorizationGatewayInput = {
  subjectId: string;
  subjectType: EntityIdentityType;
  authenticated: boolean;
  requestedAction: string;
  requestedPurpose: string;
  allowedActions?: string[];
  allowedPurposes?: string[];
  humanApprovalPresent?: boolean;
  stepUpSatisfied?: boolean;
  governanceStatus?: string;
  runtimeLocation?: "external_gateway" | "agent_runtime";
};

export type AuthorizationGatewayResult = {
  decision: AuthorizationGatewayDecision;
  reason: string;
  externalToAgentRuntime: boolean;
  evaluatedBy: "authorization_gateway";
  policyReferences: string[];
  limitations: string[];
};

export function evaluateAuthorizationGateway(input: AuthorizationGatewayInput): AuthorizationGatewayResult {
  const externalToAgentRuntime = input.runtimeLocation !== "agent_runtime";
  const actionAllowed = (input.allowedActions ?? []).includes(input.requestedAction);
  const purposeAllowed = (input.allowedPurposes ?? []).includes(input.requestedPurpose);

  if (!externalToAgentRuntime) {
    return {
      decision: "DENY",
      reason: "Authorization must be evaluated outside the agent runtime.",
      externalToAgentRuntime,
      evaluatedBy: "authorization_gateway",
      policyReferences: ["external_authorization_boundary"],
      limitations: ["Authentication can identify an actor, but authorization must remain a separate policy decision."],
    };
  }

  if (!input.authenticated) {
    return {
      decision: "STEP-UP REQUIRED",
      reason: "Identity is not sufficiently authenticated for authorization.",
      externalToAgentRuntime,
      evaluatedBy: "authorization_gateway",
      policyReferences: ["authentication_precondition"],
      limitations: ["Authentication is a precondition, not authorization."],
    };
  }

  if (/review|approval|escalat/i.test(String(input.governanceStatus ?? "")) && !input.humanApprovalPresent) {
    return {
      decision: "APPROVAL REQUIRED",
      reason: "Governance state requires human approval before execution.",
      externalToAgentRuntime,
      evaluatedBy: "authorization_gateway",
      policyReferences: ["governance_review_required"],
      limitations: ["Gateway does not override enterprise governance policy."],
    };
  }

  if (!actionAllowed || !purposeAllowed) {
    return {
      decision: "DENY",
      reason: "Requested action or purpose is outside delegated scope.",
      externalToAgentRuntime,
      evaluatedBy: "authorization_gateway",
      policyReferences: ["delegation_scope"],
      limitations: ["Denied scope is retained as reviewable context, not deleted."],
    };
  }

  if (input.stepUpSatisfied === false) {
    return {
      decision: "STEP-UP REQUIRED",
      reason: "Policy requires step-up verification before authorization.",
      externalToAgentRuntime,
      evaluatedBy: "authorization_gateway",
      policyReferences: ["step_up_policy"],
      limitations: ["Step-up challenge state must be replayable."],
    };
  }

  return {
    decision: "ALLOW",
    reason: "Authenticated actor, delegated action and declared purpose satisfy the gateway policy.",
    externalToAgentRuntime,
    evaluatedBy: "authorization_gateway",
    policyReferences: ["delegation_scope", "purpose_scope"],
    limitations: ["Allow is limited to the requested purpose, action and current policy version."],
  };
}
import type { EntityIdentityType } from "./entity-identity.ts";
