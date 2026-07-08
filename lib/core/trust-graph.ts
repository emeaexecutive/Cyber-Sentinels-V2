export type TrustGraphNodeType =
  | "human"
  | "ai_agent"
  | "machine_identity"
  | "credential"
  | "workflow"
  | "evidence"
  | "governance"
  | "replay"
  | "provider";

export type TrustGraphNode = {
  id: string;
  type: TrustGraphNodeType;
  label: string;
  metadata?: Record<string, unknown>;
};

export type TrustGraphEdge = {
  source: string;
  target: string;
  relationship:
    | "owns"
    | "delegates_to"
    | "uses_credential"
    | "executes"
    | "produces_evidence"
    | "reviewed_by"
    | "preserved_in"
    | "supplied_by"
    | "governs";
  evidence_refs: string[];
};

export type TrustGraph = {
  nodes: TrustGraphNode[];
  edges: TrustGraphEdge[];
  boundary: string;
};

function nodeId(type: TrustGraphNodeType, value: unknown) {
  return `${type}:${String(value ?? "unknown").slice(0, 160)}`;
}

function pushNode(nodes: Map<string, TrustGraphNode>, node: TrustGraphNode) {
  if (!nodes.has(node.id)) nodes.set(node.id, node);
  return node.id;
}

function pushEdge(edges: TrustGraphEdge[], edge: TrustGraphEdge) {
  if (!edges.some((item) => item.source === edge.source && item.target === edge.target && item.relationship === edge.relationship)) {
    edges.push(edge);
  }
}

