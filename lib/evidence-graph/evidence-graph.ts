import type { NormalizedTrustEvidence } from "@/lib/core/evidence-normalizer";
import { normalizeProviderSignal, type VerificationProviderSignal } from "@/lib/providers";
import type { ReplaySession } from "@/lib/trust-replay/replay";
import { createTrustMemoryEvent, type TrustMemoryEvent } from "@/lib/trust-memory/trust-memory";

export type EvidenceGraphNodeType =
  | "human"
  | "organization"
  | "ai_agent"
  | "machine_identity"
  | "credential"
  | "provider"
  | "workflow"
  | "authorization"
  | "execution"
  | "evidence"
  | "replay_event"
  | "governance_review"
  | "trust_memory_event"
  | "trust_posture"
  | "decision";

export type EvidenceGraphRelationshipType =
  | "owns"
  | "delegates"
  | "uses"
  | "initiated"
  | "verified_by"
  | "generated"
  | "reviewed"
  | "approved"
  | "blocked"
  | "restored"
  | "supports"
  | "authorizes"
  | "executes";

export type EvidenceGraphNode = {
  id: string;
  type: EvidenceGraphNodeType;
  label: string;
  summary: string;
  metadata: Record<string, unknown>;
};

export type EvidenceGraphRelationship = {
  id: string;
  from: string;
  to: string;
  type: EvidenceGraphRelationshipType;
  timestamp: string;
  confidence: number;
  source: string;
  replayReference: string | null;
};

export type EvidenceGraph = {
  nodes: EvidenceGraphNode[];
  relationships: EvidenceGraphRelationship[];
  generatedAt: string;
  boundary: string;
  acceptanceCriteria: string[];
};

export type EvidenceGraphBuildInput = {
  humans?: Array<Record<string, unknown>>;
  organizations?: Array<Record<string, unknown>>;
  aiAgents?: Array<Record<string, unknown>>;
  machineIdentities?: Array<Record<string, unknown>>;
  credentials?: Array<Record<string, unknown>>;
  providers?: Array<Record<string, unknown>>;
  workflows?: Array<Record<string, unknown>>;
  authorizations?: Array<Record<string, unknown>>;
  executions?: Array<Record<string, unknown>>;
  evidence?: Array<Record<string, unknown>>;
  replayEvents?: Array<Record<string, unknown>>;
  replaySessions?: ReplaySession[];
  governanceReviews?: Array<Record<string, unknown>>;
  trustMemoryEvents?: TrustMemoryEvent[];
  trustPostures?: Array<Record<string, unknown>>;
  validationResults?: Array<Record<string, unknown>>;
  providerSignals?: VerificationProviderSignal[];
  normalizedEvidence?: NormalizedTrustEvidence[];
};

const secretPattern = /(secret|token|credential|authorization|api[_-]?key|password|session)/i;

function now() {
  return new Date().toISOString();
}

function cleanText(value: unknown, fallback: string) {
  const text = String(value ?? "").trim();
  if (!text) return fallback;
  return text.replace(secretPattern, "redacted").slice(0, 180);
}

function timestamp(value: unknown) {
  const parsed = new Date(String(value ?? ""));
  return Number.isNaN(parsed.getTime()) ? now() : parsed.toISOString();
}

function confidence(value: unknown, fallback = 0.7) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.max(0, Math.min(1, numeric > 1 ? numeric / 100 : numeric));
}

function safeMetadata(record: Record<string, unknown> = {}) {
  return Object.fromEntries(
    Object.entries(record)
      .filter(([key]) => !secretPattern.test(key))
      .map(([key, value]) => {
        if (typeof value === "string") return [key, cleanText(value, "")];
        if (Array.isArray(value)) return [key, value.map((item) => cleanText(item, "")).filter(Boolean).slice(0, 12)];
        if (value && typeof value === "object") return [key, "[redacted object]"];
        return [key, value];
      })
  );
}

function nodeId(type: EvidenceGraphNodeType, value: unknown) {
  return `${type}:${cleanText(value, "unknown").toLowerCase().replace(/[^a-z0-9:_-]+/g, "-").slice(0, 140)}`;
}

function edgeId(edge: Omit<EvidenceGraphRelationship, "id">) {
  return `${edge.from}->${edge.type}->${edge.to}:${edge.source}`;
}

