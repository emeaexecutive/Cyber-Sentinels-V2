import Link from "next/link";
import { ShieldCheck, ClipboardCheck, FileWarning, Activity } from "lucide-react";
import { redirect } from "next/navigation";
import { calculateTrustScore } from "@/lib/verification";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const passports = [
  { name: "Senior Finance Candidate", reviewType: "candidate", type: "human", worldVerified: true, domainVerified: true, contentProvenance: false, riskFlags: [] },
  { name: "Recruiter Ownership Review", reviewType: "recruiter", type: "human", worldVerified: false, domainVerified: true, contentProvenance: true, riskFlags: [] },
  { name: "Interview Evidence Review", reviewType: "interview", type: "content", worldVerified: false, domainVerified: false, contentProvenance: true, riskFlags: ["voice mismatch"] }
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
            <p className="text-sm uppercase tracking-[0.3em] text-sentinel-green">Cyber Sentinels</p>
            <h1 className="mt-2 text-4xl font-semibold">Hiring Security Dashboard</h1>
          </div>
          <ShieldCheck className="h-10 w-10 text-sentinel-green" />
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Metric title="Active Flags" value="12" icon={<FileWarning />} />
          <Metric title="Pending Reviews" value="4" icon={<ClipboardCheck />} />
          <Metric title="Verification Progress" value="82%" icon={<Activity />} />
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {[
            ["/enterprise/hiring-security", "Hiring Security"],
            ["/verify/candidate", "Candidate Verification"],
            ["/governance", "Governance Reviews"],
          ].map(([href, label]) => (
            <Link
              key={href}
              href={href}
              className="rounded-3xl border border-sentinel-line bg-white/[0.04] p-5 hover:border-sentinel-green"
            >
              <p className="text-sm text-sentinel-muted">Review Workflow</p>
              <p className="mt-2 text-xl font-semibold">{label}</p>
            </Link>
          ))}
        </div>

        <div className="mt-8 rounded-3xl border border-sentinel-line bg-sentinel-panel/80 p-5">
          <h2 className="mb-4 text-xl font-semibold">Recent Hiring Verification Workflows</h2>
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
                    <p className="text-sm text-sentinel-muted">Review Type</p>
                    <p className="capitalize">{p.reviewType}</p>
                  </div>
                  <div>
                    <p className="text-sm text-sentinel-muted">Verification Confidence</p>
                    <p className="text-sentinel-green">{score}/100</p>
                  </div>
                  <div>
                    <p className="text-sm text-sentinel-muted">Active Flags</p>
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
