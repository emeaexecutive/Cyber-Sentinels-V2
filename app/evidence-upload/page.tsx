import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type EvidenceUploadPageProps = {
  searchParams?: Promise<{ uploaded?: string; error?: string }>;
};

export default async function EvidenceUploadPage({
  searchParams,
}: EvidenceUploadPageProps) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/evidence-upload");
  }

  const params = await searchParams;
  const uploaded = params?.uploaded === "1";
  const error = params?.error;

  return (
    <main className="min-h-screen bg-black px-6 py-8 text-white md:px-8">
      <div className="mx-auto max-w-2xl">
        <nav className="flex flex-wrap gap-3 text-sm">
          <Link href="/back-office" className="rounded-lg border border-zinc-800 px-3 py-2 text-zinc-300 hover:text-white">
            Back Office
          </Link>
          <Link href="/verification-queue" className="rounded-lg border border-zinc-800 px-3 py-2 text-zinc-300 hover:text-white">
            Verification Queue
          </Link>
          <Link href="/evidence-vault" className="rounded-lg border border-zinc-800 px-3 py-2 text-zinc-300 hover:text-white">
            Evidence Vault
          </Link>
        </nav>

        <section className="mt-10 rounded-lg border border-zinc-800 bg-zinc-950 p-6">
          <p className="text-sm uppercase tracking-[0.22em] text-cyan-200">
            Evidence intake
          </p>
          <h1 className="mt-3 text-3xl font-semibold">Upload Evidence</h1>
          <p className="mt-3 text-sm leading-6 text-zinc-400">
            Register an evidence URL against a verification case before admin
            approval.
          </p>

          {uploaded ? (
            <p className="mt-5 rounded-lg border border-emerald-800 bg-black p-3 text-sm text-emerald-200">
              Evidence uploaded.
            </p>
          ) : null}
          {error ? (
            <p className="mt-5 rounded-lg border border-red-900 bg-black p-3 text-sm text-red-200">
              Could not upload evidence.
            </p>
          ) : null}

          <form action="/api/evidence" method="POST" className="mt-6 grid gap-4">
            <label className="grid gap-2 text-sm text-zinc-400">
              Verification case ID
              <input
                name="verification_case_id"
                required
                className="rounded-lg border border-zinc-800 bg-black p-3 text-white"
              />
            </label>

            <label className="grid gap-2 text-sm text-zinc-400">
              Evidence type
              <input
                name="evidence_type"
                required
                placeholder="document, image, video, url, linkedin"
                className="rounded-lg border border-zinc-800 bg-black p-3 text-white"
              />
            </label>

            <label className="grid gap-2 text-sm text-zinc-400">
              Evidence URL
              <input
                name="file_url"
                type="url"
                required
                className="rounded-lg border border-zinc-800 bg-black p-3 text-white"
              />
            </label>

            <label className="grid gap-2 text-sm text-zinc-400">
              Notes
              <textarea
                name="notes"
                rows={4}
                className="rounded-lg border border-zinc-800 bg-black p-3 text-white"
              />
            </label>

            <button
              type="submit"
              className="rounded-lg bg-white p-3 font-semibold text-black"
            >
              Register Evidence
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
