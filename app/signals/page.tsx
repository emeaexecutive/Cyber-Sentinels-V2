import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

const supportedSignals = [
  "Human Presence Index calculated",
  "Reality Passport created",
  "Origin Trace generated",
  "Metadata stripped",
  "Watermark not found",
  "Human review required",
];

export default async function SignalsPage() {
  const supabase = await createClient();

  const { data: signals } = await supabase
    .from("signals")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <main className="min-h-screen bg-black text-white p-8">
      <div className="max-w-5xl mx-auto">
        <Link href="/" className="text-sm text-zinc-400 hover:text-white">
          Back to Cyber Sentinels
        </Link>

        <h1 className="mt-8 text-5xl font-bold">
          Live Signals
        </h1>

        <section className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
          <h2 className="text-xl font-semibold">Supported Signal Types</h2>
          <div className="mt-4 grid gap-2 text-sm text-zinc-400 md:grid-cols-2">
            {supportedSignals.map((signal) => (
              <p key={signal}>{signal}</p>
            ))}
          </div>
        </section>

        <div className="mt-8 space-y-4">
          {signals?.length ? (
            signals.map((signal) => (
              <div
                key={signal.id}
                className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5"
              >
                <p className="font-semibold">{signal.event}</p>

                <p className="mt-2 text-sm text-zinc-500">
                  {new Date(signal.created_at).toLocaleString()}
                </p>
              </div>
            ))
          ) : (
            <div className="text-zinc-500">
              No signals detected yet.
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