export class EvidenceGraphBuilder {
  private readonly nodes = new Map<string, EvidenceGraphNode>();
  private readonly relationships = new Map<string, EvidenceGraphRelationship>();

  addNode(node: EvidenceGraphNode) {
    if (!this.nodes.has(node.id)) {
      this.nodes.set(node.id, { ...node, metadata: safeMetadata(node.metadata) });
    }
    return node.id;
  }

  addRelationship(relationship: Omit<EvidenceGraphRelationship, "id">) {
    const normalized = {
      ...relationship,
      timestamp: timestamp(relationship.timestamp),
      confidence: confidence(relationship.confidence),
      replayReference: relationship.replayReference ? cleanText(relationship.replayReference, "") : null,
    };
    const id = edgeId(normalized);
    if (!this.relationships.has(id)) this.relationships.set(id, { id, ...normalized });
    return id;
  }

  build(): EvidenceGraph {
    return {
      nodes: [...this.nodes.values()],
      relationships: [...this.relationships.values()],
      generatedAt: now(),
      boundary: "Evidence Graph explains standards-ready relationships between existing records. It does not expose secrets, raw provider payloads, draft-standard dependencies or a new system of record.",
      acceptanceCriteria: [
        "Explain why trust was granted, reviewed, blocked or restored.",
        "Keep evidence, replay, governance and Trust Memory connected.",
        "Normalize provider results before graph inclusion.",
        "Keep authorization and execution relationships explainable before runtime action.",
        "Return safe admin-only graph data.",
      ],
    };
  }
}

function link(
  builder: EvidenceGraphBuilder,
  from: string,
  to: string,
  type: EvidenceGraphRelationshipType,
  source: string,
  options: { timestamp?: unknown; confidence?: unknown; replayReference?: unknown } = {}
) {
  if (!from || !to) return;
  builder.addRelationship({
    from,
    to,
    type,
    timestamp: timestamp(options.timestamp),
    confidence: confidence(options.confidence),
    source,
    replayReference: options.replayReference ? String(options.replayReference) : null,
  });
}

export function writeTrustMemoryGraphEdges(builder: EvidenceGraphBuilder, events: TrustMemoryEvent[] = []) {
  for (const event of events) {
    const actorType = event.actor_type === "ai_agent" ? "ai_agent" : "human";
    const actor = builder.addNode({
      id: nodeId(actorType, event.actor_id),
      type: actorType,
      label: cleanText(event.actor_id, actorType === "ai_agent" ? "AI Agent" : "Human"),
      summary: "Actor connected through Trust Memory.",
      metadata: { actor_type: event.actor_type },
    });
    const workflow = builder.addNode({
      id: nodeId("workflow", event.workflow_id),
      type: "workflow",
      label: cleanText(event.workflow_id, "Workflow"),
      summary: "Workflow retained in Trust Memory.",
      metadata: { workflow_id: event.workflow_id },
    });
    const memory = builder.addNode({
      id: nodeId("trust_memory_event", event.id),
      type: "trust_memory_event",
      label: cleanText(event.event_kind, "Trust Memory event"),
      summary: cleanText(event.explanation ?? event.reason, "Trust Memory captured a trust transition."),
      metadata: {
        trust_state_before: event.trust_state_before,
        trust_state_after: event.trust_state_after,
        trust_delta: event.trust_delta,
        evidence_count: event.evidence_refs.length,
      },
    });
    const posture = builder.addNode({
      id: nodeId("trust_posture", `${event.workflow_id}:${event.trust_state_after}`),
      type: "trust_posture",
      label: cleanText(event.trust_state_after, "Trust posture"),
      summary: "Trust Memory state after the recorded event.",
      metadata: { confidence_after: event.confidence_after },
    });
    link(builder, actor, workflow, "initiated", "trust_memory", { timestamp: event.created_at, confidence: event.confidence_before });
    link(builder, workflow, memory, "generated", "trust_memory", { timestamp: event.created_at, confidence: event.confidence_after, replayReference: event.replay_refs[0] });
    link(builder, memory, posture, event.trust_delta >= 0 ? "supports" : "blocked", "trust_memory", { timestamp: event.created_at, confidence: event.confidence_after, replayReference: event.replay_refs[0] });
    for (const replayRef of event.replay_refs) {
      const replay = builder.addNode({
        id: nodeId("replay_event", replayRef),
        type: "replay_event",
        label: cleanText(replayRef, "Replay event"),
        summary: "Replay reference attached to Trust Memory.",
        metadata: { replay_ref: replayRef },
      });
      link(builder, memory, replay, "supports", "trust_memory_replay_ref", { timestamp: event.created_at, confidence: event.confidence_after, replayReference: replayRef });
    }
    for (const governanceRef of event.governance_refs) {
      const governance = builder.addNode({
        id: nodeId("governance_review", governanceRef),
        type: "governance_review",
        label: cleanText(governanceRef, "Governance review"),
        summary: "Governance reference attached to Trust Memory.",
        metadata: { governance_ref: governanceRef },
      });
      link(builder, governance, memory, "reviewed", "trust_memory_governance_ref", { timestamp: event.created_at, confidence: event.confidence_after, replayReference: event.replay_refs[0] });
    }
  }
}

