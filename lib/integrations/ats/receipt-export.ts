import "server-only";

import type { ATSTrustReceiptExport } from "@/lib/integrations/ats/types";

type ReceiptRecord = {
  id: string;
  subject_id?: string | null;
  verification_status?: string | null;
  receipt_summary?: string | null;
  issued_at?: string | null;
};

type ReplayRecord = {
  id: string;
  subject_id?: string | null;
};

function originFrom(value: string) {
  if (!value) return "";
  const candidate = value.startsWith("http") ? value : `https://${value}`;
  return new URL(candidate).origin;
}

export function buildATSTrustReceiptExport(input: {
  appUrl: string;
  workflowReference: string;
  candidateReference?: string | null;
  trustPosture: string;
  governanceState: string;
  receipt: ReceiptRecord;
  replay?: ReplayRecord | null;
}): ATSTrustReceiptExport {
  const origin = originFrom(input.appUrl);
  if (!origin || !input.receipt.id || !input.workflowReference) {
    throw new Error("A real application URL, workflow and receipt are required.");
  }

  return {
    workflowReference: input.workflowReference,
    candidateReference: input.candidateReference ?? null,
    verificationState: input.receipt.verification_status ?? "recorded",
    trustPosture: input.trustPosture,
    receiptReference: input.receipt.id,
    receiptUrl: `${origin}/verification/receipt/${input.receipt.id}`,
    replayReference: input.replay?.id ?? null,
    replayUrl: input.replay?.id ? `${origin}/replay/${input.replay.id}` : null,
    governanceState: input.governanceState,
    evidenceSummary:
      input.receipt.receipt_summary ??
      "Verification receipt generated from recorded workflow evidence.",
    generatedAt: new Date().toISOString(),
  };
}
