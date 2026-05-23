export type GraphNodeType =
  | "human"
  | "candidate"
  | "ai_agent"
  | "company"
  | "passport"
  | "reality_passport"
  | "linkedin_profile"
  | "evidence"
  | "signal"
  | "audit_log"
  | "decision"
  | "origin_trace"
  | "human_presence_index";

export type GraphEdgeType =
  | "owns"
  | "submitted"
  | "verified_by"
  | "linked_to"
  | "generated"
  | "reviewed_by"
  | "flagged_by"
  | "approved_by"
  | "rejected_by"
  | "belongs_to"
  | "evidence_for";

export type GraphNode = {
  id: string;
  label: string;
  type: GraphNodeType;
  detail: string;
};

export type GraphEdge = {
  id: string;
  from: string;
  to: string;
  type: GraphEdgeType;
  label: string;
};

export type TrustGraph = {
  nodes: GraphNode[];
  edges: GraphEdge[];
};

export type PassportGraphRow = {
  id: string;
  subject_name: string | null;
  subject_type: string | null;
  trust_score: number | null;
  human_presence_index: number | null;
  origin_trace_score: number | null;
  linkedin_url: string | null;
  linkedin_claimed_company: string | null;
  linkedin_claimed_role: string | null;
};

export type TrustReportGraphRow = {
  id: string;
  candidate_name: string | null;
  linkedin_url: string | null;
  linkedin_claimed_company: string | null;
  linkedin_claimed_role: string | null;
};

export type SignalGraphRow = {
  id: string;
  event: string;
};

export type AuditLogGraphRow = {
  id: string;
  event_type: string;
  actor: string | null;
};

export type DecisionGraphRow = {
  id: string;
  verification_case_id: string | null;
  decision: string | null;
  actor: string | null;
};

export type VerificationCaseGraphRow = {
  id: string;
  subject_name: string | null;
  subject_type: string | null;
  status: string | null;
};

export type EvidenceFileGraphRow = {
  id: string;
  verification_case_id: string | null;
  file_name: string | null;
  media_type: string | null;
};

export type GraphSources = {
  passports?: PassportGraphRow[] | null;
  trustReports?: TrustReportGraphRow[] | null;
  signals?: SignalGraphRow[] | null;
  auditLogs?: AuditLogGraphRow[] | null;
  decisions?: DecisionGraphRow[] | null;
  verificationCases?: VerificationCaseGraphRow[] | null;
  evidenceFiles?: EvidenceFileGraphRow[] | null;
};

function subjectNodeType(subjectType: string | null | undefined): GraphNodeType {
  if (subjectType === "agent") return "ai_agent";
  if (subjectType === "candidate") return "candidate";

  return "human";
}

function addNode(nodes: Map<string, GraphNode>, node: GraphNode) {
  if (!nodes.has(node.id)) {
    nodes.set(node.id, node);
  }
}

function addEdge(edges: GraphEdge[], edge: GraphEdge) {
  if (!edges.some((item) => item.id === edge.id)) {
    edges.push(edge);
  }
}

export function createDemoGraph(): TrustGraph {
  const nodes: GraphNode[] = [
    { id: "demo-human", label: "Keith Speres", type: "human", detail: "Core Identity Node" },
    { id: "demo-company", label: "Cyber Sentinels", type: "company", detail: "Professional context" },
    { id: "demo-reality", label: "Reality Passport™", type: "reality_passport", detail: "Reality state" },
    { id: "demo-hpi", label: "Human Presence Index™", type: "human_presence_index", detail: "Presence score" },
    { id: "demo-origin", label: "Origin Trace™", type: "origin_trace", detail: "Provenance chain" },
    { id: "demo-linkedin", label: "LinkedIn Verification", type: "linkedin_profile", detail: "Professional signal" },
    { id: "demo-decision", label: "Admin Decision", type: "decision", detail: "Back office review" },
    { id: "demo-video", label: "Video Evidence", type: "evidence", detail: "Submitted evidence" },
    { id: "demo-voice", label: "Voice Risk Signal", type: "signal", detail: "Synthetic media signal" },
  ];

  const edges: GraphEdge[] = [
    { id: "demo-e1", from: "demo-human", to: "demo-reality", type: "owns", label: "owns" },
    { id: "demo-e2", from: "demo-human", to: "demo-hpi", type: "verified_by", label: "verified by" },
    { id: "demo-e3", from: "demo-reality", to: "demo-origin", type: "linked_to", label: "linked to" },
    { id: "demo-e4", from: "demo-linkedin", to: "demo-human", type: "evidence_for", label: "evidence for" },
    { id: "demo-e5", from: "demo-video", to: "demo-human", type: "submitted", label: "submitted" },
    { id: "demo-e6", from: "demo-voice", to: "demo-video", type: "flagged_by", label: "flagged by" },
    { id: "demo-e7", from: "demo-decision", to: "demo-reality", type: "approved_by", label: "approved by" },
    { id: "demo-e8", from: "demo-human", to: "demo-company", type: "belongs_to", label: "belongs to" },
  ];

  return { nodes, edges };
}

