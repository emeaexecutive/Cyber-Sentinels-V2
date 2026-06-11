import Link from "next/link";
import { PrivateBetaBadge, PrivateBetaNotice } from "@/components/private-beta";
import { clearancePlans } from "@/lib/billing/plans";

export const dynamic = "force-dynamic";

const ctaByTier = {
  free: {
    label: "Create Account",
    href: "/login?next=/passport",
    form: false,
  },
  starter: {
    label: "Start Starter",
    href: "/pro-waitlist?plan=starter",
    form: false,
  },
  professional: {
    label: "Start Professional",
    href: "/api/stripe/create-checkout-session",
    form: true,
  },
  premium: {
    label: "Start Premium",
    href: "/pro-waitlist?plan=premium",
    form: false,
  },
  enterprise: {
    label: "Request Enterprise Access",
    href: "/enterprise-access",
    form: false,
  },
};

export default function PricingPage() {
  const isStripeBillingConfigured = Boolean(
    process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PRO_MONTHLY_PRICE_ID
  );

  return (
    <main className="min-h-screen bg-[#04070c] px-6 py-12 text-white md:px-8">
      <div className="mx-auto max-w-6xl">
        <section>
          <p className="text-sm uppercase tracking-[0.24em] text-cyan-200">
            Pricing
          </p>
          <PrivateBetaBadge className="mt-4" />
          <h1 className="mt-4 max-w-4xl text-4xl font-semibold md:text-6xl">
            Verification workflow tiers for operational trust infrastructure.
          </h1>
          <p className="mt-5 max-w-3xl text-sm leading-7 text-zinc-400">
            Start with focused verification cases, expand into evidence
            workflows and trust graph visibility, or request enterprise access
            for governance tooling and operational collaboration.
          </p>
          <p className="mt-3 text-sm text-zinc-500">
            Prices shown in EUR. Additional currencies may be supported later.
          </p>
          <PrivateBetaNotice className="mt-4 max-w-3xl" />
          <Link
            href="/enterprise-access?intent=design_partner"
            className="mt-5 inline-flex rounded-lg border border-cyan-800 px-4 py-3 text-sm font-semibold text-cyan-100 hover:text-white"
          >
            Request Design Partner Access
          </Link>
        </section>

        <section className="mt-10 grid gap-5 lg:grid-cols-3">
          {clearancePlans.map((plan) => {
            const cta = ctaByTier[plan.tier];
            const shouldUseWaitlist =
              plan.tier !== "free" &&
              plan.tier !== "enterprise" &&
              (plan.tier !== "professional" || !isStripeBillingConfigured);
            const visibleCta = shouldUseWaitlist
              ? {
                  label:
                    plan.tier === "professional" && !isStripeBillingConfigured
                      ? "Billing coming soon"
                      : "Join waitlist",
                  href: `/pro-waitlist?plan=${plan.tier}`,
                  form: false,
                }
              : cta;

            return (
              <article
                key={plan.tier}
                className={`rounded-lg border p-6 ${
                  plan.highlighted
                    ? "border-cyan-700 bg-cyan-950/10"
                    : "border-zinc-800 bg-black"
                }`}
              >
                <h2 className="text-2xl font-semibold">{plan.name}</h2>
                <p className="mt-4 text-4xl font-semibold">{plan.price}</p>
                <p className="mt-1 text-sm text-zinc-500">{plan.cadence}</p>
                <p className="mt-5 text-sm leading-6 text-zinc-400">
                  {plan.description}
                </p>
                <ul className="mt-6 grid gap-3 text-sm text-zinc-300">
                  {plan.features.map((feature) => (
                    <li
                      key={feature}
                      className="rounded-lg border border-zinc-800 bg-zinc-950 p-3"
                    >
                      {feature}
                    </li>
                  ))}
                </ul>
                <div className="mt-6">
                  {visibleCta.form ? (
                    <form action={visibleCta.href} method="POST">
                      <button
                        type="submit"
                        className="w-full rounded-lg bg-white px-4 py-3 text-sm font-semibold text-black hover:bg-cyan-100"
                      >
                        {visibleCta.label}
                      </button>
                    </form>
                  ) : (
                    <Link
                      href={visibleCta.href}
                      className="inline-flex w-full justify-center rounded-lg bg-white px-4 py-3 text-sm font-semibold text-black hover:bg-cyan-100"
                    >
                      {visibleCta.label}
                    </Link>
                  )}
                </div>
              </article>
            );
          })}
        </section>
      </div>
    </main>
  );
}
