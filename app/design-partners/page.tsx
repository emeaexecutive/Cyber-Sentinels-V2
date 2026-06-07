import Link from "next/link";

const collaborationAreas = [
  [
    "Why design partners matter",
    "Early collaborators help test whether governed trust workflows are understandable, useful and operationally realistic before broader rollout.",
  ],
  [
    "Early operational collaboration",
    "Cyber Sentinels is looking for teams with real approval, review, verification or audit workflows that need clearer accountability.",
  ],
  [
    "Governance workflow exploration",
    "The current focus is on how evidence, human review, trust events and decision records should move through enterprise operations.",
  ],
  [
    "AI-native trust challenges",
    "AI-assisted work introduces questions around provenance, permissions, escalation and visibility that need careful operational design.",
  ],
  [
    "Feedback-driven platform evolution",
    "Partner feedback shapes workflow language, review paths, evidence requirements and the platform areas that become most important.",
  ],
];

const workflowExamples = [
  [
    "AI-assisted workflow approvals",
    "A team uses AI to prepare an approval recommendation, then routes the final decision through accountable human review.",
  ],
  [
    "Human review escalation",
    "Sensitive or incomplete cases are escalated to a reviewer instead of being resolved by automated logic alone.",
  ],
  [
    "Operational audit trails",
    "Actions, evidence, review notes and decisions are recorded so a team can understand what happened later.",
  ],
  [
    "Evidence-backed verification",
    "Trust decisions are linked to records, files or signals that can be reviewed rather than treated as unsupported conclusions.",
  ],
  [
    "Trust event visibility",
    "Important changes in verification state, review status or permissions become visible to the relevant operational team.",
  ],
  [
    "Governance workflows",
    "Policies, approvals and accountability requirements are translated into repeatable operational review steps.",
  ],
];

const notCyberSentinels = [
  "Social scoring",
  "Operational oversight",
  "Black-box trust scoring",
  "Uncontrolled AI governance",
  "Synthetic authority systems",
];

export default function DesignPartnersPage() {
  return (
    <main className="min-h-screen bg-[#04070c] text-white">
      <section className="border-b border-zinc-900 px-6 py-16 md:px-8">
        <div className="mx-auto max-w-6xl">
          <p className="text-sm uppercase tracking-[0.24em] text-cyan-200">
            Design Partners
          </p>
          <h1 className="mt-5 max-w-4xl text-4xl font-semibold leading-tight md:text-6xl">
            Early operational collaboration for governed trust workflows.
          </h1>
          <p className="mt-6 max-w-3xl text-base leading-8 text-zinc-300">
            Cyber Sentinels is onboarding a small number of early collaborators
            and operational design partners to explore evidence-backed
            verification, human review and AI-native governance workflows.
          </p>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-500">
            Cyber Sentinels is evolving through operational collaboration and
            real-world workflow feedback.
          </p>
          <div className="mt-8">
            <Link
              href="/enterprise-access?intent=design_partner"
              className="inline-flex rounded-lg bg-white px-5 py-3 text-sm font-semibold text-black hover:bg-cyan-100"
            >
              Request Enterprise Access
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-14 md:px-8">
        <div className="grid gap-4 md:grid-cols-2">
          {collaborationAreas.map(([title, copy]) => (
            <article
              key={title}
              className="rounded-lg border border-zinc-800 bg-black p-5"
            >
              <h2 className="text-lg font-semibold text-zinc-100">{title}</h2>
              <p className="mt-3 text-sm leading-6 text-zinc-500">{copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="border-y border-zinc-900 bg-zinc-950 px-6 py-14 md:px-8">
        <div className="mx-auto max-w-6xl">
          <p className="text-sm uppercase tracking-[0.24em] text-zinc-500">
            Enterprise Workflow Examples
          </p>
          <h2 className="mt-4 max-w-3xl text-3xl font-semibold">
            Simple workflows that make review and accountability visible.
          </h2>
          <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {workflowExamples.map(([title, copy]) => (
              <article
                key={title}
                className="rounded-lg border border-zinc-800 bg-black p-5"
              >
                <h3 className="text-base font-semibold text-zinc-100">
                  {title}
                </h3>
                <p className="mt-3 text-sm leading-6 text-zinc-500">{copy}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-8 px-6 py-14 md:px-8 lg:grid-cols-[0.9fr_1.1fr]">
        <div>
          <p className="text-sm uppercase tracking-[0.24em] text-zinc-500">
            Boundaries
          </p>
          <h2 className="mt-4 text-3xl font-semibold">
            What Cyber Sentinels is NOT.
          </h2>
          <p className="mt-4 text-sm leading-7 text-zinc-500">
            The platform direction is governed trust infrastructure, not an
            authority layer that silently ranks people, watches operations or
            replaces accountable human decision-making.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {notCyberSentinels.map((item) => (
            <div
              key={item}
              className="rounded-lg border border-zinc-800 bg-black p-4 text-sm text-zinc-300"
            >
              {item}
            </div>
          ))}
        </div>
      </section>

      <section className="border-t border-zinc-900 px-6 py-14 md:px-8">
        <div className="mx-auto grid max-w-6xl gap-6 rounded-lg border border-zinc-800 bg-black p-6 md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-cyan-200">
              Early Access
            </p>
            <h2 className="mt-3 text-2xl font-semibold">
              Built with serious operational feedback.
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-zinc-500">
              The design partner process is intended for teams willing to share
              workflow observations, governance constraints and early product
              feedback.
            </p>
          </div>
          <Link
            href="/enterprise-access?intent=design_partner"
            className="inline-flex rounded-lg bg-white px-5 py-3 text-sm font-semibold text-black hover:bg-cyan-100"
          >
            Request Enterprise Access
          </Link>
        </div>
      </section>
    </main>
  );
}
