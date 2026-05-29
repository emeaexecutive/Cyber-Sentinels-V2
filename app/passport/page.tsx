import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function PassportPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/command-center");
  }

  const { data: passports } = await supabase
    .from("passports")
    .select("*")
    .order("created_at", { ascending: false });

  const passport = passports?.[0];

  return (
    <main className="min-h-screen bg-black p-8 text-white">
      <div className="mx-auto max-w-5xl">
        <Link href="/" className="text-sm text-zinc-400 hover:text-white">
          Back to Cyber Sentinels
        </Link>

        <h1 className="mt-8 text-5xl font-bold">Sentinel Passport</h1>

        <section className="mt-10 rounded-3xl border border-zinc-800 bg-zinc-950 p-8">
          {passport ? (
            <>
              <p className="text-sm text-zinc-500">Subject</p>
              <h2 className="mt-2 text-3xl font-bold">
                {passport.subject_name}
              </h2>

              <div className="mt-8 grid gap-4 md:grid-cols-3">
                <div className="rounded-2xl border border-zinc-800 bg-black p-5">
                  <p className="text-zinc-500">Human Presence Index™</p>
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
                  <p className="text-zinc-500">Trust Score</p>
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
                  <p className="text-zinc-500">Synthetic Risk</p>
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
                  <p className="text-zinc-500">Image Authenticity</p>
                  <p className="mt-3 text-xl font-bold">
                    {passport.image_authenticity_score ?? 0}%
                  </p>
                </div>

                <div className="rounded-2xl border border-zinc-800 bg-black p-5">
                  <p className="text-zinc-500">Audio Clone Risk</p>
                  <p className="mt-3 text-xl font-bold">
                    {passport.voice_clone_risk ?? 0}%
                  </p>
                </div>

                <div className="rounded-2xl border border-zinc-800 bg-black p-5">
                  <p className="text-zinc-500">Video Deepfake Risk</p>
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
            <p className="text-zinc-500">No passport created yet.</p>
          )}
        </section>

        <form
          action="/api/passports"
          method="POST"
          className="mt-10 grid gap-4 rounded-3xl border border-zinc-800 bg-zinc-950 p-8"
        >
          <h2 className="text-2xl font-bold">Submit Verification</h2>

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
            placeholder="Synthetic risk score e.g. 20"
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
            placeholder="Audio clone risk e.g. 12"
            className="rounded-xl border border-zinc-800 bg-black p-4 text-white"
          />

          <input
            name="image_authenticity_score"
            type="number"
            min="0"
            max="100"
            placeholder="Image authenticity score e.g. 88"
            className="rounded-xl border border-zinc-800 bg-black p-4 text-white"
          />

          <input
            name="video_deepfake_risk"
            type="number"
            min="0"
            max="100"
            placeholder="Deepfake video risk e.g. 18"
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
            placeholder="Model fingerprint risk e.g. 35"
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
            Submit Verification
          </button>
        </form>
      </div>
    </main>
  );
}
