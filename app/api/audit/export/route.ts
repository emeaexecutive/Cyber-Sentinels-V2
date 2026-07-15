import {
  authenticatedTrustClient,
  apiError,
  loadWorkflowTrust,
  validReference,
} from "@/lib/operational-trust/api";
import { replayEngine } from "@/lib/core/replay-engine";
import {
  buildTrustEvidencePack,
  trustEvidencePackEnterpriseSummary,
  trustEvidencePackPdf,
  trustTransparencyText,
} from "@/lib/trust-transparency";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await authenticatedTrustClient();
  if ("response" in auth) return auth.response;
  const url = new URL(request.url);
  const workflowId = url.searchParams.get("workflow_id") ?? "";
  const subjectType = url.searchParams.get("subject_type") ?? undefined;
  const requestedFormat = url.searchParams.get("format");
  const allowedFormats = ["json", "text", "pack", "pack-json", "pack-pdf", "pack-summary"] as const;
  const format = allowedFormats.includes(requestedFormat as (typeof allowedFormats)[number])
    ? requestedFormat as (typeof allowedFormats)[number]
    : "json";
  if (!validReference(workflowId)) {
    return apiError("A valid workflow_id is required.", 400);
  }

  try {
    const trust = await loadWorkflowTrust(
      auth.supabase,
      workflowId,
      subjectType
    );
    const { report } = replayEngine.buildReplayTransparencyReport(trust);
    const pack = buildTrustEvidencePack(report);
    const packFormat = format === "pack" || format === "pack-json" || format === "pack-pdf" || format === "pack-summary";
    const filename = format === "pack-pdf"
      ? `cyber-sentinels-trust-evidence-pack-${workflowId}.pdf`
      : format === "pack-summary"
        ? `cyber-sentinels-enterprise-summary-${workflowId}.txt`
        : packFormat
          ? `cyber-sentinels-trust-evidence-pack-${workflowId}.json`
          : `cyber-sentinels-audit-${workflowId}.${format === "text" ? "txt" : "json"}`;
    const body = format === "pack-pdf"
      ? trustEvidencePackPdf(pack)
      : format === "pack-summary"
        ? trustEvidencePackEnterpriseSummary(pack)
        : format === "text"
          ? trustTransparencyText(report)
          : JSON.stringify(packFormat ? pack : report, null, 2);

    return new Response(body, {
      headers: {
        "Content-Type":
          format === "pack-pdf"
            ? "application/pdf"
            : format === "text" || format === "pack-summary"
            ? "text/plain; charset=utf-8"
            : "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch {
    return apiError("Audit export could not be generated.", 500);
  }
}
