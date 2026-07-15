import { evaluateAuthorityGraph, type AuthorityGrant, type AuthorityGraphResult } from "./authority-graph.ts";
import { normalizeEntityIdentity, type EntityIdentity, type EntityIdentityInput } from "./entity-identity.ts";
import {
  executeTrustLifecycle,
  type TrustLifecycleExecutionOutput,
  type TrustLifecycleExecutionInput,
} from "./trust-lifecycle-orchestrator.ts";
import {
  createProviderConsensus,
  type ProviderConsensusResult,
  type ProviderConsensusSignalInput,
} from "../providers/provider-consensus.ts";
import { validateTrustMemoryIntegrity } from "../trust-memory/trust-memory.ts";
import { getWorkflowTemplate, type WorkflowTemplateId } from "../workflows/workflow-templates.ts";

export const TRUST_FABRIC_SERVICES = [
  ["Identity", "lib/core/entity-identity.ts"],
  ["Authority", "lib/core/authority-graph.ts"],
  ["Trust Engine", "lib/core/trust-engine.ts"],
  ["Runtime", "lib/core/runtime-engine.ts"],
  ["Policy", "lib/core/governance-engine.ts"],
  ["Decision Intelligence", "lib/core/decision-intelligence.ts"],
  ["Enforcement", "lib/core/trust-enforcement.ts"],
  ["Replay", "lib/core/replay-engine.ts"],
  ["Evidence Graph", "lib/evidence-graph/evidence-graph.ts"],
  ["Trust Memory\u2122", "lib/trust-memory/trust-memory.ts"],
  ["Validation", "lib/validation/benchmark-harness.ts"],
  ["Provider Orchestrator", "lib/providers/provider-orchestrator.ts"],
  ["Governance", "lib/core/governance-engine.ts"],
] as const;

export type TrustFabricRequest = {
  tenantId: string;
  entity: EntityIdentityInput;
  workflow: {
    id: string;
    template: WorkflowTemplateId;
    lifecycleStage: TrustLifecycleExecutionInput["lifecycleStage"];
  };
  action: { name: string; purpose: string };
  signals: ProviderConsensusSignalInput[];
  policy: {
    version: string | null;
    governanceStatus?: string;
    minimumEvidence?: number;
    requiredArguments?: string[];
    arguments?: Record<string, unknown>;
    validationStatus?: "reviewed" | "incomplete" | "not_run";
  };
  authority: {
    grants: AuthorityGrant[];
    requestedScope?: string[];
    authenticated: boolean;
    humanApprovalPresent?: boolean;
    stepUpSatisfied?: boolean;
    nonce: string | null;
    seenNonces?: string[];
  };
  runtime?: TrustLifecycleExecutionInput["runtimeContext"];
  correlationId: string;
  createdAt?: string;
};

export type TrustFabricResponse = {
  contract: "enterprise_trust_fabric/1.1";
  entity: EntityIdentity;
  workflow: { id: string; template: WorkflowTemplateId };
  authority: AuthorityGraphResult;
  consensus: ProviderConsensusResult;
  trust: {
    posture: string;
    decision: TrustLifecycleExecutionOutput["trust_decision"];
    enforcement: TrustLifecycleExecutionOutput["enforcement_action"];
    nextAction: string;
  };
  evidence: {
    references: string[];
    graph: TrustLifecycleExecutionOutput["evidence_graph"];
    integrity: { valid: boolean; missingNodeTypes: string[]; danglingRelationships: string[]; tenantIsolated: boolean };
  };
  replay: { reference: string | null; status: "written" | "unavailable" };
  trustMemory: {
    reference: string | null;
    evolutionState: string;
    integrity: ReturnType<typeof validateTrustMemoryIntegrity>;
  };
  explainability: {
    decision: TrustLifecycleExecutionOutput["trust_decision"];
    why: string[];
    evidenceUsed: string[];
    evidenceSummary: {
      count: number;
      references: string[];
      graphValid: boolean;
      missingNodeTypes: string[];
    };
    authoritySummary: {
      decision: AuthorityGraphResult["decision"];
      reason: string;
      accountableHumanId: string | null;
      authorityReference: string | null;
      effectiveScope: string[];
      limitations: string[];
    };
    authorityEvaluated: {
      decision: AuthorityGraphResult["decision"];
      reason: string;
      accountableHumanId: string | null;
      authorityReference: string | null;
      effectiveScope: string[];
      limitations: string[];
    };
    policyApplied: {
      version: string | null;
      governanceStatus: string;
      validationStatus: "reviewed" | "incomplete" | "not_run";
      minimumEvidence: number;
    };
    confidenceExplanation: {
      band: TrustLifecycleExecutionOutput["confidence_band"];
      providerDecision: ProviderConsensusResult["decision"];
      trustConfidence: number | null;
      consensusConfidence: number | null;
      categoryCoverage: string[];
      explanation: string[];
      limitations: string[];
    };
    providerParticipation: ProviderConsensusResult["contributions"];
    replayReference: string | null;
    trustMemoryUpdate: {
      reference: string | null;
      state: string;
      timestamp: string;
      reason: string;
      actor: { id: string; type: string };
      evidence: string[];
      authority: string[];
    };
    nextRecommendedAction: string;
  };
  governance: { status: string; reviewAvailable: boolean };
  limitations: string[];
  lifecycle: TrustLifecycleExecutionOutput;
};

