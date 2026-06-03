import { headers } from "next/headers";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type HealthCheck = {
  label: string;
  ok: boolean;
  value?: string | number;
  detail: string;
};

const countTables = [
  "passports",
  "verification_cases",
  "evidence_files",
  "decisions",
  "audit_logs",
  "signals",
];

function stateLabel(ok: boolean) {
  return ok ? "OK" : "Check";
}

function stateClass(ok: boolean) {
  return ok
    ? "border-emerald-800 bg-emerald-950/20 text-emerald-200"
    : "border-amber-800 bg-amber-950/20 text-amber-200";
}

async function getTableCount(table: string): Promise<HealthCheck> {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from(table)
    .select("id", { count: "exact", head: true });

  return {
    label: `${table} count`,
    ok: !error,
    value: error ? "Unavailable" : (count ?? 0),
    detail: error ? error.message : `Live count returned from ${table}.`,
  };
}

async function checkSupabaseConnected(): Promise<HealthCheck> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey) {
    return {
      label: "Supabase connected",
      ok: false,
      value: "Unavailable",
      detail: "NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY is missing.",
    };
  }

  try {
    const response = await fetch(`${supabaseUrl}/auth/v1/settings`, {
      cache: "no-store",
      headers: {
        apikey: anonKey,
      },
    });

    return {
      label: "Supabase connected",
      ok: response.ok,
      value: response.ok ? "Connected" : `HTTP ${response.status}`,
      detail: response.ok
        ? "Supabase auth endpoint responded with the configured anon key."
        : "Supabase auth endpoint did not return a healthy response.",
    };
  } catch (error) {
    return {
      label: "Supabase connected",
      ok: false,
      value: "Unavailable",
      detail:
        error instanceof Error ? error.message : "Supabase connection check failed.",
    };
  }
}

async function checkEvidenceBucket(): Promise<HealthCheck> {
  const supabase = await createClient();
  const { error } = await supabase.storage
    .from("evidence-files")
    .list("", { limit: 1 });

  return {
    label: "storage bucket evidence-files reachable",
    ok: !error,
    value: error ? "Unavailable" : "Reachable",
    detail: error
      ? error.message
      : "Storage bucket list check completed with current permissions.",
  };
}

async function checkAdminRouteProtected(): Promise<HealthCheck> {
  const headerStore = await headers();
  const host = headerStore.get("host");

  if (!host) {
    return {
      label: "admin route protected",
      ok: false,
      value: "Unavailable",
      detail: "Could not resolve request host for admin route probe.",
    };
  }

  const protocol = headerStore.get("x-forwarded-proto") ?? "http";
  const url = `${protocol}://${host}/back-office`;

  try {
    const response = await fetch(url, {
      cache: "no-store",
      headers: { Cookie: "" },
      redirect: "manual",
    });
    const location = response.headers.get("location") ?? "";
    const protectedByRedirect =
      response.status >= 300 &&
      response.status < 400 &&
      location.includes("/command-center");

    return {
      label: "admin route protected",
      ok: protectedByRedirect,
      value: protectedByRedirect ? "Protected" : `HTTP ${response.status}`,
      detail: protectedByRedirect
        ? "Anonymous /back-office probe redirected to /command-center."
        : `Anonymous /back-office probe did not redirect to /command-center. Location: ${location || "none"}.`,
    };
  } catch (error) {
    return {
      label: "admin route protected",
      ok: false,
      value: "Unavailable",
      detail:
        error instanceof Error ? error.message : "Admin route probe failed.",
    };
  }
}

async function runChecks() {
  return Promise.all([
    checkSupabaseConnected(),
    ...countTables.map((table) => getTableCount(table)),
    checkEvidenceBucket(),
    checkAdminRouteProtected(),
  ]);
}

export default async function StatusPage() {
  const checks = await runChecks();
  const healthy = checks.filter((check) => check.ok).length;

  return (
    <main className="min-h-screen bg-[#04070c] px-6 py-12 text-white md:px-8">
      <div className="mx-auto max-w-6xl">
        <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-6">
          <p className="text-xs uppercase tracking-[0.2em] text-cyan-200">
            Production Readiness
          </p>
          <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-4xl font-semibold">System Status</h1>
              <p className="mt-4 max-w-3xl leading-7 text-zinc-400">
                Live health checks for the Cyber Sentinels V1 demo surface. Red
                or amber states reflect real access, connectivity or permission
                failures.
              </p>
            </div>
            <span className="rounded-lg border border-zinc-800 bg-black px-4 py-3 text-sm text-zinc-300">
              {healthy}/{checks.length} checks OK
            </span>
          </div>
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-2">
          {checks.map((check) => (
            <article
              key={check.label}
              className="rounded-lg border border-zinc-800 bg-black p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-semibold text-zinc-100">{check.label}</h2>
                  <p className="mt-2 text-2xl font-semibold">
                    {check.value ?? stateLabel(check.ok)}
                  </p>
                </div>
                <span
                  className={`rounded-full border px-3 py-1 text-xs ${stateClass(
                    check.ok
                  )}`}
                >
                  {stateLabel(check.ok)}
                </span>
              </div>
              <p className="mt-4 text-sm leading-6 text-zinc-500">
                {check.detail}
              </p>
            </article>
          ))}
        </section>

        <section className="mt-8 flex flex-wrap gap-3 text-sm">
          <Link
            href="/passports"
            className="rounded-lg border border-zinc-700 px-3 py-2 text-zinc-300 hover:text-white"
          >
            Trust Passports
          </Link>
          <Link
            href="/back-office"
            className="rounded-lg border border-zinc-700 px-3 py-2 text-zinc-300 hover:text-white"
          >
            Back Office
          </Link>
          <Link
            href="/data-rights"
            className="rounded-lg border border-zinc-700 px-3 py-2 text-zinc-300 hover:text-white"
          >
            Data Rights
          </Link>
        </section>
      </div>
    </main>
  );
}
