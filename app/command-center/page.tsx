import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function CommandCenterPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: passports } = await supabase.from("passports").select("*");
  const { data: signals } = await supabase
    .from("signals")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(5);

  const verifiedCount = passports?.filter((p) => p.verified).length ?? 0;
  const averageTrust =
    passports?.length
      ? Math.round(passports.reduce((sum, p) => sum + (p.trust_score ?? 0), 0) / passports.length)
      : 0;

  return (
    <main className="min-h-screen bg-black p-8 text-white">
      <div className="mx-auto max-w-6xl">
        <Link href="/" className="text-sm text-zinc-400 hover:text-white">
          ← Back to Cyber Sentinels
        </Link>
<form action="/api/auth/logout" method="POST" className="mt-4">
          <button className="rounded-xl border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:text-white">
            Logout
          </button>
        </form>
        <h1 className="mt-8 text-5xl font-bold">Command Center</h1>

        <section className="mt-10 grid gap-4 md:grid-cols-3">
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
        </section>

        <section className="mt-10 rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
          <h2 className="text-xl font-semibold">Latest Signals</h2>

          <div className="mt-6 space-y-3">
            {signals?.length ? (
              signals.map((signal) => (
                <div key={signal.id} className="rounded-xl border border-zinc-800 p-4 text-zinc-300">
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