import "server-only";

import { createOpenAIJsonResponse } from "@/lib/ai/openai";
import { buildEvidenceAllowlist, validateEvidenceCitations } from "@/lib/ai/evidence-grounding";

export type GovernanceSubjectType = "passport" | "agent";

export type GovernanceAnalysis = {
  title: string;
  explanation: string;
  source_reasoning: string[];
  operational_context: string;
  observations: string[];
  recommendations: string[];
  governance_boundary: string;
  citations: string[];
};

export type GovernanceContext = {
  subject_type: GovernanceSubjectType;
  subject_id: string;
  subject_label: string;
  verification_status?: string;
  evidence_count?: number;
  accepted_evidence_count?: number;
  decision_count?: number;
  audit_event_count?: number;
  signal_count?: number;
  unresolved_signal_count?: number;
  appeal_count?: number;
  trust_algorithm?: {
    score?: number | null;
    confidence_level?: string | null;
    explanation?: string | null;
    recommended_action?: string | null;
  } | null;
  recent_evidence?: string[];
  recent_decisions?: string[];
  recent_audit_events?: string[];
  recent_signals?: string[];
  recent_activity?: string[];
  permissions?: string[];
};

const governanceSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "title",
    "explanation",
    "source_reasoning",
    "operational_context",
    "observations",
    "recommendations",
    "governance_boundary",
    "citations",
  ],
  properties: {
    title: { type: "string" },
    explanation: { type: "string" },
    source_reasoning: {
      type: "array",
      items: { type: "string" },
      minItems: 1,
      maxItems: 6,
    },
    operational_context: { type: "string" },
    observations: {
      type: "array",
      items: { type: "string" },
      minItems: 1,
      maxItems: 6,
    },
    recommendations: {
      type: "array",
      items: { type: "string" },
      minItems: 1,
      maxItems: 6,
    },
    governance_boundary: { type: "string" },
    citations: {
      type: "array",
      items: { type: "string" },
      minItems: 1,
      maxItems: 12,
    },
  },
};

const instructions = [
  "You are the Cyber Sentinels AI Governance Assistant.",
  "AI assists. Humans decide.",
  "Analyze operational context and produce explainable recommendations only.",
  "Do not create trust decisions, scores, approvals, denials, bans, or hidden scoring logic.",
  "Focus on verification gaps, missing evidence, unresolved signals, operational risks, provenance gaps, and audit inconsistencies.",
  "Every output must include explanation, source reasoning, and operational context.",
  "Use only the supplied context. If context is missing, say what is missing.",
  "Citations must contain only exact references from the supplied evidence_allowlist.",
  "Recommended actions must be human-governance recommendations such as manual review, evidence upload, audit review, provenance review, or signal review.",
].join("\n");

function cleanList(values: unknown, fallback: string[]) {
  const list = Array.isArray(values) ? values.map((value) => String(value).trim()) : [];
  const cleaned = list.filter(Boolean).slice(0, 6);
  return cleaned.length ? cleaned : fallback;
}

function safeText(value: unknown, fallback: string) {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function safeRecommendation(value: string) {
  if (
    /\b(auto[- ]?(approve|reject|ban)|automatically (approve|reject|ban)|ban user|approve trust|reject passport|reject agent)\b/i.test(
      value
    )
  ) {
    return "Escalate to human governance review before any operational decision is made.";
  }

  return value;
}

export function governanceEvidenceAllowlist(context: GovernanceContext) {
  return buildEvidenceAllowlist(context as unknown as Record<string, unknown>);
}

export function normalizeGovernanceAnalysis(
  analysis: Partial<GovernanceAnalysis>,
  allowedCitations: string[] = [],
): GovernanceAnalysis {
  const citationValidation = validateEvidenceCitations(analysis.citations, allowedCitations);
  if (!citationValidation.valid) {
    throw new Error("AI governance output contained unsupported evidence citations.");
  }
  const citations = citationValidation.citations;
  return {
    title: safeText(analysis.title, "AI-assisted operational summary"),
    explanation: safeText(
      analysis.explanation,
      "The supplied operational record should be reviewed by a human governance owner."
    ),
    source_reasoning: cleanList(analysis.source_reasoning, [
      "Source reasoning is based only on the supplied operational records.",
    ]),
    operational_context: safeText(
      analysis.operational_context,
      "Operational context was limited in the supplied data."
    ),
    observations: cleanList(analysis.observations, [
      "Manual review recommended because operational context is limited.",
    ]),
    recommendations: cleanList(analysis.recommendations, [
      "Recommend human review before changing trust or access status.",
    ]).map(safeRecommendation),
    governance_boundary:
      "Cyber Sentinels uses AI-assisted analysis while maintaining human governance and explainable operational review.",
    citations,
  };
}

export function generateDeterministicGovernanceAnalysis(context: GovernanceContext): GovernanceAnalysis {
  const citations = governanceEvidenceAllowlist(context).slice(0, 12);
  const safeCitations = citations.length ? citations : ["context:subject_type"];
  const unresolved = Number(context.unresolved_signal_count ?? 0);
  const evidence = Number(context.evidence_count ?? 0);
  return {
    title: "Deterministic governance review",
    explanation: unresolved
      ? `${unresolved} unresolved signal(s) require accountable human review.`
      : "No unresolved signal count was supplied; the record remains subject to human governance review.",
    source_reasoning: [
      `${evidence} evidence record(s) were supplied to the bounded context.`,
      "No model-generated fact was used in this deterministic fallback.",
    ],
    operational_context: `${context.subject_type} governance record ${context.subject_label || "with no label"}.`,
    observations: unresolved ? ["Unresolved operational signals are present."] : ["No unresolved signal was established by the supplied counters."],
    recommendations: [unresolved ? "Request human review of unresolved signals and their source evidence." : "Confirm the evidence record before changing trust or access state."],
    governance_boundary: "Deterministic mode is active. This output is advisory, creates no evidence, and cannot approve, deny, or mutate trust.",
    citations: safeCitations,
  };
}

export async function generateGovernanceAnalysis(
  context: GovernanceContext
): Promise<GovernanceAnalysis> {
  const evidenceAllowlist = governanceEvidenceAllowlist(context);
  const analysis = await createOpenAIJsonResponse<GovernanceAnalysis>({
    instructions,
    input: JSON.stringify({ context, evidence_allowlist: evidenceAllowlist }, null, 2),
    schemaName: "cyber_sentinels_governance_analysis",
    schema: governanceSchema,
  });

  return normalizeGovernanceAnalysis(analysis, evidenceAllowlist);
}
