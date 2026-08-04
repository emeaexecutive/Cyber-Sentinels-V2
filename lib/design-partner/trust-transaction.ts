export type DesignPartnerAgentStatus = "draft" | "active" | "suspended" | "revoked" | "retired";

export type DesignPartnerAgent = {
  tenantId: string;
  enterpriseId: string;
  agentId: string;
  accountableOwnerId: string;
  operatorId: string;
  agentName: string;
  agentType: string;
  provider: string;
  modelFamily: string;
  modelVersion: string;
  runtime: string;
  purpose: string;
  permittedTools: string[];
  permittedDataClasses: string[];
  permittedResources: string[];
  environment: string;
  status: DesignPartnerAgentStatus;
  registeredAt: string;
  activatedAt?: string;
  suspendedAt?: string;
  revokedAt?: string;
  supersedesAgentVersionId?: string;
  evidenceReferences: string[];
  canonicalDigest: string;
};

export type DesignPartnerAuthority = {
  authorityId: string;
  tenantId: string;
  enterpriseId: string;
  principalHumanId: string;
  delegatedAgentId: string;
  parentAuthorityId?: string;
  purpose: string;
  permittedActionTypes: string[];
  permittedTools: string[];
  permittedResources: string[];
  permittedRepositories: string[];
  permittedBranches: string[];
  permittedEnvironments: string[];
  dataBoundary: string;
  maximumActionCount: number;
  maximumSpend?: number;
  maximumDelegationDepth: number;
  issuedAt: string;
  effectiveAt: string;
  expiresAt: string;
  revokedAt?: string;
  revocationReason?: string;
  approvalEvidence?: string;
  policyId: string;
  policyVersion: string;
  canonicalDigest: string;
};

export type DesignPartnerAction = {
  requestId: string;
  actionType: string;
  targetSystem: string;
  repository: string;
  branch: string;
  resource: string;
  requestedOperation: string;
  changeClassification: string;
  environment: string;
  purpose: string;
  toolReference: string;
  agentVersion: string;
  modelVersion: string;
  requestedAt: string;
  idempotencyKey: string;
  correlationId: string;
  evidenceReferences: string[];
  canonicalDigest: string;
};

export type DesignPartnerPolicy = {
  id: string;
  version: string;
  digest: string;
};

export type DesignPartnerTrustState = {
  state: "verified" | "degraded" | "contested" | "suspended" | "revoked";
  updatedAt: string;
};

export type DesignPartnerProviderEvidence = {
  providerId: string;
  providerEnvironment: string;
  providerOperation: string;
  externalReference: string;
  assuranceLevel: string;
  normalizedResult: string;
  providerNativeStatus: string;
  providerTimestamp: string;
  receivedAt: string;
  freshness: number;
  confidence: number;
  evidenceDigest: string;
  limitations: string[];
  timeout: boolean;
  correlationId: string;
};

export type DesignPartnerRelayState =
  | "not_relayed"
  | "relay_pending"
  | "relay_approved"
  | "relay_denied"
  | "execution_requested"
  | "execution_confirmed"
  | "execution_failed"
  | "external_state_unknown";

export type DesignPartnerDecision = {
  decisionId: string;
  decision: "allow" | "review" | "deny";
  trustState: DesignPartnerTrustState["state"];
  authorityValid: boolean;
  scopeValid: boolean;
  policyResult: "pass" | "review" | "deny";
  evidenceCompleteness: boolean;
  providerState: string;
  relayState: DesignPartnerRelayState;
  externalExecutionState: string;
  reasonCodes: string[];
  requiredActions: string[];
  reviewRequired: boolean;
  expiresAt?: string;
  correlationId: string;
  canonicalDigest: string;
};

export type DesignPartnerDecisionEngine = {
  registerAgent(input: Omit<DesignPartnerAgent, "agentId"> & { agentId: string }): DesignPartnerAgent;
  delegateAuthority(input: Omit<DesignPartnerAuthority, "authorityId" | "tenantId" | "enterpriseId"> & { tenantId: string; enterpriseId: string }): DesignPartnerAuthority;
  evaluateTrustDecision(input: {
    tenantId: string;
    enterpriseId: string;
    actorContext: { authenticatedActorId: string; actorType: string };
    agent: DesignPartnerAgent;
    authority: DesignPartnerAuthority;
    action: DesignPartnerAction;
    policy: DesignPartnerPolicy;
    trustState: DesignPartnerTrustState;
    providerEvidence: DesignPartnerProviderEvidence[];
    activeIncidents: Array<{ id: string }>;
    environment: string;
    correlationId: string;
  }): DesignPartnerDecision;
};

function stableDigest(parts: string[]): string {
  return parts.join("::");
}

function validateAgentRegistration(input: Omit<DesignPartnerAgent, "agentId"> & { agentId: string }) {
  if (!input.accountableOwnerId || !input.operatorId) {
    throw new Error("Agent registration requires an accountable owner and operator binding.");
  }
  if (!input.agentId || !input.agentName || !input.purpose || !input.environment) {
    throw new Error("Agent registration requires id, name, purpose and environment.");
  }
}

