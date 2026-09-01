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
            ["Create a key", "Sign in and open Developer → API Keys. Tenant owners/admins create a test or live key, choose only the required scopes, and label it by environment and integration."],
            ["Copy it once", "The complete secret is shown once. Cyber Sentinels retains a one-way hash and safe prefix, not recoverable plaintext. If the value is lost, rotate it and update the secret store."],
            ["Store securely", "Store keys only in server-side environment configuration or a managed secret store. Do not expose them in browser/mobile code, source, logs, URLs, screenshots, or tickets."],
            ["Expire and rotate", "Select an expiry appropriate to your policy where the onboarding channel exposes it. Rotate before expiry; rotation returns a new shown-once secret and revokes the replaced key."],
            ["Revoke when needed", "Revoke immediately when an integration is retired or exposure is suspected. Revoked and expired keys return distinct safe 401 error codes."],
            ["Test safely", "Use a cs_test_ key against the exact approved non-Production base URL. Retrieve OpenAPI, then make a tenant-scoped authority read. A cs_live_ key is not permission to test against Production."],
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
        <section className="mt-8 rounded-lg border border-zinc-800 bg-black p-5">
          <h2 className="text-xl font-semibold">Scopes used by the complete Agent Alpha proof</h2>
          <p className="mt-3 text-sm leading-6 text-zinc-500"><code>agents:write</code>, <code>agents:verify</code>, <code>authority:read</code>, <code>trust:request</code>, <code>trust:read</code>, and <code>outcomes:write</code>. Add <code>evidence:write</code> only when the integration submits application assertions. Production clients should remove unused scopes.</p>
        </section>
      </div>
    </main>
  );
}
