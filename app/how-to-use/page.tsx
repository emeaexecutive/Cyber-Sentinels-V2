import Link from "next/link";

const steps = [
  ["Create Passport", "Start with a subject and create the trust record.", "/passport"],
  ["Upload Evidence", "Attach files or supporting context to the verification case.", "/evidence-upload"],
  ["Review", "Admins review evidence and make approval, rejection or escalation decisions.", "/back-office"],
  ["Inspect Trust", "Open the Trust Passport and graph to inspect evidence, decisions, signals and audit history.", "/passports"],
];

export default function HowToUsePage() {
  return (
    <main className="min-h-screen bg-[#04070c] px-6 py-12 text-white md:px-8">
      <div className="mx-auto max-w-5xl">
        <p className="text-sm uppercase tracking-[0.24em] text-cyan-200">How to Use</p>
        <h1 className="mt-4 text-4xl font-semibold md:text-6xl">Run the Trust OS workflow</h1>
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {steps.map(([title, copy, href]) => (
            <Link key={title} href={href} className="rounded-lg border border-zinc-800 bg-black p-5 hover:border-cyan-800">
              <h2 className="text-xl font-semibold text-zinc-100">{title}</h2>
              <p className="mt-3 text-sm leading-6 text-zinc-500">{copy}</p>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
