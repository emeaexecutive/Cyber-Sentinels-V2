import Link from "next/link";

export default function VerifyEmailPage() {
  return (
    <main className="min-h-screen bg-[#04070c] px-6 py-12 text-white md:px-8">
      <section className="mx-auto max-w-2xl rounded-lg border border-zinc-800 bg-zinc-950 p-6">
        <p className="text-xs uppercase tracking-[0.22em] text-cyan-200">Email Verification</p>
        <h1 className="mt-4 text-4xl font-semibold">Please verify your email address before continuing.</h1>
        <p className="mt-4 text-sm leading-7 text-zinc-400">
          Check your inbox for the Cyber Sentinels verification email. Once your email address is verified, return to the protected workflow and continue.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/login" className="rounded-lg bg-white px-4 py-3 text-sm font-semibold text-black hover:bg-cyan-100">
            Back to login
          </Link>
          <Link href="/help" className="rounded-lg border border-zinc-700 px-4 py-3 text-sm font-semibold text-zinc-100 hover:border-zinc-400">
            Help Centre
          </Link>
        </div>
      </section>
    </main>
  );
}