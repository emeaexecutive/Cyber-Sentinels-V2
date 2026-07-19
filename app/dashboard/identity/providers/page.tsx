import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function IdentityProvidersPage() {
  const supabase = await createClient(); const { data: { user } } = await supabase.auth.getUser(); if (!user) redirect("/login?next=/dashboard/identity/providers");
  const result = await supabase.from("identity_provider_capabilities").select("*").order("provider_id").order("signal_type");
  return <main className="min-h-screen bg-black px-6 py-10 text-zinc-100"><div className="mx-auto max-w-7xl"><Link href="/dashboard/identity" className="text-sm text-cyan-400">← Identity Signals</Link><h1 className="mt-5 text-4xl font-semibold">Provider Capability Truth</h1><p className="mt-3 max-w-3xl text-zinc-400">Configuration presence is not proof of provider health, verification success, or identity accuracy.</p>{result.error ? <p className="mt-8 rounded-lg border border-amber-900 p-4 text-amber-300">Capability schema is unavailable in this environment.</p> : <div className="mt-8 overflow-x-auto rounded-xl border border-zinc-800"><table className="w-full text-left text-sm"><thead className="bg-zinc-950 text-zinc-400"><tr><th className="p-4">Provider</th><th className="p-4">Signal</th><th className="p-4">Implementation</th><th className="p-4">Runtime</th><th className="p-4">Server verified</th></tr></thead><tbody>{result.data?.map((row) => <tr key={`${row.provider_id}:${row.signal_type}`} className="border-t border-zinc-800"><td className="p-4 font-medium">{row.provider_name}</td><td className="p-4">{row.signal_type}</td><td className="p-4 text-zinc-400">{row.implementation_status}</td><td className="p-4 text-zinc-400">{row.runtime_status}</td><td className="p-4">{row.server_verified ? "Eligible after verified exchange" : "No"}</td></tr>)}</tbody></table></div>}</div></main>;
}
