import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAuditLog } from "@/lib/trust-engine/createAuditLog";
import { createSignal } from "@/lib/trust-engine/createSignal";
import {
  demoClientSummary,
  type ClientPortalSummary,
} from "@/lib/trust-engine/clientPortal";

async function countOwnedRows(
  supabase: Awaited<ReturnType<typeof createClient>>,
  table: string,
  ownerEmail: string,
  statusColumn?: string,
  statusValues: string[] = []
) {
  let query = supabase
    .from(table)
    .select("id", { count: "exact", head: true })
    .eq("owner_email", ownerEmail);

  if (statusColumn && statusValues.length) {
    query = query.in(statusColumn, statusValues);
  }

  const { count, error } = await query;

  if (error) return null;

  return count ?? 0;
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return NextResponse.json(
      { ok: false, error: "Authentication required" },
      { status: 401 }
    );
  }

  // Production must enforce row-level security and owner_email/team_id/client_id filtering.
  const [
    passportCount,
    openVerifications,
    reportsReady,
    evidenceRequired,
  ] = await Promise.all([
    countOwnedRows(supabase, "passports", user.email),
    countOwnedRows(supabase, "verification_cases", user.email, "status", [
      "pending",
      "in_review",
      "escalated",
    ]),
    countOwnedRows(supabase, "trust_reports", user.email, "review_status", [
      "ready",
      "verified",
      "approved",
    ]),
    countOwnedRows(supabase, "evidence_files", user.email, "scan_status", [
      "requested",
      "pending",
      "submitted",
      "scanning",
    ]),
  ]);
  const hasOwnedData = [
    passportCount,
    openVerifications,
    reportsReady,
    evidenceRequired,
  ].every((value) => value !== null);

  if (!hasOwnedData) {
    await createSignal(supabase, "client_portal_opened");
    await createAuditLog(supabase, "client_portal_accessed", user.email, {
      source: "client_summary_api",
      demo_fallback: true,
    });

    return NextResponse.json({
      ok: true,
      ...demoClientSummary,
      message: "client-owned data will appear here.",
    });
  }

  const summary: ClientPortalSummary = {
    passport_count: passportCount ?? 0,
    open_verifications: openVerifications ?? 0,
    reports_ready: reportsReady ?? 0,
    evidence_required: evidenceRequired ?? 0,
    exports_ready: 0,
    api_usage: "0 / 250",
    current_clearance: "Free",
    is_demo: false,
  };

  await createSignal(supabase, "client_portal_opened");
  await createAuditLog(supabase, "client_portal_accessed", user.email, {
    source: "client_summary_api",
    demo_fallback: false,
  });

  return NextResponse.json({ ok: true, ...summary });
}
