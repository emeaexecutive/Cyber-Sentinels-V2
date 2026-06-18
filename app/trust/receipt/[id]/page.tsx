import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { OnboardingHint } from "@/components/onboarding-walkthrough";
import { StatusBadge } from "@/components/phase-one-trust";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type JsonRecord = Record<string, unknown>;

function formatDate(value: unknown) {
  if (!value) return "Not recorded";
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return "Not recorded";
  return date.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
}

function label(value: unknown, fallback = "Not recorded") {
  if (value === null || value === undefined || value === "") return fallback;
  return String(value).replaceAll("_", " ");
}

function evidenceItems(value: unknown) {
  return Array.isArray(value) ? (value as JsonRecord[]) : [];
}

function DetailRow({ label: rowLabel, value }: { label: string; value: unknown }) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-black p-4">
      <p className="text-xs uppercase tracking-[0.16em] text-zinc-600">{rowLabel}</p>
      <p className="mt-2 text-sm text-zinc-300">{label(value)}</p>
    </div>
  );
}

export default async function TrustReceiptPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=/trust/receipt/${encodeURIComponent(id)}`);
  }

  const { data: receipt } = await supabase
    .from("verification_receipts")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!receipt) {
    notFound();
  }

  const [
    { data: evidenceChains },
    { data: timeline },
    { data: governanceActions },
    { data: receiptRelationships },
    { data: subjectRelationships },
    { data: auditLogs },
  ] = await Promise.all([
    supabase
      .from("evidence_chains")
      .select("*")
      .eq("subject_type", receipt.subject_type)
      .eq("subject_id", receipt.subject_id)
      .order("created_at", { ascending: false }),
    supabase
      .from("trust_timeline_events")
      .select("*")
      .eq("subject_type", receipt.subject_type)
      .eq("subject_id", receipt.subject_id)
      .order("created_at", { ascending: false })
      .limit(12),
    supabase
      .from("governance_actions")
      .select("*")
      .eq("subject_type", receipt.subject_type)
      .eq("subject_id", receipt.subject_id)
      .order("created_at", { ascending: false })
      .limit(8),
    supabase
      .from("trust_relationships")
      .select("*")
      .eq("source_type", "verification_receipt")
      .eq("source_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("trust_relationships")
      .select("*")
      .eq("target_type", receipt.subject_type)
      .eq("target_id", receipt.subject_id)
      .order("created_at", { ascending: false })
      .limit(8),
    supabase
      .from("audit_logs")
      .select("*")
      .eq("event_type", "verification_receipt_issued")
      .order("created_at", { ascending: false })
      .limit(6),
  ]);

  const snapshot = (receipt.evidence_snapshot ?? {}) as JsonRecord;
  const relationships = [...(receiptRelationships ?? []), ...(subjectRelationships ?? [])];
  const openGovernance = (governanceActions ?? []).filter((action) =>
    ["pending", "in_review", "escalated"].includes(String(action.action_status ?? "pending"))
  );
  const nextReceiptAction = openGovernance.length
    ? "Governance review is still pending. Check the open action before sharing a final outcome."
    : "Share the receipt or replay the workflow if more context is needed.";

  return (
    <main className="min-h-screen bg-[#04070c] px-6 py-12 text-white md:px-8">
      <div className="mx-auto max-w-6xl">
        <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-6">
          <p className="text-sm uppercase tracking-[0.24em] text-cyan-200">
            Verification Receipt
          </p>
          <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-4xl font-semibold">
                {label(receipt.receipt_type, "Trust receipt")}
              </h1>
              <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-400">
                {receipt.receipt_summary ??
                  "Explainable verification receipt recorded for operational governance review."}
              </p>
              <p className="mt-3 max-w-3xl rounded-lg border border-emerald-900 bg-black p-3 text-sm leading-6 text-emerald-100">
                Verification receipt available. {nextReceiptAction}
              </p>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-zinc-500">
                Cyber Sentinels creates explainable verification receipts and
                operational trust evidence chains. Receipts preserve review
                context; they are not blockchain records or automatic trust
                decisions.
              </p>
              <div className="mt-5 max-w-3xl">
                <OnboardingHint area="receipt" />
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <StatusBadge status={receipt.verification_status ?? "pending"} />
              <StatusBadge status={receipt.confidence_level ?? "In Review"} />
            </div>
          </div>
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <DetailRow label="Subject" value={`${label(receipt.subject_type)} / ${receipt.subject_id}`} />
          <DetailRow label="Issued" value={formatDate(receipt.issued_at)} />
          <DetailRow label="Expires" value={formatDate(receipt.expires_at)} />
          <DetailRow label="Reviewer State" value={receipt.issued_by ? "Human review recorded" : "System recorded"} />
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-4">
          <DetailRow label="What was verified" value={label(receipt.subject_type, "Workflow subject")} />
          <DetailRow label="Evidence exists" value={(evidenceChains ?? []).length ? `${(evidenceChains ?? []).length} evidence chain(s)` : "No linked evidence chain yet"} />
          <DetailRow label="What is pending" value={openGovernance.length ? `${openGovernance.length} governance action(s)` : "No pending governance action"} />
          <DetailRow label="Requires action" value={openGovernance.length ? "Reviewer decision required" : "No action required"} />
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold">Trust Explanation</h2>
            <div className="mt-5 grid gap-3">
              <p className="rounded-lg border border-zinc-800 bg-black p-4 text-sm leading-6 text-zinc-400">
                Verification occurred because an operational workflow recorded
                evidence, status and governance context for this subject. Human
                review remains authoritative where the workflow requires a
                decision.
              </p>
              <p className="rounded-lg border border-zinc-800 bg-black p-4 text-sm leading-6 text-zinc-400">
                Confidence: {label(receipt.confidence_level, "In Review")}.
                Status: {label(receipt.verification_status, "pending")}.
                Operational context: {label(snapshot.operational_context, "Receipt generated from existing trust workflow activity.")}
              </p>
            </div>
          </section>

          <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold">Evidence Snapshot</h2>
            <div className="mt-5 grid gap-3">
              {Object.entries(snapshot).length ? (
                Object.entries(snapshot).map(([key, value]) => (
                  <div key={key} className="rounded-lg border border-zinc-800 bg-black p-4">
                    <p className="text-xs uppercase tracking-[0.16em] text-zinc-600">
                      {label(key)}
                    </p>
                    <p className="mt-2 break-words text-sm text-zinc-300">
                      {typeof value === "object" ? JSON.stringify(value) : label(value)}
                    </p>
                  </div>
                ))
              ) : (
                <p className="rounded-lg border border-zinc-800 bg-black p-4 text-sm text-zinc-500">
                  No evidence snapshot was attached to this receipt.
                </p>
              )}
            </div>
          </section>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-3">
          <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold">Evidence Chains</h2>
            <div className="mt-5 grid gap-3">
              {(evidenceChains ?? []).length ? (
                (evidenceChains ?? []).map((chain) => (
                  <article key={String(chain.id)} className="rounded-lg border border-zinc-800 bg-black p-4">
                    <p className="font-medium text-zinc-100">{chain.chain_summary ?? "Evidence chain"}</p>
                    <div className="mt-3 grid gap-2">
                      {evidenceItems(chain.evidence).map((item, index) => (
                        <p key={`${chain.id}-${index}`} className="text-sm leading-6 text-zinc-500">
                          {label(item.type, "evidence")} {item.id ? `- ${String(item.id)}` : ""}
                        </p>
                      ))}
                    </div>
                  </article>
                ))
              ) : (
                <p className="rounded-lg border border-zinc-800 bg-black p-4 text-sm text-zinc-500">
                  No evidence chain is linked yet.
                </p>
              )}
            </div>
          </section>

          <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold">Verification Timeline</h2>
            <div className="mt-5 grid gap-3">
              {(timeline ?? []).length ? (
                (timeline ?? []).map((event) => (
                  <article key={String(event.id)} className="rounded-lg border border-zinc-800 bg-black p-4">
                    <p className="font-medium text-zinc-100">{event.event_title ?? event.event_type}</p>
                    <p className="mt-2 text-sm leading-6 text-zinc-500">{event.event_summary ?? "Timeline event recorded."}</p>
                    <p className="mt-2 text-xs text-zinc-600">{formatDate(event.created_at)}</p>
                  </article>
                ))
              ) : (
                <p className="rounded-lg border border-zinc-800 bg-black p-4 text-sm text-zinc-500">
                  No timeline events are visible yet.
                </p>
              )}
            </div>
          </section>

          <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold">Governance State</h2>
            <div className="mt-5 grid gap-3">
              {(governanceActions ?? []).length ? (
                (governanceActions ?? []).map((action) => (
                  <article key={String(action.id)} className="rounded-lg border border-zinc-800 bg-black p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="font-medium text-zinc-100">{label(action.action_status, "pending")}</p>
                      <StatusBadge status={action.action_status ?? "pending"} />
                    </div>
                    <p className="mt-2 text-sm leading-6 text-zinc-500">
                      {action.resolution_notes ?? "Human governance action remains reviewable."}
                    </p>
                  </article>
                ))
              ) : (
                <p className="rounded-lg border border-zinc-800 bg-black p-4 text-sm text-zinc-500">
                  No governance action is attached to this subject yet.
                </p>
              )}
            </div>
          </section>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-2">
          <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold">Trust Relationships</h2>
            <div className="mt-5 grid gap-3">
              {relationships.length ? (
                relationships.map((relationship) => (
                  <article key={String(relationship.id)} className="rounded-lg border border-zinc-800 bg-black p-4">
                    <p className="font-medium text-zinc-100">{label(relationship.relationship_type, "linked to")}</p>
                    <p className="mt-2 text-sm leading-6 text-zinc-500">
                      {relationship.explanation ?? "Relationship preserved for explainable provenance."}
                    </p>
                  </article>
                ))
              ) : (
                <p className="rounded-lg border border-zinc-800 bg-black p-4 text-sm text-zinc-500">
                  No trust relationships are visible yet.
                </p>
              )}
            </div>
          </section>

          <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold">Audit References</h2>
            <div className="mt-5 grid gap-3">
              {(auditLogs ?? []).length ? (
                (auditLogs ?? []).map((audit) => (
                  <article key={String(audit.id)} className="rounded-lg border border-zinc-800 bg-black p-4">
                    <p className="font-medium text-zinc-100">{audit.event_type ?? "audit_event"}</p>
                    <p className="mt-2 text-sm leading-6 text-zinc-500">
                      Actor: {label(audit.actor, "receipt registry")}
                    </p>
                    <p className="mt-2 text-xs text-zinc-600">{formatDate(audit.created_at)}</p>
                  </article>
                ))
              ) : (
                <p className="rounded-lg border border-zinc-800 bg-black p-4 text-sm text-zinc-500">
                  Audit references will appear after receipt logging is available.
                </p>
              )}
            </div>
          </section>
        </section>

        <div className="mt-8 flex flex-wrap gap-4">
          {receipt.subject_type === "interview_session" ? (
            <Link href={`/trust/hiring-report/${receipt.subject_id}`} className="text-sm text-cyan-200 underline">
              Open hiring report
            </Link>
          ) : null}
          <Link href="/trust-graph" className="text-sm text-cyan-200 underline">
            Open trust graph
          </Link>
        </div>
      </div>
    </main>
  );
}
