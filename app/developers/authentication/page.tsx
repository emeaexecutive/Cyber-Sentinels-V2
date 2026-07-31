import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "API Authentication | Cyber Sentinels",
  description: "Authentication, scoped credentials and server-side security guidance for Cyber Sentinels APIs.",
  alternates: { canonical: "/developers/authentication" },
};

export default function DeveloperAuthenticationPage() {
  return (
    <main className="min-h-screen bg-[#04070c] px-6 py-12 text-white md:px-8">
      <div className="mx-auto max-w-5xl">
        <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-6">
          <p className="text-xs uppercase tracking-[0.24em] text-cyan-200">Authentication</p>
          <h1 className="mt-4 text-4xl font-semibold">API Authentication</h1>
          <p className="mt-4 max-w-3xl text-sm leading-6 text-zinc-400">
            Use API keys for server-side access to Cyber Sentinels developer
            endpoints. Keep keys private, scoped and revocable.
          </p>
        </section>
        <section className="mt-8 grid gap-4">
          {[
            ["Create a key", "Generate an API key from the developer portal and label it by environment or integration."],
            ["Store securely", "Store keys in server-side secrets. Do not expose keys in browser code, mobile clients or public repositories."],
            ["Revoke when needed", "Revoke keys immediately when an integration is retired or a secret may be exposed."],
          ].map(([title, copy]) => (
            <article key={title} className="rounded-lg border border-zinc-800 bg-black p-5">
              <h2 className="text-xl font-semibold text-zinc-100">{title}</h2>
              <p className="mt-3 text-sm leading-6 text-zinc-500">{copy}</p>
            </article>
          ))}
        </section>
        <Link href="/developers/api-keys" className="mt-8 inline-flex rounded-lg bg-white px-4 py-3 text-sm font-semibold text-black">
          Manage API Keys
        </Link>
      </div>
    </main>
  );
}
