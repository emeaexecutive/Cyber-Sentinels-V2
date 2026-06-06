import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type EnterpriseAccessPayload = {
  name: string;
  work_email: string;
  company: string;
  role: string;
  message: string;
  use_case: string;
  status: string;
  ai_usage_level: string;
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

  console.log("LIVE_ENTERPRISE_ACCESS_HANDLER_CONFIRMED", "2026-06-06");
  console.log("LIVE_HANDLER_EDITED_NOW", "commit-6099c67");
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
  const aiUsageLevel = field(formData, "urgency") || field(formData, "ai_usage_level");

  return {
    name: field(formData, "name"),
    work_email: field(formData, "email") || field(formData, "work_email"),
    company: field(formData, "company"),
    role: field(formData, "role"),
    company_size: field(formData, "company_size"),
    current_problem_category: currentProblemCategory,
    current_problem: field(formData, "current_problem"),
    ai_usage_level: aiUsageLevel,
    use_case: field(formData, "use_case"),
    status: field(formData, "status") || "new",
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
    console.log("LIVE_HANDLER_EDITED_NOW", "2026-06-06");
    console.log("ENTERPRISE_ACCESS_ROUTE_PROBE", "2026-06-06-1008");
    console.log("ENTERPRISE_ACCESS_ENV", {
      hasUrl: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
      hasServiceRole: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
      serviceRolePrefix: process.env.SUPABASE_SERVICE_ROLE_KEY?.slice(0, 16),
      hasAnon: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    });

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return Response.json(
        { ok: false, error: "missing_supabase_admin_env" },
        { status: 500 }
      );
    }

    const formData = await req.formData();
    const payload = buildEnterpriseAccessPayload(formData);
    logSubmittedFieldKeys(formData);
    console.error("enterprise access insert payload keys", {
      keys: Object.keys(payload).sort(),
    });

    if (!payload.name || !payload.work_email || !payload.company) {
      console.error("enterprise access submit missing required fields");
      return enterpriseAccessErrorResponse("required_fields_missing", 400);
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    );

    console.log("ENTERPRISE_ACCESS_INSERT_CLIENT", "admin-inline");
    const { error } = await supabaseAdmin
      .from("enterprise_access_requests")
      .insert([payload]);

    if (error) {
      console.error("ENTERPRISE_ACCESS_SUPABASE_ERROR", {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      });
      logEnterpriseAccessSubmitError(error);
      return enterpriseAccessErrorResponse("submit_failed", 500, error);
    }

    const { error: interestSignalError } = await supabaseAdmin
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

    return redirectTo(
      req,
      payload.use_case.endsWith("_waitlist")
        ? "/pro-waitlist?success=true"
        : "/enterprise-access?success=true"
    );
  } catch (error) {
    logEnterpriseAccessSubmitError(error);
    return enterpriseAccessErrorResponse("submit_failed", 500);
  }
}
