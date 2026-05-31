import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type PassportRow = {
  id: string;
  subject_name: string | null;
  subject_type: string | null;
  verification_status: string | null;
  review_status: string | null;
  trust_score: number | null;
  created_at: string | null;
};

function formatDate(value: string | null) {
  if (!value) {
    return "Not recorded";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Not recorded";
  }

  return date.toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function valueOrFallback(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") {
    return "Not recorded";
  }

  return String(value);
}

export default async function TrustPassportRegistryPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/passports");
  }

  const { data: passports } = await supabase
    .from("passports")
    .select(
      "id,subject_name,subject_type,verification_status,review_status,trust_score,created_at"
    )
    .order("created_at", { ascending: false })
    .limit(50)
    .returns<PassportRow[]>();

  return (
    <main className="min-h-screen bg-black px-6 py-8 text-white md:px-8">
      <div className="mx-auto max-w-7xl">
        <nav className="flex flex-wrap gap-3 text-sm">
          {[
            ["/", "Home"],
            ["/passport", "Create Passport"],
            ["/back-office", "Back Office"],
            ["/command-center", "Command Center"],
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
            Trust Passport Registry
          </p>
          <div className="mt-4 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="text-4xl font-semibold md:text-6xl">
                Trust Passports
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-zinc-400">
                Latest passport records, linked directly to complete trust
                history.
              </p>
            </div>
            <Link
              href="/passport"
              className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-zinc-200"
            >
              Create Passport
            </Link>
          </div>
        </section>

        <section className="mt-8 rounded-lg border border-zinc-800 bg-zinc-950 p-5">
          <div className="hidden grid-cols-[1.4fr_0.8fr_1fr_1fr_0.7fr_1fr_auto] gap-4 border-b border-zinc-800 pb-3 text-xs uppercase tracking-[0.18em] text-zinc-500 lg:grid">
            <span>Name</span>
            <span>Type</span>
            <span>Verification</span>
            <span>Review</span>
            <span>Trust</span>
            <span>Created</span>
            <span>Action</span>
          </div>

          <div className="mt-4 space-y-3">
            {passports?.length ? (
              passports.map((passport) => (
                <div
                  key={passport.id}
                  className="grid gap-4 rounded-lg border border-zinc-800 bg-black p-4 lg:grid-cols-[1.4fr_0.8fr_1fr_1fr_0.7fr_1fr_auto] lg:items-center"
                >
                  <div>
                    <p className="text-xs text-zinc-500 lg:hidden">Name</p>
                    <p className="font-medium text-zinc-100">
                      {valueOrFallback(passport.subject_name)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500 lg:hidden">Type</p>
                    <p className="text-sm text-zinc-300">
                      {valueOrFallback(passport.subject_type)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500 lg:hidden">
                      Verification
                    </p>
                    <p className="text-sm text-zinc-300">
                      {valueOrFallback(passport.verification_status)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500 lg:hidden">Review</p>
                    <p className="text-sm text-zinc-300">
                      {valueOrFallback(passport.review_status)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500 lg:hidden">Trust</p>
                    <p className="text-sm text-zinc-300">
                      {valueOrFallback(passport.trust_score)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500 lg:hidden">Created</p>
                    <p className="text-sm text-zinc-300">
                      {formatDate(passport.created_at)}
                    </p>
                  </div>
                  <Link
                    href={`/passports/${encodeURIComponent(passport.id)}`}
                    className="rounded-lg border border-zinc-700 px-3 py-2 text-center text-sm text-zinc-300 hover:text-white"
                  >
                    View Passport
                  </Link>
                </div>
              ))
            ) : (
              <p className="text-sm text-zinc-500">
                No Trust Passports have been created yet.
              </p>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
