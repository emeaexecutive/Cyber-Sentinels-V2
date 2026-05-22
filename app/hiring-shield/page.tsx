import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function HiringShieldPage() {
  const supabase = await createClient();

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
            name="profile_consistency"
            type="number"
            placeholder="Profile consistency score e.g. 88"
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
            <option value="profile">Profile</option>
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
                      Trust Score
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
