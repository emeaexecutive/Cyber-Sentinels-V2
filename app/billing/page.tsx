import Link from "next/link";
import { redirect } from "next/navigation";
import { getUserPlan } from "@/lib/billing/getUserPlan";
import { getPlan } from "@/lib/billing/plans";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type SubscriptionRow = {
  plan: string | null;
  status: string | null;
  current_period_end: string | null;
};

function formatDate(value: string | null) {
  if (!value) {
    return "Not recorded";
  }

  return new Date(value).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default async function BillingPage({
  searchParams,
}: {
  searchParams?: Promise<{ checkout?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/billing");
  }

  const planName = await getUserPlan(supabase, user);
  const currentPlan = getPlan(planName);
  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("plan,status,current_period_end")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle<SubscriptionRow>();

  return (
    <main className="min-h-screen bg-[#04070c] px-6 py-12 text-white md:px-8">
      <div className="mx-auto max-w-5xl">
        <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-6">
          <p className="text-sm uppercase tracking-[0.24em] text-cyan-200">
            Billing
          </p>
          <h1 className="mt-4 text-4xl font-semibold">Subscription Access</h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-400">
            Stripe Checkout manages payment collection. Cyber Sentinels stores
            only customer, subscription, plan and usage-limit records.
          </p>
          {params?.checkout === "success" ? (
            <p className="mt-5 rounded-lg border border-emerald-800 bg-emerald-950/20 p-3 text-sm text-emerald-200">
              Checkout completed. Your subscription will update after Stripe
              confirms the webhook event.
            </p>
          ) : null}
        </section>

        <section className="mt-8 grid gap-5 md:grid-cols-3">
          {[
            ["Current plan", currentPlan.name],
            ["Subscription status", subscription?.status ?? "free"],
            ["Current period end", formatDate(subscription?.current_period_end ?? null)],
          ].map(([label, value]) => (
            <div
              key={label}
              className="rounded-lg border border-zinc-800 bg-black p-5"
            >
              <p className="text-xs uppercase tracking-[0.16em] text-zinc-600">
                {label}
              </p>
              <p className="mt-3 text-2xl font-semibold">{value}</p>
            </div>
          ))}
        </section>

        <section className="mt-8 rounded-lg border border-zinc-800 bg-black p-6">
          <h2 className="text-2xl font-semibold">Plan limits</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
              <p className="text-sm text-zinc-500">Passports</p>
              <p className="mt-2 text-2xl font-semibold">
                {currentPlan.passport_limit ?? "Custom"}
              </p>
            </div>
            <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
              <p className="text-sm text-zinc-500">Evidence uploads</p>
              <p className="mt-2 text-2xl font-semibold">
                {currentPlan.evidence_upload_limit ?? "Custom"}
              </p>
            </div>
            <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
              <p className="text-sm text-zinc-500">Trust graph</p>
              <p className="mt-2 text-2xl font-semibold">
                {currentPlan.trust_graph_enabled ? "Enabled" : "Not included"}
              </p>
            </div>
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/pricing"
              className="rounded-lg border border-zinc-700 px-4 py-3 text-sm font-semibold text-zinc-200 hover:border-cyan-500"
            >
              View Pricing
            </Link>
            <form action="/api/stripe/customer-portal" method="POST">
              <button
                type="submit"
                className="rounded-lg bg-white px-4 py-3 text-sm font-semibold text-black hover:bg-cyan-100"
              >
                Manage Stripe Billing
              </button>
            </form>
          </div>
        </section>
      </div>
    </main>
  );
}

