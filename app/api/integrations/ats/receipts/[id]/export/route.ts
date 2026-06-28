import { NextResponse } from "next/server";
import { requireAdminApiAccess } from "@/lib/auth/isAdmin";
import { getATSProvider } from "@/lib/integrations/ats";
import { buildATSTrustReceiptExport } from "@/lib/integrations/ats/receipt-export";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { createClient } from "@/lib/supabase/server";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const admin = await requireAdminApiAccess(request, supabase);
  if (!admin.ok) return admin.response;

  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const providerId =
    typeof body.provider === "string" ? body.provider.trim().toLowerCase() : "";
  const provider = getATSProvider(providerId);
  if (!provider) {
    return NextResponse.json({ error: "Unsupported ATS provider." }, { status: 400 });
  }
  if (provider.definition.status !== "Connected") {
    return NextResponse.json(
      {
        error: "ATS provider is not connected.",
        provider: provider.definition.id,
        status: provider.definition.status,
      },
      { status: 409 }
    );
  }

  const adminSupabase = createServiceRoleClient();
  const { data: receipt, error } = await adminSupabase
    .from("verification_receipts")
    .select("id,subject_id,verification_status,receipt_summary,issued_at")
    .eq("id", id)
    .maybeSingle();
  if (error || !receipt) {
    return NextResponse.json({ error: "Verification receipt was not found." }, { status: 404 });
  }

  const { data: replay } = await adminSupabase
    .from("trust_replay_sessions")
    .select("id,subject_id")
    .eq("subject_id", receipt.subject_id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.APP_URL ??
    process.env.VERCEL_PROJECT_PRODUCTION_URL ??
    "";

  let payload;
  try {
    payload = buildATSTrustReceiptExport({
      appUrl,
      workflowReference:
        typeof body.workflowReference === "string" && body.workflowReference.trim()
          ? body.workflowReference.trim()
          : String(receipt.subject_id ?? ""),
      candidateReference:
        typeof body.candidateReference === "string"
          ? body.candidateReference.trim() || null
          : null,
      trustPosture:
        typeof body.trustPosture === "string"
          ? body.trustPosture.trim() || "recorded"
          : "recorded",
      governanceState:
        typeof body.governanceState === "string"
          ? body.governanceState.trim() || "reviewable"
          : "reviewable",
      receipt,
      replay,
    });
  } catch (payloadError) {
    return NextResponse.json(
      {
        error:
          payloadError instanceof Error
            ? payloadError.message
            : "ATS receipt export could not be prepared.",
      },
      { status: 422 }
    );
  }

  const result = await provider.exportTrustReceipt(payload);
  const adminActor = admin.user.email ?? admin.user.id;
  const exportedAt = new Date().toISOString();
  const audit = await adminSupabase.from("audit_logs").insert({
    event_type: "ats_trust_receipt_export",
    actor: adminActor,
    metadata: {
      ats_provider: provider.definition.id,
      receipt_id: receipt.id,
      replay_id: replay?.id ?? null,
      workflow_reference: payload.workflowReference,
      delivered: result.delivered,
      delivery_status_code: result.statusCode ?? null,
      credentials_exposed: false,
    },
    created_at: exportedAt,
  });
  if (audit.error) {
    return NextResponse.json(
      { error: "ATS receipt export audit event could not be recorded." },
      { status: 500 }
    );
  }

  return NextResponse.json(
    {
      schemaVersion: 1,
      generatedAt: exportedAt,
      data: result,
      links: {
        receipt: payload.receiptUrl,
        replay: payload.replayUrl,
      },
      safeguards: {
        existingReceiptRequired: true,
        credentialsExposed: false,
        rawProviderOutputReturned: false,
      },
    },
    { status: result.delivered ? 200 : 502 }
  );
}
