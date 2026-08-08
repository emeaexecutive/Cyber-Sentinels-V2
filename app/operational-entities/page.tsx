import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { loadOperationalEntities } from "@/lib/operational-entities/server";

export const dynamic = "force-dynamic";

export default async function OperationalEntitiesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/operational-entities");
  const entities = await loadOperationalEntities({ supabase, user });

  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col gap-6 px-6 py-16">
      <header className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-500">Operational entities</p>
        <h1 className="text-3xl font-semibold text-slate-900">Every consequential entity and action is grounded in one canonical runtime.</h1>
        <p className="max-w-3xl text-sm leading-6 text-slate-600">Identity platforms tell you which AI agents exist and what they can access. Cyber Sentinels preserves whether consequential actions remained within delegated authority and what happened next. Your provider may operate the controls. You own the trust record.</p>
      </header>
      <section className="grid gap-4 md:grid-cols-2">
        {entities.map((entity) => (
          <article key={entity.entityId} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">{entity.displayReference}</h2>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-700">{entity.lifecycleState}</span>
            </div>
            <dl className="mt-4 grid gap-3 text-sm text-slate-600">
              <div><dt className="font-medium text-slate-800">Type</dt><dd>{entity.entityType}</dd></div>
              <div><dt className="font-medium text-slate-800">Owner</dt><dd>{entity.accountableOwnerId}</dd></div>
              <div><dt className="font-medium text-slate-800">Authority</dt><dd>{entity.currentAuthorityReferences.join(", ") || "legacy_unresolved"}</dd></div>
              <div><dt className="font-medium text-slate-800">Trust</dt><dd>{entity.currentTrustState}</dd></div>
            </dl>
            <div className="mt-5 border-t border-slate-200 pt-4">
              <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">External identity federation</h3>
              {entity.externalIdentityReferences.length ? (
                <ul className="mt-3 space-y-2 text-sm text-slate-600">
                  {entity.externalIdentityReferences.map((identity) => (
                    <li key={identity.referenceId} className="rounded-lg bg-slate-50 p-3">
                      <span className="font-medium text-slate-900">{identity.provider}</span> · {identity.providerEntityId} · {identity.providerNativeLifecycle}
                      <span className="mt-1 block text-xs">Owner: {identity.providerOwner ?? "Not recorded"} · Observed: {identity.observedAt}</span>
                    </li>
                  ))}
                </ul>
              ) : <p className="mt-2 text-sm text-slate-500">No external registry evidence recorded.</p>}
              <p className="mt-3 text-xs leading-5 text-slate-500">Registry presence is evidence; it does not establish trust or delegated authority by itself.</p>
            </div>
            <div className="mt-6"><Link className="inline-flex text-sm font-semibold text-slate-900 underline" href={`/operational-entities/${encodeURIComponent(entity.entityId)}`}>View live trust record</Link></div>
          </article>
        ))}
        {!entities.length ? <p className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600">No governed Operational Entities are recorded in this tenant. No provider evidence has been inferred.</p> : null}
      </section>
    </main>
  );
}