export function writeReplayGraphEdges(builder: EvidenceGraphBuilder, sessions: ReplaySession[] = []) {
  for (const session of sessions) {
    const workflow = builder.addNode({
      id: nodeId("workflow", session.subject_id ?? session.id),
      type: "workflow",
      label: cleanText(session.subject_id ?? session.subject_type, "Workflow"),
      summary: "Workflow subject preserved by replay.",
      metadata: { subject_type: session.subject_type },
    });
    const replay = builder.addNode({
      id: nodeId("replay_event", session.id),
      type: "replay_event",
      label: cleanText(session.replay_summary, "Replay event"),
      summary: "Replay retained the evidence chronology for the workflow.",
      metadata: { generated_by: session.generated_by },
    });
    link(builder, workflow, replay, "generated", "replay", { timestamp: session.created_at, confidence: 0.8, replayReference: session.id });
  }
}

export function writeGovernanceGraphEdges(builder: EvidenceGraphBuilder, reviews: Array<Record<string, unknown>> = []) {
  for (const review of reviews) {
    const workflow = builder.addNode({
      id: nodeId("workflow", review.subject_id ?? review.workflow_id ?? review.id),
      type: "workflow",
      label: cleanText(review.subject_id ?? review.workflow_id, "Workflow"),
      summary: "Workflow subject for governance review.",
      metadata: { subject_type: review.subject_type },
    });
    const governance = builder.addNode({
      id: nodeId("governance_review", review.id),
      type: "governance_review",
      label: cleanText(review.action_status ?? review.decision, "Governance review"),
      summary: cleanText(review.resolution_notes ?? review.escalation_reason, "Governance review retained."),
      metadata: safeMetadata(review),
    });
    const relationship: EvidenceGraphRelationshipType =
      String(review.action_status ?? review.decision).toLowerCase().includes("block")
        ? "blocked"
        : String(review.action_status ?? review.decision).toLowerCase().includes("approve")
          ? "approved"
          : String(review.action_status ?? review.decision).toLowerCase().includes("resolved")
            ? "restored"
            : "reviewed";
    link(builder, governance, workflow, relationship, "governance", {
      timestamp: review.resolved_at ?? review.created_at,
      confidence: 0.85,
      replayReference: review.replay_id ?? review.replay_reference,
    });
  }
}

export function normalizeProviderGraphEvidence(items: Array<Record<string, unknown>> = []) {
  return items.map((item) =>
    normalizeProviderSignal({
      providerId: String(item.provider_id ?? item.providerId ?? "external_unattributed") as any,
      providerName: cleanText(item.provider_name ?? item.providerName ?? item.name, "External verification source"),
      sourceType: "provider_signal",
      identityConfidence: item.identity_confidence ?? item.identityConfidence ?? item.confidence,
      sessionIntegrity: item.session_integrity ?? item.sessionIntegrity,
      providerVerificationState: item.provider_verification_state ?? item.providerVerificationState ?? item.verification_status ?? item.status,
      riskFlags: item.risk_flags ?? item.riskFlags,
      governanceRecommendation: cleanText(item.governance_recommendation ?? item.governanceRecommendation, ""),
      evidenceReferences: Array.isArray(item.evidence_references)
        ? item.evidence_references.map(String)
        : Array.isArray(item.evidenceReferences)
          ? item.evidenceReferences.map(String)
          : [cleanText(item.evidence_reference ?? item.provider_reference, "Provider evidence")],
      summary: cleanText(item.summary ?? item.evidence_summary, "Provider result normalized as graph evidence."),
    })
  );
}