function validateFabricGraph(lifecycle: TrustLifecycleExecutionOutput, tenantId: string) {
  const nodeIds = new Set(lifecycle.evidence_graph.nodes.map((node) => node.id));
  const danglingRelationships = lifecycle.evidence_graph.relationships
    .filter((relationship) => !nodeIds.has(relationship.from) || !nodeIds.has(relationship.to))
    .map((relationship) => relationship.id);
  const tenantIsolated = lifecycle.continuity.tenant_isolated
    && lifecycle.tenant_id === tenantId
    && lifecycle.evidence_graph.nodes.every((node) => node.metadata.tenant_id === tenantId);
  return {
    valid: lifecycle.continuity.valid && danglingRelationships.length === 0 && tenantIsolated,
    missingNodeTypes: lifecycle.continuity.missing,
    danglingRelationships,
    tenantIsolated,
  };
}

export function requestTrust(request: TrustFabricRequest): TrustFabricResponse {
  const createdAt = request.createdAt ?? new Date().toISOString();
  const template = getWorkflowTemplate(request.workflow.template);
  const entity = normalizeEntityIdentity({
    ...request.entity,
    tenant_id: request.tenantId,
    lifecycle: { ...request.entity.lifecycle, state: request.entity.lifecycle?.state ?? "active", updated_at: createdAt },
    relationships: [
      ...(request.entity.relationships ?? []),
      { type: "uses", target_id: `workflow:${request.workflow.id}` },
    ],
  });
  const authority = evaluateAuthorityGraph({
    tenantId: request.tenantId,
    subjectId: entity.id,
    workflowId: request.workflow.id,
    action: request.action.name,
    purpose: request.action.purpose,
    requestedScope: request.authority.requestedScope,
    grants: request.authority.grants,
    evaluatedAt: createdAt,
  });
  const consensus = createProviderConsensus(request.signals);
  const allowedActions = authority.valid
    ? authority.effectiveConstraints.actions ?? authority.effectiveScope
    : [];
  const allowedPurposes = authority.valid
    ? authority.effectiveConstraints.purposes ?? [request.action.purpose]
    : [];
  const lifecycle = executeTrustLifecycle({
    tenantId: request.tenantId,
    entityId: entity.id,
    entityType: entity.type,
    workflowId: request.workflow.id,
    lifecycleStage: request.workflow.lifecycleStage,
    lifecycleTemplate: template.lifecycleTemplate,
    requestedAction: request.action.name,
    authorityContext: {
      owner: entity.owner,
      humanAuthority: authority.accountableHumanId ?? "Accountable organization owner",
      authenticated: request.authority.authenticated,
      requestedPurpose: request.action.purpose,
      allowedActions,
      allowedPurposes,
      humanApprovalPresent: request.authority.humanApprovalPresent,
      stepUpSatisfied: request.authority.stepUpSatisfied,
      delegationValid: authority.valid,
      nonce: request.authority.nonce,
      seenNonces: request.authority.seenNonces,
    },
    providerSignals: request.signals.map((signal) => ({
      providerName: signal.provider,
      category: signal.category,
      state: signal.state,
      signal: signal.signal,
      model: signal.model,
      version: signal.version,
      identityConfidence: signal.confidence,
      evidenceReferences: signal.evidenceRefs,
      limitations: signal.limitations,
      latencyMs: signal.latencyMs,
    })),
    runtimeContext: {
      ...(request.runtime ?? {}),
      evidenceReferences: [
        ...(request.runtime?.evidenceReferences ?? []),
        ...authority.evidenceRefs,
        ...consensus.evidenceRefs,
      ],
    },
    policyContext: {
      policyVersion: request.policy.version,
      governanceStatus: request.policy.governanceStatus,
      minimumEvidence: request.policy.minimumEvidence ?? template.minimumEvidence,
      requiredArguments: request.policy.requiredArguments,
      arguments: request.policy.arguments ?? { action: request.action.name, workflowId: request.workflow.id },
      validationStatus: request.policy.validationStatus,
    },
    correlationId: request.correlationId,
    createdAt,
  });
  const memoryEvent = lifecycle.trust_memory_event;
  const memoryIntegrityResult = validateTrustMemoryIntegrity(
    lifecycle.trust_memory_reference ? [memoryEvent] : [],
    {
      tenantId: request.tenantId,
      evidenceRefs: memoryEvent.evidence_refs,
      replayRefs: memoryEvent.replay_refs,
      governanceRefs: memoryEvent.governance_refs,
      policyRefs: memoryEvent.policy_refs,
      authorityRefs: memoryEvent.authority_refs,
    }
  );
  const memoryIntegrity = lifecycle.trust_memory_reference
    ? memoryIntegrityResult
    : {
        ...memoryIntegrityResult,
        valid: false,
        checks: { ...memoryIntegrityResult.checks, referencesResolve: false },
        unresolvedReferences: [...memoryIntegrityResult.unresolvedReferences, "trust_memory:write_unavailable"],
      };
  const graphIntegrity = validateFabricGraph(lifecycle, request.tenantId);

  return {
    contract: "enterprise_trust_fabric/1.1",
    entity,
    workflow: { id: request.workflow.id, template: request.workflow.template },
    authority,
    consensus,
    trust: {
      posture: lifecycle.trust_posture,
      decision: lifecycle.trust_decision,
      enforcement: lifecycle.enforcement_action,
      nextAction: lifecycle.next_required_action,
    },
    evidence: { references: lifecycle.evidence_references, graph: lifecycle.evidence_graph, integrity: graphIntegrity },
    replay: { reference: lifecycle.replay_reference, status: lifecycle.replay_reference ? "written" : "unavailable" },
    trustMemory: { reference: lifecycle.trust_memory_reference, evolutionState: memoryEvent.evolution_state, integrity: memoryIntegrity },
    explainability: {
      decision: lifecycle.trust_decision,
      why: [...new Set([
        authority.reason,
        ...consensus.explanation,
        ...(lifecycle.trust_decision === "allow"
          ? ["Authority, policy, evidence and runtime checks allowed the requested action."]
          : [lifecycle.next_required_action]),
      ])],
      evidenceUsed: lifecycle.evidence_references,
      evidenceSummary: {
        count: lifecycle.evidence_references.length,
        references: lifecycle.evidence_references,
        graphValid: graphIntegrity.valid,
        missingNodeTypes: graphIntegrity.missingNodeTypes,
      },
      authoritySummary: {
        decision: authority.decision,
        reason: authority.reason,
        accountableHumanId: authority.accountableHumanId,
        authorityReference: authority.authorityReference,
        effectiveScope: authority.effectiveScope,
        limitations: authority.limitations,
      },
      authorityEvaluated: {
        decision: authority.decision,
        reason: authority.reason,
        accountableHumanId: authority.accountableHumanId,
        authorityReference: authority.authorityReference,
        effectiveScope: authority.effectiveScope,
        limitations: authority.limitations,
      },
      policyApplied: {
        version: request.policy.version,
        governanceStatus: request.policy.governanceStatus ?? "not_reported",
        validationStatus: request.policy.validationStatus ?? "not_run",
        minimumEvidence: request.policy.minimumEvidence ?? template.minimumEvidence,
      },
      confidenceExplanation: {
        band: lifecycle.confidence_band,
        providerDecision: consensus.decision,
        trustConfidence: consensus.trustConfidence,
        consensusConfidence: consensus.consensusConfidence,
        categoryCoverage: consensus.categoryCoverage,
        explanation: consensus.explanation,
        limitations: [...new Set([...consensus.limitations, ...lifecycle.limitations])],
      },
      providerParticipation: consensus.contributions,
      replayReference: lifecycle.replay_reference,
      trustMemoryUpdate: {
        reference: lifecycle.trust_memory_reference,
        state: memoryEvent.operational_state,
        timestamp: memoryEvent.created_at,
        reason: memoryEvent.reason,
        actor: { id: memoryEvent.actor_id, type: memoryEvent.actor_type },
        evidence: memoryEvent.evidence_refs,
        authority: memoryEvent.authority_refs,
      },
      nextRecommendedAction: lifecycle.next_required_action,
    },
    governance: { status: lifecycle.governance_status, reviewAvailable: lifecycle.evidence_graph.nodes.some((node) => node.type === "governance_review") },
    limitations: [...new Set([...authority.limitations, ...consensus.limitations, ...lifecycle.limitations])],
    lifecycle,
  };
}

