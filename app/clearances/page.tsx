import Link from "next/link";

export default function ClearancesPage() {
  const plans = [
    {
      name: "Free",
      price: "EUR 0",
      description: "Basic trust profile and one verification.",
      features: ["1 Trust Passport", "Basic trust score", "Public profile"],
    },
    {
      name: "Pro",
      price: "EUR 15/mo",
      description: "For creators, founders and AI users.",
      features: [
        "Multiple passports",
        "Candidate Trust Report",
        "Verification history",
        "Trust badge",
      ],
    },
    {
      name: "Teams",
      price: "EUR 99/mo",
      description: "For recruiters, operators and small teams.",
      features: [
        "Hiring Shield reports",
        "AI Agent Passport",
        "Team trust view",
        "Audit logs",
      ],
    },
  ];

  return (
    <main className="min-h-screen bg-black p-8 text-white">
      <div className="mx-auto max-w-6xl">
        <Link href="/" className="text-sm text-zinc-400 hover:text-white">
          Back to Cyber Sentinels
        </Link>

        <h1 className="mt-8 text-5xl font-bold">Clearances</h1>

        <p className="mt-4 max-w-2xl text-zinc-400">
          Trust plans for verified humans, AI agents, recruiters and teams.
        </p>

        <section className="mt-10 grid gap-4 md:grid-cols-3">
          {plans.map((plan) => (
            <div key={plan.name} className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
              <h2 className="text-2xl font-bold">{plan.name}</h2>
              <p className="mt-4 text-4xl font-bold">{plan.price}</p>
              <p className="mt-4 text-zinc-400">{plan.description}</p>

              <ul className="mt-6 space-y-2 text-sm text-zinc-300">
                {plan.features.map((feature) => (
                  <li key={feature}>{feature}</li>
                ))}
              </ul>

              <button className="mt-8 w-full rounded-xl bg-white px-5 py-4 font-semibold text-black">
                Select Clearance
              </button>
            </div>
          ))}
        </section>
      </div>
    </main>
  );
}
