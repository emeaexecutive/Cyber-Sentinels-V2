export const dynamic = "force-dynamic";

type EnterpriseAccessPageProps = {
  searchParams?: Promise<{
    success?: string;
    error?: string;
  }>;
};

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

          {error === "service_unavailable" ? (
            <div className="mb-4 rounded-lg border border-amber-900 bg-amber-950/30 p-4 text-sm text-amber-100">
              Enterprise access requests are temporarily unavailable. The page
              is still open, and no sign-in is required.
            </div>
          ) : null}

          <form
            action="/api/enterprise-access"
            method="post"
            className="grid gap-4"
          >
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
              <option value="auditability">
                Lack of AI auditability
              </option>
              <option value="ownership">
                Unclear ownership/accountability
              </option>
              <option value="human_review">
                Human approval requirements
              </option>
              <option value="workflow_governance">
                Workflow governance concerns
              </option>
              <option value="ai_identity">
                AI identity and permissions
              </option>
              <option value="provenance">
                Evidence and provenance tracking
              </option>
              <option value="compliance">
                Compliance and operational oversight
              </option>
              <option value="trust_workflows">
                Trust and verification workflows
              </option>
              <option value="trust_infrastructure">
                Exploring trust infrastructure
              </option>
              <option value="other">Other</option>
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
              <option value="exploring_ai">
                Exploring AI adoption
              </option>
              <option value="piloting_workflows">
                Piloting AI-assisted workflows
              </option>
              <option value="operational_ai">
                AI systems are operational internally
              </option>
              <option value="governance_required">
                AI agents/workflows require governance
              </option>
              <option value="auditability_critical">
                Operational auditability is becoming critical
              </option>
              <option value="trust_requirements">
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