export function buildTrustFabricDemo() {
  const createdAt = new Date().toISOString();
  const grants: AuthorityGrant[] = [
    { id: "authority:org-to-human", tenantId: "tenant:demo", grantorId: "organization:demo", grantorType: "organization", granteeId: "human:risk-owner", granteeType: "human", scope: ["approve_payment"], constraints: { workflowIds: ["workflow:financial-approval"], actions: ["approve_payment"], purposes: ["financial_approval"] }, maxDelegationDepth: 1, issuedAt: createdAt, evidenceRefs: ["evidence:board-mandate"] },
    { id: "authority:human-to-agent", tenantId: "tenant:demo", grantorId: "human:risk-owner", grantorType: "human", granteeId: "agent:treasury", granteeType: "ai_agent", scope: ["approve_payment"], constraints: { workflowIds: ["workflow:financial-approval"], actions: ["approve_payment"], purposes: ["financial_approval"] }, parentGrantId: "authority:org-to-human", maxDelegationDepth: 0, issuedAt: createdAt, evidenceRefs: ["evidence:delegation-receipt"] },
  ];
  return requestTrust({
    tenantId: "tenant:demo",
    entity: { id: "agent:treasury", type: "ai_agent", owner: "organization:demo", authority: "human:risk-owner", evidence_refs: ["evidence:agent-passport"] },
    workflow: { id: "workflow:financial-approval", template: "financial_approval", lifecycleStage: "runtime_trust" },
    action: { name: "approve_payment", purpose: "financial_approval" },
    signals: [
      { provider: "Identity Provider", category: "identity", state: "Live", signal: "support", model: "identity-assurance", version: "1.0", latencyMs: 21, confidence: 0.91, evidenceRefs: ["evidence:identity-provider"] },
      { provider: "Session Integrity Provider", category: "session_integrity", state: "Live", signal: "support", model: "session-integrity", version: "2.1", latencyMs: 18, confidence: 0.84, evidenceRefs: ["evidence:session-integrity"] },
    ],
    policy: { version: "financial-approval/1.1", minimumEvidence: 4, validationStatus: "reviewed", arguments: { action: "approve_payment", workflowId: "workflow:financial-approval" } },
    authority: { grants, authenticated: true, humanApprovalPresent: true, stepUpSatisfied: true, nonce: `demo-${Date.now()}` },
    runtime: { sessionIntegrity: 0.9, anomalyRisk: 0.08, deviceChannelIntegrity: 0.88, provenanceConfidence: 0.86, evidenceReferences: ["evidence:agent-passport"] },
    correlationId: "trust-fabric-demo-001",
    createdAt,
  });
}

