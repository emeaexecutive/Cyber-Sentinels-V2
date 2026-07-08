import Link from "next/link";
import { PrivateBetaBadge } from "@/components/private-beta";
import { clearancePlans } from "@/lib/billing/plans";

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
        <header className="max-w-4xl">
          <p className="text-sm uppercase tracking-[0.2em] text-cyan-200">TrustOps plans</p>
          <PrivateBetaBadge className="mt-4" />
          <h1 className="mt-4 text-4xl font-semibold md:text-6xl">Simple plans for operational trust workflows.</h1>
          <p className="mt-5 max-w-3xl leading-8 text-zinc-400">Start with evidence-backed trust workflows, then add runtime checks, governance, human review, receipts, replay and validation as your pilot grows.</p>
        </header>
        <section className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {plans.map((plan) => {
            const professionalCheckout = plan.tier === "professional" && billingReady;
            const href = plan.tier === "enterprise" ? "/enterprise-access" : plan.tier === "free" ? "/login?next=/passport" : "/pro-waitlist?plan=" + plan.tier;
            const label = plan.tier === "enterprise" ? "Request Enterprise Access" : plan.tier === "free" ? "Start Free" : professionalCheckout ? "Start Professional" : "Join Waitlist";
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
