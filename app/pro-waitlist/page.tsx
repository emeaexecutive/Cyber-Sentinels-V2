import { TurnstileField } from "@/components/turnstile-field";
import { getTurnstileSiteKey } from "@/lib/bot-protection";

export const dynamic = "force-dynamic";

type ProWaitlistPageProps = {
  searchParams?: Promise<{
    success?: string;
    error?: string;
    plan?: string;
  }>;
};

const waitlistPlans = {
  starter: {
    name: "Starter",
    price: "EUR 9.99/month",
    useCase: "starter_waitlist",
    status: "starter_waitlist",
  },
  professional: {
    name: "Professional",
    price: "EUR 29.99/month",
    useCase: "professional_waitlist",
    status: "professional_waitlist",
  },
  premium: {
    name: "Premium",
    price: "EUR 39.99/month",
    useCase: "premium_waitlist",
    status: "premium_waitlist",
  },
} as const;

export default async function ProWaitlistPage({
  searchParams,
}: ProWaitlistPageProps) {
  const params = await searchParams;
  const success = params?.success === "true";
  const error = params?.error;
  const turnstileSiteKey = getTurnstileSiteKey();
  const selectedPlan =
    params?.plan && params.plan in waitlistPlans
      ? waitlistPlans[params.plan as keyof typeof waitlistPlans]
      : waitlistPlans.professional;

  return (
    <main className="min-h-screen bg-[#04070c] px-6 py-12 text-white md:px-8">
      <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-[1fr_420px] lg:items-start">
        <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-6">
          <p className="text-xs uppercase tracking-[0.24em] text-cyan-200">
            Pro Waitlist
          </p>
          <h1 className="mt-4 text-4xl font-semibold md:text-5xl">
            Join the Cyber Sentinels {selectedPlan.name} waitlist
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-400">
            {selectedPlan.name} is priced at {selectedPlan.price}. Checkout
            will open once billing is fully configured.
          </p>
          <p className="mt-3 text-sm text-zinc-500">
            Prices shown in EUR. Additional currencies may be supported later.
          </p>
        </section>

        <section className="rounded-lg border border-zinc-800 bg-black p-6">
          {success ? (
            <div className="mb-4 rounded-lg border border-emerald-900 bg-emerald-950/30 p-4 text-sm text-emerald-100">
              Thanks. You are on the {selectedPlan.name} waitlist.
            </div>
          ) : null}

          {error ? (
            <div className="mb-4 rounded-lg border border-red-900 bg-red-950/30 p-4 text-sm text-red-100">
              Security check failed. Please try again.
            </div>
          ) : null}

          <form
            action="/api/enterprise-access"
            method="post"
            className="grid gap-4"
          >
            <input type="hidden" name="use_case" value={selectedPlan.useCase} />
            <input type="hidden" name="status" value={selectedPlan.status} />
            <input
              name="name"
              required
              placeholder="Name"
              className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 text-white"
            />
            <input
              name="work_email"
              required
              type="email"
              placeholder="Email"
              className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 text-white"
            />
            <input
              name="company"
              required
              placeholder="Company or project"
              className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 text-white"
            />
            <input
              name="role"
              placeholder="Role"
              className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 text-white"
            />
            <textarea
              name="message"
              placeholder="What do you want Pro to help you do?"
              rows={4}
              className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 text-white"
            />
            <TurnstileField siteKey={turnstileSiteKey} />
            <button
              type="submit"
              className="rounded-xl bg-white p-4 font-semibold text-black hover:bg-cyan-100"
            >
              Join {selectedPlan.name} waitlist
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}