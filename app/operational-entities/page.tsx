import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ensureControlledAgentAlpha } from "@/lib/onboarding/controlled-agent-alpha";
import type { OperationalEntity } from "@/lib/operational-entities/operational-entity";
import { loadOperationalEntities } from "@/lib/operational-entities/server";

export const dynamic = "force-dynamic";

function controlledOnboardingEnabled() {
  return process.env.NODE_ENV === "development" || process.env.VERCEL_ENV === "preview";
}

async function initializeControlledAgentAlpha() {
  "use server";

  if (!controlledOnboardingEnabled()) {
    redirect("/operational-entities?controlled_onboarding=disabled");
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/operational-entities");
  const result = await ensureControlledAgentAlpha({ supabase, user });
  redirect(`/operational-entities/${encodeURIComponent(result.entityId)}`);
}

export default async function OperationalEntitiesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/operational-entities");
  let entities: OperationalEntity[] = [];
  let loadError = "";
  try {
    entities = await loadOperationalEntities({ supabase, user });
  } catch (error) {
    if (error instanceof Error && error.message === "SESSION_TENANT_UNAVAILABLE") {
      entities = [];
    } else {
      console.error("Operational Entity product entry failed safely.", {
        code: (error as { code?: string })?.code ?? "UNKNOWN",
      });
      loadError = "Operational Entities could not be loaded. Retry before creating evidence.";
    }
  }
  const hasAlpha = entities.some((entity) => entity.displayReference.trim().toLowerCase() === "agent alpha");
  const hasBeta = entities.some((entity) => entity.displayReference.trim().toLowerCase() === "agent beta");
  const canInitializeControlledPair = controlledOnboardingEnabled();

  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col gap-6 px-6 py-16">
      <header className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-500">Operational entities</p>
        <h1 className="text-3xl font-semibold text-slate-900">Every consequential entity and action is grounded in one canonical runtime.</h1>
        <p className="max-w-3xl text-sm leading-6 text-slate-600">Identity platforms tell you which AI agents exist and what they can access. Cyber Sentinels preserves whether consequential actions remained within delegated authority and what happened next. Your provider may operate the controls. You own the trust record.</p>
      </header>
      {loadError ? (
        <p className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-900" role="alert">
          {loadError}
        </p>
      ) : null}
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
            <div className="mt-6"><Link className="inline-flex text-sm font-semibold text-slate-900 underline" href={`/operational-entities/${encodeURIComponent(entity.entityId)}`}>View persisted trust record</Link></div>
          </article>
        ))}
        {canInitializeControlledPair && (!hasAlpha || !hasBeta) && !loadError ? (
          <article className="rounded-2xl border border-cyan-200 bg-cyan-50 p-6 text-sm text-slate-700 md:col-span-2">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-800">First trust transaction</p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-950">Resolve canonical Agent Alpha and Agent Beta</h2>
            <p className="mt-3 max-w-3xl leading-6">
              This resolves the tenant&apos;s existing Alpha/Beta records or initializes the canonical first-run pair, then binds Alpha to a persisted authority for READ on Repositories A and B. Beta receives no authority until both agents prove identity, Alpha signs a strict READ Repository A subset, and Beta accepts it. No identity evidence or decision is fabricated here.
            </p>
            <form action={initializeControlledAgentAlpha} className="mt-5">
              <button type="submit" className="rounded-lg bg-slate-950 px-5 py-3 font-semibold text-white hover:bg-slate-800">
                Continue with canonical Alpha and Beta
              </button>
            </form>
          </article>
        ) : null}
      </section>
    </main>
  );
}
