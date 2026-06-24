import Link from "next/link";
import { PrivateBetaBadge, PrivateBetaNotice } from "@/components/private-beta";

const proofPath = [
  "Verification started",
  "Session Integrity checked",
  "Flags reviewed",
  "Governance Review opened",
  "Replay Evidence retained",
  "Verification receipt issued",
];

const platformSurfaces = [
  ["Active Flags", "Identity, media, injection and session changes that need review."],
  ["Pending Reviews", "Open work that needs a named reviewer or decision."],
  ["Session Integrity", "Liveness, channel, injection and deepfake risk kept separate."],
  ["Governance Actions", "Human review decisions preserved for audit."],
  ["Trust Posture", "Current workflow state without making binary trust claims."],
  ["Verification Receipts", "Readable proof of what was checked, reviewed and retained."],
];

const entryPoints = [
  ["/demo", "View Demo", "See the workflow before setup."],
  ["/enterprise-access", "Enterprise Access", "Request a pilot conversation."],
  ["/enterprise/hiring-security", "Hiring Security", "Start with fake applicants and proxy interviews."],
  ["/pricing", "Pricing", "Review the commercial path."],
];

export default function Home() {
  return (
    <main className="min-h-screen bg-[#05070b] text-zinc-100">
      <section className="mx-auto max-w-6xl px-6 pb-14 pt-12 md:px-8 md:pb-20 md:pt-20">
        <div className="flex flex-wrap items-center gap-3">
          <PrivateBetaBadge />
          <span className="rounded-full border border-cyan-400/40 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-cyan-100">
            Enterprise pilot ready
          </span>
        </div>

        <div className="mt-12 max-w-5xl">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-100">
            Operational Trust Infrastructure for AI-era workflows.
          </p>
          <h1 className="mt-5 text-4xl font-semibold leading-[1.05] text-white md:text-6xl">
            Protect enterprise workflows against synthetic identity attacks.
          </h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-zinc-200">
            Cyber Sentinels keeps Hiring Security, Session Integrity, Verification Evidence, Governance Review and Replay Evidence in one reviewable path.
          </p>
          <p className="mt-4 max-w-3xl text-base leading-7 text-zinc-300">
            Use it to see what changed, who reviewed it and which proof remains before a sensitive workflow moves forward.
          </p>
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/demo" className="rounded-md bg-cyan-300 px-5 py-3 text-sm font-semibold text-zinc-950 hover:bg-cyan-200">
            View Demo
          </Link>
          <Link href="/enterprise-access" className="rounded-md border border-cyan-800 px-5 py-3 text-sm font-semibold text-cyan-100 hover:border-cyan-400">
            Enterprise Access
          </Link>
          <Link href="/enterprise/hiring-security" className="rounded-md border border-zinc-600 px-5 py-3 text-sm font-semibold text-zinc-100 hover:border-zinc-300">
            Hiring Security
          </Link>
          <Link href="/pricing" className="rounded-md border border-zinc-700 px-5 py-3 text-sm font-semibold text-zinc-200 hover:border-zinc-400">
            Pricing
          </Link>
        </div>
        <PrivateBetaNotice className="mt-7 max-w-3xl" />
      </section>

      <section className="border-y border-zinc-800 bg-zinc-950/80">
        <div className="mx-auto max-w-6xl px-6 py-14 md:px-8">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-cyan-100">
              Proof workflow
            </p>
            <h2 className="mt-3 text-3xl font-semibold leading-tight text-white">
              From suspicious session to replayable proof.
            </h2>
            <p className="mt-4 text-sm leading-7 text-zinc-300">
              The product story is intentionally simple: a risky workflow is flagged, reviewed by a human owner and preserved as Verification Evidence.
            </p>
          </div>
          <div className="mt-7 grid gap-3 md:grid-cols-6">
            {proofPath.map((step, index) => (
              <div key={step} className="border-t border-zinc-700 pt-4">
                <p className="text-xs font-semibold text-cyan-200">{index + 1}</p>
                <p className="mt-2 text-sm font-semibold text-zinc-100">{step}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16 md:px-8">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-cyan-100">
            Platform focus
          </p>
          <h2 className="mt-3 text-3xl font-semibold leading-tight text-white">
            Six surfaces. One operational review path.
          </h2>
        </div>
        <div className="mt-7 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {platformSurfaces.map(([title, copy]) => (
            <article key={title} className="rounded-lg border border-zinc-800 bg-black p-5">
              <h3 className="text-lg font-semibold text-white">{title}</h3>
              <p className="mt-3 text-sm leading-6 text-zinc-300">{copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-16 md:px-8">
        <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-cyan-100">
                Demo visibility
              </p>
              <h2 className="mt-3 text-3xl font-semibold text-white">
                Show the workflow before explaining the platform.
              </h2>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-zinc-300">
                The fastest pitch path is Demo, Enterprise Access, Hiring Security and Pricing.
              </p>
            </div>
          </div>
          <div className="mt-6 grid gap-3 md:grid-cols-4">
            {entryPoints.map(([href, title, copy]) => (
              <Link key={href} href={href} className="rounded-lg border border-zinc-800 bg-black p-4 hover:border-cyan-500">
                <p className="font-semibold text-zinc-100">{title}</p>
                <p className="mt-2 text-sm leading-6 text-zinc-400">{copy}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
