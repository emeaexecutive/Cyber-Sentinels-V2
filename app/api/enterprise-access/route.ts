import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  checkRequestRateLimit,
  getClientIp,
  getTurnstileTokenFromForm,
  verifyTurnstileToken,
} from "@/lib/bot-protection";

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

  console.error("enterprise access submit failed", {
    code: typeof supabaseError?.code === "string" ? supabaseError.code : null,
  });
}

function field(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

function buildEnterpriseAccessPayload(formData: FormData): EnterpriseAccessPayload {
  const currentProblemCategory = field(formData, "current_problem_category");
  const aiUsageLevel = field(formData, "urgency") || field(formData, "ai_usage_level");
  const designPartnerInterest = field(formData, "design_partner_interest") === "true";

  return {
    name: field(formData, "name"),
    work_email: field(formData, "email") || field(formData, "work_email"),
    company: field(formData, "company"),
    role: field(formData, "role"),
    company_size: field(formData, "company_size"),
    current_problem_category: currentProblemCategory,
    current_problem: field(formData, "current_problem"),
    ai_usage_level: aiUsageLevel,
    use_case: field(formData, "use_case") || (designPartnerInterest ? "design_partner_access" : ""),
    status:
      field(formData, "status") ||
      (designPartnerInterest ? "design_partner_interest" : "new"),
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
    const rateLimited = checkRequestRateLimit(req, "/api/enterprise-access", 6, 60_000);
    if (rateLimited) return rateLimited;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return Response.json(
        {
          ok: false,
          error: "This operational request is temporarily unavailable.",
        },
        { status: 500 }
      );
    }

    const formData = await req.formData();
    const turnstile = await verifyTurnstileToken(getTurnstileTokenFromForm(formData), getClientIp(req));

    if (!turnstile.ok) {
      return enterpriseAccessErrorResponse("Bot protection check failed. Please refresh and try again.", 400);
    }

    const payload = buildEnterpriseAccessPayload(formData);

    if (!payload.name || !payload.work_email || !payload.company) {
      return enterpriseAccessErrorResponse("Additional information is required.", 400);
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

    const { error } = await supabaseAdmin
      .from("enterprise_access_requests")
      .insert([payload]);

    if (error) {
      console.warn("enterprise access request could not be recorded", {
        code: error.code,
      });
      logEnterpriseAccessSubmitError(error);
      return enterpriseAccessErrorResponse("We could not complete this request.", 500, error);
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