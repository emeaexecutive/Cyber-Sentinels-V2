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

export default function PricingPage() {
  const plans = clearancePlans.filter((plan) => ["free", "starter", "professional", "enterprise"].includes(plan.tier));
  const billingReady = Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PRO_MONTHLY_PRICE_ID);

  return (
    <main className="min-h-screen bg-[#04070c] px-6 py-12 text-white md:px-8">
      <div className="mx-auto max-w-6xl">
        <ExecutiveSummary
          eyebrow="Plans"
          title="Start with one decision workflow and expand when the evidence proves value."
          bullets={["Use the smallest plan that supports the current workflow.", "Add governance and Replay as decision risk grows.", "Keep enterprise scope and support explicit before deployment.", "Treat pilot evidence as the basis for expansion."]}
          primary={{ href: "/enterprise/pilot", label: "Start Pilot" }}
          secondary={{ href: "/platform", label: "View Architecture" }}
        />
        <section className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {plans.map((plan) => {
            const professionalCheckout = plan.tier === "professional" && billingReady;
            const href = plan.tier === "enterprise" ? "/enterprise-access" : plan.tier === "free" ? "/login?next=/passport" : "/pro-waitlist?plan=" + plan.tier;
            const label = plan.tier === "enterprise" ? "Start Pilot" : plan.tier === "free" ? "Start Free" : professionalCheckout ? "Start Professional" : "Join Waitlist";
            return (
              <article key={plan.tier} className={"rounded-lg border p-6 " + (plan.tier === "professional" ? "border-cyan-700 bg-cyan-950/10" : "border-zinc-800 bg-black")}>
                <h2 className="text-2xl font-semibold">{plan.name}</h2>
                <p className="mt-4 text-3xl font-semibold">{plan.price}</p>
                <p className="mt-5 text-sm leading-6 text-zinc-400">{plan.description}</p>
                <ul className="mt-6 grid gap-3 text-sm text-zinc-300">
                  {features[plan.tier].map((feature) => <li key={feature} className="border-t border-zinc-800 pt-3">{feature}</li>)}
                </ul>
                {professionalCheckout ? (
                  <form action="/api/stripe/create-checkout-session" method="POST"><button className="mt-6 w-full rounded-md bg-white px-4 py-3 text-sm font-semibold text-black">{label}</button></form>
                ) : (
                  <Link href={href} className="mt-6 inline-flex w-full justify-center rounded-md bg-white px-4 py-3 text-sm font-semibold text-black">{label}</Link>
                )}
              </article>
            );
          })}
        </section>
      </div>
    </main>
  );
}
