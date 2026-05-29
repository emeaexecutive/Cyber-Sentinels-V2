import { ShieldCheck, Bot, Fingerprint, FileWarning } from "lucide-react";
import { redirect } from "next/navigation";
import { calculateTrustScore } from "@/lib/verification";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const passports = [
  { name: "Executive Login", type: "human", worldVerified: true, domainVerified: true, contentProvenance: false, riskFlags: [] },
  { name: "Research Agent", type: "agent", worldVerified: false, domainVerified: true, contentProvenance: true, riskFlags: [] },
  { name: "Synthetic Interview Clip", type: "content", worldVerified: false, domainVerified: false, contentProvenance: true, riskFlags: ["voice mismatch"] }
] as const;

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/command-center");
  }

  return (
    <main className="min-h-screen bg-sentinel-black px-6 py-8 text-sentinel-white grid-bg">
      <section className="mx-auto max-w-7xl">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-sentinel-green">Cyber Sentinels V2</p>
            <h1 className="mt-2 text-4xl font-semibold">Trust Command Dashboard</h1>
          </div>
          <ShieldCheck className="h-10 w-10 text-sentinel-green" />
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Metric title="Verified Humans" value="148" icon={<Fingerprint />} />
          <Metric title="Agent Passports" value="37" icon={<Bot />} />
          <Metric title="Open Risk Flags" value="4" icon={<FileWarning />} />
        </div>

        <div className="mt-8 rounded-3xl border border-sentinel-line bg-sentinel-panel/80 p-5">
          <h2 className="mb-4 text-xl font-semibold">Recent Trust Passports</h2>
          <div className="space-y-3">
            {passports.map((p) => {
              const score = calculateTrustScore(p);
              return (
                <div key={p.name} className="grid gap-3 rounded-2xl border border-sentinel-line bg-black/30 p-4 md:grid-cols-4">
                  <div>
                    <p className="text-sm text-sentinel-muted">Subject</p>
                    <p className="font-medium">{p.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-sentinel-muted">Type</p>
                    <p className="capitalize">{p.type}</p>
                  </div>
                  <div>
                    <p className="text-sm text-sentinel-muted">Trust Score</p>
                    <p className="text-sentinel-green">{score}/100</p>
                  </div>
                  <div>
                    <p className="text-sm text-sentinel-muted">Risk Flags</p>
                    <p>{p.riskFlags.length}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </main>
  );
}

function Metric({ title, value, icon }: { title: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-3xl border border-sentinel-line bg-white/[0.04] p-5">
      <div className="mb-4 text-sentinel-green">{icon}</div>
      <p className="text-sm text-sentinel-muted">{title}</p>
      <p className="mt-1 text-4xl font-semibold">{value}</p>
    </div>
  );
}