export function writeProviderGraphEdges(builder: EvidenceGraphBuilder, signals: VerificationProviderSignal[] = []) {
  for (const signal of signals) {
    const provider = builder.addNode({
      id: nodeId("provider", signal.providerName),
      type: "provider",
      label: signal.providerName,
      summary: "Normalized provider result. Raw provider payloads are excluded.",
      metadata: { verification_state: signal.providerVerificationState, risk_flags: signal.riskFlags },
    });
    const evidence = builder.addNode({
      id: nodeId("evidence", signal.evidenceReferences[0] ?? signal.providerName),
      type: "evidence",
      label: cleanText(signal.evidenceReferences[0], "Provider evidence"),
      summary: signal.summary,
      metadata: { source_type: signal.sourceType, risk_flags: signal.riskFlags },
    });
    link(builder, evidence, provider, "verified_by", "provider_normalizer", {
      timestamp: now(),
      confidence: signal.identityConfidence / 100,
      replayReference: signal.evidenceReferences.find((item) => /replay/i.test(item)),
    });
  }
}

export function writeValidationGraphEdges(builder: EvidenceGraphBuilder, results: Array<Record<string, unknown>> = []) {
  for (const result of results) {
    const workflow = builder.addNode({
      id: nodeId("workflow", result.caseId ?? result.id),
      type: "workflow",
      label: cleanText(result.caseId ?? result.id, "Validation workflow"),
      summary: "Validation case linked as evidence, not production certainty.",
      metadata: { expected: result.expected, actual: result.actual, source: result.source },
    });
    const evidence = builder.addNode({
      id: nodeId("evidence", `validation:${result.caseId ?? result.id}`),
      type: "evidence",
      label: "Validation evidence",
      summary: "Validation result contributes to graph explainability when reviewed data exists.",
      metadata: safeMetadata(result),
    });
    link(builder, evidence, workflow, "supports", "validation", {
      timestamp: result.created_at,
      confidence: result.confidence ?? 0.5,
      replayReference: result.replay_reference,
    });
  }
}

