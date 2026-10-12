import Link from "next/link";
import { requireAdminPageAccess } from "@/lib/auth/isAdmin";
import { createClient } from "@/lib/supabase/server";
import { listEmploymentDecisionEvents } from "@/src/lib/employment/decision-service";
import { verifyTrustEventHash } from "@/src/lib/trust-events/hash";
import type { CanonicalTrustEvent } from "@/src/lib/trust-events/types";

export const dynamic = "force-dynamic";

type EventRow = Record<string, unknown>;

function record(value: unknown): EventRow {
  return value && typeof value === "object" && !Array.isArray(value) ? value as EventRow : {};
}

function display(value: unknown) {
  return typeof value === "string" && value.trim() ? value : "Not recorded";
}

function formatTime(value: unknown) {
  const date = new Date(String(value ?? ""));
  return Number.isNaN(date.getTime()) ? "Unknown" : date.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" });
}

export default async function EmploymentGovernancePage() {
  const auth = await createClient();
  await requireAdminPageAccess(auth, { path: "/admin/employment-governance" });
  const events = await listEmploymentDecisionEvents();
  const cases = new Map<string, EventRow[]>();
  for (const raw of events as EventRow[]) {
    const facts = record(raw.normalized_facts);
    const caseId = String(raw.workflow_id ?? facts.caseId ?? "");
    if (!caseId) continue;
    cases.set(caseId, [...(cases.get(caseId) ?? []), raw]);
  }

  return (
    <main className="min-h-screen bg-black px-5 py-8 text-white md:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-800 pb-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-emerald-300">Platform administration</p>
            <h1 className="mt-2 text-2xl font-semibold">Employment decision governance</h1>
          </div>
          <Link href="/back-office" className="border border-zinc-700 px-3 py-2 text-sm text-zinc-200 hover:border-zinc-400">Back Office</Link>
        </header>

        <div className="mt-6 divide-y divide-zinc-800">
          {[...cases.entries()].map(([caseId, rows]) => {
            const ordered = [...rows].sort((left, right) => Number(left.sequence) - Number(right.sequence));
            const opened = ordered.find((row) => row.event_type === "governance.employment_decision.opened");
            const facts = record(opened?.normalized_facts);
            const finding = record(facts.finding);
            const assignment = [...ordered].reverse().find((row) => row.event_type === "governance.employment_decision.reviewer_assigned");
            const assignmentFacts = record(assignment?.normalized_facts);
            const review = [...ordered].reverse().find((row) => row.event_type === "governance.employment_decision.human_reviewed");
            const reviewFacts = record(review?.normalized_facts);
            const determination = [...ordered].reverse().find((row) => row.event_type === "governance.employment_decision.determined");
            const determinationFacts = record(determination?.normalized_facts);
            const disclosures = ordered.filter((row) => row.event_type === "governance.employment_decision.disclosed");
            const latestDisclosure = disclosures.at(-1);
            const disclosureFacts = record(record(latestDisclosure?.normalized_facts).disclosure);
            const exception = [...ordered].reverse().find((row) => row.event_type === "governance.employment_decision.policy_exception_requested");
            const exceptionFacts = record(exception?.normalized_facts);
            const challenges = ordered.filter((row) => row.event_type === "governance.employment_decision.challenged");
            const overrides = ordered.filter((row) => row.event_type === "governance.employment_decision.overridden");
            const latestChallenge = record(challenges.at(-1)?.normalized_facts);
            const latestOverride = record(overrides.at(-1)?.normalized_facts);
            const policy = record(facts);
            const sourceReferences = record(facts.sourceReferences);
            return (
              <article key={caseId} className="grid gap-5 py-6 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,0.8fr)]">
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="font-medium">{display(facts.candidateReference)}</h2>
                    <span className="border border-zinc-700 px-2 py-1 text-xs text-zinc-300">{display(determinationFacts.outcome ?? (review ? "REVIEWED" : "REVIEW REQUIRED"))}</span>
                  </div>
                  <dl className="mt-4 grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
                    <div><dt className="text-zinc-500">AI finding</dt><dd className="mt-1 text-zinc-200">{display(finding.finding)}</dd></div>
                    <div><dt className="text-zinc-500">Source system decision (not employment outcome)</dt><dd className="mt-1 text-zinc-200">{display(facts.sourceSystemDecision)}</dd></div>
                    <div><dt className="text-zinc-500">External execution outcome</dt><dd className="mt-1 text-zinc-200">{display(facts.sourceExternalState)} · ALLOW is not execution success</dd></div>
                    <div><dt className="text-zinc-500">System / model</dt><dd className="mt-1 text-zinc-200">{display(facts.system)} / {display(finding.provider)} / {display(finding.model)} {display(finding.version)}</dd></div>
                    <div><dt className="text-zinc-500">Policy</dt><dd className="mt-1 break-all text-zinc-200">{display(policy.policyId)} / {display(policy.policyVersion)} / {display(policy.policyHash)}</dd></div>
                    <div><dt className="text-zinc-500">Authorized reviewer</dt><dd className="mt-1 break-all text-zinc-200">{display(reviewFacts.reviewerId ?? assignmentFacts.assignedReviewerId)} · {display(reviewFacts.authorityReference ?? assignmentFacts.authorityReference)}</dd></div>
                    <div><dt className="text-zinc-500">Independent review</dt><dd className="mt-1 text-zinc-200">{display(reviewFacts.rationale)}</dd></div>
                    <div><dt className="text-zinc-500">Review actions / evidence</dt><dd className="mt-1 break-all text-zinc-200">{Array.isArray(reviewFacts.actions) ? reviewFacts.actions.map(String).join(", ") : "Not recorded"}<br />{Array.isArray(reviewFacts.reviewedEvidenceReferences) ? reviewFacts.reviewedEvidenceReferences.map(String).join(", ") : "Not recorded"}</dd></div>
                    <div><dt className="text-zinc-500">Final human determination</dt><dd className="mt-1 text-zinc-200">{display(determinationFacts.rationale)}</dd></div>
                    <div><dt className="text-zinc-500">Determined by</dt><dd className="mt-1 break-all text-zinc-200">{display(determinationFacts.determinedBy)}</dd></div>
                    <div><dt className="text-zinc-500">Receipt / Replay / Trust Memory</dt><dd className="mt-1 break-all text-zinc-200">{display(sourceReferences.receipt)}<br />{display(sourceReferences.replay)}<br />{display(sourceReferences.trustMemory)}</dd></div>
                    <div><dt className="text-zinc-500">Challenges / overrides</dt><dd className="mt-1 text-zinc-200">{challenges.length} / {overrides.length}</dd></div>
                    {latestChallenge.challenge ? <div><dt className="text-zinc-500">Latest challenge</dt><dd className="mt-1 break-all text-zinc-200">{display(latestChallenge.challenge)}<br />Evidence: {Array.isArray(latestChallenge.newEvidenceReferences) ? latestChallenge.newEvidenceReferences.map(String).join(", ") : "Not recorded"}</dd></div> : null}
                    {latestOverride.override ? <div><dt className="text-zinc-500">Latest override</dt><dd className="mt-1 break-all text-zinc-200">{display(latestOverride.override)}<br />Evidence: {Array.isArray(latestOverride.newEvidenceReferences) ? latestOverride.newEvidenceReferences.map(String).join(", ") : "Not recorded"}</dd></div> : null}
                    <div><dt className="text-zinc-500">Outstanding disclosures</dt><dd className="mt-1 text-zinc-200">{facts.disclosureRequired !== true ? "Not required by bound policy" : disclosures.length ? "Delivery evidence recorded" : determination ? "Required" : "Due after determination"}</dd></div>
                    <div><dt className="text-zinc-500">Latest disclosure evidence</dt><dd className="mt-1 break-all text-zinc-200">{latestDisclosure ? `${display(disclosureFacts.contentVersion)} · ${display(disclosureFacts.contentHash)} · ${display(disclosureFacts.recipientReference)} · ${display(disclosureFacts.deliveryEvidenceReference)}` : "Not recorded"}</dd></div>
                    <div><dt className="text-zinc-500">Policy exceptions</dt><dd className="mt-1 break-all text-zinc-200">{exception ? `${display(exceptionFacts.status)} · ${display(exceptionFacts.exceptionScope)} · ${display(exceptionFacts.reason)}` : "None recorded"}</dd></div>
                  </dl>
                </div>
                <ol className="border-l border-zinc-800 pl-4 text-sm">
                  {ordered.map((row) => {
                    const eventFacts = record(row.normalized_facts);
                    const canonicalEvent = record(row.canonical_event) as unknown as CanonicalTrustEvent;
                    const hashVerified = typeof canonicalEvent.eventId === "string" && verifyTrustEventHash(canonicalEvent);
                    return <li key={String(row.event_id)} className="pb-4 last:pb-0">
                      <p className="text-zinc-200">{String(row.event_type).replace("governance.employment_decision.", "")}</p>
                      <p className="mt-1 text-xs text-zinc-500">{formatTime(row.occurred_at)} · {display(eventFacts.reviewerId ?? eventFacts.assignedReviewerId ?? eventFacts.determinedBy ?? eventFacts.deliveredBy ?? eventFacts.challengedBy ?? eventFacts.overriddenBy ?? eventFacts.caseCreatorId)}</p>
                      <p className="mt-1 break-all font-mono text-[11px] text-zinc-600">HASH {hashVerified ? "VERIFIED" : "UNVERIFIED"} · {display(row.event_hash)}</p>
                    </li>;
                  })}
                </ol>
              </article>
            );
          })}
          {cases.size === 0 ? <p className="py-8 text-sm text-zinc-500">No employment governance events are recorded.</p> : null}
        </div>
      </div>
    </main>
  );
}