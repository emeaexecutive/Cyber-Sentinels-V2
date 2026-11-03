import { publicSocialMetadata } from "@/lib/search/metadata";
import type { Metadata } from "next";
import { PricingCard } from "@/components/pricing-card";
import { clearancePlans } from "@/lib/billing/plans";

export const metadata: Metadata = {
  ...publicSocialMetadata("Pricing | Cyber Sentinels", "Pricing and enterprise access for governed operational trust workflows.", "/pricing"),
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
        <header className="max-w-3xl">
          <p className="operational-eyebrow">Plans &amp; access</p>
          <h1 className="mt-4 text-4xl font-semibold leading-tight md:text-5xl">Start with one workflow.</h1>
          <p className="mt-5 text-lg leading-8 text-zinc-300">Explore with us, validate a pilot, then expand around proven value.</p>
        </header>
        <p className="mt-6 max-w-3xl text-sm leading-7 text-zinc-400">
          Cyber Sentinels is opening selected design-partner and pilot engagements. Commercial terms will reflect workflow scope, evidence providers, deployment requirements and enterprise assurance needs.
        </p>
        <section aria-label="Access options" className="pricing-grid mt-10 grid items-stretch gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {plans.map((plan) => {
            const copy = publicPlanCopy[plan.tier as keyof typeof publicPlanCopy];
            return (
              <PricingCard key={plan.tier} name={copy.name} offer={copy.priceLabel} description={plan.description} features={features[plan.tier]} href={copy.href} action={copy.label} preferred={plan.tier === "starter"} />
            );
          })}
        </section>
      </div>
    </main>
  );
}
