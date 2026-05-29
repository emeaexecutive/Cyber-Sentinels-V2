import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  clearancePlans,
  createBillingProfile,
  getPlan,
} from "@/lib/billing/plans";

export const dynamic = "force-dynamic";

type AuditLog = {
  id: string;
  event_type: string;
  actor: string | null;
  created_at: string | null;
};

function formatDate(value: string | null) {
  if (!value) return "n/a";

  return new Date(value).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default async function BillingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/command-center");
  }

  const { data: billingEvents } = await supabase
    .from("audit_logs")
    .select("id,event_type,actor,created_at")
    .in("event_type", [
      "billing_checkout_placeholder_created",
      "clearance_changed",
    ])
    .order("created_at", { ascending: false })
    .limit(8)
    .returns<AuditLog[]>();

  const profile = createBillingProfile("free");
  const currentPlan = getPlan(profile.clearance_tier);
  const apiRemaining = Math.max(
    0,
    profile.api_call_limit - profile.api_calls_used
  );

  return (
    <main className="min-h-screen bg-black px-6 py-8 text-white md:px-8">
      <div className="mx-auto max-w-7xl">
        <nav className="flex flex-wrap gap-3 text-sm">
          {[
            ["/", "Home"],
            ["/clearances", "Clearances"],
            ["/client-portal", "Client Portal"],
            ["/team-workspace", "Team Workspace"],
            ["/marketplace-trust", "Marketplace Trust"],
            ["/trust-embeds", "Trust Embeds"],
            ["/trust-seal-authority", "Trust Seals"],
            ["/trust-registry", "Trust Registry"],
            ["/developer-console", "Developer Console"],
            ["/compliance-export", "Compliance Export"],
            ["/back-office", "Back Office"],
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
            Stripe-ready billing
          </p>
          <h1 className="mt-4 text-4xl font-semibold md:text-6xl">Billing</h1>
          <p className="mt-5 max-w-3xl leading-8 text-zinc-400">
            Manage clearance tier, usage and billing placeholders before Stripe
            Checkout is connected. Team plans are role-based for owners,
            admins, reviewers, analysts and viewers. Marketplace and badge API
            usage can share the same API limit placeholders.
          </p>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-[1fr_1.4fr]">
          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold">Current Clearance</h2>
            <p className="mt-4 text-3xl font-semibold">{currentPlan.name}</p>
            <p className="mt-2 text-sm text-zinc-500">
              {profile.subscription_status} / customer{" "}
              {profile.billing_customer_id ?? "not connected"}
            </p>
            <p className="mt-4 text-sm leading-6 text-zinc-400">
              {currentPlan.description}
            </p>
          </div>

          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold">Usage</h2>
            <div className="mt-5 grid gap-3 md:grid-cols-4">
              {[
                ["Usage count", profile.usage_count],
                ["Report credits", profile.report_credits],
                ["Export credits", profile.report_credits],
                ["API limit", profile.api_call_limit],
                ["API remaining", apiRemaining],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="rounded-lg border border-zinc-800 bg-black p-4"
                >
                  <p className="text-sm text-zinc-500">{label}</p>
                  <p className="mt-2 text-2xl font-semibold">{value}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-8 rounded-lg border border-zinc-800 bg-zinc-950 p-5">
          <h2 className="text-xl font-semibold">Upgrade Options</h2>
          <div className="mt-5 grid gap-4 lg:grid-cols-4">
            {clearancePlans.map((plan) => (
              <div
                key={plan.tier}
                className="rounded-lg border border-zinc-800 bg-black p-4"
              >
                <h3 className="text-lg font-semibold">{plan.name}</h3>
                <p className="mt-3 text-2xl font-semibold">{plan.price}</p>
                <p className="mt-1 text-xs text-zinc-500">{plan.cadence}</p>
                <form
                  action="/api/billing/checkout"
                  method="POST"
                  className="mt-5"
                >
                  <input type="hidden" name="plan" value={plan.tier} />
                  <button className="w-full rounded-lg border border-zinc-700 px-3 py-2 text-sm text-zinc-300 hover:text-white">
                    Start checkout
                  </button>
                </form>
                {plan.tier === "teams" ? (
                  <Link
                    href="/team-workspace"
                    className="mt-3 inline-flex w-full justify-center rounded-lg border border-cyan-800 px-3 py-2 text-sm text-cyan-200 hover:text-white"
                  >
                    Open Team Workspace
                  </Link>
                ) : null}
              </div>
            ))}
          </div>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-3">
          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold">API Checks</h2>
            <p className="mt-4 text-3xl font-semibold">
              {profile.api_calls_used} / {profile.api_call_limit}
            </p>
            <p className="mt-2 text-sm text-zinc-500">
              Placeholder usage meter for Trust API, marketplace checks and
              badge verification.
            </p>
          </div>
          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold">Candidate Reports</h2>
            <p className="mt-4 text-3xl font-semibold">
              {profile.report_credits}
            </p>
            <p className="mt-2 text-sm text-zinc-500">
              Report and compliance export credits available.
            </p>
          <Link
            href="/compliance-export"
            className="mt-4 inline-flex rounded-lg border border-zinc-700 px-3 py-2 text-xs text-zinc-300 hover:text-white"
          >
            Open Compliance Export
          </Link>
            <Link
              href="/client-portal"
              className="ml-2 mt-4 inline-flex rounded-lg border border-zinc-700 px-3 py-2 text-xs text-zinc-300 hover:text-white"
            >
              Open Client Portal
            </Link>
          </div>
          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold">Evidence Storage</h2>
            <p className="mt-4 text-3xl font-semibold">
              {currentPlan.evidence_storage}
            </p>
            <p className="mt-2 text-sm text-zinc-500">
              Storage billing placeholder.
            </p>
          </div>
          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold">Trust Embeds</h2>
            <p className="mt-4 text-3xl font-semibold">Pro / Teams</p>
            <p className="mt-2 text-sm text-zinc-500">
              Public-safe badge widgets for profiles, websites, marketplaces
              and email signatures.
            </p>
            <Link
              href="/trust-embeds"
              className="mt-4 inline-flex rounded-lg border border-zinc-700 px-3 py-2 text-xs text-zinc-300 hover:text-white"
            >
              Open Trust Embeds
            </Link>
          </div>
          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold">Trust Seals</h2>
            <p className="mt-4 text-3xl font-semibold">Pro / Teams</p>
            <p className="mt-2 text-sm text-zinc-500">
              Public trust marks for verified humans, agents, companies, teams,
              marketplaces and media objects.
            </p>
            <Link
              href="/trust-seal-authority"
              className="mt-4 inline-flex rounded-lg border border-zinc-700 px-3 py-2 text-xs text-zinc-300 hover:text-white"
            >
              Open Trust Seals
            </Link>
          </div>
          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold">Registry Listing</h2>
            <p className="mt-4 text-3xl font-semibold">Pro / Teams</p>
            <p className="mt-2 text-sm text-zinc-500">
              Public-safe discovery listings for profiles, seals, badges,
              companies, agents and Reality Passports.
            </p>
            <Link
              href="/trust-registry"
              className="mt-4 inline-flex rounded-lg border border-zinc-700 px-3 py-2 text-xs text-zinc-300 hover:text-white"
            >
              Open Trust Registry
            </Link>
          </div>
        </section>

        <section className="mt-8 rounded-lg border border-zinc-800 bg-zinc-950 p-5">
          <h2 className="text-xl font-semibold">Billing Events</h2>
          <div className="mt-5 space-y-3">
            {billingEvents?.length ? (
              billingEvents.map((event) => (
                <div
                  key={event.id}
                  className="rounded-lg border border-zinc-800 bg-black p-4"
                >
                  <p className="text-zinc-300">{event.event_type}</p>
                  <p className="mt-2 text-xs text-zinc-600">
                    {event.actor ?? "system"} / {formatDate(event.created_at)}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-sm text-zinc-500">
                No billing events recorded yet.
              </p>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
