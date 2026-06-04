import { redirect } from "next/navigation";
import { createServiceRoleClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

type EnterpriseAccessPageProps = {
  searchParams?: Promise<{
    success?: string;
    error?: string;
  }>;
};

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
  "status",
] as const;

type EnterpriseAccessInsertField =
  (typeof enterpriseAccessInsertFields)[number];
type EnterpriseAccessInsertPayload = Record<EnterpriseAccessInsertField, string>;

type SupabaseErrorLike = {
  message?: string;
  code?: string;
  details?: string;
};

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

function buildEnterpriseAccessPayload(
  values: Record<EnterpriseAccessInsertField, string>
): EnterpriseAccessInsertPayload {
  return enterpriseAccessInsertFields.reduce((payload, field) => {
    payload[field] = values[field];
    return payload;
  }, {} as EnterpriseAccessInsertPayload);
}

function getEnterpriseInterestSignal(problemCategory: string) {
  const normalizedCategory = problemCategory.toLowerCase();

  if (normalizedCategory.includes("auditability")) {
    return "auditability_interest_detected";
  }

  if (
    normalizedCategory.includes("identity") ||
    normalizedCategory.includes("permissions")
  ) {
    return "ai_identity_interest_detected";
  }

  if (
    normalizedCategory.includes("approval") ||
    normalizedCategory.includes("governance") ||
    normalizedCategory.includes("oversight") ||
    normalizedCategory.includes("accountability")
  ) {
    return "governance_interest_detected";
  }

  return "operational_trust_interest_detected";
}

