import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function PassportPage() {
  const supabase = await createClient();

  const { data: passports } = await supabase
    .from("passports")
    .select("*")
    .order("created_at", { ascending: false });

  const passport = passports?.[0];

  return (
    <main className="min-h-screen bg-black p-8 text-white">
      <div className="mx-auto max-w-5xl">
        <Link href="/" className="text-sm text-zinc-400 hover:text-white">
          ← Back to Cyber Sentinels
        </Link>

        <h1 className="mt-8 text-5xl font-bold">Sentinel Passport</h1>

        <section className="mt-10 rounded-3xl border border-zinc-800 bg-zinc-950 p-8">
          {passport ? (
            <>
              <p className="text-sm text-zinc-500">Subject</p>
              <h2 className="mt-2 text-3xl font-bold">{passport.subject_name}</h2>

              <div className="mt-8 grid gap-4 md:grid-cols-3">
                <div className="rounded-2xl border border-zinc-800 bg-black p-5">
                  <p className="text-zinc-500">Type</p>
                  <p className="mt-3 text-2xl font-bold">{passport.subject_type}</p>
                </div>

                <div className="rounded-2xl border border-zinc-800 bg-black p-5">
                  <p className="text-zinc-500">Trust Score</p>
                  <p className="mt-3 text-2xl font-bold">{passport.trust_score}</p>
                </div>

                <div className="rounded-2xl border border-zinc-800 bg-black p-5">
                  <p className="text-zinc-500">Clearance</p>
                  <p className="mt-3 text-2xl font-bold">{passport.clearance}</p>
                </div>
              </div>
            </>
          ) : (
            <p className="text-zinc-500">No passport created yet.</p>
          )}
        </section>
      </div>
    </main>
  );
}
<form action="/api/passports" method="POST" className="mt-10 grid gap-4 rounded-3xl border border-zinc-800 bg-zinc-950 p-8">
  <h2 className="text-2xl font-bold">Create New Passport</h2>

  <input
    name="user_email"
    type="email"
    placeholder="Email"
    className="rounded-xl border border-zinc-800 bg-black p-4 text-white"
  />

  <input
    name="subject_name"
    placeholder="Subject name"
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

  <button className="rounded-xl bg-white px-5 py-4 font-semibold text-black">
    Create Passport
  </button>
</form>