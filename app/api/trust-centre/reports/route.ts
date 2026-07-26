import { NextResponse } from "next/server";
import {
  trustCentreContext,
  trustCentreCorrelationId,
  trustCentreFailure,
} from "@/src/lib/trust-centre/http";
import { enterpriseTrustCentreRepository } from "@/src/lib/trust-centre/repository";
import {
  reportRows,
  rowsToCsv,
  rowsToPdf,
  trustCentreReportFormats,
  trustCentreReportTypes,
  type TrustCentreReportFormat,
  type TrustCentreReportType,
} from "@/src/lib/trust-centre/reporting";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const correlationId = trustCentreCorrelationId(request);
  try {
    const auth = await trustCentreContext(request, "export");
    const url = new URL(request.url);
    const report = String(url.searchParams.get("report") ?? "trust-summary");
    const format = String(url.searchParams.get("format") ?? "json");
    if (!trustCentreReportTypes.includes(report as TrustCentreReportType)) {
      throw Object.assign(new Error("Report type is unsupported."), {
        status: 400,
        code: "REPORT_TYPE_INVALID",
      });
    }
    if (!trustCentreReportFormats.includes(format as TrustCentreReportFormat)) {
      throw Object.assign(new Error("Report format is unsupported."), {
        status: 400,
        code: "REPORT_FORMAT_INVALID",
      });
    }
    const workspace = await auth.supabase
      .from("trust_workspaces")
      .select("name")
      .eq("id", auth.enterpriseId)
      .maybeSingle();
    if (workspace.error) throw workspace.error;
    const snapshot = await enterpriseTrustCentreRepository().snapshot(
      auth.enterpriseId,
      String(workspace.data?.name ?? "Enterprise workspace"),
      auth.trustCentreRole,
      200
    );
    const selected = reportRows(snapshot, report as TrustCentreReportType);
    const filename = `cyber-sentinels-${report}-${snapshot.generatedAt.slice(0, 10)}`;
    const headers = {
      "cache-control": "private, no-store",
      "content-disposition": `attachment; filename="${filename}.${format}"`,
      "x-correlation-id": correlationId,
      "x-content-type-options": "nosniff",
    };
    if (format === "csv") {
      return new NextResponse(rowsToCsv(selected), {
        status: 200,
        headers: { ...headers, "content-type": "text/csv; charset=utf-8" },
      });
    }
    if (format === "pdf") {
      return new NextResponse(rowsToPdf(report, snapshot, selected), {
        status: 200,
        headers: { ...headers, "content-type": "application/pdf" },
      });
    }
    return NextResponse.json(
      {
        schemaVersion: "enterprise-trust-centre-report-v1",
        report,
        generatedAt: snapshot.generatedAt,
        organisation: snapshot.organisation,
        records: selected,
      },
      {
        status: 200,
        headers: { ...headers, "content-type": "application/json; charset=utf-8" },
      }
    );
  } catch (error) {
    return trustCentreFailure(error, correlationId);
  }
}
