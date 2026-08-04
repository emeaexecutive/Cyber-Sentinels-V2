import Link from "next/link";
import { clearancePlans } from "@/lib/billing/plans";

const publicPlanCopy = {
  free: { name: "Explore", priceLabel: "Design-partner access", href: "/enterprise-access?intent=design_partner", label: "Apply as a design partner" },
  starter: { name: "Pilot Access", priceLabel: "Pilot pricing", href: "/enterprise-access?intent=pilot", label: "Discuss a pilot" },
  professional: { name: "Professional", priceLabel: "By consultation", href: "/enterprise-access?intent=pilot", label: "Request enterprise access" },
  enterprise: { name: "Enterprise Engagement", priceLabel: "Tailored to your environment", href: "/enterprise-access", label: "Request enterprise access" },
} as const;

export default function ClearancesPage() {
  return (
    <main className="min-h-screen bg-black px-6 py-8 text-white md:px-8">
      <div className="mx-auto max-w-7xl">
        <nav className="flex flex-wrap gap-3 text-sm">
          {[
            ["/", "Home"],
            ["/billing", "Billing"],
            ["/client-portal", "Client Portal"],
            ["/passport", "Trust Passport"],
            ["/developer-console", "Developer Console"],
          ].map(([href, label]) => (
            <Link
              key={href}
              href={href}
              className="rounded-lg border border-zinc-800 px-3 py-2 text-zinc-300 hover:border-zinc-500 hover:text-white"
            >
              {label}
            </Link>
          ))}
        </nav>

        <section className="mt-10">
          <p className="text-sm uppercase tracking-[0.24em] text-cyan-200">
            Clearances
          </p>
          <h1 className="mt-4 text-4xl font-semibold md:text-6xl">
            Trust access tiers
          </h1>
          <p className="mt-5 max-w-3xl leading-8 text-zinc-400">
            Clearances package Cyber Sentinels capabilities for individuals,
            teams, API builders and candidate report workflows.
          </p>
        </section>

        <section className="mt-8 grid gap-4 lg:grid-cols-4">
          {clearancePlans.map((plan) => {
            const copy = publicPlanCopy[plan.tier as keyof typeof publicPlanCopy] ?? {
              name: plan.name ?? plan.tier,
              priceLabel: plan.price ? "By consultation" : "Design-partner access",
              href: "/enterprise-access",
              label: "Request enterprise access",
            };
            return (
              <div
                key={plan.tier}
                className={`rounded-lg border bg-zinc-950 p-5 ${
                  plan.highlighted ? "border-cyan-700" : "border-zinc-800"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <h2 className="text-2xl font-semibold">{copy.name}</h2>
                  <span className="rounded-full border border-zinc-700 px-2.5 py-1 text-xs text-zinc-300">
                    {plan.tier}
                  </span>
                </div>
                <p className="mt-5 text-3xl font-semibold">{copy.priceLabel}</p>
                <p className="mt-1 text-sm text-zinc-500">{plan.cadence}</p>
                <p className="mt-4 text-sm leading-6 text-zinc-400">
                  {plan.description}
                </p>

                <ul className="mt-6 space-y-2 text-sm text-zinc-300">
                  {plan.features.map((feature) => (
                    <li key={feature}>{feature}</li>
                  ))}
                </ul>

                <Link href={copy.href} className="mt-8 inline-flex w-full justify-center rounded-lg bg-white px-4 py-3 text-sm font-semibold text-black hover:bg-zinc-200">
                  {copy.label}
                </Link>
              </div>
            );
          })}
        </section>
      </div>
    </main>
  );
}
