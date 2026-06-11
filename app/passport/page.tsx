import Link from "next/link";
import { redirect } from "next/navigation";
import { FeedbackPrompt, PrivateBetaBadge, PrivateBetaNotice } from "@/components/private-beta";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type PassportPageProps = {
  searchParams?: Promise<{ created?: string }>;
};

function friendlyStatus(status?: string | null) {
  const normalized = String(status ?? "pending").toLowerCase();

  if (["verified", "approved", "allow", "complete", "completed"].includes(normalized)) {
    return "Verification completed";
  }

  if (["rejected", "denied", "deny"].includes(normalized)) {
    return "Additional review required";
  }

  if (["escalated", "manual_review", "in_review"].includes(normalized)) {
    return "Under review";
  }

  if (["needs_more_evidence", "evidence_requested"].includes(normalized)) {
    return "Awaiting evidence";
  }

  return "Pending review";
}

function OnboardingCard({
  title,
  copy,
  href,
  complete,
}: {
  title: string;
  copy: string;
  href: string;
  complete?: boolean;
}) {
  return (
    <Link
      href={href}
      className="rounded-lg border border-zinc-800 bg-zinc-950 p-5 hover:border-cyan-800"
    >
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-lg font-semibold text-zinc-100">{title}</h2>
        <span
          className={`rounded-full border px-2.5 py-1 text-xs ${
            complete
              ? "border-emerald-800 bg-emerald-950/30 text-emerald-200"
              : "border-zinc-700 text-zinc-400"
          }`}
        >
          {complete ? "Done" : "Next"}
        </span>
      </div>
      <p className="mt-3 text-sm leading-6 text-zinc-500">{copy}</p>
    </Link>
  );
}

