import Image from "next/image";
import Link from "next/link";

const primaryCtas = [
  { href: "/mission-control", label: "Open Mission Control™" },
  { href: "/passport", label: "Create Trust Passport" },
  { href: "/command-center", label: "Open Command Center" },
];

const trustModules = [
  {
    name: "Mission Control™",
    href: "/mission-control",
    copy: "Single pane of glass for trust radar, queues, policies, decisions, evidence and global signals.",
    metric: "Live Ops",
  },
  {
    name: "Trust Passport",
    href: "/passport",
    copy: "Issue a verified trust credential for humans, agents, candidates and content.",
    metric: "Identity",
  },
  {
    name: "Human Presence Index™",
    href: "/human-presence-index",
    copy: "Score liveness, behavior consistency and biometric confidence before access.",
    metric: "Presence",
  },
  {
    name: "Reality Passport™",
    href: "/reality-passport",
    copy: "Package provenance, authenticity and verification state into a usable record.",
    metric: "Reality",
  },
  {
    name: "Origin Trace™",
    href: "/origin-trace",
    copy: "Inspect source patterns, watermark status, upload chain integrity and C2PA hints.",
    metric: "Origin",
  },
  {
    name: "AI Agent Passport",
    href: "/agent-passport",
    copy: "Track autonomous agent identity, permissions, behavior and accountability.",
    metric: "Agents",
  },
  {
    name: "Agent Registry™",
    href: "/agent-registry",
    copy: "Verify AI agents, govern permission scopes and track policy status before autonomous access.",
    metric: "Registry",
  },
  {
    name: "Permissions Firewall™",
    href: "/permissions-firewall",
    copy: "Evaluate whether humans, agents, API keys or systems can perform high-risk actions.",
    metric: "Access",
  },
  {
    name: "Step-Up Verification™",
    href: "/step-up-verification",
    copy: "Request stronger proof when high-risk actions need liveness, admin approval or extra evidence.",
    metric: "Step-Up",
  },
  {
    name: "Revocation Engine™",
    href: "/revocation-engine",
    copy: "Revoke, restrict or expire trust when synthetic risk, abuse or evidence failures appear.",
    metric: "Revoke",
  },
  {
    name: "Trust Recovery™",
    href: "/trust-recovery",
    copy: "Rebuild revoked, restricted or escalated trust through evidence, step-up and admin review.",
    metric: "Appeals",
  },
  {
    name: "Compliance Export™",
    href: "/compliance-export",
    copy: "Prepare portable trust report packs for audits, customers and internal review.",
    metric: "Reports",
  },
  {
    name: "Client Portal™",
    href: "/client-portal",
    copy: "Give customers a clean workspace for passports, verification cases, reports and exports.",
    metric: "Clients",
  },
  {
    name: "Team Workspace™",
    href: "/team-workspace",
    copy: "Coordinate shared trust operations, reviews, reports, evidence and API usage for teams.",
    metric: "Teams",
  },
  {
    name: "Team Access",
    href: "/team-access",
    copy: "Invite team members, assign roles and prepare access controls for shared trust operations.",
    metric: "Roles",
  },
  {
    name: "Verifier Network™",
    href: "/verifier-network",
    copy: "Prepare a trusted network of approved verifiers, reviewers and trust partners.",
    metric: "Partners",
  },
  {
    name: "Marketplace Trust Layer™",
    href: "/marketplace-trust",
    copy: "Verify users, sellers, candidates, creators, agents, media and high-risk marketplace interactions.",
    metric: "Marketplaces",
  },
  {
    name: "Trust Badges",
    href: "/trust-badges",
    copy: "Issue and verify public-safe trust badges for external platforms and customers.",
    metric: "Badges",
  },
  {
    name: "Public Verification Portal™",
    href: "/verify",
    copy: "Let anyone check public-safe badge, passport, report and Reality Passport status.",
    metric: "Verify",
  },
  {
    name: "Public Trust Profile™",
    href: "/profile",
    copy: "Share public-safe trust profiles for humans, candidates, agents, companies and creators.",
    metric: "Profiles",
  },
  {
    name: "Trust Feed™",
    href: "/trust-feed",
    copy: "View public-safe trust activity across profiles, badges, passports, agents and marketplaces.",
    metric: "Activity",
  },
  {
    name: "Hiring Shield",
    href: "/hiring-shield",
    copy: "Review candidate trust signals and synthetic identity risk before decisions.",
    metric: "Hiring",
  },
  {
    name: "LinkedIn Trust Verification",
    href: "/linkedin-verification",
    copy: "Attach a professional profile URL as one reviewed evidence signal, never the source of truth.",
    metric: "Professional",
  },
  {
    name: "Trust Timeline™",
    href: "/trust-timeline",
    copy: "Replay historical trust memory across people, agents, candidates and Reality Passports.",
    metric: "Memory",
  },
  {
    name: "Trust Graph Explorer™",
    href: "/trust-graph",
    copy: "Map relationships between identities, evidence, signals, decisions and passports.",
    metric: "Graph",
  },
  {
    name: "Trust Prediction Engine™",
    href: "/trust-prediction",
    copy: "Estimate emerging trust risk before decay becomes obvious.",
    metric: "Forecast",
  },
  {
    name: "Verification Queue™",
    href: "/verification-queue",
    copy: "Operate live verification work across cases, evidence, reviews and decisions.",
    metric: "Ops",
  },
  {
    name: "Trust API",
    href: "/api-docs",
    copy: "Request trust checks, passport summaries, decisions and evidence summaries from external apps.",
    metric: "API",
  },
  {
    name: "Developer Console",
    href: "/developer-console",
    copy: "Manage Trust API access, review API keys and inspect developer usage signals.",
    metric: "Builders",
  },
  {
    name: "Clearances / Billing",
    href: "/billing",
    copy: "Choose Free, Pro, Teams or Reports access with Stripe-ready billing placeholders.",
    metric: "Plans",
  },
  {
    name: "Global Trust Infrastructure",
    href: "/global-trust",
    copy: "Readiness layer for secure global trust across humans, agents, media, evidence and APIs.",
    metric: "Global",
  },
];

