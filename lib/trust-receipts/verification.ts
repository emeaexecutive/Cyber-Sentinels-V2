type ReceiptRecord = {
  id?: unknown;
  subject_type?: unknown;
  subject_id?: unknown;
  issued_at?: unknown;
  verification_status?: unknown;
  issued_by?: unknown;
};

type LinkedRecord = {
  subject_type?: unknown;
  subject_id?: unknown;
  assigned_to?: unknown;
  resolved_by?: unknown;
  created_by?: unknown;
};

export type ReceiptContinuityCheck = {
  id: "receipt_integrity" | "replay_linkage" | "workflow_chronology" | "governance_attribution";
  label: string;
  state: "verified" | "review_required";
  explanation: string;
};

export type PortableTrustEvidence = {
  schemaVersion: 1;
  receiptId: string;
  workflowReference: string;
  replayReference: string;
  providerEvidenceSummary: string;
  trustPostureSnapshot: string;
  governanceOutcome: string;
  authorizationLineageSummary: string;
  issuedAt: string | null;
};

export function buildPortableTrustEvidence(input: {
  receiptId: string;
  subjectType: string;
  subjectId: string;
  providerSignalCount: number;
  trustPosture: string;
  governanceOutcome: string;
  authorizationRelationshipCount: number;
  issuedAt?: string | null;
  replayReference?: string | null;
}): PortableTrustEvidence {
  return {
    schemaVersion: 1,
    receiptId: input.receiptId,
    workflowReference: `${input.subjectType}/${input.subjectId}`,
    replayReference: input.replayReference ?? "not_available",
    providerEvidenceSummary: `${input.providerSignalCount} normalized provider signal(s)`,
    trustPostureSnapshot: input.trustPosture,
    governanceOutcome: input.governanceOutcome,
    authorizationLineageSummary: input.authorizationRelationshipCount
      ? `${input.authorizationRelationshipCount} linked authorization or workflow relationship(s)`
      : `${input.subjectType} authority retained in replay`,
    issuedAt: input.issuedAt ?? null,
  };
}

export function verifyReceiptContinuity(input: {
  receipt: ReceiptRecord;
  timeline: LinkedRecord[];
  evidenceChains: LinkedRecord[];
  governanceActions: LinkedRecord[];
  replaySessions: LinkedRecord[];
}) {
  const subjectType = String(input.receipt.subject_type ?? "");
  const subjectId = String(input.receipt.subject_id ?? "");
  const sameSubject = (row: LinkedRecord) =>
    (!row.subject_type || String(row.subject_type) === subjectType) &&
    String(row.subject_id ?? "") === subjectId;
  const receiptComplete = Boolean(
    input.receipt.id &&
      subjectType &&
      subjectId &&
      input.receipt.issued_at &&
      input.receipt.verification_status
  );
  const replayLinked =
    input.replaySessions.some(sameSubject) ||
    input.timeline.some(sameSubject);
  const chronologyLinked =
    input.timeline.some(sameSubject) &&
    input.evidenceChains.some(sameSubject);
  const attributedGovernance =
    input.governanceActions.length === 0 ||
    input.governanceActions.some(
      (row) =>
        sameSubject(row) &&
        Boolean(row.resolved_by ?? row.assigned_to ?? row.created_by)
    );

  const checks: ReceiptContinuityCheck[] = [
    {
      id: "receipt_integrity",
      label: "Receipt record integrity",
      state: receiptComplete ? "verified" : "review_required",
      explanation: receiptComplete
        ? "Receipt identity, workflow subject, issuance time and outcome are present."
        : "One or more required receipt fields are missing.",
    },
    {
      id: "replay_linkage",
      label: "Replay linkage",
      state: replayLinked ? "verified" : "review_required",
      explanation: replayLinked
        ? "Replay or timeline records resolve to the same workflow subject."
        : "No replay chronology is linked to this workflow subject yet.",
    },
    {
      id: "workflow_chronology",
      label: "Workflow chronology",
      state: chronologyLinked ? "verified" : "review_required",
      explanation: chronologyLinked
        ? "Timeline events and evidence chains resolve to the receipt workflow."
        : "Timeline or evidence continuity requires review.",
    },
    {
      id: "governance_attribution",
      label: "Governance attribution",
      state: attributedGovernance ? "verified" : "review_required",
      explanation:
        input.governanceActions.length === 0
          ? "No governance intervention is attached to this receipt."
          : attributedGovernance
            ? "A linked governance action retains reviewer attribution."
            : "Governance action exists without reviewer attribution.",
    },
  ];

  return {
    state: checks.every((check) => check.state === "verified")
      ? ("verified" as const)
      : ("review_required" as const),
    checks,
  };
}
