import {
  authenticatedTrustClient,
  apiError,
  loadWorkflowTrust,
  validReference,
} from "@/lib/operational-trust/api";
import {
  buildTrustTransparencyReport,
  trustTransparencyText,
} from "@/lib/trust-transparency";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await authenticatedTrustClient();
  if ("response" in auth) return auth.response;
  const url = new URL(request.url);
  const workflowId = url.searchParams.get("workflow_id") ?? "";
  const subjectType = url.searchParams.get("subject_type") ?? undefined;
  const format = url.searchParams.get("format") === "text" ? "text" : "json";
  if (!validReference(workflowId)) {
    return apiError("A valid workflow_id is required.", 400);
  }

  try {
    const trust = await loadWorkflowTrust(
      auth.supabase,
      workflowId,
      subjectType
    );
    const report = buildTrustTransparencyReport(trust);
    const filename = `cyber-sentinels-audit-${workflowId}.${format === "text" ? "txt" : "json"}`;
    const body =
      format === "text"
        ? trustTransparencyText(report)
        : JSON.stringify(report, null, 2);

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
