import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type Membership = { role: string; trust_workspaces: { id: string; name: string } | null };

export default async function AccountPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/account");
  const [memberships, keys] = await Promise.all([
    supabase.from("workspace_members").select("role,trust_workspaces(id,name)").eq("user_id", user.id),
    supabase.from("api_keys").select("id", { count: "exact", head: true }).eq("owner_user_id", user.id).eq("status", "active"),
  ]);
  const organisations = memberships.error ? [] : (memberships.data ?? []) as unknown as Membership[];
  const providers = Array.isArray(user.app_metadata?.providers) ? user.app_metadata.providers.map(String) : [];

  return <main className="mx-auto min-h-screen max-w-5xl px-5 py-12 md:px-8"><header><p className="operational-eyebrow">Account</p><h1 className="mt-3 text-3xl font-semibold text-slate-950 md:text-5xl">Identity, organisation, and security.</h1><p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600">Review the authenticated identity and the access Cyber Sentinels can prove from persisted membership records.</p></header><div className="mt-8 grid gap-5 lg:grid-cols-2"><section className="rounded-2xl border border-slate-200 bg-white p-6"><h2 className="text-xl font-semibold">Profile</h2><dl className="mt-5 space-y-4 text-sm"><div><dt className="text-slate-500">Email</dt><dd className="mt-1 break-all font-medium text-slate-900">{user.email ?? "Not recorded"}</dd></div><div><dt className="text-slate-500">Email status</dt><dd className="mt-1 font-medium text-slate-900">{user.email_confirmed_at ? "Verified" : "Verification required"}</dd></div><div><dt className="text-slate-500">Sign-in methods</dt><dd className="mt-1 font-medium text-slate-900">{providers.length ? providers.join(", ") : "Email"}</dd></div></dl><div className="mt-6 flex flex-wrap gap-3"><Link className="brand-secondary-action" href="/account/reset-password">Change password</Link><form action="/api/auth/logout" method="POST"><button className="brand-primary-action" type="submit">Sign out everywhere here</button></form></div></section><section className="rounded-2xl border border-slate-200 bg-white p-6"><h2 className="text-xl font-semibold">Organisation access</h2>{organisations.length ? <ul className="mt-5 space-y-3">{organisations.map((membership, index) => <li key={`${membership.trust_workspaces?.id ?? "workspace"}-${index}`} className="rounded-xl bg-slate-50 p-4"><p className="font-semibold text-slate-950">{membership.trust_workspaces?.name ?? "Workspace"}</p><p className="mt-1 text-sm capitalize text-slate-600">{membership.role}</p></li>)}</ul> : <p className="mt-4 text-sm text-slate-600">No organisation membership was returned for this identity.</p>}<Link className="mt-5 inline-flex font-semibold underline" href="/team-access">Manage members and roles</Link></section><section className="rounded-2xl border border-slate-200 bg-white p-6"><h2 className="text-xl font-semibold">Developer access</h2><p className="mt-3 text-sm text-slate-600">{keys.error ? "API-key status is currently unavailable." : `${keys.count ?? 0} active API key${keys.count === 1 ? "" : "s"}.`}</p><Link className="mt-5 inline-flex font-semibold underline" href="/developers/api-keys">Manage API keys</Link></section><section className="rounded-2xl border border-amber-200 bg-amber-50 p-6"><h2 className="text-xl font-semibold text-slate-950">Account deletion</h2><p className="mt-3 text-sm leading-6 text-slate-700">Deletion is handled as a verified data-rights request so tenant evidence, legal retention, active API credentials, and workspace ownership are reviewed before identity removal. Cyber Sentinels does not claim instant deletion while those obligations exist.</p><Link className="mt-5 inline-flex font-semibold text-slate-950 underline" href="/data-rights">Start a deletion request</Link></section></div></main>;
}