export function buildEvidenceGraph(input: EvidenceGraphBuildInput = {}) {
  const builder = new EvidenceGraphBuilder();

  for (const human of input.humans ?? []) {
    const humanNode = builder.addNode({
      id: nodeId("human", human.id ?? human.email),
      type: "human",
      label: cleanText(human.email ?? human.name ?? human.id, "Human"),
      summary: "Human identity node.",
      metadata: human,
    });
    const organization = human.organization_id ?? human.organization ?? human.org_id;
    if (organization) {
      const orgNode = builder.addNode({
        id: nodeId("organization", organization),
        type: "organization",
        label: cleanText(organization, "Organization"),
        summary: "Organization that owns or governs the human identity.",
        metadata: {},
      });
      link(builder, orgNode, humanNode, "owns", "organization_record", { timestamp: human.created_at, confidence: 0.8 });
    }
  }

  for (const organization of input.organizations ?? []) {
    builder.addNode({
      id: nodeId("organization", organization.id ?? organization.name),
      type: "organization",
      label: cleanText(organization.name ?? organization.id, "Organization"),
      summary: "Organization node for ownership and governance context.",
      metadata: organization,
    });
  }

  for (const agent of input.aiAgents ?? []) {
    const agentNode = builder.addNode({
      id: nodeId("ai_agent", agent.id ?? agent.name),
      type: "ai_agent",
      label: cleanText(agent.name ?? agent.id, "AI Agent"),
      summary: "AI agent node with owner and authority context.",
      metadata: agent,
    });
    const owner = agent.owner_email ?? agent.owner_user_id ?? agent.human_owner;
    const organization = agent.owner_organization ?? agent.organization_id ?? agent.organization;
    if (owner) {
      const humanNode = builder.addNode({
        id: nodeId("human", owner),
        type: "human",
        label: cleanText(owner, "Human owner"),
        summary: "Human owner inferred from agent record.",
        metadata: {},
      });
      link(builder, humanNode, agentNode, "owns", "ai_agent_record", { timestamp: agent.created_at, confidence: 0.8 });
    }
    if (organization) {
      const orgNode = builder.addNode({
        id: nodeId("organization", organization),
        type: "organization",
        label: cleanText(organization, "Organization"),
        summary: "Organization owner inferred from agent record.",
        metadata: {},
      });
      link(builder, orgNode, agentNode, "owns", "ai_agent_record", { timestamp: agent.created_at, confidence: 0.8 });
    }
  }

  for (const machine of input.machineIdentities ?? []) {
    const machineNode = builder.addNode({
      id: nodeId("machine_identity", machine.id ?? machine.subject_id ?? machine.service_account),
      type: "machine_identity",
      label: cleanText(machine.service_account ?? machine.name ?? machine.id, "Machine Identity"),
      summary: "Machine identity with credential lineage and workflow context.",
      metadata: machine,
    });
    const agentId = machine.linked_agent_id ?? machine.linkedAiAgent;
    const workflowId = machine.linked_workflow_id ?? machine.linkedWorkflow;
    if (agentId) link(builder, nodeId("ai_agent", agentId), machineNode, "uses", "machine_identity_record", { timestamp: machine.created_at, confidence: 0.75 });
    if (workflowId) link(builder, machineNode, nodeId("workflow", workflowId), "supports", "machine_identity_record", { timestamp: machine.created_at, confidence: 0.75 });
  }

  for (const credential of input.credentials ?? []) {
    const credentialNode = builder.addNode({
      id: nodeId("credential", credential.id ?? credential.credential_id ?? credential.credentialId),
      type: "credential",
      label: cleanText(credential.kind ?? credential.credential_kind ?? credential.id, "Credential"),
      summary: "Credential reference with secret material excluded.",
      metadata: credential,
    });
    const machineId = credential.machine_identity_id ?? credential.machineIdentityId ?? credential.subject_id;
    if (machineId) link(builder, nodeId("machine_identity", machineId), credentialNode, "uses", "credential_record", { timestamp: credential.created_at, confidence: 0.8 });
  }

  for (const workflow of input.workflows ?? []) {
    builder.addNode({
      id: nodeId("workflow", workflow.id ?? workflow.workflow_id ?? workflow.subject_id),
      type: "workflow",
      label: cleanText(workflow.title ?? workflow.workflow_type ?? workflow.id, "Workflow"),
      summary: "Workflow node.",
      metadata: workflow,
    });
  }

  for (const authorization of input.authorizations ?? []) {
    const authorizationNode = builder.addNode({
      id: nodeId("authorization", authorization.id ?? authorization.authorization_id),
      type: "authorization",
      label: cleanText(authorization.decision ?? authorization.status, "Authorization"),
      summary: cleanText(authorization.reason, "Authorization gateway decision retained."),
      metadata: authorization,
    });
    const actorId = authorization.actor_id ?? authorization.subject_id;
    const actorType = String(authorization.actor_type ?? "ai_agent") as EvidenceGraphNodeType;
    const workflowId = authorization.workflow_id;
    if (actorId && ["human", "ai_agent", "machine_identity"].includes(actorType)) {
      link(builder, nodeId(actorType, actorId), authorizationNode, "authorizes", "authorization_gateway", { timestamp: authorization.created_at, confidence: authorization.confidence ?? 0.8, replayReference: authorization.replay_reference });
    }
    if (workflowId) link(builder, authorizationNode, nodeId("workflow", workflowId), "supports", "authorization_gateway", { timestamp: authorization.created_at, confidence: authorization.confidence ?? 0.8, replayReference: authorization.replay_reference });
  }

  for (const execution of input.executions ?? []) {
    const executionNode = builder.addNode({
      id: nodeId("execution", execution.id ?? execution.execution_id),
      type: "execution",
      label: cleanText(execution.status ?? execution.outcome, "Execution"),
      summary: cleanText(execution.summary, "Execution receipt retained."),
      metadata: execution,
    });
    const authorizationId = execution.authorization_id ?? execution.authorizationId;
    const workflowId = execution.workflow_id;
    if (authorizationId) link(builder, nodeId("authorization", authorizationId), executionNode, "executes", "trust_enforcement", { timestamp: execution.created_at, confidence: execution.confidence ?? 0.8, replayReference: execution.replay_reference });
    if (workflowId) link(builder, executionNode, nodeId("workflow", workflowId), "generated", "trust_enforcement", { timestamp: execution.created_at, confidence: execution.confidence ?? 0.8, replayReference: execution.replay_reference });
  }

  for (const evidence of input.evidence ?? []) {
    const evidenceNode = builder.addNode({
      id: nodeId("evidence", evidence.id ?? evidence.evidence_id ?? evidence.receipt_id),
      type: "evidence",
      label: cleanText(evidence.title ?? evidence.evidence_type ?? evidence.receipt_type ?? evidence.id, "Evidence"),
      summary: cleanText(evidence.receipt_summary ?? evidence.summary, "Evidence record retained."),
      metadata: evidence,
    });
    const workflowId = evidence.workflow_id ?? evidence.subject_id ?? evidence.passport_id;
    if (workflowId) {
      const workflowNode = builder.addNode({
        id: nodeId("workflow", workflowId),
        type: "workflow",
        label: cleanText(workflowId, "Workflow"),
        summary: "Workflow inferred from evidence record.",
        metadata: {},
      });
      link(builder, workflowNode, evidenceNode, "generated", "evidence_record", { timestamp: evidence.issued_at ?? evidence.created_at, confidence: evidence.confidence_level ?? evidence.confidence ?? 0.7, replayReference: evidence.replay_id });
    }
  }

  writeReplayGraphEdges(builder, input.replaySessions);
  writeGovernanceGraphEdges(builder, input.governanceReviews);
  writeTrustMemoryGraphEdges(builder, input.trustMemoryEvents);
  writeProviderGraphEdges(builder, input.providerSignals);
  writeProviderGraphEdges(builder, normalizeProviderGraphEvidence(input.providers));
  writeValidationGraphEdges(builder, input.validationResults);

  for (const posture of input.trustPostures ?? []) {
    const postureNode = builder.addNode({
      id: nodeId("trust_posture", posture.id ?? posture.subject_id ?? posture.workflow_id),
      type: "trust_posture",
      label: cleanText(posture.label ?? posture.state ?? posture.badge, "Trust posture"),
      summary: "Current explainable trust state.",
      metadata: posture,
    });
    const workflowId = posture.workflow_id ?? posture.subject_id;
    if (workflowId) link(builder, nodeId("workflow", workflowId), postureNode, "supports", "trust_posture", { timestamp: posture.updated_at ?? posture.created_at, confidence: posture.confidence ?? 0.7, replayReference: posture.replay_id });
  }

  return builder.build();
}