async function submitEnterpriseAccessRequest(formData: FormData) {
  "use server";

  const payload = buildEnterpriseAccessPayload({
    name: String(formData.get("name") ?? "").trim(),
    work_email: String(formData.get("work_email") ?? "").trim(),
    company: String(formData.get("company") ?? "").trim(),
    role: String(formData.get("role") ?? "").trim(),
    company_size: String(formData.get("company_size") ?? "").trim(),
    current_problem_category: String(
      formData.get("current_problem_category") ?? ""
    ).trim(),
    current_problem: String(formData.get("current_problem") ?? "").trim(),
    ai_usage_level: String(formData.get("ai_usage_level") ?? "").trim(),
    use_case: String(formData.get("use_case") ?? "").trim(),
    message: String(formData.get("message") ?? "").trim(),
    status: "new",
  });

  if (!payload.name || !payload.work_email || !payload.company) {
    redirect("/enterprise-access?error=required");
  }

  let supabase;

  try {
    supabase = createServiceRoleClient();
  } catch (error) {
    logEnterpriseAccessSubmitError(error);
    redirect("/enterprise-access?error=submit_failed");
  }

  const { error } = await supabase
    .from("enterprise_access_requests")
    .insert(payload);

  if (error) {
    logEnterpriseAccessSubmitError(error);
    redirect("/enterprise-access?error=submit_failed");
  }

  const { error: interestSignalError } = await supabase.from("interest_signals").insert({
    company: payload.company,
    role: payload.role || null,
    use_case:
      payload.use_case || payload.current_problem_category || payload.current_problem || null,
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
    console.error("enterprise access interest signal insert failed", interestSignalError);
  }

  redirect("/enterprise-access?success=true");
}

export default async function EnterpriseAccessPage({
  searchParams,
}: EnterpriseAccessPageProps) {
  const params = await searchParams;
  const success = params?.success === "true";
  const error = params?.error;

  return (
    <main className="min-h-screen bg-[#04070c] px-6 py-12 text-white md:px-8">
      <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1fr_460px] lg:items-start">
        <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-6">
          <p className="text-xs uppercase tracking-[0.24em] text-cyan-200">
            Enterprise Access
          </p>
          <h1 className="mt-4 text-4xl font-semibold md:text-5xl">
            Request Cyber Sentinels Enterprise Access
          </h1>
          <p className="mt-4 max-w-3xl leading-7 text-zinc-400">
            Tell us how your organisation wants to use governed trust
            infrastructure for verification, auditability, AI governance or
            operational transparency.
          </p>
          <div className="mt-6 grid gap-3 text-sm text-zinc-400 md:grid-cols-2">
            {[
              "Evidence-backed verification",
              "Human-governed review",
              "Operational trust maturity",
              "AI governance and auditability",
            ].map((item) => (
              <div
                key={item}
                className="rounded-lg border border-zinc-800 bg-black p-4"
              >
                {item}
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-lg border border-zinc-800 bg-black p-6">
          {success ? (
            <div className="rounded-lg border border-emerald-900 bg-emerald-950/30 p-4 text-sm text-emerald-100">
              Thanks &mdash; your request has been received.
            </div>
          ) : null}

          {error === "required" ? (
            <div className="mb-4 rounded-lg border border-amber-900 bg-amber-950/30 p-4 text-sm text-amber-100">
              Please provide your name, work email and company.
            </div>
          ) : null}

          {error === "submit_failed" ? (
            <div className="mb-4 rounded-lg border border-red-900 bg-red-950/30 p-4 text-sm text-red-100">
              We could not submit the request. Please try again.
            </div>
          ) : null}

          <form action={submitEnterpriseAccessRequest} className="grid gap-4">
            <input
              name="name"
              placeholder="Name"
              className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 text-white"
            />
            <input
              name="work_email"
              type="email"
              placeholder="Work email"
              className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 text-white"
            />
            <input
              name="company"
              placeholder="Company"
              className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 text-white"
            />
            <input
              name="role"
              placeholder="Role"
              className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 text-white"
            />
            <input
              name="company_size"
              placeholder="Company size"
              className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 text-white"
            />
            <select
              name="current_problem_category"
              defaultValue=""
              className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 text-white"
            >
              <option value="" disabled>
                Operational trust challenge
              </option>
              <option value="Lack of AI auditability">
                Lack of AI auditability
              </option>
              <option value="Unclear ownership/accountability">
                Unclear ownership/accountability
              </option>
              <option value="Human approval requirements">
                Human approval requirements
              </option>
              <option value="Workflow governance concerns">
                Workflow governance concerns
              </option>
              <option value="AI identity and permissions">
                AI identity and permissions
              </option>
              <option value="Evidence and provenance tracking">
                Evidence and provenance tracking
              </option>
              <option value="Compliance and operational oversight">
                Compliance and operational oversight
              </option>
              <option value="Trust and verification workflows">
                Trust and verification workflows
              </option>
              <option value="Exploring trust infrastructure">
                Exploring trust infrastructure
              </option>
              <option value="Other">Other</option>
            </select>
            <input
              name="current_problem"
              placeholder="Describe the operational trust problem"
              className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 text-white"
            />
            <select
              name="ai_usage_level"
              defaultValue=""
              className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 text-white"
            >
              <option value="" disabled>
                AI maturity and oversight need
              </option>
              <option value="Exploring AI adoption">
                Exploring AI adoption
              </option>
              <option value="Piloting AI-assisted workflows">
                Piloting AI-assisted workflows
              </option>
              <option value="AI systems are operational internally">
                AI systems are operational internally
              </option>
              <option value="AI agents/workflows require governance">
                AI agents/workflows require governance
              </option>
              <option value="Operational auditability is becoming critical">
                Operational auditability is becoming critical
              </option>
              <option value="Trust and oversight requirements are increasing">
                Trust and oversight requirements are increasing
              </option>
            </select>
            <input
              name="use_case"
              placeholder="Use case"
              className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 text-white"
            />
            <textarea
              name="message"
              placeholder="Message"
              rows={5}
              className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 text-white"
            />
            <button
              type="submit"
              className="rounded-xl bg-white p-4 font-semibold text-black hover:bg-cyan-100"
            >
              Request Enterprise Access
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
