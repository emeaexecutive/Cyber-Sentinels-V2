import Link from "next/link";
import { redirect } from "next/navigation";
import { FeedbackPrompt } from "@/components/private-beta";
import { createClient } from "@/lib/supabase/server";
import { EvidenceUploadForm } from "./evidence-upload-form";

export const dynamic = "force-dynamic";

type EvidenceUploadPageProps = {
  searchParams?: Promise<{ uploaded?: string; error?: string; case?: string }>;
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
          <Link href="/" className="rounded-lg border border-zinc-800 px-3 py-2 text-zinc-300 hover:text-white">
            Home
          </Link>
          <Link href="/passport" className="rounded-lg border border-zinc-800 px-3 py-2 text-zinc-300 hover:text-white">
            Create Passport
          </Link>
          <Link href="/passports" className="rounded-lg border border-zinc-800 px-3 py-2 text-zinc-300 hover:text-white">
            My Passports
          </Link>
        </nav>

        <section className="mt-10 rounded-lg border border-zinc-800 bg-zinc-950 p-6">
          <p className="text-sm uppercase tracking-[0.22em] text-cyan-200">
            Evidence intake
          </p>
          <h1 className="mt-3 text-3xl font-semibold">Upload Evidence</h1>
          <p className="mt-3 text-sm leading-6 text-zinc-400">
            Upload evidence to continue verification. Your verification is
            awaiting review after evidence is submitted.
          </p>

          {uploaded ? (
            <div className="mt-5 grid gap-3">
              <p className="rounded-lg border border-emerald-800 bg-black p-3 text-sm text-emerald-200">
                Evidence uploaded.
              </p>
              <FeedbackPrompt />
            </div>
          ) : null}
          {error ? (
            <p className="mt-5 rounded-lg border border-red-900 bg-black p-3 text-sm text-red-200">
              Could not upload evidence.
            </p>
          ) : null}

          <EvidenceUploadForm initialVerificationCaseId={params?.case ?? ""} />
        </section>
      </div>
    </main>
  );
}
