import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAuditLog } from "@/lib/trust-engine/createAuditLog";
import { createSignal } from "@/lib/trust-engine/createSignal";
import {
  complianceReportTypes,
  createComplianceReport,
  type ComplianceReportType,
} from "@/lib/trust-engine/complianceExport";

function getRequiredText(body: Record<string, unknown>, field: string) {
  const value = body[field];

  if (typeof value !== "string" || !value.trim() || value.length > 180) {
    throw new Error("Invalid input");
  }

  return value.trim();
}

function getAllowed<T extends readonly string[]>(
  body: Record<string, unknown>,
  field: string,
  allowed: T
) {
  const value = body[field];

  if (typeof value !== "string" || !allowed.includes(value)) {
    throw new Error("Invalid input");
  }

  return value as T[number];
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as Record<
      string,
      unknown
    > | null;

    if (!body) {
      return NextResponse.json(
        { ok: false, error: "Invalid export request" },
        { status: 400 }
      );
    }

    const reportType = getAllowed(
      body,
      "report_type",
      complianceReportTypes
    ) as ComplianceReportType;
    const subjectId = getRequiredText(body, "subject_id");
    const report = createComplianceReport(reportType, subjectId);
    const supabase = await createClient();

    // Future: replace placeholder with signed PDF generation and secure storage.
    await createSignal(supabase, "compliance_export_created");
    await createAuditLog(
      supabase,
      "compliance_export_created",
      "compliance_export_api",
      {
        report_type: reportType,
        subject_id: subjectId,
        report_id: report.report_id,
        export_status: report.export_status,
      }
    );

    return NextResponse.json({
      ok: true,
      export_status: report.export_status,
      report_id: report.report_id,
      message: report.message,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Invalid input") {
      return NextResponse.json(
        { ok: false, error: "Invalid export request" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { ok: false, error: "Could not create compliance export" },
      { status: 500 }
    );
  }
}
