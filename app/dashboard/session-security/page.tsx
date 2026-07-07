import Link from "next/link";
import { redirect } from "next/navigation";
import { getMfaStatus, getTrustedDeviceStatus } from "@/lib/auth/mfa";
import { evaluateGeoSessionIntelligence } from "@/lib/runtime/geo-session-intelligence";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type AnyRow = Record<string, any>;

function formatDate(value?: string | null) {
  if (!value) return "Not recorded";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Not recorded" : date.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
}

export default async function SessionSecurityPage({
  searchParams,
}: {
  searchParams?: Promise<{ step_up?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/dashboard/session-security");

  const params = await searchParams;
  const [{ data: auditRows }, { data: replayRows }, { data: sessionChecks }] = await Promise.all([
    supabase
      .from("audit_logs")
      .select("*")
      .ilike("event_type", "auth_%")
      .order("created_at", { ascending: false })
      .limit(20)
      .returns<AnyRow[]>(),
    supabase
      .from("trust_timeline_events")
      .select("*")
      .ilike("event_type", "auth_%")
      .order("created_at", { ascending: false })
      .limit(20)
      .returns<AnyRow[]>(),
    supabase
      .from("session_integrity_checks")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(8)
      .returns<AnyRow[]>(),
  ]);
  const mfa = getMfaStatus();
  const trustedDevice = getTrustedDeviceStatus({
    hasKnownDeviceCookie: false,
    deviceFingerprintProviderState: "Awaiting Credentials",
  });
  const geoSession = evaluateGeoSessionIntelligence({
    currentCountry: "unknown",
    previousCountry: null,
    currentDevice: "current browser",
    previousDevice: null,
    knownDevice: trustedDevice.trusted,
    expectedCountries: [],
  });
  const activeSessions = [
    {
      id: "current-session",
      label: "Current browser session",
      state: "Active",
      device: "Browser session",
      country: "Runtime header dependent",
      lastSeen: new Date().toISOString(),
    },
  ];
  const suspiciousEvents = (auditRows ?? []).filter((row) =>
    /geo_mismatch|blocked_session|suspicious_login|step_up/i.test(String(row.event_type))
  );

  return (
    <main className="min-h-screen bg-[#04070c] px-6 py-8 text-white md:px-8">
      <div className="mx-auto max-w-7xl">
        <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-6">
          <p className="text-xs uppercase tracking-[0.18em] text-cyan-200">Session Security</p>
          <h1 className="mt-3 text-4xl font-semibold">Trust-aware identity and session continuity</h1>
          <p className="mt-4 max-w-4xl text-sm leading-7 text-zinc-400">
            Review active sessions, MFA readiness, trusted-device continuity, geo/session intelligence and replayable auth events. Geo and device signals are runtime heuristics unless a configured provider supplies evidence.
          </p>
          {params?.step_up === "1" ? (
            <p className="mt-4 rounded-lg border border-cyan-900 bg-cyan-950/20 p-3 text-sm text-cyan-100">
              Step-up authentication event recorded for governed review.
            </p>
          ) : null}
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            ["MFA status", mfa.step_up_available ? "Configured" : "Awaiting Credentials"],
            ["Session posture", geoSession.posture],
            ["Continuity score", geoSession.continuity_score],
            ["Suspicious activity", suspiciousEvents.length],
          ].map(([label, value]) => (
            <article key={String(label)} className="rounded-lg border border-zinc-800 bg-black p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-zinc-500">{label}</p>
              <p className="mt-2 text-2xl font-semibold capitalize text-zinc-100">{value}</p>
            </article>
          ))}
        </section>

        <section className="mt-8 grid gap-5 lg:grid-cols-3">
          <article className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold">Active sessions</h2>
            <div className="mt-5 grid gap-3">
              {activeSessions.map((session) => (
                <div key={session.id} className="rounded-lg border border-zinc-800 bg-black p-4">
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-medium text-zinc-100">{session.label}</p>
                    <span className="rounded-full border border-emerald-800 px-2 py-1 text-xs text-emerald-200">{session.state}</span>
                  </div>
                  <p className="mt-2 text-sm text-zinc-500">{session.device} / {session.country}</p>
                  <p className="mt-1 text-xs text-zinc-600">Last seen {formatDate(session.lastSeen)}</p>
                </div>
              ))}
            </div>
            <div className="mt-5 grid gap-2">
              <form action="/api/auth/logout" method="POST">
                <button type="submit" className="w-full rounded-lg border border-zinc-700 px-4 py-3 text-sm text-zinc-200 hover:text-white">
                  Revoke current session
                </button>
              </form>
              <form action="/api/auth/logout" method="POST">
                <button type="submit" className="w-full rounded-lg border border-zinc-700 px-4 py-3 text-sm text-zinc-200 hover:text-white">
                  Logout all sessions
                </button>
              </form>
              <form action="/api/auth/session-action" method="POST">
                <input type="hidden" name="action" value="step_up" />
                <button type="submit" className="w-full rounded-lg border border-cyan-800 px-4 py-3 text-sm text-cyan-100 hover:text-white">
                  Trigger step-up auth
                </button>
              </form>
            </div>
          </article>

          <article className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold">MFA readiness</h2>
            <div className="mt-5 grid gap-3">
              {[
                ["SMS OTP", mfa.sms_otp],
                ["Authenticator app", mfa.authenticator_app],
                ["Trusted device", mfa.trusted_device],
                ["Recovery flow", mfa.recovery_flow],
              ].map(([label, state]) => (
                <div key={label} className="rounded-lg border border-zinc-800 bg-black p-4">
                  <p className="text-sm font-medium text-zinc-100">{label}</p>
                  <p className="mt-2 text-sm text-amber-200">{state}</p>
                </div>
              ))}
            </div>
            <p className="mt-4 text-sm leading-6 text-zinc-500">{mfa.summary}</p>
          </article>

          <article className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold">Geo and device intelligence</h2>
            <div className="mt-5 grid gap-2 text-sm text-zinc-400">
              <p>Geo mismatch: {geoSession.geo_mismatch ? "Yes" : "No"}</p>
              <p>Impossible travel: {geoSession.impossible_travel.replaceAll("_", " ")}</p>
              <p>New device: {geoSession.new_device ? "Yes" : "No"}</p>
              <p>Unusual browser/device: {geoSession.unusual_browser_or_device ? "Yes" : "No"}</p>
              <p>Trusted-device state: {trustedDevice.provider_state}</p>
            </div>
            <div className="mt-4 rounded-lg border border-zinc-800 bg-black p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-zinc-500">Reason</p>
              <p className="mt-2 text-sm leading-6 text-zinc-400">{geoSession.reasons.join(" ")}</p>
            </div>
          </article>
        </section>

        <section className="mt-8 grid gap-5 lg:grid-cols-2">
          <article className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold">Recent auth events</h2>
            <div className="mt-5 grid gap-3">
              {(auditRows ?? []).length ? (auditRows ?? []).map((event, index) => (
                <div key={String(event.id ?? index)} className="rounded-lg border border-zinc-800 bg-black p-4">
                  <p className="font-mono text-xs text-cyan-300">{event.event_type}</p>
                  <p className="mt-2 text-xs text-zinc-600">{formatDate(event.created_at)}</p>
                </div>
              )) : <p className="rounded-lg border border-zinc-800 bg-black p-4 text-sm text-zinc-500">No auth events retained yet.</p>}
            </div>
          </article>

          <article className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold">Replayable session context</h2>
            <div className="mt-5 grid gap-3">
              {(replayRows ?? []).length ? (replayRows ?? []).map((event, index) => (
                <Link key={String(event.id ?? index)} href={`/trust-replay?subject_id=${encodeURIComponent(String(event.subject_id ?? user.id))}`} className="rounded-lg border border-zinc-800 bg-black p-4 hover:border-cyan-800">
                  <p className="text-sm font-medium text-zinc-100">{event.event_title ?? event.event_type}</p>
                  <p className="mt-2 text-xs text-zinc-600">{formatDate(event.created_at)}</p>
                </Link>
              )) : <p className="rounded-lg border border-zinc-800 bg-black p-4 text-sm text-zinc-500">No replayable auth events retained yet.</p>}
            </div>
          </article>
        </section>

        <section className="mt-8 rounded-lg border border-zinc-800 bg-zinc-950 p-5">
          <h2 className="text-xl font-semibold">Session integrity linkage</h2>
          <p className="mt-3 text-sm leading-6 text-zinc-400">
            Authentication posture feeds runtime trust posture, session risk, escalation logic and governance review. Recent session integrity checks are shown as supporting context, not identity certainty.
          </p>
          <div className="mt-5 grid gap-3 md:grid-cols-4">
            {[
              ["Integrity checks", (sessionChecks ?? []).length],
              ["MFA decision", mfa.step_up_available ? "step_up_available" : "awaiting_credentials"],
              ["Geo decision", geoSession.decision],
              ["Trust source", "Runtime Intelligence"],
            ].map(([label, value]) => (
              <div key={String(label)} className="rounded-lg border border-zinc-800 bg-black p-4">
                <p className="text-xs uppercase tracking-[0.14em] text-zinc-500">{label}</p>
                <p className="mt-2 text-sm font-semibold text-zinc-100">{value}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
