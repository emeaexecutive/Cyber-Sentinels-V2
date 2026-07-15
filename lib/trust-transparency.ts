export type TransparencyRow = Record<string, any>;

export type TrustTransparencyInput = {
  workflow: { subjectType: string; subjectId: string };
  posture: {
    state?: string;
    label?: string;
    explanation?: string;
    nextReview?: string;
  };
  explanation: {
    whatChanged?: string;
    why?: string;
    evidenceContribution?: string;
    governanceImpact?: string;
  };
  providerEvidence: {
    providers?: Array<{
      providerId?: string;
      providerName?: string;
      verificationState?: string;
      evidenceReferences?: string[];
      summary?: string;
    }>;
    evidenceReferences?: string[];
  };
  evidenceContinuity: TransparencyRow[];
  chronology: TransparencyRow[];
  governanceLineage: TransparencyRow[];
  replay: {
    reference: string | null;
    sessions: TransparencyRow[];
    supportedEvidenceLineage?: string[];
  };
  receipts: TransparencyRow[];
};

export type TrustTransparencyReport = {
  schemaVersion: 1;
  workflow: TrustTransparencyInput["workflow"];
  scoringMethod: typeof TRUST_SCORING_TRANSPARENCY;
  decisionExplanation: {
    whatChanged: string;
    whyTrustShifted: string;
    evidenceContributed: string[];
    governanceActions: Array<{
      action: string;
      reviewer: string;
      owner: string;
      resolution: string;
      occurredAt: string;
    }>;
    providerSignals: Array<{
      provider: string;
      state: string;
      summary: string;
      evidenceReferences: string[];
    }>;
  };
  auditability: {
    evidenceContinuityCount: number;
    chronologyCount: number;
    governanceInterventionCount: number;
    replaySessionCount: number;
    receiptCount: number;
    replayReference: string | null;
    authorizationLineage: string[];
    trustMemoryReferences: string[];
    escalationPath: string[];
    resolutionSummaries: string[];
  };
  posture: TrustTransparencyInput["posture"];
  boundary: string;
};

export type TrustEvidencePack = {
  schemaVersion: 1;
  kind: "cyber_sentinels_trust_evidence_pack";
  audience: readonly ["Auditors", "CISOs", "Compliance", "Investigations"];
  workflow: TrustTransparencyReport["workflow"];
  decision: {
    posture: TrustTransparencyReport["posture"];
    whatChanged: string;
    why: string;
    scoringMethod: TrustTransparencyReport["scoringMethod"];
  };
  evidence: {
    references: string[];
    providerSignals: TrustTransparencyReport["decisionExplanation"]["providerSignals"];
    continuityRecords: number;
  };
  authority: {
    lineage: string[];
    humanReviewRemainsAuthoritative: true;
  };
  replay: { reference: string | null; chronologyRecords: number };
  trustMemory: { references: string[]; state: string; limitation: string };
  governance: {
    actions: TrustTransparencyReport["decisionExplanation"]["governanceActions"];
    escalationPath: string[];
  };
  operationalLimitations: string[];
};

export const TRUST_SCORING_TRANSPARENCY = {
  method: "deterministic_workflow_review",
  inputs: [
    "identity and provider evidence",
    "session integrity",
    "evidence completeness",
    "governance review state",
    "authorization lineage",
    "replay continuity",
    "workflow anomalies",
  ],
  outputMeaning:
    "A reviewable workflow posture and routing context, not truth or biometric certainty.",
  humanReviewRemainsAuthoritative: true,
  standaloneDeepfakeVerdict: false,
  biometricCertainty: false,
  surveillance: false,
} as const;

function stringValue(value: unknown, fallback: string) {
  if (value === null || value === undefined || value === "") return fallback;
  return String(value);
}

function metadata(row: TransparencyRow) {
  return row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata)
    ? (row.metadata as Record<string, unknown>)
    : {};
}

function unique(values: Array<string | null | undefined>) {
  return [...new Set(values.filter((value): value is string => Boolean(value)))];
}

function evidenceReferences(input: TrustTransparencyInput) {
  return unique([
    ...(input.providerEvidence.evidenceReferences ?? []),
    ...input.evidenceContinuity.flatMap((row) => {
      const meta = metadata(row);
      return [
        row.id ? `evidence:${row.id}` : null,
        row.chain_summary ? String(row.chain_summary) : null,
        meta.evidence_reference ? String(meta.evidence_reference) : null,
      ];
    }),
    ...input.chronology.flatMap((row) => {
      const meta = metadata(row);
      return [
        row.id ? `chronology:${row.id}` : null,
        meta.evidence_reference ? String(meta.evidence_reference) : null,
      ];
    }),
  ]);
}

