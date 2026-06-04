import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAuditLog } from "@/lib/trust-engine/createAuditLog";
import { createSignal } from "@/lib/trust-engine/createSignal";

export const dynamic = "force-dynamic";

type FeedbackPageProps = {
  searchParams?: Promise<{
    submitted?: string;
    error?: string;
  }>;
};

const categories = [
  ["bug_report", "Bug report"],
  ["confusion_point", "Confusion point"],
  ["feature_request", "Feature request"],
  ["trust_concern", "Trust concern"],
  ["enterprise_interest", "Enterprise interest"],
  ["onboarding_issue", "Onboarding issue"],
];

async function submitFeedback(formData: FormData) {
  "use server";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/feedback");
  }

  const category = String(formData.get("category") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();
  const screenshotUrl = String(formData.get("screenshot_url") ?? "").trim();
  const contactPreference = String(
    formData.get("contact_preference") ?? ""
  ).trim();
  const actor = user.email ?? user.id;
  const metadata = {
    category,
    screenshot_url: screenshotUrl || null,
    contact_preference: contactPreference || null,
    actor,
  };

  if (!category || !message) {
    redirect("/feedback?error=required");
  }

  const { error } = await supabase.from("feedback_reports").insert({
    category,
    message,
    screenshot_url: screenshotUrl || null,
    contact_preference: contactPreference || null,
    submitted_by_user_id: user.id,
    submitted_by_email: user.email ?? null,
    status: "new",
  });

  if (error) {
    redirect("/feedback?error=submit_failed");
  }

  if (category === "enterprise_interest") {
    await supabase.from("interest_signals").insert({
      company: null,
      role: null,
      use_case: message,
      interest_level: "user_reported",
      source: "feedback",
      notes: contactPreference || null,
    });
  }

  await createAuditLog(supabase, "feedback_received", actor, {
    ...metadata,
    message_preview: message.slice(0, 160),
  });

  await createSignal(
    supabase,
    category === "confusion_point" || category === "onboarding_issue"
      ? "onboarding_confusion_detected"
      : category === "enterprise_interest"
        ? "enterprise_interest_detected"
        : "feedback_received",
    metadata
  );

  redirect("/feedback?submitted=1");
}

export default async function FeedbackPage({ searchParams }: FeedbackPageProps) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/feedback");
  }

  const params = await searchParams;
  const submitted = params?.submitted === "1";
  const error = params?.error;

  return (
    <main className="min-h-screen bg-[#04070c] px-6 py-12 text-white md:px-8">
      <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
        <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-6">
          <p className="text-xs uppercase tracking-[0.24em] text-cyan-200">
            Early Operational Feedback
          </p>
          <h1 className="mt-4 text-4xl font-semibold md:text-5xl">
            Help shape Cyber Sentinels
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-400">
            Share what felt unclear, what broke, what you expected, or what
            would make governed trust workflows more useful in real operations.
          </p>
          <p className="mt-5 rounded-lg border border-zinc-800 bg-black p-4 text-sm leading-6 text-zinc-500">
            Cyber Sentinels is evolving through early operational feedback and
            design collaboration.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/passports"
              className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:text-white"
            >
              My Passports
            </Link>
            <Link
              href="/help"
              className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:text-white"
            >
              Help Center
            </Link>
          </div>
        </section>

        <section className="rounded-lg border border-zinc-800 bg-black p-6">
          {submitted ? (
            <div className="mb-4 rounded-lg border border-emerald-900 bg-emerald-950/30 p-4 text-sm text-emerald-100">
              Thanks. Your feedback has been received.
            </div>
          ) : null}
          {error === "required" ? (
            <div className="mb-4 rounded-lg border border-amber-900 bg-amber-950/30 p-4 text-sm text-amber-100">
              Please choose a category and describe what you noticed.
            </div>
          ) : null}
          {error === "submit_failed" ? (
            <div className="mb-4 rounded-lg border border-red-900 bg-red-950/30 p-4 text-sm text-red-100">
              Could not submit feedback. Please try again.
            </div>
          ) : null}

          <form action={submitFeedback} className="grid gap-4">
            <select
              name="category"
              defaultValue=""
              className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 text-white"
            >
              <option value="" disabled>
                Feedback category
              </option>
              {categories.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <textarea
              name="message"
              rows={7}
              placeholder="What was unclear, broken, missing or strategically important?"
              className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 text-white placeholder:text-zinc-600"
            />
            <input
              name="screenshot_url"
              placeholder="Optional screenshot URL"
              className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 text-white placeholder:text-zinc-600"
            />
            <input
              name="contact_preference"
              placeholder="Optional contact preference"
              className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 text-white placeholder:text-zinc-600"
            />
            <button
              type="submit"
              className="rounded-xl bg-white p-4 font-semibold text-black hover:bg-cyan-100"
            >
              Send Feedback
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
