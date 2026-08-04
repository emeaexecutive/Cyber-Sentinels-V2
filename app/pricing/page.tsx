import type { Metadata } from "next";
import Link from "next/link";
import { ExecutiveSummary } from "@/components/executive-summary";
import { clearancePlans } from "@/lib/billing/plans";

export const metadata: Metadata = {
  title: "Pricing | Cyber Sentinels",
  description: "Pricing and enterprise access for governed operational trust workflows.",
  alternates: { canonical: "/pricing" },
};

export const dynamic = "force-dynamic";

const features: Record<string, string[]> = {
  free: ["1 verification workflow", "Basic evidence uploads", "Verification receipt preview"],
  starter: ["Up to 5 trust workflows", "Evidence and audit trail", "Enterprise workflow review"],
  professional: ["Up to 15 verification workflows", "Session integrity reviews", "Governance, receipts and replay"],
  enterprise: ["Custom workflow volume", "Five-engine TrustOps controls", "API access and pilot support"],
};

const publicPlanCopy = {
  free: { name: "Explore", priceLabel: "Design-partner access", href: "/enterprise-access?intent=design_partner", label: "Apply as a design partner" },
  starter: { name: "Pilot Access", priceLabel: "Pilot pricing", href: "/enterprise-access?intent=pilot", label: "Discuss a pilot" },
  professional: { name: "Professional", priceLabel: "By consultation", href: "/enterprise-access?intent=pilot", label: "Request enterprise access" },
  enterprise: { name: "Enterprise", priceLabel: "Tailored to your environment", href: "/enterprise-access", label: "Request enterprise access" },
} as const;

export default function PricingPage() {
  const plans = clearancePlans.filter((plan) => ["free", "starter", "professional", "enterprise"].includes(plan.tier));

  return (
    <main className="min-h-screen bg-[#04070c] px-6 py-12 text-white md:px-8">
      <div className="mx-auto max-w-6xl">
        <ExecutiveSummary
          eyebrow="Plans"
          title="Start with one decision workflow and expand when the evidence proves value."
          bullets={["Use the smallest plan that supports the current workflow.", "Add governance and Replay as decision risk grows.", "Keep enterprise scope and support explicit before deployment.", "Treat pilot evidence as the basis for expansion."]}
          primary={{ href: "/enterprise-access?intent=pilot", label: "Discuss a pilot" }}
          secondary={{ href: "/platform", label: "View Architecture" }}
        />
        <p className="mt-6 max-w-3xl text-sm leading-7 text-zinc-400">
          Cyber Sentinels is opening selected design-partner and pilot engagements. Commercial terms will reflect workflow scope, evidence providers, deployment requirements and enterprise assurance needs.
        </p>
        <section className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {plans.map((plan) => {
            const copy = publicPlanCopy[plan.tier as keyof typeof publicPlanCopy];
            return (
              <article key={plan.tier} className={"rounded-lg border p-6 " + (plan.tier === "professional" ? "border-cyan-700 bg-cyan-950/10" : "border-zinc-800 bg-black")}>
                <h2 className="text-2xl font-semibold">{copy.name}</h2>
                <p className="mt-4 text-3xl font-semibold">{copy.priceLabel}</p>
                <p className="mt-5 text-sm leading-6 text-zinc-400">{plan.description}</p>
                <ul className="mt-6 grid gap-3 text-sm text-zinc-300">
                  {features[plan.tier].map((feature) => <li key={feature} className="border-t border-zinc-800 pt-3">{feature}</li>)}
                </ul>
                <Link href={copy.href} className="mt-6 inline-flex w-full justify-center rounded-md bg-white px-4 py-3 text-sm font-semibold text-black">{copy.label}</Link>
              </article>
            );
          })}
        </section>
      </div>
    </main>
  );
}