const riskSignals = [
  "Deepfake video risk",
  "Deepfake audio risk",
  "Synthetic image risk",
  "Voice clone risk",
  "Model fingerprint risk",
  "Metadata integrity",
];

const routeLinks = [
  { href: "/passport", label: "Trust Passport" },
  { href: "/command-center", label: "Command Center" },
  { href: "/mission-control", label: "Mission Control™" },
  { href: "/hiring-shield", label: "Hiring Shield" },
  { href: "/clearances", label: "Clearances" },
  { href: "/billing", label: "Billing" },
  { href: "/signals", label: "Signals" },
  { href: "/trust-radar", label: "Live Trust Radar™" },
  { href: "/trust-timeline", label: "Trust Timeline™" },
  { href: "/trust-graph", label: "Trust Graph Explorer™" },
  { href: "/trust-prediction", label: "Trust Prediction Engine™" },
  { href: "/verification-queue", label: "Verification Queue™" },
  { href: "/api-docs", label: "Trust API" },
  { href: "/developer-console", label: "Developer Console" },
  { href: "/global-trust", label: "Global Trust Infrastructure" },
  { href: "/deepfake-detection", label: "Deepfake Detection" },
  { href: "/video-verification", label: "Video Verification" },
  { href: "/agent-passport", label: "AI Agent Passport" },
  { href: "/agent-registry", label: "Agent Registry™" },
  { href: "/permissions-firewall", label: "Permissions Firewall™" },
  { href: "/step-up-verification", label: "Step-Up Verification™" },
  { href: "/revocation-engine", label: "Revocation Engine™" },
  { href: "/trust-recovery", label: "Trust Recovery™" },
  { href: "/compliance-export", label: "Compliance Export™" },
  { href: "/client-portal", label: "Client Portal™" },
  { href: "/team-workspace", label: "Team Workspace™" },
  { href: "/team-access", label: "Team Access" },
  { href: "/verifier-network", label: "Verifier Network™" },
  { href: "/marketplace-trust", label: "Marketplace Trust Layer™" },
  { href: "/trust-badges", label: "Trust Badges" },
  { href: "/verify", label: "Public Verification Portal™" },
  { href: "/profile", label: "Public Trust Profile™" },
  { href: "/trust-feed", label: "Trust Feed™" },
  { href: "/human-presence-index", label: "Human Presence Index™" },
  { href: "/reality-passport", label: "Reality Passport™" },
  { href: "/origin-trace", label: "Origin Trace™" },
  { href: "/linkedin-verification", label: "LinkedIn Trust Verification" },
  { href: "/security", label: "Security Layer" },
  { href: "/admin", label: "Back Office / Admin" },
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#050505] text-white">
      <section className="relative min-h-[92vh] overflow-hidden">
        <Image
          src="/cyber-sentinels-hero.png"
          alt="Cyber Sentinels trust operations interface"
          fill
          priority
          className="object-cover"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-black/60" />
        <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-[#050505] to-transparent" />

        <div className="relative mx-auto flex min-h-[92vh] max-w-7xl flex-col justify-between px-6 py-8 md:px-8">
          <nav className="flex items-center justify-between gap-4">
            <Link
              href="/"
              className="text-xs font-semibold uppercase tracking-[0.32em] text-zinc-200"
            >
              Cyber Sentinels
            </Link>
            <Link
              href="/admin"
              className="rounded-lg border border-white/20 bg-black/30 px-4 py-2 text-sm text-zinc-200 backdrop-blur hover:border-white/50"
            >
              Back Office / Admin
            </Link>
          </nav>

          <div className="max-w-4xl pb-10">
            <p className="text-sm uppercase tracking-[0.28em] text-teal-200">
              Premium trust infrastructure
            </p>
            <h1 className="mt-5 max-w-4xl text-5xl font-semibold leading-[1.02] md:text-7xl">
              Proof before permission
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-zinc-200">
              Cyber Sentinels verifies human presence, origin traces, synthetic
              media risk and AI agent identity before critical systems grant
              trust.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              {primaryCtas.map((cta, index) => (
                <Link
                  key={cta.href}
                  href={cta.href}
                  className={
                    index === 0
                      ? "rounded-lg bg-white px-5 py-3 font-semibold text-black hover:bg-zinc-200"
                      : "rounded-lg border border-white/25 bg-black/30 px-5 py-3 font-semibold text-white backdrop-blur hover:border-white/60"
                  }
                >
                  {cta.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-zinc-900 bg-black">
        <div className="mx-auto grid max-w-7xl gap-4 px-6 py-6 md:grid-cols-4 md:px-8">
          {[
            ["Human", "presence verified"],
            ["Origin", "trace inspected"],
            ["Media", "risk scored"],
            ["Decision", "audit logged"],
          ].map(([label, value]) => (
            <div key={label} className="border-l border-zinc-800 pl-4">
              <p className="text-xs uppercase tracking-[0.22em] text-zinc-500">
                {label}
              </p>
              <p className="mt-2 text-lg font-medium text-zinc-100">{value}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-20 md:px-8">
        <div className="max-w-3xl">
          <p className="text-sm uppercase tracking-[0.24em] text-amber-200">
            Trust stack
          </p>
          <h2 className="mt-4 text-3xl font-semibold md:text-5xl">
            One control plane for identity, media, agents and decisions.
          </h2>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {trustModules.map((module) => (
            <Link
              key={module.href}
              href={module.href}
              className="group rounded-lg border border-zinc-800 bg-zinc-950 p-5 transition hover:border-zinc-500 hover:bg-zinc-900"
            >
              <div className="flex items-start justify-between gap-4">
                <h3 className="text-xl font-semibold">{module.name}</h3>
                <span className="rounded-full border border-zinc-700 px-3 py-1 text-xs text-zinc-400 group-hover:text-white">
                  {module.metric}
                </span>
              </div>
              <p className="mt-4 leading-7 text-zinc-400">{module.copy}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="bg-zinc-950">
        <div className="mx-auto grid max-w-7xl gap-10 px-6 py-20 md:px-8 lg:grid-cols-[1fr_1.15fr]">
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-rose-200">
              Deepfake video / audio / image risk
            </p>
            <h2 className="mt-4 text-3xl font-semibold md:text-5xl">
              Synthetic content is treated as an operational risk signal.
            </h2>
            <p className="mt-5 leading-8 text-zinc-400">
              Score liveness, voice clone exposure, image authenticity, model
              fingerprints and metadata integrity before the content moves
              deeper into a workflow.
            </p>
            <Link
              href="/deepfake-detection"
              className="mt-8 inline-flex rounded-lg border border-zinc-700 px-5 py-3 font-semibold hover:border-zinc-400"
            >
              Inspect deepfake risk
            </Link>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {riskSignals.map((signal, index) => (
              <div
                key={signal}
                className="rounded-lg border border-zinc-800 bg-black p-4"
              >
                <p className="text-sm text-zinc-500">
                  Signal {String(index + 1).padStart(2, "0")}
                </p>
                <p className="mt-3 text-lg font-medium">{signal}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-4 px-6 py-20 md:px-8 lg:grid-cols-3">
        <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-6">
          <p className="text-sm uppercase tracking-[0.22em] text-teal-200">
            Security Layer
          </p>
          <h2 className="mt-4 text-2xl font-semibold">
            Trust operations with protected admin review.
          </h2>
          <p className="mt-4 leading-7 text-zinc-400">
            Supabase auth, allowlisted administration and step-up verification
            keep the back office behind deliberate controls.
          </p>
          <Link
            href="/security"
            className="mt-6 inline-flex rounded-lg border border-zinc-700 px-4 py-2 text-sm font-semibold hover:border-zinc-400"
          >
            View security layer
          </Link>
        </div>

        <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-6">
          <p className="text-sm uppercase tracking-[0.22em] text-amber-200">
            Back Office / Admin
          </p>
          <h2 className="mt-4 text-2xl font-semibold">
            Every decision creates evidence in the system.
          </h2>
          <p className="mt-4 leading-7 text-zinc-400">
            Review evidence, update verification cases, create signals and
            append audit events from one operator surface.
          </p>
          <Link
            href="/admin"
            className="mt-6 inline-flex rounded-lg border border-zinc-700 px-4 py-2 text-sm font-semibold hover:border-zinc-400"
          >
            Open admin
          </Link>
        </div>

        <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-6">
          <p className="text-sm uppercase tracking-[0.22em] text-rose-200">
            Hiring Shield
          </p>
          <h2 className="mt-4 text-2xl font-semibold">
            Candidate trust signals before hiring momentum.
          </h2>
          <p className="mt-4 leading-7 text-zinc-400">
            Bring synthetic identity, media confidence and human review into the
            hiring decision trail.
          </p>
          <Link
            href="/hiring-shield"
            className="mt-6 inline-flex rounded-lg border border-zinc-700 px-4 py-2 text-sm font-semibold hover:border-zinc-400"
          >
            Launch Hiring Shield
          </Link>
        </div>
      </section>

      <section className="border-t border-zinc-900 bg-black">
        <div className="mx-auto max-w-7xl px-6 py-14 md:px-8">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div>
              <p className="text-sm uppercase tracking-[0.24em] text-zinc-500">
                Routes
              </p>
              <h2 className="mt-3 text-3xl font-semibold">
                Existing Cyber Sentinels surfaces
              </h2>
            </div>
            <div className="flex flex-wrap gap-3">
              {primaryCtas.map((cta) => (
                <Link
                  key={`footer-${cta.href}`}
                  href={cta.href}
                  className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-zinc-200"
                >
                  {cta.label}
                </Link>
              ))}
            </div>
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            {routeLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-lg border border-zinc-800 px-4 py-2 text-sm text-zinc-300 hover:border-zinc-500 hover:text-white"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