export function buildTrustGraph(input: {
  humans?: Array<Record<string, unknown>>;
  agents?: Array<Record<string, unknown>>;
  machineIdentities?: Array<Record<string, unknown>>;
  credentials?: Array<Record<string, unknown>>;
  workflows?: Array<Record<string, unknown>>;
  evidence?: Array<Record<string, unknown>>;
  governance?: Array<Record<string, unknown>>;
  replays?: Array<Record<string, unknown>>;
  providers?: Array<Record<string, unknown>>;
}): TrustGraph {
  const nodes = new Map<string, TrustGraphNode>();
  const edges: TrustGraphEdge[] = [];

  for (const human of input.humans ?? []) {
    pushNode(nodes, {
      id: nodeId("human", human.id ?? human.email),
      type: "human",
      label: String(human.email ?? human.name ?? human.id ?? "Human"),
      metadata: human,
    });
  }

  for (const agent of input.agents ?? []) {
    const agentNode = pushNode(nodes, {
      id: nodeId("ai_agent", agent.id),
      type: "ai_agent",
      label: String(agent.name ?? agent.id ?? "AI agent"),
      metadata: agent,
    });
    const owner = agent.owner_email ?? agent.owner_user_id;
    if (owner) {
      const ownerNode = pushNode(nodes, {
        id: nodeId("human", owner),
        type: "human",
        label: String(owner),
      });
      pushEdge(edges, { source: ownerNode, target: agentNode, relationship: "owns", evidence_refs: [] });
    }
  }

  for (const machine of input.machineIdentities ?? []) {
    pushNode(nodes, {
      id: nodeId("machine_identity", machine.id ?? machine.subject_id),
      type: "machine_identity",
      label: String(machine.name ?? machine.subject_id ?? machine.id ?? "Machine identity"),
      metadata: machine,
    });
  }

  for (const credential of input.credentials ?? []) {
    const credentialNode = pushNode(nodes, {
      id: nodeId("credential", credential.id ?? credential.name ?? credential.provider_reference),
      type: "credential",
      label: String(credential.name ?? credential.credential_type ?? "Credential"),
      metadata: credential,
    });
    const agentId = credential.agent_id ?? credential.linked_agent;
    if (agentId) {
      pushEdge(edges, {
        source: nodeId("ai_agent", agentId),
        target: credentialNode,
        relationship: "uses_credential",
        evidence_refs: credential.id ? [String(credential.id)] : [],
      });
    }
  }

  for (const workflow of input.workflows ?? []) {
    const workflowNode = pushNode(nodes, {
      id: nodeId("workflow", workflow.id ?? workflow.workflow_id ?? workflow.subject_id),
      type: "workflow",
      label: String(workflow.title ?? workflow.workflow_type ?? workflow.id ?? "Workflow"),
      metadata: workflow,
    });
    const actorId = workflow.agent_id ?? workflow.actor_id;
    if (actorId) {
      const actorType = String(workflow.actor_type ?? "ai_agent") === "human" ? "human" : "ai_agent";
      pushEdge(edges, {
        source: nodeId(actorType as TrustGraphNodeType, actorId),
        target: workflowNode,
        relationship: "executes",
        evidence_refs: workflow.id ? [String(workflow.id)] : [],
      });
    }
  }

  for (const evidence of input.evidence ?? []) {
    const evidenceNode = pushNode(nodes, {
      id: nodeId("evidence", evidence.id ?? evidence.evidence_id),
      type: "evidence",
      label: String(evidence.title ?? evidence.evidence_type ?? evidence.id ?? "Evidence"),
      metadata: evidence,
    });
    const workflowId = evidence.workflow_id ?? evidence.subject_id ?? evidence.passport_id;
    if (workflowId) {
      pushEdge(edges, {
        source: nodeId("workflow", workflowId),
        target: evidenceNode,
        relationship: "produces_evidence",
        evidence_refs: evidence.id ? [String(evidence.id)] : [],
      });
    }
  }

  for (const governance of input.governance ?? []) {
    const governanceNode = pushNode(nodes, {
      id: nodeId("governance", governance.id),
      type: "governance",
      label: String(governance.action_status ?? governance.decision ?? "Governance review"),
      metadata: governance,
    });
    const subjectId = governance.subject_id ?? governance.workflow_id;
    if (subjectId) {
      pushEdge(edges, {
        source: governanceNode,
        target: nodeId("workflow", subjectId),
        relationship: "governs",
        evidence_refs: governance.id ? [String(governance.id)] : [],
      });
    }
  }

  for (const replay of input.replays ?? []) {
    const replayNode = pushNode(nodes, {
      id: nodeId("replay", replay.id),
      type: "replay",
      label: String(replay.replay_summary ?? replay.id ?? "Replay"),
      metadata: replay,
    });
    const subjectId = replay.subject_id;
    if (subjectId) {
      pushEdge(edges, {
        source: nodeId("workflow", subjectId),
        target: replayNode,
        relationship: "preserved_in",
        evidence_refs: replay.id ? [String(replay.id)] : [],
      });
    }
  }

  for (const provider of input.providers ?? []) {
    const providerNode = pushNode(nodes, {
      id: nodeId("provider", provider.id ?? provider.provider_name ?? provider.name),
      type: "provider",
      label: String(provider.provider_name ?? provider.name ?? "Provider"),
      metadata: provider,
    });
    const evidenceId = provider.evidence_id ?? provider.receipt_id;
    if (evidenceId) {
      pushEdge(edges, {
        source: providerNode,
        target: nodeId("evidence", evidenceId),
        relationship: "supplied_by",
        evidence_refs: [String(evidenceId)],
      });
    }
  }

  return {
    nodes: [...nodes.values()],
    edges,
    boundary: "Trust Graph relates existing records; it does not duplicate source data or create a new system of record.",
  };
}

export function queryTrustGraph(graph: TrustGraph, id: string) {
  const connectedEdges = graph.edges.filter((edge) => edge.source === id || edge.target === id);
  const neighborIds = new Set(connectedEdges.flatMap((edge) => [edge.source, edge.target]));
  return {
    node: graph.nodes.find((node) => node.id === id) ?? null,
    neighbors: graph.nodes.filter((node) => neighborIds.has(node.id) && node.id !== id),
    edges: connectedEdges,
  };
}