export function buildEvidenceGraphDemo() {
  const createdAt = "2026-07-10T12:00:00.000Z";
  return buildEvidenceGraph({
    organizations: [{ id: "example-enterprise", name: "Example Enterprise", created_at: createdAt }],
    humans: [{ id: "ciso@example.com", email: "ciso@example.com", organization: "example-enterprise", created_at: createdAt }],
    aiAgents: [{ id: "agent-contract-review", name: "Contract Review Agent", owner_email: "ciso@example.com", created_at: createdAt }],
    machineIdentities: [{ id: "machine-ats-webhook-prod", service_account: "ATS webhook service account", linked_agent_id: "agent-contract-review", linked_workflow_id: "workflow-vendor-access", created_at: createdAt }],
    credentials: [{ id: "credential-oauth-client-ats-prod", credential_kind: "oauth_client", machine_identity_id: "machine-ats-webhook-prod", created_at: createdAt }],
    workflows: [{ id: "workflow-vendor-access", workflow_type: "Vendor access review", created_at: createdAt }],
    authorizations: [{ id: "authorization-demo-001", actor_type: "ai_agent", actor_id: "agent-contract-review", workflow_id: "workflow-vendor-access", decision: "APPROVAL REQUIRED", reason: "Delegated action required governance approval.", replay_reference: "replay-demo-001", created_at: createdAt }],
    executions: [{ id: "execution-demo-001", authorization_id: "authorization-demo-001", workflow_id: "workflow-vendor-access", status: "receipt_created", summary: "Execution held until governance approval and replay receipt.", replay_reference: "replay-demo-001", created_at: createdAt }],
    evidence: [{ id: "evidence-provider-hopae", subject_id: "workflow-vendor-access", evidence_type: "Provider Evidence", confidence: 0.82, created_at: createdAt }],
    providers: [{ provider_id: "hopae_connect", provider_name: "Hopae Connect", verification_status: "verified", confidence: 82, evidence_references: ["evidence-provider-hopae", "replay-demo-001"] }],
    replaySessions: [{ id: "replay-demo-001", subject_type: "workflow", subject_id: "workflow-vendor-access", replay_summary: "Replay preserved actor, authority, provider evidence and review sequence.", generated_by: "system", created_at: createdAt }],
    governanceReviews: [{ id: "governance-demo-001", subject_type: "workflow", subject_id: "workflow-vendor-access", action_status: "approved", resolution_notes: "CISO approved after evidence and replay review.", replay_reference: "replay-demo-001", created_at: createdAt }],
    trustMemoryEvents: [
      createTrustMemoryEvent({
        id: "trust-memory-demo-001",
        actor_id: "agent-contract-review",
        actor_type: "ai_agent",
        workflow_id: "workflow-vendor-access",
        event_kind: "governance_decision",
        trust_state_before: "review",
        trust_state_after: "approved",
        reason: "Provider evidence, replay and governance review supported approval.",
        evidence_refs: ["evidence-provider-hopae"],
        replay_refs: ["replay-demo-001"],
        governance_refs: ["governance-demo-001"],
        provider_refs: ["hopae_connect"],
        reviewed_outcome_ref: "decision-demo-001",
        confidence_before: 0.64,
        confidence_after: 0.82,
        created_at: createdAt,
      }),
    ],
  });
}

