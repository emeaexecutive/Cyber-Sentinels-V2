import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type Passport = {
  id: string;
  subject_name: string;
  subject_type: string;
  media_type: string | null;
  human_presence_index: number | null;
  synthetic_risk: number | null;
  liveness_score: number | null;
  voice_clone_risk: number | null;
  video_deepfake_risk: number | null;
  image_authenticity_score: number | null;
  origin_trace_score: number | null;
  attribution_confidence: number | null;
  provenance_status: string | null;
  review_status: string | null;
  trust_score: number | null;
  clearance: string | null;
  verified: boolean | null;
  created_at: string | null;
};

export default async function CommandCenterPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: passports } = await supabase
    .from("passports")
    .select("*")
    .order("created_at", { ascending: false })
    .returns<Passport[]>();

  const { data: signals } = await supabase
    .from("signals")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(5);

  const verifiedCount = passports?.filter((p) => p.verified).length ?? 0;

  const averageTrust = passports?.length
    ? Math.round(
        passports.reduce((sum, p) => sum + (p.trust_score ?? 0), 0) /
          passports.length
      )
    : 0;

  const averageHpi = passports?.length
    ? Math.round(
        passports.reduce(
          (sum, p) => sum + (p.human_presence_index ?? 0),
          0
        ) / passports.length
      )
    : 0;

  const reviewPassports =
    passports?.filter((p) => (p.clearance ?? "pending") === "pending") ?? [];
  const pendingCount = reviewPassports.length;
  const originTraceAlerts =
    passports?.filter((p) => (p.attribution_confidence ?? 100) < 50).length ??
    0;
  const averageAttribution = passports?.length
    ? Math.round(
        passports.reduce(
          (sum, p) => sum + (p.attribution_confidence ?? 0),
          0
        ) / passports.length
      )
    : 0;

  return (
    <main className="min-h-screen bg-black p-8 text-white">
      <div className="mx-auto max-w-6xl">
        <Link href="/" className="text-sm text-zinc-400 hover:text-white">
          Back to Cyber Sentinels
        </Link>

        <form action="/api/auth/logout" method="POST" className="mt-4">
          <button className="rounded-xl border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:text-white">
            Logout
          </button>
        </form>

        <h1 className="mt-8 text-5xl font-bold">Command Center</h1>

        <section className="mt-10 grid gap-4 md:grid-cols-4">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
            <p className="text-zinc-500">Passports</p>
            <p className="mt-3 text-4xl font-bold">{passports?.length ?? 0}</p>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
            <p className="text-zinc-500">Verified</p>
            <p className="mt-3 text-4xl font-bold">{verifiedCount}</p>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
            <p className="text-zinc-500">Average Trust</p>
            <p className="mt-3 text-4xl font-bold">{averageTrust}</p>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
            <p className="text-zinc-500">Pending Review</p>
            <p className="mt-3 text-4xl font-bold">{pendingCount}</p>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
            <p className="text-zinc-500">HPI™</p>
            <p className="mt-3 text-4xl font-bold">{averageHpi}</p>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
            <p className="text-zinc-500">Reality Passports</p>
            <p className="mt-3 text-4xl font-bold">{passports?.length ?? 0}</p>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
            <p className="text-zinc-500">Attribution Confidence</p>
            <p className="mt-3 text-4xl font-bold">{averageAttribution}</p>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
            <p className="text-zinc-500">Origin Trace Alerts</p>
            <p className="mt-3 text-4xl font-bold">{originTraceAlerts}</p>
          </div>
        </section>

        <section className="mt-10 rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold">Passport Review Queue</h2>
              <p className="mt-2 text-sm text-zinc-500">
                Approve verified subjects or reject risky submissions.
              </p>
            </div>

            <Link
              href="/passport"
              className="rounded-xl border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:text-white"
            >
              Create Passport
            </Link>
          </div>

          <div className="mt-6 space-y-3">
            {reviewPassports.length ? (
              reviewPassports.map((passport) => (
                <div
                  key={passport.id}
                  className="grid gap-4 rounded-xl border border-zinc-800 p-4 md:grid-cols-[1.5fr_1fr_1fr_1fr_auto]"
                >
                  <div>
                    <p className="text-sm text-zinc-500">Subject</p>
                    <p className="mt-1 font-semibold">
                      {passport.subject_name}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-zinc-500">Type / Media</p>
                    <p className="mt-1 capitalize text-zinc-300">
                      {passport.subject_type} / {passport.media_type ?? "profile"}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-zinc-500">Risk</p>
                    <p className="mt-1 text-zinc-300">
                      Synthetic {passport.synthetic_risk ?? 0}%
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-zinc-500">Liveness / Image</p>
                    <p className="mt-1 capitalize text-zinc-300">
                      {passport.liveness_score ?? 0}% /{" "}
                      {passport.image_authenticity_score ?? 0}%
                    </p>
                  </div>

                  <div className="flex items-center gap-2 md:justify-end">
                    <form
                      action={`/api/passports/${passport.id}/decision`}
                      method="POST"
                    >
                      <input type="hidden" name="decision" value="approve" />
                      <button className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black">
                        Approve
                      </button>
                    </form>

                    <form
                      action={`/api/passports/${passport.id}/decision`}
                      method="POST"
                    >
                      <input type="hidden" name="decision" value="reject" />
                      <button className="rounded-xl border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:text-white">
                        Reject
                      </button>
                    </form>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-zinc-500">No passports awaiting review.</p>
            )}
          </div>
        </section>

        <section className="mt-10 rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
          <h2 className="text-xl font-semibold">Latest Signals</h2>

          <div className="mt-6 space-y-3">
            {signals?.length ? (
              signals.map((signal) => (
                <div
                  key={signal.id}
                  className="rounded-xl border border-zinc-800 p-4 text-zinc-300"
                >
                  {signal.event}
                </div>
              ))
            ) : (
              <p className="text-zinc-500">No signals yet.</p>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