function validateActionRequest(action: DesignPartnerAction) {
  const invalidReasons: string[] = [];
  if (!action.requestId) invalidReasons.push("requestId");
  if (!action.actionType) invalidReasons.push("actionType");
  if (!action.targetSystem) invalidReasons.push("targetSystem");
  if (!action.repository) invalidReasons.push("repository");
  if (!action.branch) invalidReasons.push("branch");
  if (!action.resource) invalidReasons.push("resource");
  if (!action.requestedOperation) invalidReasons.push("requestedOperation");
  if (!action.environment) invalidReasons.push("environment");
  if (!action.purpose) invalidReasons.push("purpose");
  if (!action.idempotencyKey) invalidReasons.push("idempotencyKey");
  if (!action.correlationId) invalidReasons.push("correlationId");
  if (!action.canonicalDigest) invalidReasons.push("canonicalDigest");
  return invalidReasons;
}

function isExpired(authority: DesignPartnerAuthority, action: DesignPartnerAction) {
  return action.requestedAt > authority.expiresAt;
}

function isRevoked(authority: DesignPartnerAuthority) {
  return Boolean(authority.revokedAt);
}

function isScopeAllowed(authority: DesignPartnerAuthority, action: DesignPartnerAction) {
  const repoAllowed = authority.permittedRepositories.includes(action.repository);
  const branchAllowed = authority.permittedBranches.some((pattern) => {
    if (pattern.endsWith("/*")) {
      const prefix = pattern.slice(0, -1);
      return action.branch.startsWith(prefix);
    }
    return action.branch === pattern;
  });
  const envAllowed = authority.permittedEnvironments.includes(action.environment);
  const actionAllowed = authority.permittedActionTypes.includes(action.actionType);
  return repoAllowed && branchAllowed && envAllowed && actionAllowed;
}

export function createControlledGitHubRelayPlan(
  action: DesignPartnerAction,
  decision: DesignPartnerDecision["decision"],
): { relayState: DesignPartnerRelayState; externalExecutionState: string } {
  if (action.targetSystem !== "github") {
    return { relayState: "not_relayed", externalExecutionState: "external_state_unknown" };
  }
  if (decision === "allow") {
    return { relayState: "relay_pending", externalExecutionState: "external_state_unknown" };
  }
  if (decision === "review") {
    return { relayState: "not_relayed", externalExecutionState: "external_state_unknown" };
  }
  return { relayState: "relay_denied", externalExecutionState: "external_state_unknown" };
}

