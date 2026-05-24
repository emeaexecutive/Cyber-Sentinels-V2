import { createClient } from "@/lib/supabase/server";
import {
  recordTrustApiCall,
  trustApiError,
  trustApiOk,
  validateTrustApiKey,
} from "@/lib/api/trustResponses";
import type { TrustPassportSummary } from "@/types/api";

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function getSafeQueryValue(url: URL, field: string) {
  const value = url.searchParams.get(field)?.trim() ?? "";

  if (value.length > 160) {
    throw new Error("Invalid input");
  }

  return value;
}

export async function GET(req: Request) {
  try {
    const apiKey = validateTrustApiKey(req);

    if (!apiKey.ok) {
      return trustApiError("Unauthorized", 401);
    }

    // Future: add per-API-key rate limits and access scopes for passport reads.
    const url = new URL(req.url);
    const id = getSafeQueryValue(url, "id");
    const subject = getSafeQueryValue(url, "subject");

    if (!id && !subject) {
      return trustApiError("Provide an id or subject", 400);
    }

    if (id && !uuidPattern.test(id)) {
      return trustApiError("Invalid passport lookup", 400);
    }

    const supabase = await createClient();
    const selectFields =
      "id,subject_name,subject_type,trust_score,human_presence_index,origin_trace_score,review_status,verification_status,reality_passport_status,provenance_status,created_at";
    const { data, error } = id
      ? await supabase
          .from("passports")
          .select(selectFields)
          .eq("id", id)
          .limit(1)
          .returns<TrustPassportSummary[]>()
      : await supabase
          .from("passports")
          .select(selectFields)
          .ilike("subject_name", subject)
          .limit(1)
          .returns<TrustPassportSummary[]>();

    if (error) {
      return trustApiError("Could not retrieve passport", 500);
    }

    const passport = data?.[0];

    await recordTrustApiCall(supabase, req, {
      route: "/api/trust/passport",
      metadata: {
        lookup_type: id ? "id" : "subject",
        found: Boolean(passport),
      },
    });

    if (!passport) {
      return trustApiError("Passport not found", 404);
    }

    return trustApiOk({ passport });
  } catch (error) {
    if (error instanceof Error && error.message === "Invalid input") {
      return trustApiError("Invalid passport lookup", 400);
    }

    return trustApiError("Could not retrieve passport", 500);
  }
}
