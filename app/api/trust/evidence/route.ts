import { createClient } from "@/lib/supabase/server";
import {
  demoEvidence,
  getEvidenceSummary,
  normalizeEvidenceRows,
} from "@/lib/trust-engine/evidence";
import {
  recordTrustApiCall,
  trustApiError,
  trustApiOk,
  validateTrustApiKey,
} from "@/lib/api/trustResponses";

export async function GET(req: Request) {
  try {
    const apiKey = validateTrustApiKey(req);

    if (!apiKey.ok) {
      return trustApiError("Unauthorized", 401);
    }

    // Future: this endpoint can issue signed upload intents once storage,
    // malware scanning, and custody hashing are fully wired.
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("evidence_files")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      return trustApiError("Could not retrieve evidence summary", 500);
    }

    const evidence = normalizeEvidenceRows(data);
    const summary = getEvidenceSummary(evidence.length ? evidence : demoEvidence);

    await recordTrustApiCall(supabase, req, {
      route: "/api/trust/evidence",
      metadata: {
        evidence_total: summary.total,
      },
    });

    return trustApiOk({
      evidence_summary: {
        total: summary.total,
        pending_scan: summary.pendingScan,
        suspicious: summary.suspicious,
        custody_issues: summary.custodyIssues,
        linked_passports: summary.linkedPassports,
        linked_cases: summary.linkedCases,
      },
      upload_workflow: "placeholder",
      message:
        "Evidence upload workflow is prepared but not enabled in Trust API V1.",
    });
  } catch {
    return trustApiError("Could not retrieve evidence summary", 500);
  }
}
