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
  | "changed_to";

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

  return {
    schemaVersion: 1,
    nodes: [...input.nodes],
    edges: linkedEdges,
    transitions,
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