export type EnterpriseOperationalDemoState =
  | "Live"
  | "Configured"
  | "Simulated"
  | "Awaiting Credentials";

export function buildEnterpriseOperationalReadinessDemo() {
  const decision = buildTrustFabricDemo();
  const steps: Array<{
    order: number;
    label: string;
    state: EnterpriseOperationalDemoState;
    evidence: string;
  }> = [
    { order: 1, label: "Human verification", state: "Live", evidence: "Authenticated accountable-human authority is evaluated in the controlled Trust Fabric request." },
    { order: 2, label: "AI agent verification", state: "Configured", evidence: `The normalized AI-agent identity is ${decision.entity.id}.` },
    { order: 3, label: "Machine identity verification", state: "Awaiting Credentials", evidence: "The machine-identity adapter remains disabled until deployment credentials and egress controls are reviewed." },
    { order: 4, label: "Trust Decision", state: "Simulated", evidence: `Controlled demo decision: ${decision.explainability.decision}.` },
    { order: 5, label: "Replay", state: "Simulated", evidence: decision.explainability.replayReference ?? "Replay write unavailable in the controlled demo." },
    { order: 6, label: "Evidence Graph", state: "Simulated", evidence: `${decision.explainability.evidenceSummary.count} evidence reference(s) are linked in the controlled demo graph.` },
    { order: 7, label: "Trust Memory™", state: "Simulated", evidence: `${decision.explainability.trustMemoryUpdate.state}: ${decision.explainability.trustMemoryUpdate.reason}` },
    { order: 8, label: "Governance review", state: "Configured", evidence: `Governance status is ${decision.governance.status}; human review remains authoritative.` },
    { order: 9, label: "Enterprise dashboard", state: "Configured", evidence: "The protected Enterprise Readiness workspace uses evidence-backed component states." },
    { order: 10, label: "Platform health", state: "Configured", evidence: "Platform health combines measured runtime samples, process-local diagnostics and deployment metadata without implying fleet health." },
  ];
  return {
    id: "enterprise-operational-readiness-demo/1.1.4",
    mode: "controlled_demo" as const,
    steps,
    decision,
    boundary: "Simulated steps prove product behavior and explainability only; they are not production provider, traffic or SLA evidence.",
  };
}

