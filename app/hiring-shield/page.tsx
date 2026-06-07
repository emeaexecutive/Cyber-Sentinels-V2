import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function HiringShieldPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/command-center");
  }

  const { data: reports } = await supabase
    .from("trust_reports")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <main className="min-h-screen bg-black p-8 text-white">
      <div className="mx-auto max-w-5xl">

        <Link href="/" className="text-sm text-zinc-400 hover:text-white">
          Back to Cyber Sentinels
        </Link>

        <h1 className="mt-8 text-5xl font-bold">
          Hiring Shield
        </h1>

        <p className="mt-4 max-w-2xl text-zinc-400">
          Candidate trust reports for identity confidence,
          synthetic risk and profile consistency.
        </p>

        {/* FORM */}
        <form
          action="/api/trust-reports"
          method="POST"
          className="mt-10 grid gap-4 rounded-3xl border border-zinc-800 bg-zinc-950 p-8"
        >
          <h2 className="text-2xl font-bold">
            Create Candidate Trust Report
          </h2>

          <input
            name="candidate_name"
            placeholder="Candidate name"
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

          <input
            name="profile_consistency"
            type="number"
            placeholder="Profile consistency score e.g. 88"
            className="rounded-xl border border-zinc-800 bg-black p-4 text-white"
          />

          <input
            name="biometric_confidence"
            type="number"
            placeholder="Biometric confidence e.g. 84"
            className="rounded-xl border border-zinc-800 bg-black p-4 text-white"
          />

          <input
            name="behavioural_consistency"
            type="number"
            placeholder="Behavioural consistency e.g. 78"
            className="rounded-xl border border-zinc-800 bg-black p-4 text-white"
          />

          <input
            name="synthetic_risk"
            type="number"
            placeholder="Synthetic risk score e.g. 12"
            className="rounded-xl border border-zinc-800 bg-black p-4 text-white"
          />

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
            name="liveness_score"
            type="number"
            placeholder="Liveness verification score e.g. 86"
            className="rounded-xl border border-zinc-800 bg-black p-4 text-white"
          />

          <input
            name="voice_clone_risk"
            type="number"
            placeholder="Cloned voice risk e.g. 14"
            className="rounded-xl border border-zinc-800 bg-black p-4 text-white"
          />

          <input
            name="image_authenticity_score"
            type="number"
            placeholder="Image authenticity score e.g. 88"
            className="rounded-xl border border-zinc-800 bg-black p-4 text-white"
          />

          <input
            name="video_deepfake_risk"
            type="number"
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
            name="confidence"
            type="number"
            placeholder="Confidence score e.g. 91"
            className="rounded-xl border border-zinc-800 bg-black p-4 text-white"
          />

          <input
            name="trust_timeline_score"
            type="number"
            placeholder="Trust timeline score e.g. 66"
            className="rounded-xl border border-zinc-800 bg-black p-4 text-white"
          />

          <input
            name="attribution_confidence"
            type="number"
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
            Generate Report
          </button>
        </form>

        {/* REPORTS */}
        <section className="mt-10 space-y-4">

          {reports?.length ? (

            reports.map((report) => (

              <div
                key={report.id}
                className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6"
              >

                <p className="text-sm text-zinc-500">
                  Trust Report
                </p>

                <div className="mt-5 grid gap-4 md:grid-cols-4">

                  <div>
                    <p className="text-zinc-500">
                      HPI™
                    </p>

                    <p className="mt-2 text-3xl font-bold">
                      {report.human_presence_index ?? 0}
                    </p>
                  </div>

                  <div>
                    <p className="text-zinc-500">
                      Profile Consistency
                    </p>

                    <p className="mt-2 text-3xl font-bold">
                      {report.profile_consistency}%
                    </p>
                  </div>

                  <div>
                    <p className="text-zinc-500">
                      Synthetic Risk
                    </p>

                    <p className="mt-2 text-3xl font-bold">
                      {report.synthetic_risk}%
                    </p>
                  </div>

                  <div>
                    <p className="text-zinc-500">
                      Confidence
                    </p>

                    <p className="mt-2 text-3xl font-bold">
                      {report.confidence}%
                    </p>
                  </div>

                  <div>
                    <p className="text-zinc-500">
                      Verification Confidence
                    </p>

                    <p className="mt-2 text-3xl font-bold">
                      {report.trust_score ?? 50}%
                    </p>
                  </div>

                </div>

                <div className="mt-5 grid gap-4 md:grid-cols-4">
                  <div>
                    <p className="text-zinc-500">Media</p>
                    <p className="mt-2 text-xl font-bold capitalize">
                      {report.media_type ?? "profile"}
                    </p>
                  </div>

                  <div>
                    <p className="text-zinc-500">Liveness</p>
                    <p className="mt-2 text-xl font-bold">
                      {report.liveness_score ?? 0}%
                    </p>
                  </div>

                  <div>
                    <p className="text-zinc-500">Audio Clone Risk</p>
                    <p className="mt-2 text-xl font-bold">
                      {report.voice_clone_risk ?? 0}%
                    </p>
                  </div>

                  <div>
                    <p className="text-zinc-500">Video Deepfake Risk</p>
                    <p className="mt-2 text-xl font-bold">
                      {report.video_deepfake_risk ?? 0}%
                    </p>
                  </div>
                </div>

                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  <div>
                    <p className="text-zinc-500">Image Authenticity</p>
                    <p className="mt-2 text-xl font-bold">
                      {report.image_authenticity_score ?? 0}%
                    </p>
                  </div>

                  <div>
                    <p className="text-zinc-500">Provenance / C2PA</p>
                    <p className="mt-2 text-xl font-bold capitalize">
                      {report.provenance_status ?? "unverified"}
                    </p>
                  </div>
                </div>

                <div className="mt-5 grid gap-4 md:grid-cols-4">
                  <div>
                    <p className="text-zinc-500">Origin Trace™</p>
                    <p className="mt-2 text-xl font-bold">
                      {report.origin_trace_score ?? 0}
                    </p>
                  </div>

                  <div>
                    <p className="text-zinc-500">Attribution Confidence</p>
                    <p className="mt-2 text-xl font-bold">
                      {report.attribution_confidence ?? 0}%
                    </p>
                  </div>

                  <div>
                    <p className="text-zinc-500">Likely Source</p>
                    <p className="mt-2 text-xl font-bold capitalize">
                      {report.likely_source_type ?? "unknown"}
                    </p>
                  </div>

                  <div>
                    <p className="text-zinc-500">Human Review</p>
                    <p className="mt-2 text-xl font-bold">
                      {report.human_review_required ? "Required" : "Optional"}
                    </p>
                  </div>
                </div>

                <div className="mt-5 grid gap-4 md:grid-cols-4">
                  <div>
                    <p className="text-zinc-500">LinkedIn Verification</p>
                    <p className="mt-2 text-xl font-bold capitalize">
                      {report.linkedin_verification_status ?? "unverified"}
                    </p>
                  </div>

                  <div>
                    <p className="text-zinc-500">LinkedIn Consistency</p>
                    <p className="mt-2 text-xl font-bold">
                      {report.linkedin_profile_consistency ?? "Pending"}
                    </p>
                  </div>

                  <div>
                    <p className="text-zinc-500">Claimed Role</p>
                    <p className="mt-2 text-xl font-bold">
                      {report.linkedin_claimed_role ?? "Not submitted"}
                    </p>
                  </div>

                  <div>
                    <p className="text-zinc-500">LinkedIn Review</p>
                    <p className="mt-2 text-xl font-bold">
                      {report.linkedin_review_required ? "Required" : "Not required"}
                    </p>
                  </div>
                </div>

              </div>

            ))

          ) : (

            <p className="text-zinc-500">
              No trust reports generated yet.
            </p>

          )}

        </section>

      </div>
    </main>
  );
}