export function buildTrustTransparencyReport(
  input: TrustTransparencyInput
): TrustTransparencyReport {
  const governanceActions = input.governanceLineage.map((row) => ({
    action: stringValue(
      row.action_status ?? row.action_type ?? row.decision,
      "governance action recorded"
    ),
    reviewer: stringValue(
      row.reviewer_name ?? row.reviewer_email ?? row.reviewed_by,
      "Reviewer not recorded"
    ),
    owner: stringValue(row.assigned_to ?? row.owner_name, "Owner not recorded"),
    resolution: stringValue(
      row.resolution_notes ?? row.notes,
      "Resolution summary not recorded"
    ),
    occurredAt: stringValue(
      row.resolved_at ?? row.created_at,
      "Time not recorded"
    ),
  }));
  const providerSignals = (input.providerEvidence.providers ?? []).map(
    (provider) => ({
      provider: stringValue(
        provider.providerName ?? provider.providerId,
        "Attributed provider"
      ),
      state: stringValue(provider.verificationState, "not recorded"),
      summary: stringValue(
        provider.summary,
        "Provider signal retained without additional summary."
      ),
      evidenceReferences: provider.evidenceReferences ?? [],
    })
  );
  const authorizationLineage = unique(
    input.chronology.flatMap((row) => {
      const meta = metadata(row);
      return [
        row.authorization_lineage
          ? String(row.authorization_lineage)
          : null,
        meta.authorization_lineage
          ? String(meta.authorization_lineage)
          : null,
        row.actor_id ? `actor:${row.actor_id}` : null,
      ];
    })
  );
  const trustMemoryReferences = unique(
    input.chronology.flatMap((row) => {
      const meta = metadata(row);
      return [
        row.trust_memory_reference ? String(row.trust_memory_reference) : null,
        meta.trust_memory_reference ? String(meta.trust_memory_reference) : null,
        meta.trust_memory_event_id ? String(meta.trust_memory_event_id) : null,
      ];
    })
  );

  return {
    schemaVersion: 1,
    workflow: input.workflow,
    scoringMethod: TRUST_SCORING_TRANSPARENCY,
    decisionExplanation: {
      whatChanged: stringValue(
        input.explanation.whatChanged,
        "No trust-state transition is recorded."
      ),
      whyTrustShifted: stringValue(
        input.explanation.why,
        "No trust-shift explanation is recorded."
      ),
      evidenceContributed: evidenceReferences(input),
      governanceActions,
      providerSignals,
    },
    auditability: {
      evidenceContinuityCount: input.evidenceContinuity.length,
      chronologyCount: input.chronology.length,
      governanceInterventionCount: input.governanceLineage.length,
      replaySessionCount: input.replay.sessions.length,
      receiptCount: input.receipts.length,
      replayReference: input.replay.reference,
      authorizationLineage,
      trustMemoryReferences,
      escalationPath: governanceActions.map(
        (action) => `${action.action} / ${action.owner}`
      ),
      resolutionSummaries: governanceActions.map(
        (action) => `${action.reviewer}: ${action.resolution}`
      ),
    },
    posture: input.posture,
    boundary:
      "This report explains recorded workflow evidence and governance history. It does not guarantee authenticity, fraud detection, biometric certainty or regulatory compliance.",
  };
}

export function buildTrustEvidencePack(report: TrustTransparencyReport): TrustEvidencePack {
  const memoryState = report.posture.label ?? report.posture.state ?? "not recorded";
  return {
    schemaVersion: 1,
    kind: "cyber_sentinels_trust_evidence_pack",
    audience: ["Auditors", "CISOs", "Compliance", "Investigations"],
    workflow: report.workflow,
    decision: {
      posture: report.posture,
      whatChanged: report.decisionExplanation.whatChanged,
      why: report.decisionExplanation.whyTrustShifted,
      scoringMethod: report.scoringMethod,
    },
    evidence: {
      references: report.decisionExplanation.evidenceContributed,
      providerSignals: report.decisionExplanation.providerSignals,
      continuityRecords: report.auditability.evidenceContinuityCount,
    },
    authority: {
      lineage: report.auditability.authorizationLineage,
      humanReviewRemainsAuthoritative: true,
    },
    replay: {
      reference: report.auditability.replayReference,
      chronologyRecords: report.auditability.chronologyCount,
    },
    trustMemory: {
      references: report.auditability.trustMemoryReferences,
      state: memoryState,
      limitation: report.auditability.trustMemoryReferences.length
        ? "References identify recorded Trust Memory events; they do not imply autonomous learning."
        : "No standalone Trust Memory reference is recorded in this report; absence remains explicit.",
    },
    governance: {
      actions: report.decisionExplanation.governanceActions,
      escalationPath: report.auditability.escalationPath,
    },
    operationalLimitations: [
      report.boundary,
      "The pack contains recorded references and summaries, not raw provider payloads or secret values.",
      "Missing evidence, authority, Replay or Trust Memory references remain missing and must not be inferred.",
    ],
  };
}

export function trustTransparencyText(report: TrustTransparencyReport) {
  const lines = [
    "Cyber Sentinels Trust Transparency Report",
    `Workflow: ${report.workflow.subjectType} / ${report.workflow.subjectId}`,
    `Posture: ${report.posture.label ?? report.posture.state ?? "not recorded"}`,
    "",
    "What changed",
    report.decisionExplanation.whatChanged,
    "",
    "Why trust shifted",
    report.decisionExplanation.whyTrustShifted,
    "",
    "Evidence contributed",
    ...(report.decisionExplanation.evidenceContributed.length
      ? report.decisionExplanation.evidenceContributed.map((item) => `- ${item}`)
      : ["- No evidence reference recorded"]),
    "",
    "Governance history",
    ...(report.decisionExplanation.governanceActions.length
      ? report.decisionExplanation.governanceActions.map(
          (item) =>
            `- ${item.action} / reviewer: ${item.reviewer} / owner: ${item.owner} / resolution: ${item.resolution}`
        )
      : ["- No governance action recorded"]),
    "",
    "Provider evidence",
    ...(report.decisionExplanation.providerSignals.length
      ? report.decisionExplanation.providerSignals.map(
          (item) => `- ${item.provider}: ${item.state} / ${item.summary}`
        )
      : ["- No provider signal recorded"]),
    "",
    "Replay and continuity",
    `- Replay reference: ${report.auditability.replayReference ?? "not recorded"}`,
    `- Chronology records: ${report.auditability.chronologyCount}`,
    `- Evidence continuity records: ${report.auditability.evidenceContinuityCount}`,
    `- Governance interventions: ${report.auditability.governanceInterventionCount}`,
    `- Receipts: ${report.auditability.receiptCount}`,
    "",
    report.boundary,
  ];

  return lines.join("\n");
}