export function buildReleaseCandidateDemo() {
  const decision = buildTrustFabricDemo();
  const steps: Array<{
    order: number;
    timestamp: string;
    label: string;
    state: EnterpriseOperationalDemoState;
    evidence: string;
  }> = [
    { order: 1, timestamp: "0:00", label: "Human", state: "Configured", evidence: `Configured accountable-human context: ${decision.authority.accountableHumanId ?? "not recorded"}.` },
    { order: 2, timestamp: "0:35", label: "AI Agent", state: "Configured", evidence: `Normalized entity: ${decision.entity.id}.` },
    { order: 3, timestamp: "1:10", label: "Machine Identity", state: "Awaiting Credentials", evidence: "The machine-identity provider remains disabled until credentials and egress controls are reviewed." },
    { order: 4, timestamp: "1:45", label: "Authority", state: "Live", evidence: `${decision.authority.decision}: ${decision.authority.reason}` },
    { order: 5, timestamp: "2:25", label: "Trust Decision", state: "Simulated", evidence: `${decision.explainability.decision}: ${decision.explainability.why.join(" ")}` },
    { order: 6, timestamp: "3:10", label: "Replay", state: "Simulated", evidence: decision.explainability.replayReference ?? "Replay write unavailable in the controlled demo." },
    { order: 7, timestamp: "3:50", label: "Evidence Graph", state: "Simulated", evidence: `${decision.explainability.evidenceUsed.length} evidence reference(s); graph valid: ${decision.explainability.evidenceSummary.graphValid}.` },
    { order: 8, timestamp: "4:30", label: "Trust Memory™", state: "Simulated", evidence: `${decision.explainability.trustMemoryUpdate.state}: ${decision.explainability.trustMemoryUpdate.reason}` },
    { order: 9, timestamp: "5:15", label: "Governance", state: "Configured", evidence: `Governance status: ${decision.governance.status}; human review remains authoritative.` },
    { order: 10, timestamp: "6:10", label: "Enterprise Dashboard", state: "Configured", evidence: "The protected readiness dashboard separates measured evidence from deployment configuration and missing data." },
  ];
  return {
    id: "release-candidate-demo/1.1.5",
    release: "1.1.5",
    durationMinutes: 7,
    mode: "controlled_demo" as const,
    steps,
    statesShown: ["Live", "Configured", "Simulated", "Awaiting Credentials"] as EnterpriseOperationalDemoState[],
    decision,
    boundary: "Live labels refer only to controls executed in this request. Configured and simulated steps are not production traffic, provider health or SLA evidence.",
  };
}

