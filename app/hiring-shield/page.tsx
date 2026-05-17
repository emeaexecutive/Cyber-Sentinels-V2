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
          ← Back to Cyber Sentinels
        </Link>

        <h1 className="mt-8 text-5xl font-bold">Hiring Shield</h1>

        <p className="mt-4 max-w-2xl text-zinc-400">
          Candidate trust reports for identity confidence, synthetic risk and profile consistency.
        </p>

        <section className="mt-10 space-y-4">
          {reports?.length ? (
            reports.map((report) => (
              <div key={report.id} className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
                <p className="text-sm text-zinc-500">Trust Report</p>

                <div className="mt-5 grid gap-4 md:grid-cols-3">
                  <div>
                    <p className="text-zinc-500">Profile Consistency</p>
                    <p className="mt-2 text-3xl font-bold">{report.profile_consistency}%</p>
                  </div>

                  <div>
                    <p className="text-zinc-500">Synthetic Risk</p>
                    <p className="mt-2 text-3xl font-bold">{report.synthetic_risk}%</p>
                  </div>

                  <div>
                    <p className="text-zinc-500">Confidence</p>
                    <p className="mt-2 text-3xl font-bold">{report.confidence}%</p>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <p className="text-zinc-500">No trust reports generated yet.</p>
          )}
        </section>
      </div>
    </main>
  );
}