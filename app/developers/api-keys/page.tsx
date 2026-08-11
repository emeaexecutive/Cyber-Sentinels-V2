import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { resolveOperationalEntityTenantId } from "@/lib/operational-entities/server";
import { ApiKeyManager } from "./api-key-manager";

export const dynamic = "force-dynamic";

export default async function DeveloperApiKeysPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/developers/api-keys");
  const enterpriseId = await resolveOperationalEntityTenantId(supabase, user);
  return <main className="min-h-screen bg-[#04070c] px-6 py-12 text-white md:px-8">
    <div className="mx-auto max-w-6xl">
      <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-6">
        <p className="text-xs uppercase tracking-[0.24em] text-cyan-200">Developer Access · External Agent Trust API v0.1</p>
        <h1 className="mt-4 text-4xl font-semibold">API clients and keys</h1>
        <p className="mt-4 max-w-3xl text-sm leading-6 text-zinc-400">Create, scope, rotate, and revoke tenant-bound server credentials for external agents. The raw secret is returned once; only its digest and identifying prefix remain.</p>
        <Link href="/developers/quickstart" className="mt-4 inline-flex text-sm font-semibold text-cyan-200 underline">Build Agent Gamma with the quickstart</Link>
      </section>
      <ApiKeyManager enterpriseId={enterpriseId} />
    </div>
  </main>;
}
