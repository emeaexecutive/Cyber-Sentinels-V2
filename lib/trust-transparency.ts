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
  providerParticipation: Array<{
    provider: string;
    state: string;
    summary: string;
    evidenceReferences: string[];
  }>;
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
    providerParticipation: report.decisionExplanation.providerSignals,
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

function trustEvidencePackLines(pack: TrustEvidencePack, enterpriseSummary = false) {
  const lines = [
    "CYBER SENTINELS TRUST EVIDENCE PACK",
    enterpriseSummary ? "Enterprise Summary" : "Portable decision evidence",
    `Workflow: ${pack.workflow.subjectType} / ${pack.workflow.subjectId}`,
    `Decision posture: ${pack.decision.posture.label ?? pack.decision.posture.state ?? "not recorded"}`,
    `What changed: ${pack.decision.whatChanged}`,
    `Why: ${pack.decision.why}`,
    "",
    `Evidence: ${pack.evidence.references.length} reference(s); ${pack.evidence.continuityRecords} continuity record(s)`,
    `Replay: ${pack.replay.reference ?? "not recorded"}; ${pack.replay.chronologyRecords} chronology record(s)`,
    `Trust Memory: ${pack.trustMemory.state}; ${pack.trustMemory.references.length} reference(s)`,
    `Authority: ${pack.authority.lineage.length} lineage reference(s); human review authoritative`,
    `Provider participation: ${pack.providerParticipation.length} provider signal(s)`,
  ];

  if (!enterpriseSummary) {
    lines.push(
      "",
      "Evidence references",
      ...(pack.evidence.references.length ? pack.evidence.references.map((item) => `- ${item}`) : ["- none recorded"]),
      "",
      "Provider participation",
      ...(pack.providerParticipation.length
        ? pack.providerParticipation.map((item) => `- ${item.provider}: ${item.state} / ${item.summary}`)
        : ["- no provider participation recorded"]),
      "",
      "Authority lineage",
      ...(pack.authority.lineage.length ? pack.authority.lineage.map((item) => `- ${item}`) : ["- none recorded"]),
      "",
      "Governance",
      ...(pack.governance.escalationPath.length ? pack.governance.escalationPath.map((item) => `- ${item}`) : ["- no escalation recorded"]),
    );
  }

  lines.push(
    "",
    "Operational limitations",
    ...pack.operationalLimitations.map((item) => `- ${item}`),
    `- ${pack.trustMemory.limitation}`,
  );
  return lines;
}

export function trustEvidencePackEnterpriseSummary(pack: TrustEvidencePack) {
  return trustEvidencePackLines(pack, true).join("\n");
}

function pdfSafe(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[^\x20-\x7E]/g, "-")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

function wrapPdfLine(value: string, max = 92) {
  if (value.length <= max) return [value];
  const words = value.split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    if (`${current} ${word}`.trim().length > max && current) {
      lines.push(current);
      current = word;
    } else {
      current = `${current} ${word}`.trim();
    }
  }
  if (current) lines.push(current);
  return lines;
}

export function trustEvidencePackPdf(pack: TrustEvidencePack) {
  const lines = trustEvidencePackLines(pack).flatMap((line) => wrapPdfLine(pdfSafe(line)));
  const pages = Array.from({ length: Math.max(1, Math.ceil(lines.length / 48)) }, (_, index) =>
    lines.slice(index * 48, (index + 1) * 48)
  );
  const fontId = 3 + pages.length * 2;
  const objects = new Map<number, string>();
  objects.set(1, "<< /Type /Catalog /Pages 2 0 R >>");
  objects.set(2, `<< /Type /Pages /Kids [${pages.map((_, index) => `${3 + index * 2} 0 R`).join(" ")}] /Count ${pages.length} >>`);
  pages.forEach((page, index) => {
    const pageId = 3 + index * 2;
    const contentId = pageId + 1;
    const content = [
      "BT",
      "/F1 10 Tf",
      "48 794 Td",
      "14 TL",
      ...page.map((line) => `(${line}) Tj T*`),
      "ET",
    ].join("\n");
    objects.set(pageId, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 842] /Resources << /Font << /F1 ${fontId} 0 R >> >> /Contents ${contentId} 0 R >>`);
    objects.set(contentId, `<< /Length ${Buffer.byteLength(content, "ascii")} >>\nstream\n${content}\nendstream`);
  });
  objects.set(fontId, "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [0];
  for (let id = 1; id <= fontId; id += 1) {
    offsets[id] = Buffer.byteLength(pdf, "ascii");
    pdf += `${id} 0 obj\n${objects.get(id)}\nendobj\n`;
  }
  const xref = Buffer.byteLength(pdf, "ascii");
  pdf += `xref\n0 ${fontId + 1}\n0000000000 65535 f \n`;
  for (let id = 1; id <= fontId; id += 1) pdf += `${String(offsets[id]).padStart(10, "0")} 00000 n \n`;
  pdf += `trailer\n<< /Size ${fontId + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(pdf, "ascii");
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
