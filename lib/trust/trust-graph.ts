export type TrustGraphNodeType =
  | "actor"
  | "workflow"
  | "authorization"
  | "evidence"
  | "replay"
  | "governance"
  | "trust_transition";

export type ExplainableTrustNode = {
  id: string;
  type: TrustGraphNodeType;
  label: string;
  recordedAt?: string;
  metadata?: Record<string, unknown>;
};

export type TrustGraphRelation =
  | "acted_in"
  | "authorized_by"
  | "supported_by"
  | "replayed_by"
  | "governed_by"
  | "changed_to"
  | "responded_with"
  | "produced_receipt";

export type ExplainableTrustEdge = {
  id: string;
  from: string;
  to: string;
  relation: TrustGraphRelation;
  evidenceReferences?: string[];
  explanation: string;
};

export type TrustTransitionHistory = {
  id: string;
  fromScore: number | null;
  toScore: number | null;
  reason: string;
  source: string;
  occurredAt: string;
  evidenceReferences: string[];
};

export function buildExplainableTrustGraph(input: {
  nodes: ExplainableTrustNode[];
  edges: ExplainableTrustEdge[];
  transitions?: TrustTransitionHistory[];
}) {
  const nodeIds = new Set(input.nodes.map((node) => node.id));
  const linkedEdges = input.edges.filter(
    (edge) => nodeIds.has(edge.from) && nodeIds.has(edge.to)
  );
  const unlinkedEdges = input.edges.filter(
    (edge) => !nodeIds.has(edge.from) || !nodeIds.has(edge.to)
  );
  const transitions = [...(input.transitions ?? [])].sort(
    (left, right) =>
      new Date(left.occurredAt).getTime() - new Date(right.occurredAt).getTime()
  );
  const linkageCoverage = input.edges.length
    ? linkedEdges.length / input.edges.length
    : input.nodes.length
      ? 0
      : 1;
  const lineage = {
    actorRelationships: linkedEdges.filter((edge) => edge.relation === "acted_in").length,
    authorizationRelationships: linkedEdges.filter((edge) => edge.relation === "authorized_by").length,
    evidenceRelationships: linkedEdges.filter((edge) => edge.relation === "supported_by").length,
    replayRelationships: linkedEdges.filter((edge) => edge.relation === "replayed_by").length,
    governanceRelationships: linkedEdges.filter((edge) => edge.relation === "governed_by").length,
    providerResponseRelationships: linkedEdges.filter((edge) => edge.relation === "responded_with").length,
    receiptRelationships: linkedEdges.filter((edge) => edge.relation === "produced_receipt").length,
  };
  const evidenceReferences = [
    ...new Set([
      ...linkedEdges.flatMap((edge) => edge.evidenceReferences ?? []),
      ...transitions.flatMap((transition) => transition.evidenceReferences),
    ]),
  ];

  return {
    schemaVersion: 1,
    nodes: [...input.nodes],
    edges: linkedEdges,
    transitions,
    lineage,
    explanation: transitions.length
      ? transitions.map((transition) => ({
          transitionId: transition.id,
          change:
            transition.fromScore == null || transition.toScore == null
              ? "Trust posture changed without a numeric score."
              : `Trust changed from ${transition.fromScore} to ${transition.toScore}.`,
          why: transition.reason,
          source: transition.source,
          evidenceReferences: [...transition.evidenceReferences],
        }))
      : [],
    evidenceReferences,
    completeness: {
      linkageCoverage,
      hasActor: input.nodes.some((node) => node.type === "actor"),
      hasWorkflow: input.nodes.some((node) => node.type === "workflow"),
      hasAuthorization: input.nodes.some((node) => node.type === "authorization"),
      hasEvidence: input.nodes.some((node) => node.type === "evidence"),
      hasReplay: input.nodes.some((node) => node.type === "replay"),
      hasGovernance: input.nodes.some((node) => node.type === "governance"),
      hasTrustTransition: transitions.length > 0,
    },
    linkageCoverage,
    missingLinks: unlinkedEdges.map((edge) => ({
      edgeId: edge.id,
      missingNodeIds: [edge.from, edge.to].filter((id) => !nodeIds.has(id)),
    })),
    limitations: unlinkedEdges.length
      ? ["Some graph relationships reference unavailable nodes."]
      : [],
  };
}

export function buildWorkflowTrustGraph(input: {
  workflowId: string;
  actorId: string;
  actorLabel: string;
  authorizationId?: string;
  evidenceIds?: string[];
  replayId?: string;
  governanceId?: string;
  providerResponseId?: string;
  receiptId?: string;
  transitions?: TrustTransitionHistory[];
}) {
  const workflowNode: ExplainableTrustNode = {
    id: `workflow:${input.workflowId}`,
    type: "workflow",
    label: input.workflowId,
  };
  const actorNode: ExplainableTrustNode = {
    id: `actor:${input.actorId}`,
    type: "actor",
    label: input.actorLabel,
  };
  const optionalNodes: ExplainableTrustNode[] = [
    input.authorizationId && {
      id: `authorization:${input.authorizationId}`,
      type: "authorization" as const,
      label: input.authorizationId,
    },
    ...(input.evidenceIds ?? []).map((id) => ({
      id: `evidence:${id}`,
      type: "evidence" as const,
      label: id,
    })),
    input.replayId && {
      id: `replay:${input.replayId}`,
      type: "replay" as const,
      label: input.replayId,
    },
    input.governanceId && {
      id: `governance:${input.governanceId}`,
      type: "governance" as const,
      label: input.governanceId,
    },
    input.providerResponseId && {
      id: `evidence:provider:${input.providerResponseId}`,
      type: "evidence" as const,
      label: input.providerResponseId,
    },
    input.receiptId && {
      id: `evidence:receipt:${input.receiptId}`,
      type: "evidence" as const,
      label: input.receiptId,
    },
  ].filter(Boolean) as ExplainableTrustNode[];

  const edges: ExplainableTrustEdge[] = [
    {
      id: `edge:${input.actorId}:workflow:${input.workflowId}`,
      from: actorNode.id,
      to: workflowNode.id,
      relation: "acted_in",
      explanation: "Actor activity is linked to the workflow under review.",
    },
    ...(input.authorizationId
      ? [{
          id: `edge:${input.authorizationId}:workflow:${input.workflowId}`,
          from: workflowNode.id,
          to: `authorization:${input.authorizationId}`,
          relation: "authorized_by" as const,
          explanation: "Workflow activity is tied to an authorization lineage record.",
        }]
      : []),
    ...(input.evidenceIds ?? []).map((id) => ({
      id: `edge:${id}:workflow:${input.workflowId}`,
      from: workflowNode.id,
      to: `evidence:${id}`,
      relation: "supported_by" as const,
      evidenceReferences: [id],
      explanation: "Evidence contributes to the workflow trust posture.",
    })),
    ...(input.replayId
      ? [{
          id: `edge:${input.replayId}:workflow:${input.workflowId}`,
          from: workflowNode.id,
          to: `replay:${input.replayId}`,
          relation: "replayed_by" as const,
          explanation: "Replay reconstructs the workflow chronology.",
        }]
      : []),
    ...(input.governanceId
      ? [{
          id: `edge:${input.governanceId}:workflow:${input.workflowId}`,
          from: workflowNode.id,
          to: `governance:${input.governanceId}`,
          relation: "governed_by" as const,
          explanation: "Governance review records the accountable operational response.",
        }]
      : []),
  ];

  return buildExplainableTrustGraph({
    nodes: [workflowNode, actorNode, ...optionalNodes],
    edges,
    transitions: input.transitions,
  });
}
