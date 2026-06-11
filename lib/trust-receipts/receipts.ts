import type { SupabaseClient } from "@supabase/supabase-js";

type ReceiptInput = {
  subjectType: string;
  subjectId: string;
  receiptType: string;
  verificationStatus: string;
  confidenceLevel: string;
  issuedBy?: string | null;
  expiresAt?: string | null;
  receiptSummary: string;
  evidenceSnapshot?: Record<string, unknown>;
};

type EvidenceChainInput = {
  subjectType: string;
  subjectId: string;
  chainSummary: string;
  evidence?: Array<Record<string, unknown>>;
};

export function verificationReceiptType(
  baseType: string,
  status: string,
  pendingType: string
) {
  return ["verified", "approved", "completed"].includes(status.toLowerCase())
    ? baseType
    : pendingType;
}

export function receiptConfidence(status: string, riskLevel?: string | null) {
  const normalizedStatus = status.toLowerCase();
  const normalizedRisk = String(riskLevel ?? "").toLowerCase();

  if (["verified", "approved", "completed"].includes(normalizedStatus)) {
    return normalizedRisk === "high" ? "Verified with Review" : "High Trust";
  }

  if (["high", "escalated", "needs_review"].includes(normalizedRisk)) {
    return "Elevated Risk";
  }

  return "In Review";
}

export async function createEvidenceChain(
  supabase: SupabaseClient,
  input: EvidenceChainInput
) {
  const result = await supabase.from("evidence_chains").insert({
    subject_type: input.subjectType,
    subject_id: input.subjectId,
    chain_summary: input.chainSummary,
    evidence: input.evidence ?? [],
  });

  if (result.error) {
    console.warn("Evidence chain insert failed", result.error);
  }

  return result;
}

export async function createVerificationReceipt(
  supabase: SupabaseClient,
  input: ReceiptInput
) {
  const existing = await supabase
    .from("verification_receipts")
    .select("id")
    .eq("subject_type", input.subjectType)
    .eq("subject_id", input.subjectId)
    .eq("receipt_type", input.receiptType)
    .maybeSingle();

  if (existing.data?.id) {
    return existing;
  }

  const result = await supabase.from("verification_receipts").insert({
    subject_type: input.subjectType,
    subject_id: input.subjectId,
    receipt_type: input.receiptType,
    verification_status: input.verificationStatus,
    confidence_level: input.confidenceLevel,
    issued_by: input.issuedBy ?? null,
    expires_at: input.expiresAt ?? null,
    receipt_summary: input.receiptSummary,
    evidence_snapshot: input.evidenceSnapshot ?? {},
  });

  if (result.error) {
    console.warn("Verification receipt insert failed", result.error);
  }

  return result;
}

export async function createReceiptBundle(
  supabase: SupabaseClient,
  input: ReceiptInput & EvidenceChainInput
) {
  await createEvidenceChain(supabase, input);
  return createVerificationReceipt(supabase, input);
}
