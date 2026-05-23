import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  formatTimeAgo,
  normalizeSignals,
  type SignalRow,
} from "@/lib/trust-engine/liveSignals";
import {
  formatTimelineTimeAgo,
  normalizeTimelineEvents,
  type AuditLogRow,
} from "@/lib/trust-engine/timeline";

export const dynamic = "force-dynamic";

type Passport = {
  id: string;
  subject_name: string;
  subject_type: string;
  media_type: string | null;
  human_presence_index: number | null;
  synthetic_risk: number | null;
  liveness_score: number | null;
  voice_clone_risk: number | null;
  video_deepfake_risk: number | null;
  image_authenticity_score: number | null;
  origin_trace_score: number | null;
  attribution_confidence: number | null;
  provenance_status: string | null;
  review_status: string | null;
  trust_score: number | null;
  clearance: string | null;
  reality_passport_status: string | null;
  verified: boolean | null;
  suspicious_activity: boolean | null;
  abuse_risk: string | null;
  scan_status: string | null;
  linkedin_review_required: boolean | null;
  linkedin_verification_status: string | null;
  created_at: string | null;
};

export default async function CommandCenterPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: passports } = await supabase
    .from("passports")
    .select("*")
    .order("created_at", { ascending: false })
    .returns<Passport[]>();

  const { data: signals } = await supabase
    .from("signals")
    .select("id,event,created_at")
    .order("created_at", { ascending: false })
    .limit(5)
    .returns<SignalRow[]>();
  const radarSignals = normalizeSignals(signals).slice(0, 4);
  const { data: auditLogs } = await supabase
    .from("audit_logs")
    .select("id,event_type,actor,metadata,created_at")
    .order("created_at", { ascending: false })
    .limit(5)
    .returns<AuditLogRow[]>();
  const timelinePreview = normalizeTimelineEvents({
    auditLogs,
    signals,
    passports,
  }).slice(0, 4);

  const verifiedCount = passports?.filter((p) => p.verified).length ?? 0;

  const averageTrust = passports?.length
    ? Math.round(
        passports.reduce((sum, p) => sum + (p.trust_score ?? 0), 0) /
          passports.length
      )
    : 0;

  const averageHpi = passports?.length
    ? Math.round(
        passports.reduce(
          (sum, p) => sum + (p.human_presence_index ?? 0),
          0
        ) / passports.length
      )
    : 0;

  const reviewPassports =
    passports?.filter((p) => (p.clearance ?? "pending") === "pending") ?? [];
  const pendingCount = reviewPassports.length;
  const originTraceAlerts =
    passports?.filter((p) => (p.attribution_confidence ?? 100) < 50).length ??
    0;
  const averageAttribution = passports?.length
    ? Math.round(
        passports.reduce(
          (sum, p) => sum + (p.attribution_confidence ?? 0),
          0
        ) / passports.length
      )
    : 0;
  const suspiciousActivityCount =
    passports?.filter((p) => p.suspicious_activity).length ?? 0;
  const elevatedAbuseRiskCount =
    passports?.filter((p) => (p.abuse_risk ?? "low") !== "low").length ?? 0;
  const evidencePendingScan =
    passports?.filter((p) => (p.scan_status ?? "pending") === "pending").length ??
    0;
  const securityEvents =
    suspiciousActivityCount + elevatedAbuseRiskCount + evidencePendingScan;
  const linkedInProfilesUnderReview =
    passports?.filter(
      (p) =>
        p.linkedin_review_required ||
        ["submitted", "manual_review", "mismatch"].includes(
          p.linkedin_verification_status ?? ""
        )
    ).length ?? 0;

  return (
    <main className="min-h-screen bg-black p-8 text-white">
      <div className="mx-auto max-w-6xl">
        <Link href="/" className="text-sm text-zinc-400 hover:text-white">
          Back to Cyber Sentinels
        </Link>

        <form action="/api/auth/logout" method="POST" className="mt-4">
          <button className="rounded-xl border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:text-white">
            Logout
          </button>
        </form>

        <h1 className="mt-8 text-5xl font-bold">Command Center</h1>

        <section className="mt-10 grid gap-4 md:grid-cols-4">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
            <p className="text-zinc-500">Passports</p>
            <p className="mt-3 text-4xl font-bold">{passports?.length ?? 0}</p>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
            <p className="text-zinc-500">Verified</p>
            <p className="mt-3 text-4xl font-bold">{verifiedCount}</p>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
            <p className="text-zinc-500">Average Trust</p>
            <p className="mt-3 text-4xl font-bold">{averageTrust}</p>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
            <p className="text-zinc-500">Pending Review</p>
            <p className="mt-3 text-4xl font-bold">{pendingCount}</p>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
            <p className="text-zinc-500">HPI™</p>
            <p className="mt-3 text-4xl font-bold">{averageHpi}</p>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
            <p className="text-zinc-500">Reality Passports</p>
            <p className="mt-3 text-4xl font-bold">{passports?.length ?? 0}</p>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
            <p className="text-zinc-500">Attribution Confidence</p>
            <p className="mt-3 text-4xl font-bold">{averageAttribution}</p>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
            <p className="text-zinc-500">Origin Trace Alerts</p>
            <p className="mt-3 text-4xl font-bold">{originTraceAlerts}</p>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
            <p className="text-zinc-500">Suspicious Activity</p>
            <p className="mt-3 text-4xl font-bold">{suspiciousActivityCount}</p>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
            <p className="text-zinc-500">Abuse Risk</p>
            <p className="mt-3 text-4xl font-bold">{elevatedAbuseRiskCount}</p>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
            <p className="text-zinc-500">Evidence Pending Scan</p>
            <p className="mt-3 text-4xl font-bold">{evidencePendingScan}</p>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
            <p className="text-zinc-500">Security Events</p>
            <p className="mt-3 text-4xl font-bold">{securityEvents}</p>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
            <p className="text-zinc-500">LinkedIn profiles under review</p>
            <p className="mt-3 text-4xl font-bold">
              {linkedInProfilesUnderReview}
            </p>
          </div>
        </section>

        <section className="mt-10 rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold">Passport Review Queue</h2>
              <p className="mt-2 text-sm text-zinc-500">
                Approve verified subjects or reject risky submissions.
              </p>
            </div>

            <Link
              href="/passport"
              className="rounded-xl border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:text-white"
            >
              Create Passport
            </Link>
          </div>

          <div className="mt-6 space-y-3">
            {reviewPassports.length ? (
              reviewPassports.map((passport) => (
                <div
                  key={passport.id}
                  className="grid gap-4 rounded-xl border border-zinc-800 p-4 md:grid-cols-[1.5fr_1fr_1fr_1fr_auto]"
                >
                  <div>
                    <p className="text-sm text-zinc-500">Subject</p>
                    <p className="mt-1 font-semibold">
                      {passport.subject_name}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-zinc-500">Type / Media</p>
                    <p className="mt-1 capitalize text-zinc-300">
                      {passport.subject_type} / {passport.media_type ?? "profile"}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-zinc-500">Risk</p>
                    <p className="mt-1 text-zinc-300">
                      Synthetic {passport.synthetic_risk ?? 0}%
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-zinc-500">Liveness / Image</p>
                    <p className="mt-1 capitalize text-zinc-300">
                      {passport.liveness_score ?? 0}% /{" "}
                      {passport.image_authenticity_score ?? 0}%
                    </p>
                  </div>

                  <div className="flex items-center gap-2 md:justify-end">
                    <form
                      action={`/api/passports/${passport.id}/decision`}
                      method="POST"
                    >
                      <input type="hidden" name="decision" value="approve" />
                      <button className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black">
                        Approve
                      </button>
                    </form>

                    <form
                      action={`/api/passports/${passport.id}/decision`}
                      method="POST"
                    >
                      <input type="hidden" name="decision" value="reject" />
                      <button className="rounded-xl border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:text-white">
                        Reject
                      </button>
                    </form>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-zinc-500">No passports awaiting review.</p>
            )}
          </div>
        </section>

        <section className="mt-10 rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold">Trust Timeline Preview</h2>
              <p className="mt-2 text-sm text-zinc-500">
                Trust is earned over time.
              </p>
            </div>
            <Link
              href="/trust-timeline"
              className="rounded-xl border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:text-white"
            >
              Open Trust Timeline
            </Link>
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-2">
            {timelinePreview.map((event) => (
              <Link
                key={event.id}
                href={`/trust-timeline/${encodeURIComponent(event.id)}`}
                className="rounded-xl border border-zinc-800 bg-black p-4 hover:border-zinc-500"
              >
                <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                  {event.source}
                </p>
                <p className="mt-2 font-medium text-zinc-100">{event.event}</p>
                <p className="mt-3 text-xs text-zinc-600">
                  {formatTimelineTimeAgo(event.created_at)} / {event.severity}
                </p>
              </Link>
            ))}
          </div>
        </section>

        <section className="mt-10 rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold">Live Trust Radar Preview</h2>
              <p className="mt-2 text-sm text-zinc-500">
                Signal detected across the trust layer.
              </p>
            </div>
            <Link
              href="/trust-radar"
              className="rounded-xl border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:text-white"
            >
              Open Live Trust Radar
            </Link>
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-2">
            {radarSignals.map((signal, index) => (
              <div
                key={signal.id}
                className={`rounded-xl border border-zinc-800 bg-black p-4 ${
                  index === 0 ? "animate-pulse" : ""
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                      {signal.isDemo ? "Demo Signal" : signal.source_type}
                    </p>
                    <p className="mt-2 font-medium text-zinc-100">
                      {signal.event}
                    </p>
                  </div>
                  <span className="rounded-full border border-zinc-700 px-2.5 py-1 text-xs text-zinc-300">
                    {signal.severity}
                  </span>
                </div>
                <p className="mt-3 text-xs text-zinc-600">
                  {formatTimeAgo(signal.created_at)} / {signal.status}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-10 rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
          <h2 className="text-xl font-semibold">Latest Signals</h2>

          <div className="mt-6 space-y-3">
            {signals?.length ? (
              signals.map((signal) => (
                <div
                  key={signal.id}
                  className="rounded-xl border border-zinc-800 p-4 text-zinc-300"
                >
                  {signal.event}
                </div>
              ))
            ) : (
              <p className="text-zinc-500">No signals yet.</p>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
