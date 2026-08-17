import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  CanonicalTransactionError,
  loadCanonicalTrustTransactionHistory,
} from "@/lib/trust-transaction/server";
import { loadProtectedWorkflowReceiptContext } from "@/lib/protected-workflows/server";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ transactionId: string }> },
) {
  const { transactionId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { ok: false, error: "AUTHENTICATION_REQUIRED" },
      { status: 401, headers: { "cache-control": "private, no-store" } },
    );
  }

  try {
    const { receipt } = await loadCanonicalTrustTransactionHistory({
      supabase,
      user,
      transactionId,
    });
    const protectedWorkflow = await loadProtectedWorkflowReceiptContext(receipt.enterpriseId, receipt.transactionId);
    const portableReceipt = {
      receiptVersion: "canonical-trust-transaction-v1",
      transactionId: receipt.transactionId,
      entity: {
        operationalEntityId: receipt.operationalEntityId,
        type: receipt.entityType,
        accountableOwnerId: receipt.accountableOwnerId,
      },
      decision: receipt.decision,
      trustState: receipt.trustState,
      timestamp: receipt.timestamp,
      action: receipt.action,
      reasonCodes: receipt.reasonCodes,
      evidenceReferences: receipt.evidence.map((item) => ({
        reference: item.reference,
        type: item.type,
        sourceDigest: item.sourceDigest,
      })),
      authorityReference: receipt.authorityReference,
      delegationReference: receipt.authorityLineageReferences.find((item) => item.type === "authority_delegation")?.id ?? null,
      parentAuthorityReference: receipt.authorityLineageReferences.find((item) => item.type === "parent_authority")?.id ?? null,
      policy: receipt.policy,
      decisionDigest: receipt.digest,
      evidenceGraphReference: receipt.evidenceGraphReference,
      replayReference: receipt.replayReference,
      trustMemoryReference: receipt.trustMemoryReference,
      protectedWorkflow,
    };
    return NextResponse.json(portableReceipt, {
      headers: {
        "cache-control": "private, no-store",
        "content-disposition": `attachment; filename="cyber-sentinels-${receipt.transactionId}.json"`,
        "x-content-type-options": "nosniff",
      },
    });
  } catch (error) {
    if (error instanceof CanonicalTransactionError) {
      return NextResponse.json(
        { ok: false, error: error.code },
        { status: error.status, headers: { "cache-control": "private, no-store" } },
      );
    }
    console.error("Portable transaction receipt failed safely.", {
      code: (error as { code?: string })?.code ?? "UNKNOWN",
    });
    return NextResponse.json(
      { ok: false, error: "RECEIPT_UNAVAILABLE" },
      { status: 503, headers: { "cache-control": "private, no-store" } },
    );
  }
}
