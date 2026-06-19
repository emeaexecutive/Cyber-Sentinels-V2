import Link from "next/link";
import { redirect } from "next/navigation";
import { RecruiterDashboardCards, StatusBadge } from "@/components/phase-one-trust";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type ProfileRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  verification_status: string | null;
};

type SessionRow = {
  id: string;
  title: string | null;
  status: string | null;
  created_at: string | null;
};

export default async function RecruiterDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/recruiter/dashboard");
  }

  const [{ data: candidates }, { data: recruiters }, { data: sessions }] =
    await Promise.all([
      supabase.from("candidate_profiles").select("id,full_name,email,verification_status").order("created_at", { ascending: false }).limit(20),
      supabase.from("recruiter_profiles").select("id,full_name,email,verification_status").order("created_at", { ascending: false }).limit(10),
      supabase.from("interview_sessions").select("id,title,status,created_at").order("created_at", { ascending: false }).limit(20),
    ]);

  const candidateRows = (candidates ?? []) as ProfileRow[];
  const recruiterRows = (recruiters ?? []) as ProfileRow[];
  const sessionRows = (sessions ?? []) as SessionRow[];

  return (
    <main className="min-h-screen bg-[#04070c] px-6 py-12 text-white md:px-8">
      <div className="mx-auto max-w-7xl">
        <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-6">
          <p className="text-sm uppercase tracking-[0.24em] text-cyan-200">
            Recruiter Dashboard
          </p>
          <h1 className="mt-4 text-4xl font-semibold">Trusted Hiring Queue</h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-400">
            Create interview sessions, monitor placeholder integrity flags and
            open audit-ready hiring reports.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/dashboard/interview-risk" className="rounded-lg bg-white px-4 py-3 text-sm font-semibold text-black">
              Open Interview Risk Dashboard
            </Link>
            <Link href="/enterprise/hiring-security" className="rounded-lg border border-cyan-800 px-4 py-3 text-sm text-cyan-100">
              Hiring Security
            </Link>
          </div>
        </section>

        <section className="mt-8">
          <RecruiterDashboardCards />
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-[360px_1fr]">
          <form action="/api/interview/create" method="post" className="grid gap-4 rounded-lg border border-zinc-800 bg-black p-5">
            <h2 className="text-xl font-semibold">Create Interview Session</h2>
            <input name="title" placeholder="Session title" className="rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-white" />
            <select name="candidate_profile_id" className="rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-white" defaultValue="">
              <option value="">Candidate profile</option>
              {candidateRows.map((candidate) => (
                <option key={candidate.id} value={candidate.id}>{candidate.full_name ?? candidate.email}</option>
              ))}
            </select>
            <select name="recruiter_profile_id" className="rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-white" defaultValue="">
              <option value="">Recruiter profile</option>
              {recruiterRows.map((recruiter) => (
                <option key={recruiter.id} value={recruiter.id}>{recruiter.full_name ?? recruiter.email}</option>
              ))}
            </select>
            <button className="rounded-lg bg-white px-4 py-3 text-sm font-semibold text-black">
              Create Session
            </button>
          </form>

          <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold">Interview Sessions</h2>
            <div className="mt-5 grid gap-3">
              {sessionRows.length ? sessionRows.map((session) => (
                <Link key={session.id} href={`/interview/session/${session.id}`} className="rounded-lg border border-zinc-800 bg-black p-4 hover:border-cyan-800">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="font-medium">{session.title ?? "Trusted hiring interview"}</p>
                    <StatusBadge status={session.status ?? "pending"} />
                  </div>
                  <p className="mt-2 text-xs text-zinc-600">{session.id}</p>
                </Link>
              )) : (
                <p className="rounded-lg border border-zinc-800 bg-black p-4 text-sm text-zinc-500">
                  No interview sessions yet.
                </p>
              )}
            </div>
          </section>
        </section>
      </div>
    </main>
  );
}
