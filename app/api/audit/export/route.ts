import {
  authenticatedTrustClient,
  apiError,
  loadWorkflowTrust,
  validReference,
} from "@/lib/operational-trust/api";
import { replayEngine } from "@/lib/core/replay-engine";
import { buildTrustEvidencePack, trustTransparencyText } from "@/lib/trust-transparency";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await authenticatedTrustClient();
  if ("response" in auth) return auth.response;
  const url = new URL(request.url);
  const workflowId = url.searchParams.get("workflow_id") ?? "";
  const subjectType = url.searchParams.get("subject_type") ?? undefined;
  const requestedFormat = url.searchParams.get("format");
  const format = requestedFormat === "text" || requestedFormat === "pack" ? requestedFormat : "json";
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
    const filename = format === "pack"
      ? `cyber-sentinels-trust-evidence-pack-${workflowId}.json`
      : `cyber-sentinels-audit-${workflowId}.${format === "text" ? "txt" : "json"}`;
    const body =
      format === "text"
        ? trustTransparencyText(report)
        : JSON.stringify(format === "pack" ? buildTrustEvidencePack(report) : report, null, 2);

    return new Response(body, {
      headers: {
        "Content-Type":
          format === "text"
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
