import type {
  EvidenceGraph,
  EvidenceGraphNode,
  EvidenceGraphRelationship,
  EvidenceGraphRelationshipType,
} from "@/lib/evidence-graph/evidence-graph";

function node(graph: EvidenceGraph, id: string) {
  return graph.nodes.find((item) => item.id === id) ?? null;
}

function edgesFor(graph: EvidenceGraph, id: string) {
  return graph.relationships.filter((edge) => edge.from === id || edge.to === id);
}

function labels(graph: EvidenceGraph, edges: EvidenceGraphRelationship[]) {
  return edges.map((edge) => {
    const from = node(graph, edge.from)?.label ?? edge.from;
    const to = node(graph, edge.to)?.label ?? edge.to;
    return `${from} ${edge.type} ${to}`;
  });
}

function byType(graph: EvidenceGraph, type: EvidenceGraphRelationshipType) {
  return graph.relationships.filter((edge) => edge.type === type);
}

function uniqueNodes(graph: EvidenceGraph, edges: EvidenceGraphRelationship[]) {
  const ids = new Set(edges.flatMap((edge) => [edge.from, edge.to]));
  return graph.nodes.filter((item) => ids.has(item.id));
}

export function explainTrust(graph: EvidenceGraph, targetId?: string) {
  const selected = targetId ? node(graph, targetId) : graph.nodes.find((item) => item.type === "workflow") ?? graph.nodes[0] ?? null;
  const edges = selected ? edgesFor(graph, selected.id) : graph.relationships;
  const supports = edges.filter((edge) => edge.type === "supports" || edge.type === "verified_by" || edge.type === "approved" || edge.type === "reviewed");
  const blockers = edges.filter((edge) => edge.type === "blocked");

  return {
    question: "Can I explain WHY this was trusted?",
    answer: supports.length ? "YES" : "NO",
    target: selected,
    explanation: supports.length
      ? "Trust is explained by connected evidence, provider, replay, governance and Trust Memory relationships."
      : "No sufficient supporting graph relationships were found for this target.",
    supportingRelationships: supports,
    blockingRelationships: blockers,
    pathSummary: labels(graph, edges),
    evidenceReferences: [...new Set(edges.map((edge) => edge.replayReference).filter(Boolean))],
    boundary: graph.boundary,
  };
}

export function explainAuthority(graph: EvidenceGraph, targetId?: string) {
  const edges = graph.relationships.filter((edge) =>
    ["owns", "delegates", "uses", "initiated"].includes(edge.type) &&
    (!targetId || edge.from === targetId || edge.to === targetId)
  );
  return {
    answer: edges.length ? "Authority can be explained from ownership, delegation, usage and initiation relationships." : "No authority path is available in the graph.",
    relationships: edges,
    nodes: uniqueNodes(graph, edges),
    pathSummary: labels(graph, edges),
  };
}

export function showEvidenceChain(graph: EvidenceGraph, targetId?: string) {
  const edges = graph.relationships.filter((edge) =>
    ["verified_by", "generated", "supports"].includes(edge.type) &&
    (!targetId || edge.from === targetId || edge.to === targetId)
  );
  return {
    evidenceNodes: uniqueNodes(graph, edges).filter((item) => ["evidence", "provider", "replay_event"].includes(item.type)),
    relationships: edges,
    pathSummary: labels(graph, edges),
  };
}

export function showWorkflowHistory(graph: EvidenceGraph, workflowId?: string) {
  const workflow = workflowId ? node(graph, workflowId) : graph.nodes.find((item) => item.type === "workflow") ?? null;
  const edges = workflow
    ? edgesFor(graph, workflow.id)
    : graph.relationships.filter((edge) => {
        const from = node(graph, edge.from);
        const to = node(graph, edge.to);
        return from?.type === "workflow" || to?.type === "workflow";
      });
  return {
    workflow,
    relationships: [...edges].sort((a, b) => a.timestamp.localeCompare(b.timestamp)),
    pathSummary: labels(graph, edges),
  };
}

export function showTrustEvolution(graph: EvidenceGraph) {
  const edges = graph.relationships.filter((edge) => edge.type === "supports" || edge.type === "restored" || edge.type === "blocked");
  return {
    postureNodes: graph.nodes.filter((item) => item.type === "trust_posture" || item.type === "trust_memory_event"),
    relationships: [...edges].sort((a, b) => a.timestamp.localeCompare(b.timestamp)),
    pathSummary: labels(graph, edges),
  };
}

export function showGovernanceHistory(graph: EvidenceGraph) {
  const edges = graph.relationships.filter((edge) => ["reviewed", "approved", "blocked", "restored"].includes(edge.type));
  return {
    governanceNodes: graph.nodes.filter((item) => item.type === "governance_review"),
    relationships: [...edges].sort((a, b) => a.timestamp.localeCompare(b.timestamp)),
    pathSummary: labels(graph, edges),
  };
}

export function runEvidenceGraphQueries(graph: EvidenceGraph, targetId?: string) {
  return {
    explainTrust: explainTrust(graph, targetId),
    explainAuthority: explainAuthority(graph, targetId),
    evidenceChain: showEvidenceChain(graph, targetId),
    workflowHistory: showWorkflowHistory(graph, targetId),
    trustEvolution: showTrustEvolution(graph),
    governanceHistory: showGovernanceHistory(graph),
  };
}
