import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

const enterpriseAccessInsertFields = [
  "name",
  "work_email",
  "company",
  "role",
  "company_size",
  "current_problem_category",
  "current_problem",
  "ai_usage_level",
  "use_case",
  "message",
] as const;

type EnterpriseAccessInsertField =
  (typeof enterpriseAccessInsertFields)[number];
type EnterpriseAccessInsertPayload = Record<EnterpriseAccessInsertField, string>;

type SupabaseErrorLike = {
  message?: string;
  code?: string;
  details?: string;
};

function redirectTo(req: Request, path: string) {
  return NextResponse.redirect(new URL(path, req.url), { status: 303 });
}

function enterpriseAccessErrorUrl(req: Request, error: string) {
  const url = new URL("/enterprise-access", req.url);
  url.searchParams.set("error", error);
  return url;
}

function redirectWithEnterpriseAccessError(req: Request, error: string) {
  return NextResponse.redirect(enterpriseAccessErrorUrl(req, error), {
    status: 303,
  });
}

function logEnterpriseAccessSubmitError(error: unknown) {
  const supabaseError = error as SupabaseErrorLike;

  console.error("enterprise access submit failed", {
    message:
      typeof supabaseError?.message === "string"
        ? supabaseError.message
        : "Unknown enterprise access submit error",
    code: typeof supabaseError?.code === "string" ? supabaseError.code : null,
    details:
      typeof supabaseError?.details === "string"
        ? supabaseError.details
        : null,
  });
}

function logSubmittedFieldKeys(formData: FormData) {
  console.error("enterprise access submitted field keys", {
    keys: [...formData.keys()].sort(),
  });
}

function field(formData: FormData, name: EnterpriseAccessInsertField) {
  return String(formData.get(name) ?? "").trim();
}

function buildEnterpriseAccessPayload(
  formData: FormData
): EnterpriseAccessInsertPayload {
  const currentProblemCategory = field(formData, "current_problem_category");
  const aiUsageLevel = field(formData, "ai_usage_level");

  return {
    name: field(formData, "name"),
    work_email: field(formData, "work_email"),
    company: field(formData, "company"),
    role: field(formData, "role"),
    company_size: field(formData, "company_size"),
    current_problem_category: currentProblemCategory,
    current_problem: field(formData, "current_problem"),
    ai_usage_level: aiUsageLevel,
    use_case: field(formData, "use_case"),
    message: field(formData, "message"),
  };
}

function getEnterpriseInterestSignal(problemCategory: string) {
  const normalizedCategory = problemCategory.toLowerCase();

  if (normalizedCategory === "auditability") {
    return "auditability_interest_detected";
  }

  if (
    normalizedCategory === "ai_identity" ||
    normalizedCategory === "provenance"
  ) {
    return "ai_identity_interest_detected";
  }

  if (
    normalizedCategory === "ownership" ||
    normalizedCategory === "human_review" ||
    normalizedCategory === "workflow_governance" ||
    normalizedCategory === "compliance"
  ) {
    return "governance_interest_detected";
  }

  return "operational_trust_interest_detected";
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const payload = buildEnterpriseAccessPayload(formData);
    logSubmittedFieldKeys(formData);
    console.error("enterprise access insert payload keys", {
      keys: Object.keys(payload).sort(),
    });

    if (!payload.name || !payload.work_email || !payload.company) {
      console.error("enterprise access submit missing required fields");
      return redirectWithEnterpriseAccessError(req, "required");
    }

    let supabase;

    try {
      supabase = createServiceRoleClient();
    } catch (error) {
      logEnterpriseAccessSubmitError(error);
      return redirectWithEnterpriseAccessError(req, "service_unavailable");
    }

    const { error } = await supabase
      .from("enterprise_access_requests")
      .insert(payload);

    if (error) {
      logEnterpriseAccessSubmitError(error);
      if (error.code === "42501") {
        return redirectWithEnterpriseAccessError(req, "permission_denied");
      }

      return redirectWithEnterpriseAccessError(req, "submit_failed");
    }

    const { error: interestSignalError } = await supabase
      .from("interest_signals")
      .insert({
        company: payload.company,
        role: payload.role || null,
        use_case:
          payload.use_case ||
          payload.current_problem_category ||
          payload.current_problem ||
          null,
        interest_level: payload.ai_usage_level || "early_access_request",
        source: getEnterpriseInterestSignal(payload.current_problem_category),
        notes:
          [
            payload.current_problem_category,
            payload.current_problem,
            payload.message,
          ]
            .filter(Boolean)
            .join(" / ") || null,
      });

    if (interestSignalError) {
      console.error(
        "enterprise access interest signal insert failed",
        interestSignalError
      );
    }

    return redirectTo(req, "/enterprise-access?success=true");
  } catch (error) {
    logEnterpriseAccessSubmitError(error);
    return redirectWithEnterpriseAccessError(req, "submit_failed");
  }
}
