import Link from "next/link";
import { entityIdentityModel, entityDecisionSurface } from "@/lib/core/entity-identity";

const principles = [
  ["Evidence before outcome", "Trust Posture is supported by inspectable evidence, not a hidden verdict."],
  ["Human governance", "Sensitive workflow changes remain reviewable, attributable and reversible where appropriate."],
  ["Replayable chronology", "Evidence, policy triggers, reviewer actions and authorization changes remain connected over time."],
  ["Provider transparency", "Live, Simulated, Awaiting Credentials and Disabled states remain explicit."],
];

const entityCopy: Record<string, { label: string; identified: string; verified: string; collected: string; decisions: string }> = {
  human: {
    label: "Humans",
    identified: "Supabase auth user ID, email verification, phone/MFA status and proof-of-human provider status.",
    verified: "Device/session continuity, geo/session risk and manual review status keep the person tied to the workflow context.",
    collected: "Authentication state, session integrity, provider evidence, review notes and replay references.",
    decisions: "Actions can be allowed, sent to review, escalated for step-up verification or blocked with replay retained.",
  },
  ai_agent: {
    label: "AI Agents",
    identified: "Agent registry ID, agent name, owner organization and named human authority.",
    verified: "Delegated permissions, signed action receipts, runtime session status and kill-switch status are checked before reliance.",
    collected: "Registry records, permission scope, receipt references, runtime events and governance interventions.",
    decisions: "Agent actions can proceed, require human review, trigger a kill-switch review or be blocked.",
  },
  machine_identity: {
    label: "Machine Identities",
    identified: "Service accounts, API key placeholders, OAuth app placeholders, certificate placeholders and credential ownership.",
    verified: "Token scope, expiry/rotation status, orphaned status and linked agent/workflow context remain visible.",
    collected: "Credential metadata, declared scopes, owner lineage, rotation state and replayed use events.",
    decisions: "Credential use can be allowed, reviewed for ownership or scope, escalated for rotation or blocked.",
  },
  regulated_workflow: {
    label: "Regulated Workflows",
    identified: "Workflow type, data sensitivity, policy requirement, approval requirement and governance owner.",
    verified: "Replay, evidence and approval requirements are checked against the workflow's regulated context placeholder.",
    collected: "Policy context, evidence requirements, approval records, governance actions and replay chronology.",
    decisions: "Workflows can continue, route to governance review, require additional evidence or be blocked.",
  },
};

export default function TrustPage() {
  return (
    <main className="min-h-screen bg-[#04070c] px-6 py-12 text-white md:px-8">
      <div className="mx-auto max-w-6xl">
        <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-6 md:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-200">Trust</p>
          <h1 className="mt-4 max-w-4xl text-4xl font-semibold md:text-5xl">
            Explainable operational trust, governed by evidence.
          </h1>
          <p className="mt-5 max-w-3xl text-sm leading-7 text-zinc-300">
            Cyber Sentinels coordinates verification signals, Evidence Chains,
            Governance Review and Replay Timelines without claiming autonomous truth
            detection or perfect identity certainty.
          </p>
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-2">
          {principles.map(([title, copy]) => (
            <article key={title} className="rounded-lg border border-zinc-800 bg-black p-5">
              <h2 className="text-lg font-semibold">{title}</h2>
              <p className="mt-3 text-sm leading-6 text-zinc-300">{copy}</p>
            </article>
          ))}
        </section>

        <section className="mt-8 rounded-lg border border-zinc-800 bg-zinc-950 p-5 md:p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-200">
            Entity Identity Model
          </p>
          <h2 className="mt-3 text-2xl font-semibold">
            Humans, AI agents, machine identities and regulated workflows enter one trust control plane.
          </h2>
          <p className="mt-3 max-w-4xl text-sm leading-7 text-zinc-400">
            Each entity carries owner, authority, verification status, trust posture,
            evidence references, replay references, governance status and risk level.
            The same context feeds the trust engine, runtime engine, replay engine,
            governance engine and ML validation engine without creating a parallel
            trust score or fake provider capability.
          </p>
          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            {entityIdentityModel.map((entity) => {
              const copy = entityCopy[entity.type];
              const surface = entityDecisionSurface(entity);
              return (
                <article key={entity.id} className="rounded-lg border border-zinc-800 bg-black p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-semibold text-zinc-100">{copy.label}</h3>
                      <p className="mt-1 text-xs uppercase tracking-[0.12em] text-zinc-500">{entity.type.replaceAll("_", " ")}</p>
                    </div>
                    <span className="rounded-full border border-zinc-700 px-2.5 py-1 text-xs capitalize text-zinc-300">
                      {entity.trust_posture.replaceAll("_", " ")}
                    </span>
                  </div>
                  <dl className="mt-4 grid gap-3 text-sm leading-6 text-zinc-400">
                    <div>
                      <dt className="font-medium text-zinc-200">How identified</dt>
                      <dd className="mt-1">{copy.identified}</dd>
                    </div>
                    <div>
                      <dt className="font-medium text-zinc-200">How verified</dt>
                      <dd className="mt-1">{copy.verified}</dd>
                    </div>
                    <div>
                      <dt className="font-medium text-zinc-200">Evidence collected</dt>
                      <dd className="mt-1">{copy.collected}</dd>
                    </div>
                    <div>
                      <dt className="font-medium text-zinc-200">Allowed / reviewed / blocked</dt>
                      <dd className="mt-1">{copy.decisions}</dd>
                    </div>
                  </dl>
                  <p className="mt-4 border-t border-zinc-800 pt-4 text-xs leading-5 text-zinc-500">
                    Replay surface: {surface.entity_type.replaceAll("_", " ")} / {surface.decision} / {surface.outcome}
                  </p>
                </article>
              );
            })}
          </div>
        </section>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/methodology" className="brand-primary-action">Review Methodology</Link>
          <Link href="/security" className="brand-secondary-action">Security &amp; Trust</Link>
        </div>
      </div>
    </main>
  );
}
