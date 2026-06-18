import Link from "next/link";
import type { TimelineEvent, TrustFactor } from "@/lib/trusted-layer/phase1";
import { orchestrationLabel, riskFromScore } from "@/lib/trusted-layer/phase1";

function scoreClass(score: number) {
  if (score >= 85) return "border-emerald-800 bg-emerald-950/20 text-emerald-200";
  if (score >= 70) return "border-cyan-800 bg-cyan-950/20 text-cyan-100";
  if (score >= 50) return "border-amber-800 bg-amber-950/20 text-amber-200";
  return "border-red-900 bg-red-950/20 text-red-200";
}

export function TrustScoreBadge({ score }: { score: number }) {
  return (
    <div className={`rounded-lg border px-4 py-3 ${scoreClass(score)}`}>
      <p className="text-xs uppercase tracking-[0.16em]">Trust score</p>
      <p className="mt-2 text-3xl font-semibold">{score}</p>
      <p className="mt-1 text-xs capitalize">{riskFromScore(score)} risk</p>
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const normalized = status.toLowerCase();
  const label =
    normalized === "verified" || normalized === "approved"
      ? "Verified"
      : normalized === "needs_manual_review" || normalized === "needs_review"
        ? "Needs Review"
        : normalized === "risk_detected" || normalized === "high"
          ? "Risk Detected"
          : "Pending";
  const className =
    label === "Verified"
      ? "border-emerald-800 bg-emerald-950/20 text-emerald-200"
      : label === "Needs Review"
        ? "border-amber-800 bg-amber-950/20 text-amber-200"
        : label === "Risk Detected"
          ? "border-red-900 bg-red-950/20 text-red-200"
          : "border-cyan-800 bg-cyan-950/20 text-cyan-100";

  return (
    <span className={`inline-flex rounded-full border px-3 py-1 text-xs ${className}`}>
      {label}
    </span>
  );
}

export function AuthenticityBadge({ score }: { score: number }) {
  return (
    <span className={`inline-flex rounded-full border px-3 py-1 text-xs ${scoreClass(score)}`}>
      {orchestrationLabel(score)}
    </span>
  );
}

export function VerificationTimeline({ events }: { events: TimelineEvent[] }) {
  return (
    <div className="grid gap-3">
      {events.map((event, index) => (
        <div key={`${event.label}-${index}`} className="rounded-lg border border-zinc-800 bg-black p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <p className="font-medium text-zinc-100">{event.label}</p>
            <span className="rounded-full border border-cyan-800 px-2.5 py-1 text-xs text-cyan-100">
              {event.status}
            </span>
          </div>
          <p className="mt-2 text-sm leading-6 text-zinc-400">{event.detail}</p>
        </div>
      ))}
    </div>
  );
}

export function ExplainableTrustFactors({ factors }: { factors: TrustFactor[] }) {
  return (
    <div className="grid gap-3">
      {factors.map((factor) => (
        <div key={factor.label} className="rounded-lg border border-zinc-800 bg-black p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-medium text-zinc-100">{factor.label}</p>
              <p className="mt-2 text-sm leading-6 text-zinc-400">{factor.detail}</p>
            </div>
            <span className={`rounded-full border px-2.5 py-1 text-xs ${scoreClass(factor.score)}`}>
              {factor.score}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

export function AgentPassportCard({
  id,
  name,
  purpose,
  owner,
  score,
}: {
  id?: string;
  name: string;
  purpose: string;
  owner: string;
  score: number;
}) {
  const content = (
    <article className="rounded-lg border border-zinc-800 bg-black p-5 hover:border-cyan-800">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-zinc-600">Agent passport</p>
          <h3 className="mt-2 text-xl font-semibold text-zinc-100">{name}</h3>
          <p className="mt-2 text-sm leading-6 text-zinc-400">{purpose}</p>
        </div>
        <TrustScoreBadge score={score} />
      </div>
      <p className="mt-4 text-xs text-zinc-600">Owner: {owner}</p>
    </article>
  );

  return id ? <Link href={`/agents/${encodeURIComponent(id)}`}>{content}</Link> : content;
}

export function RecruiterDashboardCards() {
  const cards = [
    ["Candidates in review", "12", "Identity, liveness and profile consistency checks."],
    ["Interview sessions", "5", "Live sessions with webcam, voice and liveness placeholders."],
    ["Reports ready", "8", "Explainable hiring trust reports ready for recruiter review."],
    ["Escalations", "3", "Cases that require human review before decisioning."],
  ];

  return (
    <div className="grid gap-4 md:grid-cols-4">
      {cards.map(([label, value, detail]) => (
        <div key={label} className="rounded-lg border border-zinc-800 bg-black p-5">
          <p className="text-xs uppercase tracking-[0.16em] text-zinc-600">{label}</p>
          <p className="mt-3 text-3xl font-semibold text-zinc-100">{value}</p>
          <p className="mt-2 text-sm leading-6 text-zinc-400">{detail}</p>
        </div>
      ))}
    </div>
  );
}

export function AdminReviewQueuePlaceholder() {
  const rows = [
    ["Candidate liveness mismatch", "interview", "manual review"],
    ["Recruiter domain needs confirmation", "recruiter", "pending"],
    ["Media provenance incomplete", "provenance", "evidence needed"],
  ];

  return (
    <div className="grid gap-3">
      {rows.map(([title, type, status]) => (
        <div key={title} className="rounded-lg border border-zinc-800 bg-black p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-medium text-zinc-100">{title}</p>
              <p className="mt-1 text-xs text-zinc-600">{type}</p>
            </div>
            <span className="rounded-full border border-amber-800 px-2.5 py-1 text-xs text-amber-200">
              {status}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