export function createDesignPartnerDecisionEngine(): DesignPartnerDecisionEngine {
  const decisions = new Map<string, DesignPartnerDecision>();
  const agents = new Map<string, DesignPartnerAgent>();
  const authorities = new Map<string, DesignPartnerAuthority>();

  return {
    registerAgent(input) {
      validateAgentRegistration(input);
      const agent: DesignPartnerAgent = {
        ...input,
      };
      agents.set(agent.agentId, agent);
      return agent;
    },
    delegateAuthority(input) {
      const authority: DesignPartnerAuthority = {
        authorityId: `auth-${Math.random().toString(36).slice(2, 10)}`,
        ...input,
      };
      authorities.set(authority.authorityId, authority);
      return authority;
    },
    evaluateTrustDecision(input) {
      const agent = input.agent;
      const authority = input.authority;
      const reasonCodes: string[] = [];
      const requiredActions: string[] = [];

      const invalidActionFields = validateActionRequest(input.action);
      if (invalidActionFields.length > 0) {
        reasonCodes.push("ACTION_REQUEST_INVALID");
        requiredActions.push("reject_malformed_request");
      }

      const authenticatedActorId = input.actorContext.authenticatedActorId?.trim();
      const actorIsOwnerOrOperator = Boolean(authenticatedActorId)
        && [agent.accountableOwnerId, agent.operatorId].includes(authenticatedActorId);
      if (!actorIsOwnerOrOperator) {
        reasonCodes.push("AUTHENTICATED_ACTOR_UNAUTHORIZED");
      }
      if (agent.status === "revoked") {
        reasonCodes.push("AGENT_REVOKED");
      }
      if (agent.status === "suspended") {
        reasonCodes.push("AGENT_SUSPENDED");
      }
      if (agent.tenantId !== input.tenantId) {
        reasonCodes.push("TENANT_MISMATCH");
      }
      if (agent.enterpriseId !== input.enterpriseId) {
        reasonCodes.push("ENTERPRISE_MISMATCH");
      }
      if (authority.tenantId !== input.tenantId || authority.enterpriseId !== input.enterpriseId) {
        reasonCodes.push("AUTHORITY_TENANT_MISMATCH");
      }
      if (isRevoked(authority)) {
        reasonCodes.push("AUTHORITY_REVOKED");
      }
      if (isExpired(authority, input.action)) {
        reasonCodes.push("AUTHORITY_EXPIRED");
      }
      if (!isScopeAllowed(authority, input.action)) {
        reasonCodes.push("AUTHORITY_SCOPE_EXCEEDED");
      }
      if (input.providerEvidence.length === 0) {
        reasonCodes.push("EVIDENCE_MISSING");
      }
      if (input.activeIncidents.length > 0) {
        reasonCodes.push("ACTIVE_INCIDENT_REQUIRES_REVIEW");
      }
      if (input.action.actionType === "github_pull_request_merge") {
        reasonCodes.push("AUTHORITY_SCOPE_EXCEEDED");
      }

      const key = `${input.tenantId}:${input.enterpriseId}:${input.action.idempotencyKey}`;
      const previous = decisions.get(key);
      if (previous) {
        if (previous.correlationId !== input.correlationId) {
          return {
            decisionId: previous.decisionId,
            decision: "deny",
            trustState: "suspended",
            authorityValid: false,
            scopeValid: false,
            policyResult: "deny",
            evidenceCompleteness: false,
            providerState: "idempotency_conflict",
            relayState: "relay_denied",
            externalExecutionState: "external_state_unknown",
            reasonCodes: ["IDEMPOTENCY_CONFLICT"],
            requiredActions: ["retry_with_new_idempotency_key"],
            reviewRequired: false,
            correlationId: input.correlationId,
            canonicalDigest: stableDigest(["idempotency-conflict", input.correlationId]),
          };
        }
        return previous;
      }

      let decision: DesignPartnerDecision["decision"] = "allow";
      let trustState: DesignPartnerDecision["trustState"] = "verified";
      let policyResult: DesignPartnerDecision["policyResult"] = "pass";
      const evidenceCompleteness = input.providerEvidence.length > 0;
      const authorityValid = !reasonCodes.some((code) => ["AUTHORITY_REVOKED", "AUTHORITY_EXPIRED", "AUTHORITY_SCOPE_EXCEEDED", "AUTHORITY_TENANT_MISMATCH"].includes(code));
      const scopeValid = !reasonCodes.some((code) => ["AUTHORITY_SCOPE_EXCEEDED"].includes(code));
      if (authorityValid) {
        reasonCodes.push("AUTHORITY_VALID");
      }
      if (scopeValid) {
        reasonCodes.push("SCOPE_VALID");
      }

      if (reasonCodes.some((code) => ["ACTION_REQUEST_INVALID"].includes(code))) {
        decision = "deny";
        policyResult = "deny";
        trustState = "suspended";
        requiredActions.push("reject_malformed_request");
      } else if (reasonCodes.some((code) => ["AUTHENTICATED_ACTOR_UNAUTHORIZED"].includes(code))) {
        decision = "review";
        policyResult = "review";
        trustState = "degraded";
        requiredActions.push("human_review_required");
      } else if (reasonCodes.some((code) => ["AGENT_REVOKED", "AGENT_SUSPENDED", "AUTHORITY_REVOKED", "AUTHORITY_EXPIRED", "ACTIVE_INCIDENT_REQUIRES_REVIEW"].includes(code))) {
        decision = "review";
        policyResult = "review";
        trustState = "degraded";
        requiredActions.push("human_review_required");
      } else if (reasonCodes.some((code) => ["EVIDENCE_MISSING", "AUTHORITY_SCOPE_EXCEEDED"].includes(code))) {
        decision = input.action.actionType === "github_pull_request_merge" ? "deny" : "review";
        policyResult = input.action.actionType === "github_pull_request_merge" ? "deny" : "review";
        trustState = input.action.actionType === "github_pull_request_merge" ? "suspended" : "degraded";
        if (decision === "deny") {
          requiredActions.push("relay_denied");
        } else {
          requiredActions.push("human_review_required");
        }
      } else {
        decision = "allow";
        policyResult = "pass";
        trustState = "verified";
      }

      const relayPlan = createControlledGitHubRelayPlan(input.action, decision);

      const result: DesignPartnerDecision = {
        decisionId: `decision-${Math.random().toString(36).slice(2, 10)}`,
        decision,
        trustState,
        authorityValid,
        scopeValid,
        policyResult,
        evidenceCompleteness,
        providerState: input.providerEvidence.length > 0 ? "available" : "unavailable",
        relayState: relayPlan.relayState,
        externalExecutionState: relayPlan.externalExecutionState,
        reasonCodes,
        requiredActions,
        reviewRequired: decision === "review",
        expiresAt: authority.expiresAt,
        correlationId: input.correlationId,
        canonicalDigest: stableDigest([
          input.tenantId,
          input.enterpriseId,
          agent.agentId,
          authority.authorityId,
          input.action.requestId,
          decision,
          reasonCodes.join("|"),
        ]),
      };

      decisions.set(key, result);
      return result;
    },
  };
}
