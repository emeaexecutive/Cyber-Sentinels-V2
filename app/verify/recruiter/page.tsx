import { RecruiterDashboardCards, VerificationTimeline } from "@/components/phase-one-trust";
import { verificationTimeline } from "@/lib/trusted-layer/phase1";

export const dynamic = "force-dynamic";

export default function RecruiterVerificationPage() {
  return (
    <main className="min-h-screen bg-[#04070c] px-6 py-12 text-white md:px-8">
      <div className="mx-auto max-w-6xl">
        <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-6">
          <p className="text-sm uppercase tracking-[0.24em] text-cyan-200">Recruiter Trust</p>
          <h1 className="mt-4 text-4xl font-semibold md:text-5xl">Recruiter Verification</h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-400">
            Confirm recruiter identity, organization domain, role claim and hiring workflow context before candidate trust checks are issued.
          </p>
        </section>

        <section className="mt-8">
          <RecruiterDashboardCards />
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-[0.9fr_1.2fr]">
          <form action="/api/recruiter/verify" method="POST" className="grid gap-4 rounded-lg border border-zinc-800 bg-black p-5">
            <h2 className="text-xl font-semibold">Verify Recruiter</h2>
            <input name="full_name" required placeholder="Recruiter full name" className="rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-white" />
            <input name="email" type="email" required placeholder="Work email" className="rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-white" />
            <input name="company_name" required placeholder="Company" className="rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-white" />
            <input name="role_title" placeholder="Recruiting role" className="rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-white" />
            <select name="verification_status" defaultValue="pending" className="rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-white">
              <option value="pending">Pending</option>
              <option value="verified">Verified</option>
              <option value="needs_manual_review">Needs Review</option>
              <option value="risk_detected">Risk Detected</option>
            </select>
            <textarea name="notes" placeholder="Notes" rows={4} className="rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-white" />
            <button className="rounded-lg bg-white px-4 py-3 text-sm font-semibold text-black">Verify Recruiter</button>
          </form>
          <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold">Verification Timeline</h2>
            <div className="mt-5">
              <VerificationTimeline events={verificationTimeline("recruiter")} />
            </div>
          </section>
        </section>
      </div>
    </main>
  );
}
