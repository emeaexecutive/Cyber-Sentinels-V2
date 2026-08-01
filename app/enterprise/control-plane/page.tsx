import type { Metadata } from "next";
import Link from "next/link";
import { EnterpriseTrustControlPlane } from "@/components/enterprise-trust-control-plane";
import { requireAdminPageAccess } from "@/lib/auth/isAdmin";
import { governanceEngine } from "@/lib/core/governance-engine";
import { POLICY_ENGINE_BOUNDARY } from "@/lib/policy-engine";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Enterprise Trust Control Plane | Cyber Sentinels",
  description:
    "Explainable operational trust policy, governance routing and replay continuity controls.",
};

export default async function EnterpriseControlPlanePage() {
  const supabase = await createClient();
  await requireAdminPageAccess(supabase, {
    path: "/enterprise/control-plane",
  });

  return (
    <main className="min-h-screen bg-[#04070c] px-6 py-10 text-white md:px-8">
      <div className="mx-auto max-w-7xl">
        <section className="grid-bg rounded-lg border border-zinc-800 bg-zinc-950 p-6 md:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-cyan-200">
            Enterprise Trust Control Plane
          </p>
          <h1 className="mt-4 max-w-5xl text-4xl font-semibold md:text-6xl">
            Operational policy and governance routing.
          </h1>
          <p className="mt-5 max-w-4xl text-lg leading-8 text-zinc-200">
            Govern enterprise-owned operational memory, explainable trust
            thresholds, provider policy, reviewer ownership and replay
            retention without replacing accountable human decisions.
          </p>
          <p className="mt-4 max-w-4xl text-base leading-7 text-zinc-300">
            Cyber Sentinels continuously verifies that an AI agent&apos;s identity,
            authority, declared environment and permitted scope still match the
            conditions in which its actions execute. Scope Continuity™ uses
            Environment Attestation because declared scope is not trusted until
            runtime evidence confirms it.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/dashboard/governance"
              className="brand-primary-action brand-action-large text-sm"
            >
              Open Governance Queue
            </Link>
            <Link
              href="/trust-replay"
              className="brand-secondary-action brand-action-large text-sm"
            >
              Review Replay
            </Link>
            <Link
              href="/admin/test-lab"
              className="brand-secondary-action brand-action-large text-sm"
            >
              Validate Policy Scenarios
            </Link>
            <Link
              href="/enterprise/readiness"
              className="brand-secondary-action brand-action-large text-sm"
            >
              Review Deployment Readiness
            </Link>
            <Link
              href="/dashboard/environment-scope"
              className="brand-secondary-action brand-action-large text-sm"
            >
              Review Environment &amp; Scope
            </Link>
          </div>
        </section>

        <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {[
            ["Human-reviewable", "Every routed workflow retains named review ownership."],
            ["Explainable", "Every trigger exposes its threshold, observation and evidence."],
            ["Replay-linked", "Policy, reason, threshold and resolution context remain reconstructable."],
            ["Enterprise-owned", "Workflow memory, provider use and operational evidence remain governed by enterprise policy."],
            ["Non-punitive", "The engine routes work; it does not accuse or impose automatic penalties."],
          ].map(([title, copy]) => (
            <article key={title} className="rounded-lg border border-zinc-800 bg-black p-5">
              <h2 className="font-semibold text-zinc-100">{title}</h2>
              <p className="mt-3 text-sm leading-6 text-zinc-400">{copy}</p>
            </article>
          ))}
        </section>

        <section className="mt-8">
          <EnterpriseTrustControlPlane initialPolicies={governanceEngine.listGovernancePolicies()} />
        </section>

        <section className="mt-8 rounded-lg border border-zinc-800 bg-zinc-950 p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-cyan-200">
            Control boundary
          </p>
          <p className="mt-3 max-w-4xl text-sm leading-7 text-zinc-300">
            Policy previews are deterministic operational routing support. Human
            review remains authoritative, audit context is retained, and no
            result represents biometric certainty, autonomous truth detection
            or an automatic punitive decision.
          </p>
          <div className="mt-4 flex flex-wrap gap-2 text-xs text-zinc-400">
            {Object.entries(POLICY_ENGINE_BOUNDARY).map(([label, value]) => (
              <span key={label} className="rounded-full border border-zinc-700 px-2.5 py-1">
                {label.replaceAll(/([A-Z])/g, " $1").toLowerCase()}: {String(value)}
              </span>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