export function validateEvidenceGraphContinuity(graph: EvidenceGraph, tenantId?: string) {
  const nodeIds = new Set(graph.nodes.map((node) => node.id));
  const incidentEdges = new Map<string, number>();
  for (const relationship of graph.relationships) {
    incidentEdges.set(relationship.from, (incidentEdges.get(relationship.from) ?? 0) + 1);
    incidentEdges.set(relationship.to, (incidentEdges.get(relationship.to) ?? 0) + 1);
  }
  const missingEdges = graph.relationships
    .filter((relationship) => !nodeIds.has(relationship.from) || !nodeIds.has(relationship.to))
    .map((relationship) => relationship.id);
  const crossTenantReferences = tenantId
    ? graph.nodes.filter((node) => node.metadata.tenant_id && node.metadata.tenant_id !== tenantId).map((node) => node.id)
    : [];
  const orphanedCredentials = graph.nodes.filter((node) => node.type === "credential" && !incidentEdges.has(node.id)).map((node) => node.id);
  const unownedAgents = graph.nodes.filter((node) => node.type === "ai_agent" && !graph.relationships.some((edge) => edge.to === node.id && edge.type === "owns")).map((node) => node.id);
  const revokedAuthority = graph.nodes.filter((node) => node.type === "authorization" && /revoked/i.test(node.label)).map((node) => node.id);
  const missingExecutionReceipt = graph.nodes.some((node) => node.type === "execution") ? [] : ["execution_receipt"];
  const evidenceNotLinkedToReplay = graph.nodes
    .filter((node) => node.type === "evidence" && !graph.relationships.some((edge) => (edge.from === node.id || edge.to === node.id) && Boolean(edge.replayReference)))
    .map((node) => node.id);
  const trustMemoryWithoutEvidence = graph.nodes
    .filter((node) => node.type === "trust_memory_event" && !graph.nodes.some((candidate) => candidate.type === "evidence"))
    .map((node) => node.id);
  const findings = { missingEdges, crossTenantReferences, orphanedCredentials, unownedAgents, revokedAuthority, missingExecutionReceipt, evidenceNotLinkedToReplay, trustMemoryWithoutEvidence };
  return {
    valid: Object.values(findings).every((items) => items.length === 0),
    findings,
    boundary: "Evidence Graph integrity reports continuity gaps without creating another graph or silently repairing records.",
  };
}
