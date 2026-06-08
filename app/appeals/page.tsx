import { redirect } from "next/navigation";
import { FeedbackPrompt } from "@/components/private-beta";
import { createNotification } from "@/lib/communications/createNotification";
import { createClient } from "@/lib/supabase/server";
import { createAuditLog } from "@/lib/trust-engine/createAuditLog";
import { createSignal } from "@/lib/trust-engine/createSignal";

export const dynamic = "force-dynamic";

function formatDate(value?: string | null) {
  if (!value) return "Not recorded";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not recorded";
  return date.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
}

async function submitAppeal(formData: FormData) {
  "use server";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?next=/appeals");

  const passportId = String(formData.get("passport_id") ?? "").trim();
  const verificationCaseId = String(formData.get("verification_case_id") ?? "").trim();
  const appealReason = String(formData.get("appeal_reason") ?? "").trim();

  if (!passportId || !appealReason) redirect("/appeals?error=missing");

  const { data: passport } = await supabase
    .from("passports")
    .select("id,user_email,subject_name")
    .eq("id", passportId)
    .eq("user_email", user.email ?? "")
    .maybeSingle();

  if (!passport) redirect("/appeals?error=passport");

  const { data: appeal, error } = await supabase
    .from("appeals")
    .insert({
      passport_id: passportId,
      verification_case_id: verificationCaseId || null,
      submitted_by_user_id: user.id,
      submitted_by_email: user.email,
      appeal_reason: appealReason,
      status: "submitted",
    })
    .select("id")
    .single();

  if (error || !appeal) redirect("/appeals?error=submit_failed");

  const actor = user.email ?? user.id;
  const metadata = {
    appeal_id: appeal.id,
    passport_id: passportId,
    verification_case_id: verificationCaseId || null,
    actor,
  };

  await createAuditLog(supabase, "appeal_submitted", actor, metadata);
  await createSignal(supabase, "Appeal submitted", metadata);
  await createNotification(supabase, {
    userId: user.id,
    title: "Appeal submitted",
    body: "Your appeal was submitted for human review.",
    notificationType: "appeal_submitted",
    actor,
    metadata,
  });

  redirect("/appeals?submitted=1");
}

export default async function AppealsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?next=/appeals");

  const [{ data: passports }, { data: appeals }] = await Promise.all([
    supabase
      .from("passports")
      .select("id,subject_name,verification_status,review_status,created_at")
      .eq("user_email", user.email ?? "")
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("appeals")
      .select("*")
      .eq("submitted_by_user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  const passportRows = passports ?? [];
  const appealRows = appeals ?? [];

  return (
    <main className="min-h-screen bg-[#04070c] px-6 py-8 text-white md:px-8">
      <div className="mx-auto max-w-5xl">
        <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-6">
          <p className="text-sm uppercase tracking-[0.24em] text-cyan-200">
            Appeals
          </p>
          <h1 className="mt-4 text-4xl font-semibold">Appeal Review Workflow</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-400">
            Request human review of a verification outcome. Appeals are tracked
            in-app and do not use autonomous AI decisions.
          </p>
        </section>

        {params?.submitted ? (
          <div className="mt-6 grid gap-3">
            <p className="rounded-lg border border-emerald-800 bg-emerald-950/20 p-4 text-sm text-emerald-200">
              Appeal submitted for review.
            </p>
            <FeedbackPrompt />
          </div>
        ) : null}

        <form action={submitAppeal} className="mt-8 grid gap-4 rounded-lg border border-zinc-800 bg-black p-5">
          <h2 className="text-xl font-semibold">Submit Appeal</h2>
          <select
            name="passport_id"
            required
            className="rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-white"
          >
            <option value="">Select passport</option>
            {passportRows.map((passport) => (
              <option key={String(passport.id)} value={String(passport.id)}>
                {passport.subject_name ?? "Unnamed passport"} /{" "}
                {passport.verification_status ?? passport.review_status ?? "pending"}
              </option>
            ))}
          </select>
          <input
            name="verification_case_id"
            placeholder="Verification case ID, if known"
            className="rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-white placeholder:text-zinc-600"
          />
          <textarea
            name="appeal_reason"
            required
            rows={5}
            placeholder="Explain what should be reviewed and why."
            className="rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-white placeholder:text-zinc-600"
          />
          <button className="rounded-lg bg-white px-4 py-3 text-sm font-semibold text-black">
            Submit Appeal
          </button>
        </form>

        <section className="mt-8 grid gap-4">
          <h2 className="text-2xl font-semibold">Your Appeals</h2>
          {appealRows.length ? (
            appealRows.map((appeal) => (
              <article key={String(appeal.id)} className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="break-all text-sm text-zinc-500">
                      Passport {appeal.passport_id ?? "not linked"}
                    </p>
                    <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-zinc-300">
                      {appeal.appeal_reason}
                    </p>
                  </div>
                  <span className="rounded-full border border-cyan-800 px-3 py-1 text-xs text-cyan-100">
                    {appeal.status ?? "submitted"}
                  </span>
                </div>
                {appeal.resolution_notes ? (
                  <div className="mt-4 rounded-lg border border-zinc-800 bg-black p-4">
                    <p className="text-xs uppercase tracking-[0.16em] text-zinc-600">
                      Resolution
                    </p>
                    <p className="mt-2 text-sm leading-6 text-zinc-300">
                      {appeal.resolution_notes}
                    </p>
                  </div>
                ) : null}
                <p className="mt-4 text-xs text-zinc-600">
                  Submitted {formatDate(appeal.created_at)}
                </p>
              </article>
            ))
          ) : (
            <p className="rounded-lg border border-zinc-800 bg-black p-5 text-sm text-zinc-500">
              No appeals yet. Submit an appeal when a verification outcome needs
              human review.
            </p>
          )}
        </section>
      </div>
    </main>
  );
}
