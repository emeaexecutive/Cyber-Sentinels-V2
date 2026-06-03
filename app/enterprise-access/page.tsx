import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type EnterpriseAccessPageProps = {
  searchParams?: Promise<{
    submitted?: string;
    error?: string;
  }>;
};

async function submitEnterpriseAccessRequest(formData: FormData) {
  "use server";

  const payload = {
    name: String(formData.get("name") ?? "").trim(),
    work_email: String(formData.get("work_email") ?? "").trim(),
    company: String(formData.get("company") ?? "").trim(),
    role: String(formData.get("role") ?? "").trim(),
    use_case: String(formData.get("use_case") ?? "").trim(),
    message: String(formData.get("message") ?? "").trim(),
  };

  if (!payload.name || !payload.work_email || !payload.company) {
    redirect("/enterprise-access?error=required");
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("enterprise_access_requests")
    .insert(payload);

  if (error) {
    redirect("/enterprise-access?error=submit_failed");
  }

  redirect("/enterprise-access?submitted=1");
}

export default async function EnterpriseAccessPage({
  searchParams,
}: EnterpriseAccessPageProps) {
  const params = await searchParams;
  const submitted = params?.submitted === "1";
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
              "Operational audit trails",
              "AI and workflow trust oversight",
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
          {submitted ? (
            <div className="rounded-lg border border-emerald-900 bg-emerald-950/30 p-4 text-sm text-emerald-100">
              Thanks — your request has been received.
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
