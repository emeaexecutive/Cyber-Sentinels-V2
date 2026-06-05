import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type EnterpriseAccessPayload = {
  name: string;
  email: string;
  company: string;
  role: string;
  message: string;
  use_case: string;
  urgency: string;
  company_size: string;
  current_problem_category: string;
  current_problem: string;
};

type SupabaseErrorLike = {
  message?: string;
  code?: string;
  details?: string;
};

function redirectTo(req: Request, path: string) {
  return NextResponse.redirect(new URL(path, req.url), { status: 303 });
}

function enterpriseAccessErrorResponse(
  error: string,
  status: number,
  supabaseError?: SupabaseErrorLike
) {
  return NextResponse.json(
    {
      ok: false,
      error,
      code: supabaseError?.code ?? null,
      message:
        "We could not submit your request. Please try again or contact support.",
    },
    { status }
  );
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

function field(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

function buildEnterpriseAccessPayload(formData: FormData): EnterpriseAccessPayload {
  const currentProblemCategory = field(formData, "current_problem_category");
  const urgency = field(formData, "urgency") || field(formData, "ai_usage_level");

  return {
    name: field(formData, "name"),
    email: field(formData, "email") || field(formData, "work_email"),
    company: field(formData, "company"),
    role: field(formData, "role"),
    company_size: field(formData, "company_size"),
    current_problem_category: currentProblemCategory,
    current_problem: field(formData, "current_problem"),
    urgency,
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

function hasServiceRoleKey() {
  return Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY?.trim());
}

export async function POST(req: Request) {
  try {
    if (!hasServiceRoleKey()) {
      console.error("enterprise access submit missing service role key");
      return enterpriseAccessErrorResponse("missing_service_role_key", 500);
    }

    const formData = await req.formData();
    const payload = buildEnterpriseAccessPayload(formData);
    logSubmittedFieldKeys(formData);
    console.error("enterprise access insert payload keys", {
      keys: Object.keys(payload).sort(),
    });

    if (!payload.name || !payload.email || !payload.company) {
      console.error("enterprise access submit missing required fields");
      return enterpriseAccessErrorResponse("required_fields_missing", 400);
    }

    const supabase = createServiceRoleClient();

    const { error } = await supabase.rpc(
      "submit_enterprise_access_request",
      {
        p_name: payload.name,
        p_email: payload.email,
        p_company: payload.company ?? null,
        p_role: payload.role ?? null,
        p_message: payload.message ?? null,
        p_use_case: payload.use_case ?? null,
        p_urgency: payload.urgency ?? null,
        p_company_size: payload.company_size ?? null,
      }
    );

    if (error) {
      logEnterpriseAccessSubmitError(error);
      return enterpriseAccessErrorResponse("submit_failed", 500, error);
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
        interest_level: payload.urgency || "early_access_request",
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
    return enterpriseAccessErrorResponse("submit_failed", 500);
  }
}