export function buildDesignPartnerReadinessDemo() {
  const decision = buildTrustFabricDemo();
  const steps: Array<{
    order: number;
    timestamp: string;
    label: string;
    state: EnterpriseOperationalDemoState;
    evidence: string;
  }> = [
    { order: 1, timestamp: "0:00", label: "Organization created", state: "Configured", evidence: "The protected pilot setup creates a tenant workspace, administrator membership and first governed case." },
    { order: 2, timestamp: "0:35", label: "Provider configured", state: "Awaiting Credentials", evidence: "Configuration remains distinct from health; the walkthrough proceeds without inventing a successful provider call." },
    { order: 3, timestamp: "1:10", label: "Trust policy selected", state: "Configured", evidence: `Policy ${decision.explainability.policyApplied.version} retains thresholds, evidence requirements and human review.` },
    { order: 4, timestamp: "1:45", label: "Verification initiated", state: "Live", evidence: `${decision.authority.decision}: ${decision.authority.reason}` },
    { order: 5, timestamp: "2:25", label: "Decision", state: "Simulated", evidence: `${decision.explainability.decision}: ${decision.explainability.why.join(" ")}` },
    { order: 6, timestamp: "3:05", label: "Replay", state: "Simulated", evidence: decision.explainability.replayReference ?? "Replay write unavailable in the controlled demo." },
    { order: 7, timestamp: "3:45", label: "Evidence Graph", state: "Simulated", evidence: `${decision.explainability.evidenceUsed.length} retained evidence reference(s) support the controlled decision.` },
    { order: 8, timestamp: "4:25", label: "Trust Memory™", state: "Simulated", evidence: `${decision.explainability.trustMemoryUpdate.state}: ${decision.explainability.trustMemoryUpdate.reason}` },
    { order: 9, timestamp: "5:10", label: "Governance", state: "Configured", evidence: `Governance status: ${decision.governance.status}; a human outcome remains authoritative.` },
    { order: 10, timestamp: "6:10", label: "Enterprise Dashboard", state: "Configured", evidence: "The protected dashboard consolidates posture, decisions, evidence, replay, memory, providers, reviews and pending actions." },
  ];
  return {
    id: "design-partner-readiness-demo/1.2.1",
    release: "1.2.1",
    durationMinutes: 7,
    mode: "controlled_demo" as const,
    steps,
    statesShown: ["Live", "Configured", "Simulated", "Awaiting Credentials"] as EnterpriseOperationalDemoState[],
    decision,
    boundary: "Live labels apply only to controls executed in this request. Configured, simulated and awaiting-credential states are not production traffic, provider accuracy or SLA evidence.",
  };
}

export function buildCategoryLeadershipDemo() {
  const decision = buildTrustFabricDemo();
  const steps: Array<{
    order: number;
    timestamp: string;
    label: string;
    state: EnterpriseOperationalDemoState;
    evidence: string;
  }> = [
    { order: 1, timestamp: "0:00", label: "Human", state: "Configured", evidence: `Accountable owner: ${decision.authority.accountableHumanId ?? "not recorded"}.` },
    { order: 2, timestamp: "0:40", label: "AI Agent", state: "Configured", evidence: `Normalized agent identity: ${decision.entity.id}.` },
    { order: 3, timestamp: "1:20", label: "Machine Identity", state: "Awaiting Credentials", evidence: "Credential lineage is modeled; deployment credentials remain outside the controlled demo." },
    { order: 4, timestamp: "2:00", label: "Decision", state: "Simulated", evidence: `${decision.explainability.decision}: ${decision.explainability.why.join(" ")}` },
    { order: 5, timestamp: "3:10", label: "Replay", state: "Simulated", evidence: decision.explainability.replayReference ?? "Replay reference unavailable in the controlled demo." },
    { order: 6, timestamp: "4:20", label: "Governance", state: "Configured", evidence: `Governance status: ${decision.governance.status}; human review remains authoritative.` },
    { order: 7, timestamp: "5:30", label: "Dashboard", state: "Configured", evidence: "The protected dashboard consolidates posture, decisions, evidence, providers, reviews and next actions." },
  ];
  return {
    id: "category-leadership-demo/1.2.2",
    release: "1.2.2",
    durationMinutes: 6.5,
    mode: "controlled_demo" as const,
    steps,
    decision,
    boundary: "Configured and simulated steps demonstrate product behavior, not production traffic, provider accuracy, customer outcomes or an SLA.",
  };
}
