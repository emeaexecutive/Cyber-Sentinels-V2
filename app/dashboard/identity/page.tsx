import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function badge(value: string) {
  return value === "AVAILABLE" || value === "COMPLETED" ? "border-emerald-800 text-emerald-300" : value === "PARTIAL" ? "border-amber-800 text-amber-300" : "border-zinc-700 text-zinc-400";
}

export default async function IdentitySignalsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/dashboard/identity");
  const owned = await supabase.from("trust_workspaces").select("id,name").eq("created_by", user.id).order("created_at").limit(1).maybeSingle();
  const membership = owned.data ? null : await supabase.from("workspace_members").select("workspace_id,trust_workspaces(id,name)").eq("user_id", user.id).limit(1).maybeSingle();
  const workspace = owned.data ?? (membership?.data?.trust_workspaces as unknown as { id: string; name: string | null } | null);
  if (!workspace) return <main className="min-h-screen bg-black p-8 text-zinc-100"><div className="mx-auto max-w-6xl"><h1 className="text-3xl font-semibold">Identity Signals</h1><p className="mt-4 text-zinc-400">Create or join a Trust Workspace before using enterprise identity signals.</p></div></main>;
  const [requests, subjects, capabilities] = await Promise.all([
    supabase.from("identity_verification_requests").select("id,subject_id,status,purpose,requested_signals,created_at").eq("enterprise_id", workspace.id).order("created_at", { ascending: false }).limit(25),
    supabase.from("identity_subjects").select("id,subject_type,display_label,created_at").eq("enterprise_id", workspace.id).order("created_at", { ascending: false }).limit(25),
    supabase.from("identity_provider_capabilities").select("provider_id,signal_type,implementation_status,runtime_status").order("provider_id").limit(50),
  ]);
  const schemaMissing = [requests.error, subjects.error, capabilities.error].some((error) => error?.code === "42P01");
  return <main className="min-h-screen bg-black px-6 py-10 text-zinc-100"><div className="mx-auto max-w-7xl">
    <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm uppercase tracking-[0.2em] text-cyan-400">Enterprise Identity Intelligence</p><h1 className="mt-2 text-4xl font-semibold">Identity Signal Engine</h1><p className="mt-3 text-zinc-400">Workspace: {workspace.name ?? workspace.id}. Evidence is advisory and never an authorization decision.</p></div><Link href="/dashboard/identity/providers" className="rounded-lg border border-cyan-800 px-4 py-2 text-sm text-cyan-300">Provider capability truth</Link></div>
    {schemaMissing ? <section className="mt-8 rounded-xl border border-amber-900 bg-amber-950/20 p-5"><h2 className="font-semibold text-amber-300">Schema deployment required</h2><p className="mt-2 text-sm text-amber-200/70">Migration 202607190001_identity_signal_engine.sql has not been applied to this environment. No demo identity data is shown.</p></section> : null}
    <section className="mt-8 grid gap-5 md:grid-cols-3"><div className="rounded-xl border border-zinc-800 bg-zinc-950 p-5"><p className="text-sm text-zinc-500">Subjects</p><p className="mt-2 text-3xl font-semibold">{subjects.data?.length ?? 0}</p></div><div className="rounded-xl border border-zinc-800 bg-zinc-950 p-5"><p className="text-sm text-zinc-500">Recent requests</p><p className="mt-2 text-3xl font-semibold">{requests.data?.length ?? 0}</p></div><div className="rounded-xl border border-zinc-800 bg-zinc-950 p-5"><p className="text-sm text-zinc-500">Declared capabilities</p><p className="mt-2 text-3xl font-semibold">{capabilities.data?.length ?? 0}</p></div></section>
    <section className="mt-8 rounded-xl border border-zinc-800 bg-zinc-950 p-6"><h2 className="text-xl font-semibold">Verification activity</h2><div className="mt-4 grid gap-3">{requests.data?.length ? requests.data.map((row) => <Link key={row.id} href={`/dashboard/identity/verifications/${row.id}`} className="rounded-lg border border-zinc-800 bg-black p-4 hover:border-cyan-900"><div className="flex justify-between gap-4"><div><p className="font-medium">{row.purpose}</p><p className="mt-1 text-sm text-zinc-500">{row.requested_signals.join(", ")}</p></div><span className={`h-fit rounded border px-2 py-1 text-xs ${badge(row.status)}`}>{row.status}</span></div></Link>) : <p className="rounded-lg border border-zinc-800 bg-black p-4 text-sm text-zinc-500">No verification requests exist. Use the authenticated API to create a subject and start a verification.</p>}</div></section>
  </div></main>;
}