export default async function PassportPage({ searchParams }: PassportPageProps) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/passport");
  }

  const { data: passports } = await supabase
    .from("passports")
    .select("*")
    .eq("user_email", user.email ?? "")
    .order("created_at", { ascending: false });

  const passport = passports?.[0];
  const params = await searchParams;
  const created = params?.created === "1";
  const hasPassport = Boolean(passport);
  const currentStatus = friendlyStatus(
    passport?.verification_status ?? passport?.review_status
  );

  return (
    <main className="min-h-screen bg-[#04070c] p-8 text-white">
      <div className="mx-auto max-w-5xl">
        <nav className="flex flex-wrap gap-3 text-sm">
          {[
            ["/", "Home"],
            ["/passports", "My Passports"],
            ["/evidence-upload", "Upload Evidence"],
            ["/help", "Help"],
          ].map(([href, label]) => (
            <Link
              key={href}
              href={href}
              className="rounded-lg border border-zinc-800 px-3 py-2 text-zinc-300 hover:text-white"
            >
              {label}
            </Link>
          ))}
        </nav>

        <section className="mt-8 rounded-lg border border-zinc-800 bg-zinc-950 p-6">
          <p className="text-sm uppercase tracking-[0.24em] text-cyan-200">
            Guided Setup
          </p>
          <PrivateBetaBadge className="mt-4" />
          <h1 className="mt-4 text-4xl font-semibold">
            Create and manage your Trust Passport
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-6 text-zinc-400">
            Start with a passport, upload evidence when requested, and track the
            verification process from one calm workspace.
          </p>
          <PrivateBetaNotice className="mt-4 max-w-3xl" />
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-5">
          <OnboardingCard
            title="Create your first Trust Passport"
            copy="Create the trust record that starts verification."
            href="#submit-verification"
            complete={hasPassport}
          />
          <OnboardingCard
            title="Upload evidence"
            copy="Add supporting files when evidence is requested."
            href="/evidence-upload"
          />
          <OnboardingCard
            title="Track verification progress"
            copy="Open My Passports to see status and next steps."
            href="/passports"
            complete={hasPassport}
          />
          <OnboardingCard
            title="View notifications"
            copy="Read updates about evidence, decisions and appeals."
            href="/notifications"
          />
          <OnboardingCard
            title="Understand operational review"
            copy="See how evidence, status and audit visibility support verification."
            href="/how-to-use"
          />
        </section>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="#submit-verification"
            className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black"
          >
            Create Verification Workflow
          </Link>
          <Link
            href="/evidence-upload"
            className="rounded-xl border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:text-white"
          >
            Upload Evidence
          </Link>
          <Link
            href="/passports"
            className="rounded-xl border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:text-white"
          >
            My Passports
          </Link>
        </div>

        {created ? (
          <section className="mt-8 rounded-2xl border border-emerald-800 bg-zinc-950 p-5">
            <p className="text-sm text-emerald-200">
              Verification workflow created.
            </p>
            <FeedbackPrompt className="mt-4" />
            <Link
              href="/passports"
              className="mt-3 inline-flex rounded-xl border border-emerald-700 px-4 py-2 text-sm text-emerald-100 hover:text-white"
            >
              View Trust Passports
            </Link>
          </section>
        ) : null}

        <section className="mt-8 rounded-lg border border-zinc-800 bg-black p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-zinc-600">
                Current Step
              </p>
              <h2 className="mt-2 text-2xl font-semibold">
                {hasPassport ? currentStatus : "Create your first Trust Passport"}
              </h2>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-400">
                {hasPassport
                  ? "Your passport has been created. Continue by uploading evidence when requested, then watch for review updates and notifications."
                  : "No Trust Passports yet. Create your first Trust Passport to begin verification."}
              </p>
            </div>
            <Link
              href={hasPassport ? "/evidence-upload" : "#submit-verification"}
              className="rounded-lg border border-cyan-800 px-4 py-2 text-sm text-cyan-100 hover:text-white"
            >
              {hasPassport ? "Upload Evidence" : "Start Passport"}
            </Link>
          </div>
        </section>

        <section className="mt-10 rounded-3xl border border-zinc-800 bg-zinc-950 p-8">
          {passport ? (
            <>
              <p className="text-sm text-zinc-500">Subject</p>
              <h2 className="mt-2 text-3xl font-bold">
                {passport.subject_name}
              </h2>

              <div className="mt-8 grid gap-4 md:grid-cols-3">
                <div className="rounded-2xl border border-zinc-800 bg-black p-5">
                  <p className="text-zinc-500">Evidence-backed verification</p>
                  <p className="mt-3 text-2xl font-bold">
                    {passport.human_presence_index ?? 0}
                  </p>
                </div>

                <div className="rounded-2xl border border-zinc-800 bg-black p-5">
                  <p className="text-zinc-500">Type</p>
                  <p className="mt-3 text-2xl font-bold">
                    {passport.subject_type}
                  </p>
                </div>

                <div className="rounded-2xl border border-zinc-800 bg-black p-5">
                  <p className="text-zinc-500">Verification confidence</p>
                  <p className="mt-3 text-2xl font-bold">
                    {passport.trust_score}
                  </p>
                </div>

                <div className="rounded-2xl border border-zinc-800 bg-black p-5">
                  <p className="text-zinc-500">Clearance</p>
                  <p className="mt-3 text-2xl font-bold">
                    {passport.clearance}
                  </p>
                </div>
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-4">
                <div className="rounded-2xl border border-zinc-800 bg-black p-5">
                  <p className="text-zinc-500">Media Type</p>
                  <p className="mt-3 text-xl font-bold capitalize">
                    {passport.media_type ?? "profile"}
                  </p>
                </div>

                <div className="rounded-2xl border border-zinc-800 bg-black p-5">
                  <p className="text-zinc-500">Review risk</p>
                  <p className="mt-3 text-xl font-bold">
                    {passport.synthetic_risk ?? 0}%
                  </p>
                </div>

                <div className="rounded-2xl border border-zinc-800 bg-black p-5">
                  <p className="text-zinc-500">Liveness</p>
                  <p className="mt-3 text-xl font-bold">
                    {passport.liveness_score ?? 0}%
                  </p>
                </div>

                <div className="rounded-2xl border border-zinc-800 bg-black p-5">
                  <p className="text-zinc-500">Provenance</p>
                  <p className="mt-3 text-xl font-bold capitalize">
                    {passport.provenance_status ?? "unverified"}
                  </p>
                </div>
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-3">
                <div className="rounded-2xl border border-zinc-800 bg-black p-5">
                  <p className="text-zinc-500">Image Signal</p>
                  <p className="mt-3 text-xl font-bold">
                    {passport.image_authenticity_score ?? 0}%
                  </p>
                </div>

                <div className="rounded-2xl border border-zinc-800 bg-black p-5">
                  <p className="text-zinc-500">Audio review</p>
                  <p className="mt-3 text-xl font-bold">
                    {passport.voice_clone_risk ?? 0}%
                  </p>
                </div>

                <div className="rounded-2xl border border-zinc-800 bg-black p-5">
                  <p className="text-zinc-500">Video review</p>
                  <p className="mt-3 text-xl font-bold">
                    {passport.video_deepfake_risk ?? 0}%
                  </p>
                </div>
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-4">
                <div className="rounded-2xl border border-zinc-800 bg-black p-5">
                  <p className="text-zinc-500">Origin Trace Score</p>
                  <p className="mt-3 text-xl font-bold">
                    {passport.origin_trace_score ?? 0}
                  </p>
                </div>

                <div className="rounded-2xl border border-zinc-800 bg-black p-5">
                  <p className="text-zinc-500">Attribution Confidence</p>
                  <p className="mt-3 text-xl font-bold">
                    {passport.attribution_confidence ?? 0}%
                  </p>
                </div>

                <div className="rounded-2xl border border-zinc-800 bg-black p-5">
                  <p className="text-zinc-500">Review Status</p>
                  <p className="mt-3 text-xl font-bold capitalize">
                    {passport.review_status ?? "pending"}
                  </p>
                </div>

                <div className="rounded-2xl border border-zinc-800 bg-black p-5">
                  <p className="text-zinc-500">Likely Source</p>
                  <p className="mt-3 text-xl font-bold capitalize">
                    {passport.likely_source_type ?? "unknown"}
                  </p>
                </div>
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-zinc-800 bg-black p-5">
                  <p className="text-zinc-500">Verification Status</p>
                  <p className="mt-3 text-xl font-bold capitalize">
                    {passport.verification_status ?? "pending"}
                  </p>
                </div>

                <div className="rounded-2xl border border-zinc-800 bg-black p-5">
                  <p className="text-zinc-500">Reality Passport Status</p>
                  <p className="mt-3 text-xl font-bold capitalize">
                    {passport.reality_passport_status ?? "pending"}
                  </p>
                </div>
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-3">
                <div className="rounded-2xl border border-zinc-800 bg-black p-5">
                  <p className="text-zinc-500">LinkedIn Verification</p>
                  <p className="mt-3 text-xl font-bold capitalize">
                    {passport.linkedin_verification_status ?? "unverified"}
                  </p>
                </div>

                <div className="rounded-2xl border border-zinc-800 bg-black p-5">
                  <p className="text-zinc-500">Claimed Role</p>
                  <p className="mt-3 text-xl font-bold">
                    {passport.linkedin_claimed_role ?? "Not submitted"}
                  </p>
                </div>

                <div className="rounded-2xl border border-zinc-800 bg-black p-5">
                  <p className="text-zinc-500">LinkedIn Review</p>
                  <p className="mt-3 text-xl font-bold">
                    {passport.linkedin_review_required ? "Required" : "Not required"}
                  </p>
                </div>
              </div>
            </>
          ) : (
            <div className="rounded-lg border border-zinc-800 bg-black p-5">
              <p className="font-medium text-zinc-100">No Trust Passports yet.</p>
              <p className="mt-2 text-sm leading-6 text-zinc-500">
                Create your first Trust Passport to begin verification.
              </p>
            </div>
          )}
        </section>

        <form
          id="submit-verification"
          action="/api/passports"
          method="POST"
          className="mt-10 grid gap-4 rounded-3xl border border-zinc-800 bg-zinc-950 p-8"
        >
          <h2 className="text-2xl font-bold">Create Verification Workflow</h2>

          <input
            name="subject_name"
            placeholder="Subject name"
            className="rounded-xl border border-zinc-800 bg-black p-4 text-white"
          />

          <input
            name="linkedin_url"
            type="url"
            placeholder="LinkedIn profile URL e.g. https://www.linkedin.com/in/name"
            className="rounded-xl border border-zinc-800 bg-black p-4 text-white"
          />

          <input
            name="linkedin_claimed_role"
            placeholder="Claimed LinkedIn role"
            className="rounded-xl border border-zinc-800 bg-black p-4 text-white"
          />

          <input
            name="linkedin_claimed_company"
            placeholder="Claimed LinkedIn company"
            className="rounded-xl border border-zinc-800 bg-black p-4 text-white"
          />

          <select
            name="subject_type"
            className="rounded-xl border border-zinc-800 bg-black p-4 text-white"
          >
            <option value="human">Human</option>
            <option value="agent">AI Agent</option>
            <option value="candidate">Candidate</option>
            <option value="content">Content</option>
          </select>

          <select
            name="media_type"
            className="rounded-xl border border-zinc-800 bg-black p-4 text-white"
          >
            <option value="image">Image</option>
            <option value="video">Video</option>
            <option value="audio">Audio</option>
            <option value="document">Document</option>
          </select>

          <input
            name="biometric_confidence"
            type="number"
            min="0"
            max="100"
            placeholder="Biometric confidence e.g. 82"
            className="rounded-xl border border-zinc-800 bg-black p-4 text-white"
          />

          <input
            name="behavioural_consistency"
            type="number"
            min="0"
            max="100"
            placeholder="Behavioural consistency e.g. 76"
            className="rounded-xl border border-zinc-800 bg-black p-4 text-white"
          />

          <input
            name="synthetic_risk"
            type="number"
            min="0"
            max="100"
            placeholder="Review risk indicator e.g. 20"
            className="rounded-xl border border-zinc-800 bg-black p-4 text-white"
          />

          <input
            name="liveness_score"
            type="number"
            min="0"
            max="100"
            placeholder="Liveness verification score e.g. 82"
            className="rounded-xl border border-zinc-800 bg-black p-4 text-white"
          />

          <input
            name="voice_clone_risk"
            type="number"
            min="0"
            max="100"
            placeholder="Audio review indicator e.g. 12"
            className="rounded-xl border border-zinc-800 bg-black p-4 text-white"
          />

          <input
            name="image_authenticity_score"
            type="number"
            min="0"
            max="100"
            placeholder="Image signal score e.g. 88"
            className="rounded-xl border border-zinc-800 bg-black p-4 text-white"
          />

          <input
            name="video_deepfake_risk"
            type="number"
            min="0"
            max="100"
            placeholder="Video review indicator e.g. 18"
            className="rounded-xl border border-zinc-800 bg-black p-4 text-white"
          />

          <select
            name="provenance_status"
            className="rounded-xl border border-zinc-800 bg-black p-4 text-white"
          >
            <option value="unverified">Unverified provenance</option>
            <option value="verified">Verified provenance</option>
            <option value="missing">Missing provenance</option>
            <option value="tampered">Tampered provenance</option>
          </select>

          <input
            name="trust_timeline_score"
            type="number"
            min="0"
            max="100"
            placeholder="Trust timeline score e.g. 64"
            className="rounded-xl border border-zinc-800 bg-black p-4 text-white"
          />

          <input
            name="attribution_confidence"
            type="number"
            min="0"
            max="100"
            placeholder="Attribution confidence e.g. 42"
            className="rounded-xl border border-zinc-800 bg-black p-4 text-white"
          />

          <input
            name="likely_source_type"
            placeholder="Likely source type e.g. unknown, model, platform"
            className="rounded-xl border border-zinc-800 bg-black p-4 text-white"
          />

          <input
            name="model_fingerprint_risk"
            type="number"
            min="0"
            max="100"
            placeholder="Source pattern review e.g. 35"
            className="rounded-xl border border-zinc-800 bg-black p-4 text-white"
          />

          <select
            name="metadata_integrity"
            className="rounded-xl border border-zinc-800 bg-black p-4 text-white"
          >
            <option value="unknown">Unknown metadata integrity</option>
            <option value="intact">Metadata intact</option>
            <option value="stripped">Metadata stripped</option>
            <option value="tampered">Metadata tampered</option>
          </select>

          <select
            name="watermark_status"
            className="rounded-xl border border-zinc-800 bg-black p-4 text-white"
          >
            <option value="unknown">Unknown watermark status</option>
            <option value="found">Watermark found</option>
            <option value="not_found">Watermark not found</option>
          </select>

          <select
            name="c2pa_status"
            className="rounded-xl border border-zinc-800 bg-black p-4 text-white"
          >
            <option value="unknown">Unknown C2PA status</option>
            <option value="verified">C2PA verified</option>
            <option value="missing">C2PA missing</option>
            <option value="tampered">C2PA tampered</option>
          </select>

          <select
            name="upload_chain_status"
            className="rounded-xl border border-zinc-800 bg-black p-4 text-white"
          >
            <option value="unknown">Unknown upload chain</option>
            <option value="verified">Upload chain verified</option>
            <option value="broken">Upload chain broken</option>
          </select>

          <button className="rounded-xl bg-white px-5 py-4 font-semibold text-black">
            Create Verification Workflow
          </button>

          <Link
            href="/passports"
            className="text-center text-sm text-zinc-400 hover:text-white"
          >
            View Trust Passports
          </Link>
        </form>
      </div>
    </main>
  );
}