export function buildTrustGraph(sources: GraphSources): TrustGraph {
  const nodes = new Map<string, GraphNode>();
  const edges: GraphEdge[] = [];

  for (const passport of sources.passports ?? []) {
    const subjectId = `subject-${passport.id}`;
    const passportId = `passport-${passport.id}`;
    const realityId = `reality-${passport.id}`;
    const hpiId = `hpi-${passport.id}`;
    const originId = `origin-${passport.id}`;

    addNode(nodes, {
      id: subjectId,
      label: passport.subject_name ?? "Unnamed subject",
      type: subjectNodeType(passport.subject_type),
      detail: passport.subject_type ?? "human",
    });
    addNode(nodes, {
      id: passportId,
      label: "Trust Passport",
      type: "passport",
      detail: `Trust score ${passport.trust_score ?? "pending"}`,
    });
    addNode(nodes, {
      id: realityId,
      label: "Reality Passport™",
      type: "reality_passport",
      detail: "Reality state",
    });
    addNode(nodes, {
      id: hpiId,
      label: "Human Presence Index™",
      type: "human_presence_index",
      detail: `${passport.human_presence_index ?? "pending"}`,
    });
    addNode(nodes, {
      id: originId,
      label: "Origin Trace™",
      type: "origin_trace",
      detail: `${passport.origin_trace_score ?? "pending"}`,
    });

    addEdge(edges, { id: `edge-${subjectId}-${passportId}`, from: subjectId, to: passportId, type: "owns", label: "owns" });
    addEdge(edges, { id: `edge-${passportId}-${realityId}`, from: passportId, to: realityId, type: "generated", label: "generated" });
    addEdge(edges, { id: `edge-${subjectId}-${hpiId}`, from: subjectId, to: hpiId, type: "verified_by", label: "verified by" });
    addEdge(edges, { id: `edge-${passportId}-${originId}`, from: passportId, to: originId, type: "linked_to", label: "linked to" });

    if (passport.linkedin_url) {
      const linkedInId = `linkedin-${passport.id}`;
      addNode(nodes, {
        id: linkedInId,
        label: "LinkedIn Profile",
        type: "linkedin_profile",
        detail: [passport.linkedin_claimed_role, passport.linkedin_claimed_company]
          .filter(Boolean)
          .join(" / ") || passport.linkedin_url,
      });
      addEdge(edges, { id: `edge-${linkedInId}-${subjectId}`, from: linkedInId, to: subjectId, type: "evidence_for", label: "evidence for" });
    }

    if (passport.linkedin_claimed_company) {
      const companyId = `company-${passport.linkedin_claimed_company.toLowerCase().replaceAll(" ", "-")}`;
      addNode(nodes, {
        id: companyId,
        label: passport.linkedin_claimed_company,
        type: "company",
        detail: "Claimed company",
      });
      addEdge(edges, { id: `edge-${subjectId}-${companyId}`, from: subjectId, to: companyId, type: "belongs_to", label: "belongs to" });
    }
  }

  for (const report of sources.trustReports ?? []) {
    const candidateId = `candidate-report-${report.id}`;
    addNode(nodes, {
      id: candidateId,
      label: report.candidate_name ?? "Candidate",
      type: "candidate",
      detail: "Hiring Shield report",
    });

    if (report.linkedin_url) {
      const linkedInId = `linkedin-report-${report.id}`;
      addNode(nodes, {
        id: linkedInId,
        label: "LinkedIn Profile",
        type: "linkedin_profile",
        detail: [report.linkedin_claimed_role, report.linkedin_claimed_company]
          .filter(Boolean)
          .join(" / ") || report.linkedin_url,
      });
      addEdge(edges, { id: `edge-${linkedInId}-${candidateId}`, from: linkedInId, to: candidateId, type: "evidence_for", label: "evidence for" });
    }
  }

  for (const item of sources.verificationCases ?? []) {
    const caseId = `case-${item.id}`;
    addNode(nodes, {
      id: caseId,
      label: item.subject_name ?? "Verification Case",
      type: "evidence",
      detail: item.status ?? "pending",
    });
  }

  for (const evidence of sources.evidenceFiles ?? []) {
    const evidenceId = `evidence-${evidence.id}`;
    addNode(nodes, {
      id: evidenceId,
      label: evidence.file_name ?? "Evidence file",
      type: "evidence",
      detail: evidence.media_type ?? "evidence",
    });

    if (evidence.verification_case_id) {
      addEdge(edges, {
        id: `edge-${evidenceId}-case-${evidence.verification_case_id}`,
        from: evidenceId,
        to: `case-${evidence.verification_case_id}`,
        type: "evidence_for",
        label: "evidence for",
      });
    }
  }

  for (const signal of sources.signals ?? []) {
    const signalId = `signal-${signal.id}`;
    addNode(nodes, {
      id: signalId,
      label: signal.event,
      type: "signal",
      detail: "Trust signal",
    });
  }

  for (const decision of sources.decisions ?? []) {
    const decisionId = `decision-${decision.id}`;
    addNode(nodes, {
      id: decisionId,
      label: decision.decision ?? "Decision",
      type: "decision",
      detail: decision.actor ?? "admin",
    });

    if (decision.verification_case_id) {
      addEdge(edges, {
        id: `edge-${decisionId}-case-${decision.verification_case_id}`,
        from: decisionId,
        to: `case-${decision.verification_case_id}`,
        type: decision.decision === "deny" ? "rejected_by" : "approved_by",
        label: decision.decision === "deny" ? "rejected by" : "approved by",
      });
    }
  }

  for (const auditLog of sources.auditLogs ?? []) {
    addNode(nodes, {
      id: `audit-${auditLog.id}`,
      label: auditLog.event_type,
      type: "audit_log",
      detail: auditLog.actor ?? "system",
    });
  }

  const graph = { nodes: [...nodes.values()], edges };

  return graph.nodes.length ? graph : createDemoGraph();
}

export function graphNodesByType(graph: TrustGraph, types: GraphNodeType[]) {
  return graph.nodes.filter((node) => types.includes(node.type));
}

export function graphEdgesForNode(graph: TrustGraph, nodeId: string) {
  return graph.edges.filter((edge) => edge.from === nodeId || edge.to === nodeId);
}
