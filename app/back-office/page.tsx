import Link from "next/link";
import { AdminVerificationActions } from "@/components/admin-verification-actions";
import { checkAdminAccess, requireAdminPageAccess } from "@/lib/auth/isAdmin";
import {
  backOfficeStatuses,
  decisionActions,
  type BackOfficeStatus,
  type DecisionAction,
} from "@/lib/back-office";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import {
  formatTimeAgo,
  normalizeSignals,
} from "@/lib/trust-engine/liveSignals";
import {
  calculateTrustScoreV1,
  getTrustScoreReasonTone,
  isRowLinkedToPassport,
} from "@/lib/trust-score-engine";
import { scoreGraphHealth } from "@/lib/trust-graph/scoreGraphHealth";
import {
  predictTrustRisk,
  type PredictionInputDecision,
} from "@/lib/trust-engine/predictions";
import { evaluateTrustFabric } from "@/lib/trust-engine/trustFabric";

export const dynamic = "force-dynamic";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

type AnyRow = Record<string, any>;

type TableResult<T> = {
  rows: T[];
  count: number;
  available: boolean;
};

type SupabaseQueryError = {
  code?: string;
  message?: string;
  details?: string;
  hint?: string;
};

function isMissingTableError(error: SupabaseQueryError | null) {
  const text = [
    error?.code,
    error?.message,
    error?.details,
    error?.hint,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return (
    error?.code === "42P01" ||
    error?.code === "PGRST205" ||
    text.includes("could not find the table") ||
    (text.includes("relation") && text.includes("does not exist"))
  );
}

function toTableResult<T>(data: T[] | null, count: number | null) {
  return {
    rows: data ?? [],
    count: count ?? data?.length ?? 0,
    available: true,
  };
}

async function fetchTable<T>(
  supabase: SupabaseServerClient,
  table: string,
  orderColumn = "created_at",
  limit = 8
): Promise<TableResult<T>> {
  const primary = await supabase
    .from(table)
    .select("*", { count: "exact" })
    .order(orderColumn, { ascending: false })
    .limit(limit)
    .returns<T[]>();

  if (!primary.error) {
    return toTableResult(primary.data, primary.count);
  }

  if (isMissingTableError(primary.error)) {
    return { rows: [], count: 0, available: false };
  }

  const broad = await supabase
    .from(table)
    .select("*", { count: "exact" })
    .order(orderColumn, { ascending: false })
    .limit(limit)
    .returns<T[]>();

  if (!broad.error) {
    return toTableResult(broad.data, broad.count);
  }

  if (isMissingTableError(broad.error)) {
    return { rows: [], count: 0, available: false };
  }

  const unordered = await supabase
    .from(table)
    .select("*", { count: "exact" })
    .limit(limit)
    .returns<T[]>();

  if (!unordered.error) {
    return toTableResult(unordered.data, unordered.count);
  }

  return {
    rows: [],
    count: 0,
    available: !isMissingTableError(unordered.error),
  };
}

function formatDate(value?: string | null) {
  if (!value) {
    return "Unknown date";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Unknown date";
  }

  return date.toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function StatusBadge({ status }: { status?: string | null }) {
  const normalized =
    status && backOfficeStatuses.includes(status as BackOfficeStatus)
      ? status
      : "pending";

  const styles: Record<BackOfficeStatus, string> = {
    pending: "border-zinc-700 text-zinc-300",
    in_review: "border-cyan-700 text-cyan-200",
    verified: "border-emerald-700 text-emerald-200",
    rejected: "border-red-800 text-red-200",
    escalated: "border-amber-700 text-amber-200",
  };

  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs ${styles[
        normalized as BackOfficeStatus
      ]}`}
    >
      {normalized}
    </span>
  );
}

function DecisionBadge({ decision }: { decision?: string | null }) {
  const normalized =
    decision && decisionActions.includes(decision as DecisionAction)
      ? decision
      : "manual_review";

  return (
    <span className="inline-flex rounded-full border border-zinc-700 px-2.5 py-1 text-xs text-zinc-300">
      {normalized}
    </span>
  );
}

function EmptyState({ label }: { label: string }) {
  return <p className="text-sm text-zinc-500">{label}</p>;
}

function shortId(value?: string | null) {
  return value ? value.slice(0, 8) : "n/a";
}

function AuditPanelItem({
  label,
  row,
  detail,
}: {
  label: string;
  row?: AnyRow;
  detail?: string;
}) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-black p-4">
      <p className="text-xs uppercase tracking-[0.16em] text-zinc-600">
        {label}
      </p>
      {row ? (
        <>
          <p className="mt-2 break-all text-sm font-medium text-zinc-100">
            {shortId(String(row.id ?? ""))}
          </p>
          {detail ? (
            <p className="mt-1 text-sm text-zinc-400">{detail}</p>
          ) : null}
          <p className="mt-2 text-xs text-zinc-600">
            {formatDate(row.created_at)}
          </p>
        </>
      ) : (
        <p className="mt-2 text-sm text-zinc-500">No live record yet.</p>
      )}
    </div>
  );
}

function BackOfficeAccessGate({
  email,
  denied,
}: {
  email: string;
  denied?: boolean;
}) {
  return (
    <main className="min-h-screen bg-black p-6 text-white md:p-8">
      <div className="mx-auto max-w-md">
        <Link href="/" className="text-sm text-zinc-400 hover:text-white">
          Back to Cyber Sentinels
        </Link>

        <section className="mt-10 rounded-lg border border-zinc-800 bg-zinc-950 p-6">
          <h1 className="text-3xl font-bold">Back Office Access</h1>
          <p className="mt-3 text-zinc-400">
            Enter the admin access code to open Back Office.
          </p>

          <form action="/api/admin/access" method="post" className="mt-6 grid gap-4">
            <p className="text-sm text-emerald-300">
              Logged in as {email}. This account is allowlisted.
            </p>
            <label className="grid gap-2 text-sm text-zinc-400">
              Admin access code
              <input
                name="access_code"
                type="password"
                autoComplete="one-time-code"
                required
                className="rounded-lg border border-zinc-800 bg-black p-3 text-white"
              />
            </label>

            <button
              type="submit"
              className="rounded-lg bg-white p-3 font-semibold text-black"
            >
              Open Back Office
            </button>

            {denied ? (
              <p className="text-sm text-red-300">
                Admin access expired. Re-enter admin code.
              </p>
            ) : null}
          </form>
        </section>
      </div>
    </main>
  );
}

function NotAllowlistedGate() {
  return (
    <main className="min-h-screen bg-black p-6 text-white md:p-8">
      <div className="mx-auto max-w-md">
        <Link href="/" className="text-sm text-zinc-400 hover:text-white">
          Back to Cyber Sentinels
        </Link>

        <section className="mt-10 rounded-lg border border-red-900 bg-zinc-950 p-6">
          <h1 className="text-3xl font-bold">Back Office Access</h1>
          <p className="mt-4 text-sm text-red-300">Not allowlisted.</p>
        </section>
      </div>
    </main>
  );
}

function AdminNotConfiguredGate() {
  return (
    <main className="min-h-screen bg-black p-6 text-white md:p-8">
      <div className="mx-auto max-w-md">
        <Link href="/" className="text-sm text-zinc-400 hover:text-white">
          Back to Cyber Sentinels
        </Link>

        <section className="mt-10 rounded-lg border border-amber-900 bg-zinc-950 p-6">
          <h1 className="text-3xl font-bold">Back Office Access</h1>
          <p className="mt-4 text-sm text-amber-200">
            Admin not configured.
          </p>
          <p className="mt-3 text-sm leading-6 text-zinc-400">
            Set ADMIN_EMAILS to the comma-separated admin allowlist before
            opening Back Office.
          </p>
        </section>
      </div>
    </main>
  );
}

function rowKey(row: AnyRow, fallback: string) {
  return String(row.id ?? fallback);
}

function FeedbackActions({
  item,
  target = "feedback_reports",
}: {
  item: AnyRow;
  target?: "feedback_reports" | "interest_signals";
}) {
  const action = `/api/admin/feedback/${item.id}`;
  const status = String(item.status ?? "new");

  return (
    <form
      method="POST"
      action={action}
      className="mt-4 grid gap-3 border-t border-zinc-900 pt-4"
    >
      <input type="hidden" name="target" value={target} />
      <div className="flex flex-wrap gap-2">
        {[
          ["reviewed", "Mark Reviewed"],
          ["resolved", "Mark Resolved"],
          ["high_signal", "Mark High-Signal"],
        ].map(([value, label]) => (
          <button
            key={value}
            type="submit"
            name="status"
            value={value}
            disabled={status === value}
            className="rounded-lg border border-cyan-800 px-3 py-2 text-xs font-medium text-cyan-100 hover:border-cyan-400 hover:text-white disabled:opacity-50"
          >
            {label}
          </button>
        ))}
      </div>
      <textarea
        name="admin_notes"
        defaultValue={String(item.admin_notes ?? "")}
        rows={2}
        placeholder="Founder/admin notes"
        className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white placeholder:text-zinc-600"
      />
    </form>
  );
}

function evidenceStatus(row?: AnyRow) {
  return row?.status ?? row?.scan_status ?? "pending_review";
}

function EvidenceReviewActions({ evidenceId }: { evidenceId: string }) {
  const action = `/api/admin/evidence/${evidenceId}/decision`;

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      <form method="POST" action={action}>
        <input type="hidden" name="decision" value="accept" />
        <button
          type="submit"
          className="rounded-lg border border-emerald-700 px-3 py-2 text-xs font-medium text-emerald-200 hover:border-emerald-400 hover:text-white"
        >
          Accept Evidence
        </button>
      </form>
      <form method="POST" action={action}>
        <input type="hidden" name="decision" value="reject" />
        <button
          type="submit"
          className="rounded-lg border border-red-800 px-3 py-2 text-xs font-medium text-red-200 hover:border-red-500 hover:text-white"
        >
          Reject Evidence
        </button>
      </form>
    </div>
  );
}

function DataRightsActions({ request }: { request: AnyRow }) {
  const action = `/api/admin/data-rights/${request.id}/status`;
  const status = String(request.status ?? "open");

  return (
    <div className="mt-3 flex flex-wrap gap-2 border-t border-zinc-900 pt-3">
      {status !== "in_progress" && status !== "completed" ? (
        <form method="POST" action={action}>
          <input type="hidden" name="status" value="in_progress" />
          <button
            type="submit"
            className="rounded-lg border border-cyan-800 px-3 py-2 text-xs font-medium text-cyan-100 hover:border-cyan-400 hover:text-white"
          >
            Mark In Progress
          </button>
        </form>
      ) : null}
      {status !== "completed" ? (
        <form method="POST" action={action}>
          <input type="hidden" name="status" value="completed" />
          <button
            type="submit"
            className="rounded-lg border border-emerald-700 px-3 py-2 text-xs font-medium text-emerald-200 hover:border-emerald-400 hover:text-white"
          >
            Mark Completed
          </button>
        </form>
      ) : null}
    </div>
  );
}

function MessageThreadActions({ thread }: { thread: AnyRow }) {
  const action = `/api/admin/messages/${thread.id}/action`;

  return (
    <div className="mt-4 grid gap-3 border-t border-zinc-900 pt-4">
      <form method="POST" action={action} className="grid gap-3">
        <input type="hidden" name="action" value="reply" />
        <textarea
          name="message"
          required
          rows={3}
          placeholder="Reply to the user"
          className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white placeholder:text-zinc-600"
        />
        <button
          type="submit"
          className="w-fit rounded-lg border border-cyan-800 px-3 py-2 text-xs font-medium text-cyan-100 hover:border-cyan-400 hover:text-white"
        >
          Reply
        </button>
      </form>
      <div className="flex flex-wrap gap-2">
        <form method="POST" action={action}>
          <input type="hidden" name="action" value="escalate" />
          <button
            type="submit"
            className="rounded-lg border border-amber-800 px-3 py-2 text-xs font-medium text-amber-200 hover:border-amber-400 hover:text-white"
          >
            Escalate
          </button>
        </form>
        <form method="POST" action={action}>
          <input type="hidden" name="action" value="close" />
          <button
            type="submit"
            className="rounded-lg border border-zinc-700 px-3 py-2 text-xs font-medium text-zinc-300 hover:border-zinc-400 hover:text-white"
          >
            Close Thread
          </button>
        </form>
      </div>
    </div>
  );
}

function AppealReviewActions({ appeal }: { appeal: AnyRow }) {
  const action = `/api/admin/appeals/${appeal.id}/review`;

  return (
    <form method="POST" action={action} className="mt-4 grid gap-3 border-t border-zinc-900 pt-4">
      <select
        name="status"
        defaultValue={String(appeal.status ?? "under_review")}
        className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white"
      >
        {["under_review", "upheld", "reversed", "escalated", "closed"].map(
          (status) => (
            <option key={status} value={status}>
              {status}
            </option>
          )
        )}
      </select>
      <textarea
        name="resolution_notes"
        rows={3}
        defaultValue={String(appeal.resolution_notes ?? "")}
        placeholder="Resolution notes visible to the user"
        className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white placeholder:text-zinc-600"
      />
      <button
        type="submit"
        className="w-fit rounded-lg border border-emerald-700 px-3 py-2 text-xs font-medium text-emerald-200 hover:border-emerald-400 hover:text-white"
      >
        Update Appeal
      </button>
    </form>
  );
}

function HelpQuestionActions({ question }: { question: AnyRow }) {
  const action = `/api/admin/help-questions/${question.id}/answer`;
  const draftAction = "/api/admin/assistant/draft-answer";
  const isAiDraft = question.status === "drafted";

  return (
    <div className="mt-4 grid gap-3 border-t border-zinc-900 pt-4">
      {question.status !== "answered" ? (
        <form method="POST" action={draftAction}>
          <input type="hidden" name="target" value="help" />
          <input type="hidden" name="question_id" value={String(question.id)} />
          <input
            type="hidden"
            name="question_text"
            value={String(question.question ?? "")}
          />
          <button
            type="submit"
            className="rounded-lg border border-cyan-800 px-3 py-2 text-xs font-medium text-cyan-100 hover:border-cyan-400 hover:text-white"
          >
            Generate Draft
          </button>
        </form>
      ) : null}
      <form method="POST" action={action} className="grid gap-3">
        <input type="hidden" name="action" value="answer" />
        <input
          type="hidden"
          name="answer_source"
          value={isAiDraft ? "ai_draft_from_knowledge_base" : "admin_review"}
        />
        <label className="grid gap-2 text-xs uppercase tracking-[0.16em] text-zinc-600">
          {question.answer ? "Edit Draft" : "Answer"}
          <textarea
            name="answer"
            required
            rows={3}
            defaultValue={String(question.answer ?? "")}
            placeholder="Write an admin-managed answer"
            className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm normal-case tracking-normal text-white placeholder:text-zinc-600"
          />
        </label>
        <div className="flex flex-wrap gap-2">
          <button
            type="submit"
            className="rounded-lg border border-emerald-700 px-3 py-2 text-xs font-medium text-emerald-200 hover:border-emerald-400 hover:text-white"
          >
            Approve Answer
          </button>
        </div>
      </form>
      <form method="POST" action={action}>
        <input type="hidden" name="action" value="close" />
        <button
          type="submit"
          className="rounded-lg border border-zinc-700 px-3 py-2 text-xs font-medium text-zinc-300 hover:border-zinc-400 hover:text-white"
        >
          Mark Closed
        </button>
      </form>
    </div>
  );
}

function TrustAssistantQuestionActions({ question }: { question: AnyRow }) {
  const action = `/api/admin/trust-assistant-questions/${question.id}/answer`;
  const draftAction = "/api/admin/assistant/draft-answer";

  return (
    <div className="mt-4 grid gap-3 border-t border-zinc-900 pt-4">
      {question.status !== "answered" ? (
        <form method="POST" action={draftAction}>
          <input type="hidden" name="target" value="trust_assistant" />
          <input type="hidden" name="question_id" value={String(question.id)} />
          <input
            type="hidden"
            name="question_text"
            value={String(question.question ?? "")}
          />
          <button
            type="submit"
            className="rounded-lg border border-cyan-800 px-3 py-2 text-xs font-medium text-cyan-100 hover:border-cyan-400 hover:text-white"
          >
            Generate Draft
          </button>
        </form>
      ) : null}
      <form method="POST" action={action} className="grid gap-3">
        <input type="hidden" name="action" value="answer" />
        <label className="grid gap-2 text-xs uppercase tracking-[0.16em] text-zinc-600">
          {question.answer ? "Edit Draft" : "Answer in app"}
          <textarea
            name="answer"
            required
            rows={3}
            defaultValue={String(question.answer ?? "")}
            placeholder="Write a governed assistant answer"
            className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm normal-case tracking-normal text-white placeholder:text-zinc-600"
          />
        </label>
        <input
          name="answer_source"
          defaultValue={String(question.answer_source ?? "admin_review")}
          className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white placeholder:text-zinc-600"
          placeholder="answer source"
        />
        <button
          type="submit"
          className="w-fit rounded-lg border border-emerald-700 px-3 py-2 text-xs font-medium text-emerald-200 hover:border-emerald-400 hover:text-white"
        >
          Approve Answer
        </button>
      </form>
      <div className="flex flex-wrap gap-2">
        <form method="POST" action={action}>
          <input type="hidden" name="action" value="reviewed" />
          <button
            type="submit"
            className="rounded-lg border border-cyan-800 px-3 py-2 text-xs font-medium text-cyan-100 hover:border-cyan-400 hover:text-white"
          >
            Mark Reviewed
          </button>
        </form>
        <form method="POST" action={action}>
          <input type="hidden" name="action" value="escalated" />
          <button
            type="submit"
            className="rounded-lg border border-amber-800 px-3 py-2 text-xs font-medium text-amber-200 hover:border-amber-400 hover:text-white"
          >
            Mark Escalated
          </button>
        </form>
      </div>
    </div>
  );
}

function ReasonCodeChip({ reason }: { reason: string }) {
  const tone = getTrustScoreReasonTone(reason);
  const styles = {
    positive: "border-emerald-800 bg-emerald-950/30 text-emerald-200",
    warning: "border-amber-800 bg-amber-950/30 text-amber-200",
    danger: "border-red-900 bg-red-950/30 text-red-200",
  };
  const icon = tone === "positive" ? "✓" : "!";

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs ${styles[tone]}`}
    >
      <span aria-hidden="true">{icon}</span>
      {reason}
    </span>
  );
}

function tableEmptyLabel(table: string, available: boolean) {
  return available
    ? "No pending records."
    : `${table} table is not available yet.`;
}

type BackOfficePageProps = {
  searchParams?: Promise<{ denied?: string; ai_draft?: string }>;
};

export default async function BackOfficePage({
  searchParams,
}: BackOfficePageProps) {
  const supabase = await createClient();
  const params = await searchParams;
  const access = await checkAdminAccess(supabase);

  if (!access.ok) {
    if (access.reason === "unauthenticated") {
      redirect("/login?next=/back-office");
    }

    if (access.reason === "admin_not_configured") {
      return <AdminNotConfiguredGate />;
    }

    if (access.reason === "not_allowlisted") {
      return <NotAllowlistedGate />;
    }

    return (
      <BackOfficeAccessGate
        email={access.user?.email ?? access.user?.id ?? "admin"}
        denied={params?.denied === "1"}
      />
    );
  }

  await requireAdminPageAccess(supabase, {
    path: "/back-office",
    denied: params?.denied === "1",
  });
  const aiDraftMessage =
    params?.ai_draft === "missing_openai_key"
      ? "AI drafting unavailable — missing OPENAI_API_KEY."
      : params?.ai_draft === "no_approved_source"
        ? "No approved knowledge source available."
        : params?.ai_draft === "created"
          ? "AI answer draft created. Review and approve before users see it."
          : "";

  const [
    waitlist,
    verificationCases,
    passports,
    trustReports,
    signals,
    auditLogs,
    evidenceFiles,
    decisions,
    helpQuestions,
    trustAssistantQuestions,
    knowledgeArticles,
    dataRightsRequests,
    enterpriseAccessRequests,
    billingCustomers,
    subscriptions,
    feedbackReports,
    interestSignals,
    messageThreads,
    messageEvents,
    notifications,
    appeals,
    agents,
    trustEvents,
    stateChecks,
    executionPassports,
    trustGraphNodes,
    trustGraphEdges,
  ] = await Promise.all([
    fetchTable<AnyRow>(supabase, "waitlist"),
    fetchTable<AnyRow>(supabase, "verification_cases"),
    fetchTable<AnyRow>(supabase, "passports"),
    fetchTable<AnyRow>(supabase, "trust_reports"),
    fetchTable<AnyRow>(supabase, "signals"),
    fetchTable<AnyRow>(supabase, "audit_logs"),
    fetchTable<AnyRow>(supabase, "evidence_files", "created_at", 100),
    fetchTable<AnyRow>(supabase, "decisions", "created_at", 100),
    fetchTable<AnyRow>(supabase, "help_questions", "created_at", 8),
    fetchTable<AnyRow>(supabase, "trust_assistant_questions", "created_at", 8),
    fetchTable<AnyRow>(supabase, "knowledge_articles", "updated_at", 20),
    fetchTable<AnyRow>(supabase, "data_rights_requests", "created_at", 20),
    fetchTable<AnyRow>(supabase, "enterprise_access_requests", "created_at", 20),
    fetchTable<AnyRow>(supabase, "billing_customers", "created_at", 20),
    fetchTable<AnyRow>(supabase, "subscriptions", "created_at", 20),
    fetchTable<AnyRow>(supabase, "feedback_reports", "created_at", 50),
    fetchTable<AnyRow>(supabase, "interest_signals", "created_at", 30),
    fetchTable<AnyRow>(supabase, "message_threads", "updated_at", 20),
    fetchTable<AnyRow>(supabase, "message_events", "created_at", 80),
    fetchTable<AnyRow>(supabase, "notifications", "created_at", 20),
    fetchTable<AnyRow>(supabase, "appeals", "created_at", 20),
    fetchTable<AnyRow>(supabase, "agents", "created_at", 20),
    fetchTable<AnyRow>(supabase, "trust_events", "created_at", 30),
    fetchTable<AnyRow>(supabase, "passport_state_checks", "created_at", 100),
    fetchTable<AnyRow>(supabase, "execution_passports", "created_at", 100),
    fetchTable<AnyRow>(supabase, "trust_graph_nodes", "created_at", 20),
    fetchTable<AnyRow>(supabase, "trust_graph_edges", "created_at", 20),
  ]);

  const messageEventsByThread = new Map<string, AnyRow[]>();

  messageEvents.rows.forEach((event) => {
    const threadId = String(event.thread_id ?? "");

    if (!threadId) {
      return;
    }

    messageEventsByThread.set(threadId, [
      ...(messageEventsByThread.get(threadId) ?? []),
      event,
    ]);
  });

  const isStripeBillingConfigured = Boolean(
    process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PRO_MONTHLY_PRICE_ID
  );
  const proWaitlistRequests = enterpriseAccessRequests.rows.filter(
    (request) =>
      String(request.use_case ?? "").endsWith("_waitlist") ||
      String(request.status ?? "").endsWith("_waitlist")
  );
  const enterpriseLeadRequests = enterpriseAccessRequests.rows.filter(
    (request) =>
      !String(request.use_case ?? "").endsWith("_waitlist") &&
      !String(request.status ?? "").endsWith("_waitlist")
  );
  const activeSubscriptions = subscriptions.rows.filter((subscription) =>
    ["active", "trialing"].includes(String(subscription.status ?? ""))
  );

  const feedbackByCategory = (category: string) =>
    feedbackReports.rows.filter((report) => report.category === category);
  const confusionPoints = feedbackByCategory("confusion_point").concat(
    feedbackByCategory("onboarding_issue")
  );
  const featureRequests = feedbackByCategory("feature_request");
  const bugReports = feedbackByCategory("bug_report");
  const highSignalFeedback = feedbackReports.rows.filter(
    (report) => report.status === "high_signal"
  );
  const founderSignals = [
    [
      "Most common confusion points",
      confusionPoints.length
        ? `${confusionPoints.length} confusion or onboarding reports`
        : "No confusion points recorded yet",
    ],
    [
      "Most requested features",
      featureRequests.length
        ? `${featureRequests.length} feature requests`
        : "No feature requests recorded yet",
    ],
    [
      "Most viewed pages",
      "Page analytics are not instrumented yet",
    ],
    [
      "Enterprise access requests",
      `${enterpriseAccessRequests.count} access requests`,
    ],
    [
      "High-signal feedback",
      highSignalFeedback.length
        ? `${highSignalFeedback.length} items marked high-signal`
        : "No high-signal feedback marked yet",
    ],
    [
      "Signup failures",
      "Tracked through auth/error feedback when reported",
    ],
    [
      "Onboarding drop-offs",
      `${feedbackByCategory("onboarding_issue").length} onboarding issues reported`,
    ],
  ];
  const feedbackPanels = [
    {
      label: "Bugs",
      rows: bugReports,
      target: "feedback_reports" as const,
      empty: "No bug reports yet.",
    },
    {
      label: "Confusion Points",
      rows: confusionPoints,
      target: "feedback_reports" as const,
      empty: "No confusion points yet.",
    },
    {
      label: "Enterprise Interest",
      rows: interestSignals.rows,
      target: "interest_signals" as const,
      empty: "No enterprise interest signals yet.",
    },
    {
      label: "Feature Requests",
      rows: featureRequests,
      target: "feedback_reports" as const,
      empty: "No feature requests yet.",
    },
  ];

  const radarSignals = signals.rows.length
    ? normalizeSignals(
        signals.rows as Parameters<typeof normalizeSignals>[0]
      )
        .filter((signal) => !signal.isDemo)
        .slice(0, 5)
    : [];
  const prediction = predictTrustRisk({
    passports: passports.rows,
    signals: signals.rows,
    auditLogs: auditLogs.rows,
    decisions: decisions.rows as PredictionInputDecision[],
    fabricActivity: signals.count + auditLogs.count + decisions.count,
  });
  const trustFabric = evaluateTrustFabric({
    active_nodes:
      passports.count +
      verificationCases.count +
      signals.count +
      decisions.count +
      evidenceFiles.count,
    humans: passports.rows.filter((passport) => passport.subject_type === "human")
      .length,
    agents: passports.rows.filter((passport) => passport.subject_type === "agent")
      .length,
    signals: signals.count,
    decisions: decisions.count,
    evidence: evidenceFiles.count,
    relationships: signals.count + auditLogs.count + decisions.count,
    global_activity: signals.count + auditLogs.count,
  });
  const linkedInReviewQueue = [
    ...passports.rows.map((passport) => ({
      id: `passport-${passport.id}`,
      subject_name: passport.subject_name ?? "Unnamed subject",
      linkedin_url: passport.linkedin_url,
      status: passport.linkedin_verification_status ?? "unverified",
      claimed_company: passport.linkedin_claimed_company,
      claimed_role: passport.linkedin_claimed_role,
      review_required: Boolean(passport.linkedin_review_required),
    })),
    ...trustReports.rows.map((report) => ({
      id: `report-${report.id}`,
      subject_name: report.candidate_name ?? "Unnamed candidate",
      linkedin_url: report.linkedin_url,
      status: report.linkedin_verification_status ?? "unverified",
      claimed_company: report.linkedin_claimed_company,
      claimed_role: report.linkedin_claimed_role,
      review_required: Boolean(report.linkedin_review_required),
    })),
  ].filter(
    (item) =>
      item.linkedin_url &&
      (item.review_required ||
        ["submitted", "manual_review", "mismatch"].includes(item.status))
  );
  const pendingVerificationCases = verificationCases.rows;
  const stepUpRequests = signals.rows
    .filter((signal) =>
      /step_up|permission_step_up|agent_permission_escalated/i.test(
        signal.event ?? ""
      )
    )
    .slice(0, 4);
  const revocationEvents = signals.rows
    .filter((signal) =>
      /revoked|restricted|paused|locked|expired|revocation/i.test(
        signal.event ?? ""
      )
    )
    .slice(0, 4);
  const recoveryEvents = signals.rows
    .filter((signal) => /recovery|restored/i.test(signal.event ?? ""))
    .slice(0, 4);
  const complianceExportEvents = signals.rows
    .filter((signal) =>
      /compliance_export|trust_report|audit_pack|report_exported/i.test(
        signal.event ?? ""
      )
    )
    .slice(0, 4);
  const pendingEvidenceFiles = evidenceFiles.rows.filter(
    (file) => evidenceStatus(file) !== "clean"
  );
  const passportById = new Map(
    passports.rows.map((passport) => [String(passport.id), passport])
  );
  const evidenceByCase = new Map<string, AnyRow[]>();

  evidenceFiles.rows.forEach((file) => {
    if (!file.verification_case_id) {
      return;
    }

    const caseId = String(file.verification_case_id);
    const current = evidenceByCase.get(caseId) ?? [];
    current.push(file);
    evidenceByCase.set(caseId, current);
  });
  const latestDecisionByCase = new Map<string, AnyRow>();

  decisions.rows.forEach((decision) => {
    const caseId = decision.verification_case_id ?? decision.case_id;

    if (caseId && !latestDecisionByCase.has(String(caseId))) {
      latestDecisionByCase.set(String(caseId), decision);
    }
  });
  const trustScoreByCase = new Map(
    verificationCases.rows.map((item) => {
      const caseId = String(item.id);
      const passportId = item.passport_id ? String(item.passport_id) : "";
      const caseIds = new Set([caseId]);
      const evidence = evidenceByCase.get(caseId) ?? [];

      return [
        caseId,
        calculateTrustScoreV1({
          passport: passportId ? passportById.get(passportId) ?? item : item,
          evidence,
          decisions: decisions.rows.filter((decision) => {
            const decisionCaseId = decision.verification_case_id ?? decision.case_id;

            return decisionCaseId ? String(decisionCaseId) === caseId : false;
          }),
          auditLogs: auditLogs.rows.filter((log) =>
            isRowLinkedToPassport(log, passportId, caseIds)
          ),
          signals: signals.rows.filter((signal) =>
            isRowLinkedToPassport(signal, passportId, caseIds)
          ),
        }),
      ] as const;
    })
  );
  const graphHealthByCase = new Map(
    verificationCases.rows.map((item) => {
      const caseId = String(item.id);
      const passportId = item.passport_id ? String(item.passport_id) : "";
      const caseIds = new Set([caseId]);

      const subjectSignalNeedle = String(item.subject_name ?? "")
        .trim()
        .toLowerCase();

      return [
        caseId,
        scoreGraphHealth({
          passport: passportId ? passportById.get(passportId) ?? null : null,
          verificationCases: [item],
          evidenceFiles: evidenceFiles.rows.filter((file) =>
            isRowLinkedToPassport(file, passportId, caseIds)
          ),
          decisions: decisions.rows.filter((decision) =>
            isRowLinkedToPassport(decision, passportId, caseIds)
          ),
          auditLogs: auditLogs.rows.filter((log) =>
            isRowLinkedToPassport(log, passportId, caseIds)
          ),
          signals: signals.rows.filter(
            (signal) =>
              isRowLinkedToPassport(signal, passportId, caseIds) ||
              (subjectSignalNeedle
                ? String(signal.event ?? "")
                    .toLowerCase()
                    .includes(subjectSignalNeedle)
                : false)
          ),
          stateChecks: stateChecks.rows.filter(
            (row) => String(row.passport_id ?? "") === passportId
          ),
          executionPassports: executionPassports.rows.filter(
            (row) => String(row.passport_id ?? "") === passportId
          ),
        }),
      ] as const;
    })
  );
  const trustScoreByPassport = new Map(
    passports.rows.map((passport) => {
      const passportId = String(passport.id);
      const caseIds = new Set(
        verificationCases.rows
          .filter((item) => String(item.passport_id ?? "") === passportId)
          .map((item) => String(item.id))
      );

      return [
        passportId,
        calculateTrustScoreV1({
          passport,
          evidence: evidenceFiles.rows.filter((file) =>
            isRowLinkedToPassport(file, passportId, caseIds)
          ),
          decisions: decisions.rows.filter((decision) =>
            isRowLinkedToPassport(decision, passportId, caseIds)
          ),
          auditLogs: auditLogs.rows.filter((log) =>
            isRowLinkedToPassport(log, passportId, caseIds)
          ),
          signals: signals.rows.filter((signal) =>
            isRowLinkedToPassport(signal, passportId, caseIds)
          ),
        }),
      ] as const;
    })
  );

  const latestDecision = decisions.rows[0];
  const latestVerificationCase = verificationCases.rows[0];
  const latestPassport = passports.rows[0];
  const latestSignal = signals.rows[0];
  const latestAuditLog = auditLogs.rows[0];
  const demoChecklist = [
    ["Passport created", passports.count > 0],
    ["Evidence uploaded", evidenceFiles.count > 0],
    [
      "Evidence accepted",
      evidenceFiles.rows.some((file) =>
        ["accepted", "clean", "approved"].includes(evidenceStatus(file))
      ),
    ],
    ["Decision recorded", decisions.count > 0],
    ["Audit trail written", auditLogs.count > 0],
    ["Signals generated", signals.count > 0],
    ["Trust Passport view available", passports.count > 0],
    [
      "Trust Graph available",
      trustGraphNodes.count > 0 || trustGraphEdges.count > 0,
    ],
  ] as const;

  const moduleLinks = [
    ["Mission Control", "/mission-control"],
    ["Verification Queue", "/verification-queue"],
    ["Evidence Vault", "/evidence-vault"],
    ["Decision Engine", "/decision-engine"],
    ["Launch Control", "/admin/launch-control"],
    ["Launch Console", "/launch-console"],
    ["Trust History", "/trust-timeline"],
    ["Trust Graph", "/trust-graph-engine"],
    ["Trust Intelligence", "/trust-intelligence"],
    ["Trust Assistant", "/trust-assistant"],
    ["Knowledge Base", "/knowledge-base"],
    ["Help Center", "/help"],
    ["Prediction Engine", "/trust-prediction"],
    ["Policy Engine", "/policy-engine"],
    ["API Docs", "/api-docs"],
    ["Developer Console", "/developer-console"],
    ["Billing / Clearances", "/billing"],
    ["Global Infrastructure", "/global-trust"],
    ["QA Console", "/qa-console"],
    ["Agent Registry", "/agent-registry"],
    ["Permissions Firewall", "/permissions-firewall"],
    ["Step-Up Verification", "/step-up-verification"],
    ["Revocation Engine", "/revocation-engine"],
    ["Trust Recovery", "/trust-recovery"],
    ["Compliance Export", "/compliance-export"],
    ["Client Portal", "/client-portal"],
    ["Team Workspace", "/team-workspace"],
    ["Team Access", "/team-access"],
    ["Verifier Network", "/verifier-network"],
    ["Marketplace Trust", "/marketplace-trust"],
    ["Trust Badges", "/trust-badges"],
    ["Public Verification", "/verify"],
    ["Public Profiles", "/profile"],
    ["Trust Ledger", "/trust-ledger"],
    ["Reality OS", "/reality-os"],
    ["Trust Fabric", "/trust-fabric"],
  ];

  return (
    <main id="top" className="min-h-screen bg-black pb-16 text-white">
      <header className="border-b border-zinc-800 bg-black/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 md:px-8">
          <Link href="/back-office" className="text-sm font-semibold text-white">
            Cyber Sentinels Back Office
          </Link>
          <nav className="flex flex-wrap items-center gap-2 text-xs text-zinc-300">
            <form action="/api/auth/logout" method="POST">
              <button
                className="rounded-lg border border-zinc-800 px-3 py-2 hover:text-white"
                type="submit"
              >
                Logout
              </button>
            </form>
          </nav>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-6 md:px-8">
        <section className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-emerald-300">
              Admin Access Verified
            </p>
            <h1 className="mt-2 text-3xl font-bold md:text-4xl">
              Back Office
            </h1>
          </div>
          <nav className="flex flex-wrap gap-2 text-xs text-zinc-300">
            {[
              ["#overview", "Overview"],
              ["#verification-queue", "Queue"],
              ["#evidence-review", "Evidence"],
              ["#decisions", "Decisions"],
              ["#audit-timeline", "Audit"],
              ["#signal-timeline", "Signals"],
              ["#help", "Help"],
              ["#feedback-signals", "Feedback"],
              ["#billing-readiness", "Billing"],
              ["#intelligence", "Intelligence"],
            ].map(([href, label]) => (
              <a
                key={href}
                href={href}
                className="rounded-lg border border-zinc-800 px-3 py-2 hover:text-white"
              >
                {label}
              </a>
            ))}
          </nav>
        </section>
        {aiDraftMessage ? (
          <p className="mt-5 rounded-lg border border-cyan-900 bg-cyan-950/20 p-3 text-sm text-cyan-100">
            {aiDraftMessage}
          </p>
        ) : null}

        <section className="mt-6 grid gap-4 md:grid-cols-4">
          {[
            [
              "What needs review?",
              `${verificationCases.count} verification cases and ${pendingEvidenceFiles.length} evidence files need attention.`,
              "#verification-queue",
            ],
            [
              "What is risky?",
              `${radarSignals.filter((signal) => ["high", "critical"].includes(String(signal.severity).toLowerCase())).length} high-risk signals are visible in the latest operating data.`,
              "#signal-timeline",
            ],
            [
              "What is blocked?",
              `${dataRightsRequests.rows.filter((request) => request.status !== "completed").length} data-rights requests and ${appeals.rows.filter((appeal) => !["closed", "upheld", "reversed"].includes(String(appeal.status))).length} appeals are still open.`,
              "#help",
            ],
            [
              "What requires escalation?",
              `${trustAssistantQuestions.rows.filter((question) => question.status === "escalated").length + messageThreads.rows.filter((thread) => thread.status === "escalated").length} escalated support or assistant items need admin review.`,
              "#trust-assistant",
            ],
          ].map(([title, copy, href]) => (
            <Link
              key={title}
              href={href}
              className="rounded-lg border border-zinc-800 bg-zinc-950 p-4 hover:border-cyan-800"
            >
              <h2 className="text-sm font-semibold text-zinc-100">{title}</h2>
              <p className="mt-3 text-sm leading-6 text-zinc-500">{copy}</p>
            </Link>
          ))}
        </section>

        <section id="overview" className="mt-6 scroll-mt-24">
          <h2 className="mb-4 text-xl font-semibold">Operational Snapshot</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-7">
          {[
            {
              label: "Passports",
              value: passports.count,
              available: passports.available,
              href: "/passports",
            },
            {
              label: "Pending Reviews",
              value: verificationCases.rows.filter((item) =>
                ["pending", "in_review", "escalated"].includes(
                  item.verification_status ?? item.status ?? "pending"
                )
              ).length,
              available: verificationCases.available,
              href: "/verification-queue",
            },
            {
              label: "Evidence Pending",
              value: evidenceFiles.rows.filter((file) =>
                ["pending_review", "needs_more_evidence", "pending"].includes(
                  evidenceStatus(file)
                )
              ).length,
              available: evidenceFiles.available,
              href: "#evidence-review",
            },
            {
              label: "Decisions",
              value: decisions.count,
              available: decisions.available,
              href: "#decision-history",
            },
            {
              label: "Audit Events",
              value: auditLogs.count,
              available: auditLogs.available,
              href: "#audit-timeline",
            },
            {
              label: "Signals",
              value: signals.count,
              available: signals.available,
              href: "#signal-timeline",
            },
            {
              label: "System Health",
              value: "Live",
              available: true,
              href: "/status",
            },
          ].map((metric) => (
            <Link
              key={metric.label}
              href={metric.href}
              className="rounded-lg border border-zinc-800 bg-zinc-950 p-4"
            >
              <p className="text-sm text-zinc-500">{metric.label}</p>
              <p className="mt-2 text-3xl font-semibold">{metric.value}</p>
              {!metric.available ? (
                <p className="mt-1 text-xs text-zinc-600">Table unavailable</p>
              ) : null}
            </Link>
          ))}
          </div>
        </section>

        <section className="mt-6 rounded-lg border border-zinc-800 bg-zinc-950 p-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-zinc-600">
                Demo Readiness
              </p>
              <h2 className="mt-2 text-xl font-semibold">V1 Demo Checklist</h2>
            </div>
            <Link
              href="/demo"
              className="rounded-lg border border-cyan-800 px-3 py-2 text-xs text-cyan-100 hover:text-white"
            >
              Open Demo
            </Link>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {demoChecklist.map(([label, ok]) => (
              <div
                key={label}
                className="rounded-lg border border-zinc-800 bg-black p-4"
              >
                <span
                  className={`inline-flex rounded-full border px-2.5 py-1 text-xs ${
                    ok
                      ? "border-emerald-800 bg-emerald-950/30 text-emerald-200"
                      : "border-amber-800 bg-amber-950/30 text-amber-200"
                  }`}
                >
                  {ok ? "Ready" : "Missing"}
                </span>
                <p className="mt-3 text-sm font-medium text-zinc-100">{label}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-6 rounded-lg border border-zinc-800 bg-zinc-950 p-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-zinc-600">
                Founder Signals
              </p>
              <h2 className="mt-2 text-xl font-semibold">
                Early Market Learning
              </h2>
            </div>
            <Link
              href="#feedback-signals"
              className="rounded-lg border border-cyan-800 px-3 py-2 text-xs text-cyan-100 hover:text-white"
            >
              Open Feedback
            </Link>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {founderSignals.map(([label, value]) => (
              <div
                key={label}
                className="rounded-lg border border-zinc-800 bg-black p-4"
              >
                <p className="text-xs uppercase tracking-[0.16em] text-zinc-600">
                  {label}
                </p>
                <p className="mt-3 text-sm leading-6 text-zinc-300">{value}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="decisions" className="mt-8 scroll-mt-24 rounded-lg border border-zinc-800 bg-zinc-950 p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold">Decision Pipeline Audit</h2>
              <p className="mt-2 text-sm text-zinc-500">
                Latest live records ordered by created_at desc.
              </p>
            </div>
            <span className="rounded-full border border-emerald-700 px-3 py-1 text-xs text-emerald-200">
              Supabase live
            </span>
          </div>
          <div className="grid gap-3 md:grid-cols-5">
            <AuditPanelItem
              label="Latest Decision"
              row={latestDecision}
              detail={[
                latestDecision?.decision,
                latestDecision?.status,
                latestDecision?.actor,
                latestDecision?.verification_case_id,
              ]
                .filter(Boolean)
                .join(" / ")}
            />
            <AuditPanelItem
              label="Latest Verification Case"
              row={latestVerificationCase}
              detail={[
                latestVerificationCase?.subject_name,
                latestVerificationCase?.verification_status ??
                  latestVerificationCase?.status,
              ]
                .filter(Boolean)
                .join(" / ")}
            />
            <AuditPanelItem
              label="Latest Passport Update"
              row={latestPassport}
              detail={[
                latestPassport?.subject_name,
                latestPassport?.verification_status ??
                  latestPassport?.review_status,
              ]
                .filter(Boolean)
                .join(" / ")}
            />
            <AuditPanelItem
              label="Latest Signal"
              row={latestSignal}
              detail={latestSignal?.event}
            />
            <AuditPanelItem
              label="Latest Audit Event"
              row={latestAuditLog}
              detail={[
                latestAuditLog?.event_type,
                latestAuditLog?.actor,
              ]
                .filter(Boolean)
                .join(" / ")}
            />
          </div>
        </section>

        <section id="verification-queue" className="mt-8 scroll-mt-24">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-semibold">Priority Queue</h2>
            <div className="flex flex-wrap gap-2">
            <Link
              href="/verification-queue"
              className="rounded-lg border border-zinc-700 px-3 py-2 text-xs text-zinc-300 hover:text-white"
            >
              Open Full Queue
            </Link>
              <Link
                href="/evidence-upload"
                className="rounded-lg border border-zinc-700 px-3 py-2 text-xs text-zinc-300 hover:text-white"
              >
                Upload Evidence
              </Link>
            </div>
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
              <h3 className="text-lg font-semibold">Latest Verification Cases</h3>
              <div className="mt-5 space-y-3">
                {pendingVerificationCases.length ? (
                  pendingVerificationCases.map((item, index) => {
                    const caseEvidence =
                      evidenceByCase.get(String(item.id)) ?? [];
                    const latestEvidence = caseEvidence[0];
                    const latestCaseDecision = latestDecisionByCase.get(
                      String(item.id)
                    );
                    const trustScore = trustScoreByCase.get(String(item.id));
                    const graphHealth = graphHealthByCase.get(String(item.id));
                    const passportId = item.passport_id
                      ? String(item.passport_id)
                      : "";

                    return (
                      <div key={rowKey(item, `verification-case-${index}`)} className="rounded-lg border border-zinc-800 p-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="font-medium text-zinc-100">
                              {item.subject_name ?? "Unnamed subject"}
                            </p>
                            <p className="mt-1 text-sm text-zinc-500">
                              {item.subject_type ?? "unknown"} / Created {formatDate(item.created_at)}
                            </p>
                            <p className="mt-1 text-sm text-zinc-500">
                              Trust Score: {trustScore?.score ?? item.trust_score ?? "n/a"}
                              {trustScore ? ` / ${trustScore.confidenceLabel}` : ""}
                            </p>
                          </div>
                          <StatusBadge status={item.verification_status ?? item.status} />
                        </div>
                        {trustScore ? (
                          <div className="mt-3">
                            <p className="mb-2 text-xs uppercase tracking-[0.16em] text-zinc-600">
                              Reason Codes
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {(trustScore.reasonCodes.length
                                ? trustScore.reasonCodes
                                : ["Evidence missing"]
                              ).map((reason) => (
                                <ReasonCodeChip
                                  key={`${item.id}-${reason}`}
                                  reason={reason}
                                />
                              ))}
                            </div>
                          </div>
                        ) : null}
                        {graphHealth ? (
                          <div className="mt-3 rounded-lg border border-cyan-900/60 bg-cyan-950/10 p-3">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <div>
                                <p className="text-xs uppercase tracking-[0.16em] text-cyan-300/70">
                                  Graph Health
                                </p>
                                <p className="mt-1 text-sm font-semibold text-cyan-100">
                                  {graphHealth.health} / {graphHealth.score}
                                </p>
                              </div>
                              {passportId ? (
                                <Link
                                  href={`/trust-graph-engine?passport_id=${encodeURIComponent(passportId)}`}
                                  className="rounded-lg border border-cyan-800 px-3 py-2 text-xs text-cyan-100 hover:border-cyan-400"
                                >
                                  Open Graph
                                </Link>
                              ) : null}
                            </div>
                          </div>
                        ) : null}
                        <div className="mt-3 rounded-lg border border-zinc-900 bg-black p-3 text-xs text-zinc-500">
                          <p className="font-medium text-zinc-300">
                            Evidence: {caseEvidence.length}
                          </p>
                          <p className="mt-1">
                            Latest Evidence Status:{" "}
                            {latestEvidence
                              ? evidenceStatus(latestEvidence)
                              : "No evidence yet"}
                          </p>
                          <p className="mt-1">
                            Latest Decision:{" "}
                            {latestCaseDecision
                              ? [
                                  latestCaseDecision.decision,
                                  latestCaseDecision.status,
                                ]
                                  .filter(Boolean)
                                  .join(" / ")
                              : "No decisions yet"}
                          </p>
                          {latestEvidence ? (
                            <div className="mt-3 space-y-3">
                              {caseEvidence.map((evidence, evidenceIndex) => (
                                <div
                                  key={rowKey(
                                    evidence,
                                    `case-evidence-${index}-${evidenceIndex}`
                                  )}
                                  className="rounded-lg border border-zinc-800 bg-zinc-950 p-3"
                                >
                                  <div className="flex flex-wrap items-start justify-between gap-2">
                                    <div>
                                      <p className="font-medium text-zinc-200">
                                        {evidence.file_name ??
                                          evidence.evidence_type ??
                                          "Evidence file"}
                                      </p>
                                      <p className="mt-1 text-zinc-500">
                                        {formatDate(evidence.created_at)}
                                      </p>
                                    </div>
                                    <StatusBadge status={evidenceStatus(evidence)} />
                                  </div>
                                  <div className="mt-2 grid gap-1 text-zinc-500">
                                    <p>
                                      Type:{" "}
                                      {evidence.file_type ??
                                        evidence.evidence_type ??
                                        evidence.media_type ??
                                        "unknown"}
                                    </p>
                                    <p>Uploaded: {formatDate(evidence.created_at)}</p>
                                  </div>
                                  {evidence.notes ? (
                                    <p className="mt-2 text-zinc-500">
                                      {evidence.notes}
                                    </p>
                                  ) : null}
                                  {evidence.public_url || evidence.file_url ? (
                                    <Link
                                      href={String(
                                        evidence.public_url ?? evidence.file_url
                                      )}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="mt-3 inline-flex rounded-lg border border-zinc-700 px-3 py-2 text-xs text-zinc-300 hover:text-white"
                                    >
                                      Open Evidence
                                    </Link>
                                  ) : null}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="mt-1">No evidence uploaded yet.</p>
                          )}
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {item.passport_id ? (
                            <Link
                              href={`/passports/${encodeURIComponent(
                                String(item.passport_id)
                              )}`}
                              className="rounded-lg border border-zinc-700 px-3 py-2 text-xs font-medium text-zinc-200 hover:border-zinc-400"
                            >
                              Open Passport
                            </Link>
                          ) : null}
                          {item.id ? (
                            <Link
                              href={`/evidence-upload?case=${encodeURIComponent(
                                String(item.id)
                              )}`}
                              className="rounded-lg border border-zinc-700 px-3 py-2 text-xs font-medium text-zinc-200 hover:border-zinc-400"
                            >
                              Upload Evidence
                            </Link>
                          ) : null}
                          <Link
                            href="/evidence-vault"
                            className="rounded-lg border border-zinc-700 px-3 py-2 text-xs font-medium text-zinc-200 hover:border-zinc-400"
                          >
                            Review Evidence
                          </Link>
                        </div>
                        {item.id ? (
                          <AdminVerificationActions caseId={String(item.id)} />
                        ) : null}
                      </div>
                    );
                  })
                ) : (
                  <EmptyState label="No verification cases yet." />
                )}
              </div>
            </div>

            <div id="decision-history" className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
              <h3 className="text-lg font-semibold">Decision History</h3>
              <div className="mt-5 space-y-3">
                {decisions.rows.length ? (
                  decisions.rows.map((decision, index) => (
                    <div key={rowKey(decision, `decision-${index}`)} className="rounded-lg border border-zinc-800 p-4">
                      <div className="flex flex-wrap gap-2">
                        <DecisionBadge decision={decision.decision} />
                        <StatusBadge status={decision.status} />
                      </div>
                      <p className="mt-2 text-xs text-zinc-600">
                        {formatDate(decision.created_at)}
                      </p>
                      <div className="mt-3 grid gap-1 text-xs text-zinc-500">
                        <p>Actor: {decision.actor ?? decision.decided_by ?? "n/a"}</p>
                        <p>
                          Verification Case:{" "}
                          {decision.verification_case_id ??
                            decision.case_id ??
                            "n/a"}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <EmptyState label="No decisions recorded yet." />
                )}
              </div>
            </div>

            <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
              <h3 className="text-lg font-semibold">Recent Passports</h3>
              <div className="mt-5 space-y-3">
                {passports.rows.length ? (
                  passports.rows.map((passport, index) => {
                    const trustScore = trustScoreByPassport.get(String(passport.id));

                    return (
                      <div key={rowKey(passport, `passport-${index}`)} className="rounded-lg border border-zinc-800 p-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="font-medium">{passport.subject_name ?? "Unnamed subject"}</p>
                            <p className="mt-1 text-sm text-zinc-500">
                              {passport.subject_type ?? "unknown"} / Trust{" "}
                              {trustScore?.score ?? passport.trust_score ?? "n/a"}
                              {trustScore ? ` / ${trustScore.confidenceLabel}` : ""}
                            </p>
                          </div>
                          <StatusBadge status={passport.review_status} />
                        </div>
                        {trustScore ? (
                          <div className="mt-3">
                            <p className="mb-2 text-xs uppercase tracking-[0.16em] text-zinc-600">
                              Reason Codes
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {(trustScore.reasonCodes.length
                                ? trustScore.reasonCodes
                                : ["Evidence missing"]
                              ).map((reason) => (
                                <ReasonCodeChip
                                  key={`${passport.id}-${reason}`}
                                  reason={reason}
                                />
                              ))}
                            </div>
                          </div>
                        ) : null}
                      </div>
                    );
                  })
                ) : (
                  <EmptyState label={passports.available ? "No pending reviews." : tableEmptyLabel("passports", passports.available)} />
                )}
              </div>
            </div>

            <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
              <h3 className="text-lg font-semibold">Recent Trust Reports</h3>
              <div className="mt-5 space-y-3">
                {trustReports.rows.length ? (
                  trustReports.rows.map((report, index) => (
                    <div key={rowKey(report, `trust-report-${index}`)} className="rounded-lg border border-zinc-800 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="font-medium">{report.candidate_name ?? "Unnamed candidate"}</p>
                          <p className="mt-1 text-sm text-zinc-500">
                            {report.report_type ?? "trust_report"} / Trust {report.trust_score ?? "n/a"}
                          </p>
                        </div>
                        <StatusBadge status={report.review_status} />
                      </div>
                    </div>
                  ))
                ) : (
                  <EmptyState label={tableEmptyLabel("trust_reports", trustReports.available)} />
                )}
              </div>
            </div>
          </div>
        </section>

        <section id="evidence-review" className="mt-8 scroll-mt-24 rounded-lg border border-zinc-800 bg-zinc-950 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-semibold">Evidence Review</h2>
            <Link
              href="/evidence-upload"
              className="rounded-lg border border-zinc-700 px-3 py-2 text-xs text-zinc-300 hover:text-white"
            >
              Upload Evidence
            </Link>
          </div>
          <div className="mt-5 space-y-3">
            {evidenceFiles.rows.length ? (
              evidenceFiles.rows.map((file, index) => (
                <div
                  key={rowKey(file, `evidence-review-${index}`)}
                  className="rounded-lg border border-zinc-800 bg-black p-4"
                >
                  <div className="grid gap-4 md:grid-cols-[1.2fr_0.7fr_0.7fr_1fr_0.8fr] md:items-start">
                    <div>
                      <p className="text-xs uppercase tracking-[0.16em] text-zinc-600">
                        File
                      </p>
                      <p className="mt-2 break-all font-medium text-zinc-100">
                        {file.file_name ?? file.file_url ?? "Evidence file"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.16em] text-zinc-600">
                        Type
                      </p>
                      <p className="mt-2 text-zinc-300">
                        {file.evidence_type ?? file.file_type ?? "unknown"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.16em] text-zinc-600">
                        Status
                      </p>
                      <p className="mt-2 text-zinc-300">{evidenceStatus(file)}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.16em] text-zinc-600">
                        Uploaded By
                      </p>
                      <p className="mt-2 break-all text-zinc-300">
                        {file.uploaded_by ?? "n/a"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.16em] text-zinc-600">
                        Created
                      </p>
                      <p className="mt-2 text-zinc-300">
                        {formatDate(file.created_at)}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2 border-t border-zinc-900 pt-4">
                    {file.public_url || file.file_url ? (
                      <Link
                        href={String(file.public_url ?? file.file_url)}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-lg border border-zinc-700 px-3 py-2 text-xs font-medium text-zinc-200 hover:border-zinc-400"
                      >
                        Open Evidence
                      </Link>
                    ) : null}
                    {file.id ? (
                      <EvidenceReviewActions evidenceId={String(file.id)} />
                    ) : null}
                  </div>
                </div>
              ))
            ) : (
              <EmptyState label="No evidence awaiting review." />
            )}
          </div>
        </section>

        <section id="activity" className="mt-8 scroll-mt-24">
          <div className="mb-8 rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-zinc-600">
                  Help Center
                </p>
                <h2 id="help" className="mt-2 scroll-mt-24 text-xl font-semibold">
                  Latest Help Questions
                </h2>
              </div>
              <Link
                href="/help"
                className="rounded-lg border border-zinc-700 px-3 py-2 text-xs text-zinc-300 hover:text-white"
              >
                Open Help Center
              </Link>
            </div>
            <div className="mt-5 grid gap-3">
              {helpQuestions.rows.length ? (
                helpQuestions.rows.map((question, index) => (
                  <div
                    key={rowKey(question, `help-question-${index}`)}
                    className="rounded-lg border border-zinc-800 bg-black p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <p className="max-w-4xl text-zinc-300">
                        {question.question ?? "Help question"}
                      </p>
                      <span className="inline-flex rounded-full border border-cyan-800/70 bg-cyan-950/20 px-2.5 py-1 text-xs text-cyan-100">
                        {question.status ?? "open"}
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-zinc-600">
                      Asked by{" "}
                      {question.created_by_email ?? question.created_by ?? "n/a"} /{" "}
                      {formatDate(question.created_at)}
                    </p>
                    {question.answer ? (
                      <div className="mt-4 rounded-lg border border-zinc-800 bg-zinc-950 p-3">
                        <p className="text-xs uppercase tracking-[0.16em] text-zinc-600">
                          Answer
                        </p>
                        <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-zinc-300">
                          {question.answer}
                        </p>
                        <p className="mt-3 text-xs text-zinc-600">
                          Answered by {question.admin_answered_by ?? "n/a"} /{" "}
                          {formatDate(question.answered_at)}
                        </p>
                      </div>
                    ) : null}
                    {question.id ? <HelpQuestionActions question={question} /> : null}
                  </div>
                ))
              ) : (
                <EmptyState label={tableEmptyLabel("help_questions", helpQuestions.available)} />
              )}
            </div>
          </div>

          <div
            id="data-rights"
            className="mb-8 scroll-mt-24 rounded-lg border border-zinc-800 bg-zinc-950 p-5"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-zinc-600">
                  Privacy Operations
                </p>
                <h2 className="mt-2 text-xl font-semibold">
                  Data Rights Requests
                </h2>
              </div>
              <Link
                href="/data-rights"
                className="rounded-lg border border-zinc-700 px-3 py-2 text-xs text-zinc-300 hover:text-white"
              >
                Open Data Rights
              </Link>
            </div>
            <div className="mt-5 grid gap-3">
              {dataRightsRequests.rows.length ? (
                dataRightsRequests.rows.map((request, index) => (
                  <div
                    key={rowKey(request, `data-rights-${index}`)}
                    className="rounded-lg border border-zinc-800 bg-black p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-zinc-100">
                          {request.request_type ?? "Data rights request"}
                        </p>
                        <p className="mt-2 text-xs text-zinc-600">
                          {request.requester_email ?? "n/a"} /{" "}
                          {formatDate(request.created_at)}
                        </p>
                      </div>
                      <span className="inline-flex rounded-full border border-cyan-800/70 bg-cyan-950/20 px-2.5 py-1 text-xs text-cyan-100">
                        {request.status ?? "open"}
                      </span>
                    </div>
                    {request.details ? (
                      <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-zinc-400">
                        {request.details}
                      </p>
                    ) : null}
                    {request.handled_by ? (
                      <p className="mt-3 text-xs text-zinc-600">
                        Handled by {request.handled_by} /{" "}
                        {formatDate(request.handled_at)}
                      </p>
                    ) : null}
                    {request.id ? <DataRightsActions request={request} /> : null}
                  </div>
                ))
              ) : (
                <EmptyState
                  label={tableEmptyLabel(
                    "data_rights_requests",
                    dataRightsRequests.available
                  )}
                />
              )}
            </div>
          </div>

          <div
            id="enterprise-access"
            className="mb-8 scroll-mt-24 rounded-lg border border-zinc-800 bg-zinc-950 p-5"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-zinc-600">
                  Market Validation
                </p>
                <h2 className="mt-2 text-xl font-semibold">
                  Enterprise Access Requests
                </h2>
              </div>
              <Link
                href="/enterprise-access"
                className="rounded-lg border border-zinc-700 px-3 py-2 text-xs text-zinc-300 hover:text-white"
              >
                Open Request Page
              </Link>
            </div>
            <div className="mt-5 grid gap-3">
              {enterpriseLeadRequests.length ? (
                enterpriseLeadRequests.map((request, index) => (
                  <div
                    key={rowKey(request, `enterprise-access-${index}`)}
                    className="rounded-lg border border-zinc-800 bg-black p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-zinc-100">
                          {request.company ?? "Enterprise request"}
                        </p>
                        <p className="mt-1 text-sm text-zinc-500">
                          {request.name ?? "Unknown contact"} / {request.work_email ?? "No email"}
                        </p>
                      </div>
                      <span className="rounded-full border border-cyan-800 px-3 py-1 text-xs text-cyan-100">
                        {request.status ?? "new"}
                      </span>
                    </div>
                    <div className="mt-3 grid gap-2 text-sm text-zinc-400 md:grid-cols-2">
                      <p>Role: {request.role ?? "Not provided"}</p>
                      <p>Company size: {request.company_size ?? "Not provided"}</p>
                      <p>AI usage: {request.ai_usage_level ?? "Not provided"}</p>
                      <p>
                        Problem category:{" "}
                        {request.current_problem_category ?? "Not provided"}
                      </p>
                      <p>Use case: {request.use_case ?? "Not provided"}</p>
                    </div>
                    {request.current_problem ? (
                      <p className="mt-3 text-sm leading-6 text-zinc-400">
                        Problem: {request.current_problem}
                      </p>
                    ) : null}
                    {request.message ? (
                      <p className="mt-3 text-sm leading-6 text-zinc-500">
                        {request.message}
                      </p>
                    ) : null}
                    <p className="mt-3 text-xs text-zinc-600">
                      {formatDate(request.created_at)}
                    </p>
                  </div>
                ))
              ) : (
                <EmptyState
                  label={tableEmptyLabel(
                    "enterprise_access_requests",
                    enterpriseAccessRequests.available
                  )}
                />
              )}
            </div>

            <div
              id="billing-readiness"
              className="mt-6 rounded-lg border border-zinc-800 bg-black p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-zinc-600">
                    Billing Status
                  </p>
                  <h3 className="mt-2 text-lg font-semibold">
                    Payment Readiness Summary
                  </h3>
                </div>
                <span
                  className={`rounded-full border px-3 py-1 text-xs ${
                    isStripeBillingConfigured
                      ? "border-emerald-800 text-emerald-200"
                      : "border-amber-800 text-amber-200"
                  }`}
                >
                  {isStripeBillingConfigured ? "Stripe configured" : "Stripe optional"}
                </span>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-4">
                {[
                  ["Checkout readiness", isStripeBillingConfigured ? "Ready" : "Waitlist mode"],
                  ["Billing customers", String(billingCustomers.count)],
                  ["Subscriptions", String(subscriptions.count)],
                  ["Active subscriptions", String(activeSubscriptions.length)],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="rounded-lg border border-zinc-800 bg-zinc-950 p-3"
                  >
                    <p className="text-xs uppercase tracking-[0.16em] text-zinc-600">
                      {label}
                    </p>
                    <p className="mt-2 text-lg font-semibold text-zinc-100">
                      {value}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-lg font-semibold">Paid Tier Waitlist Requests</h3>
                <Link
                  href="/pro-waitlist"
                  className="rounded-lg border border-zinc-700 px-3 py-2 text-xs text-zinc-300 hover:text-white"
                >
                  Open Waitlist
                </Link>
              </div>
              <div className="mt-4 grid gap-3">
                {proWaitlistRequests.length ? (
                  proWaitlistRequests.map((request, index) => (
                    <div
                      key={rowKey(request, `pro-waitlist-${index}`)}
                      className="rounded-lg border border-zinc-800 bg-black p-4"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="font-medium text-zinc-100">
                            {request.company ?? "Paid tier waitlist request"}
                          </p>
                          <p className="mt-1 text-sm text-zinc-500">
                            {request.name ?? "Unknown contact"} /{" "}
                            {request.work_email ?? "No email"}
                          </p>
                        </div>
                        <span className="rounded-full border border-cyan-800 px-3 py-1 text-xs text-cyan-100">
                          {request.status ?? "waitlist"}
                        </span>
                      </div>
                      <div className="mt-3 grid gap-2 text-sm text-zinc-400 md:grid-cols-2">
                        <p>Role: {request.role ?? "Not provided"}</p>
                        <p>Use case: {request.use_case ?? "waitlist"}</p>
                      </div>
                      {request.message ? (
                        <p className="mt-3 text-sm leading-6 text-zinc-500">
                          {request.message}
                        </p>
                      ) : null}
                      <p className="mt-3 text-xs text-zinc-600">
                        {formatDate(request.created_at)}
                      </p>
                    </div>
                  ))
                ) : (
                  <EmptyState label="No paid tier waitlist requests yet." />
                )}
              </div>
            </div>
          </div>

          <div
            id="feedback-signals"
            className="mb-8 scroll-mt-24 rounded-lg border border-zinc-800 bg-zinc-950 p-5"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-zinc-600">
                  Feedback & Signals
                </p>
                <h2 className="mt-2 text-xl font-semibold">
                  Real-World Learning
                </h2>
              </div>
              <Link
                href="/feedback"
                className="rounded-lg border border-zinc-700 px-3 py-2 text-xs text-zinc-300 hover:text-white"
              >
                Open Feedback Form
              </Link>
            </div>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-500">
              Lightweight founder-led feedback signals from users, enterprise
              conversations and early validation. Cyber Sentinels is evolving
              through early operational feedback and design collaboration.
            </p>
            <div className="mt-5 grid gap-4 xl:grid-cols-2">
              {feedbackPanels.map((panel) => (
                <div
                  key={panel.label}
                  className="rounded-lg border border-zinc-800 bg-black p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h3 className="font-semibold text-zinc-100">
                      {panel.label}
                    </h3>
                    <span className="rounded-full border border-zinc-700 px-2.5 py-1 text-xs text-zinc-400">
                      {panel.rows.length}
                    </span>
                  </div>
                  <div className="mt-4 grid gap-3">
                    {panel.rows.length ? (
                      panel.rows.slice(0, 6).map((item, index) => (
                        <div
                          key={rowKey(item, `${panel.label}-${index}`)}
                          className="rounded-lg border border-zinc-800 bg-zinc-950 p-3"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <p className="font-medium text-zinc-100">
                                {item.company ??
                                  item.category ??
                                  "Feedback signal"}
                              </p>
                              <p className="mt-1 text-xs text-zinc-600">
                                {item.submitted_by_email ??
                                  item.source ??
                                  "unknown source"}{" "}
                                / {formatDate(item.created_at)}
                              </p>
                            </div>
                            <span className="rounded-full border border-cyan-800/70 bg-cyan-950/20 px-2.5 py-1 text-xs text-cyan-100">
                              {item.status ?? "new"}
                            </span>
                          </div>
                          <p className="mt-3 text-sm leading-6 text-zinc-400">
                            {item.message ??
                              item.use_case ??
                              item.notes ??
                              "No details supplied."}
                          </p>
                          {item.screenshot_url ? (
                            <Link
                              href={String(item.screenshot_url)}
                              className="mt-2 inline-flex text-xs text-cyan-200 hover:text-white"
                            >
                              Screenshot
                            </Link>
                          ) : null}
                          {item.id ? (
                            <FeedbackActions item={item} target={panel.target} />
                          ) : null}
                        </div>
                      ))
                    ) : (
                      <EmptyState label={panel.empty} />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div
            id="ai-trust-events"
            className="mb-8 scroll-mt-24 rounded-lg border border-zinc-800 bg-zinc-950 p-5"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-zinc-600">
                  AI Trust Event Pipeline
                </p>
                <h2 className="mt-2 text-xl font-semibold">
                  Latest Trust Events
                </h2>
              </div>
              <Link
                href="/trust-events"
                className="rounded-lg border border-zinc-700 px-3 py-2 text-xs text-zinc-300 hover:text-white"
              >
                Open Trust Events
              </Link>
            </div>
            <div className="mt-5 grid gap-3">
              {trustEvents.rows.length ? (
                trustEvents.rows.slice(0, 8).map((event, index) => (
                  <div
                    key={rowKey(event, `trust-event-${index}`)}
                    className="rounded-lg border border-zinc-800 bg-black p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-zinc-100">
                          {event.event_type ?? "Trust event"}
                        </p>
                        <p className="mt-1 text-xs text-zinc-600">
                          {event.actor_type ?? "actor"} /{" "}
                          {event.actor_label ?? "n/a"} /{" "}
                          {formatDate(event.created_at)}
                        </p>
                      </div>
                      <span className="rounded-full border border-cyan-800/70 bg-cyan-950/20 px-2.5 py-1 text-xs text-cyan-100">
                        {event.risk_level ?? "low"}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <EmptyState
                  label={tableEmptyLabel(
                    "trust_events",
                    trustEvents.available
                  )}
                />
              )}
            </div>
          </div>

          <div
            id="agent-registry"
            className="mb-8 scroll-mt-24 rounded-lg border border-zinc-800 bg-zinc-950 p-5"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-zinc-600">
                  AI Identity
                </p>
                <h2 className="mt-2 text-xl font-semibold">Agent Registry</h2>
              </div>
              <Link
                href="/admin/agents"
                className="rounded-lg border border-zinc-700 px-3 py-2 text-xs text-zinc-300 hover:text-white"
              >
                Open Admin Agents
              </Link>
            </div>
            <div className="mt-5 grid gap-3">
              {agents.rows.length ? (
                agents.rows.slice(0, 8).map((agent, index) => (
                  <Link
                    key={rowKey(agent, `agent-${index}`)}
                    href={`/agents/${encodeURIComponent(String(agent.id))}`}
                    className="rounded-lg border border-zinc-800 bg-black p-4 hover:border-cyan-800"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-zinc-100">
                          {agent.name ?? agent.agent_name ?? "Agent"}
                        </p>
                        <p className="mt-1 text-xs text-zinc-600">
                          {agent.owner_email ?? "n/a"} /{" "}
                          {agent.model_provider ?? "unknown"}{" "}
                          {agent.model_name ?? agent.model_family ?? ""}
                        </p>
                      </div>
                      <span className="rounded-full border border-cyan-800/70 bg-cyan-950/20 px-2.5 py-1 text-xs text-cyan-100">
                        {agent.status ?? "pending"}
                      </span>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-zinc-400">
                      {agent.purpose ?? agent.declared_purpose ?? "No purpose recorded."}
                    </p>
                  </Link>
                ))
              ) : (
                <EmptyState label={tableEmptyLabel("agents", agents.available)} />
              )}
            </div>
          </div>

          <div
            id="high-risk-agent-events"
            className="mb-8 scroll-mt-24 rounded-lg border border-zinc-800 bg-zinc-950 p-5"
          >
            <h2 className="text-xl font-semibold">High-Risk Agent Events</h2>
            <div className="mt-5 grid gap-3">
              {trustEvents.rows.filter((event) =>
                ["high", "critical"].includes(String(event.risk_level).toLowerCase())
              ).length ? (
                trustEvents.rows
                  .filter((event) =>
                    ["high", "critical"].includes(String(event.risk_level).toLowerCase())
                  )
                  .slice(0, 8)
                  .map((event, index) => (
                    <Link
                      key={rowKey(event, `high-risk-agent-event-${index}`)}
                      href={`/trust-events?agent_id=${encodeURIComponent(String(event.agent_id ?? ""))}`}
                      className="rounded-lg border border-zinc-800 bg-black p-4 hover:border-cyan-800"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <p className="font-medium text-zinc-100">
                          {event.event_type ?? "Trust event"}
                        </p>
                        <span className="rounded-full border border-amber-800 px-2.5 py-1 text-xs text-amber-200">
                          {event.risk_level}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-zinc-500">
                        {event.actor_label ?? "Agent"} /{" "}
                        {event.event_source ?? "unknown"} /{" "}
                        {formatDate(event.created_at)}
                      </p>
                    </Link>
                  ))
              ) : (
                <EmptyState label="No high-risk agent events." />
              )}
            </div>
          </div>

          <div
            id="messages"
            className="mb-8 scroll-mt-24 rounded-lg border border-zinc-800 bg-zinc-950 p-5"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-zinc-600">
                  User Communications
                </p>
                <h2 className="mt-2 text-xl font-semibold">
                  Message Threads
                </h2>
              </div>
              <Link
                href="/messages"
                className="rounded-lg border border-zinc-700 px-3 py-2 text-xs text-zinc-300 hover:text-white"
              >
                Open Messages
              </Link>
            </div>
            <div className="mt-5 grid gap-3">
              {messageThreads.rows.length ? (
                messageThreads.rows.map((thread, index) => (
                  <div
                    key={rowKey(thread, `message-thread-${index}`)}
                    className="rounded-lg border border-zinc-800 bg-black p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-zinc-100">
                          {thread.subject ?? "Message thread"}
                        </p>
                        <p className="mt-1 text-xs text-zinc-600">
                          {thread.created_by_email ?? "n/a"} /{" "}
                          {formatDate(thread.updated_at ?? thread.created_at)}
                        </p>
                      </div>
                      <span className="rounded-full border border-cyan-800/70 bg-cyan-950/20 px-2.5 py-1 text-xs text-cyan-100">
                        {thread.status ?? "open"}
                      </span>
                    </div>
                    <div className="mt-4 grid gap-2">
                      {(messageEventsByThread.get(String(thread.id)) ?? [])
                        .slice(-3)
                        .map((event, eventIndex) => (
                          <div
                            key={rowKey(event, `message-event-${eventIndex}`)}
                            className="rounded-lg border border-zinc-800 bg-zinc-950 p-3"
                          >
                            <p className="text-xs uppercase tracking-[0.16em] text-zinc-600">
                              {event.sender_type ?? "message"} /{" "}
                              {formatDate(event.created_at)}
                            </p>
                            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-zinc-300">
                              {event.message ?? "Message"}
                            </p>
                          </div>
                        ))}
                    </div>
                    {thread.id ? <MessageThreadActions thread={thread} /> : null}
                  </div>
                ))
              ) : (
                <EmptyState
                  label={tableEmptyLabel(
                    "message_threads",
                    messageThreads.available
                  )}
                />
              )}
            </div>
          </div>

          <div
            id="appeals"
            className="mb-8 scroll-mt-24 rounded-lg border border-zinc-800 bg-zinc-950 p-5"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-zinc-600">
                  Human Review
                </p>
                <h2 className="mt-2 text-xl font-semibold">Appeals</h2>
              </div>
              <Link
                href="/appeals"
                className="rounded-lg border border-zinc-700 px-3 py-2 text-xs text-zinc-300 hover:text-white"
              >
                Open Appeals
              </Link>
            </div>
            <div className="mt-5 grid gap-3">
              {appeals.rows.length ? (
                appeals.rows.map((appeal, index) => (
                  <div
                    key={rowKey(appeal, `appeal-${index}`)}
                    className="rounded-lg border border-zinc-800 bg-black p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-zinc-100">
                          {appeal.submitted_by_email ?? "Appeal"}
                        </p>
                        <p className="mt-1 break-all text-xs text-zinc-600">
                          Passport {appeal.passport_id ?? "n/a"} /{" "}
                          {formatDate(appeal.created_at)}
                        </p>
                      </div>
                      <span className="rounded-full border border-cyan-800/70 bg-cyan-950/20 px-2.5 py-1 text-xs text-cyan-100">
                        {appeal.status ?? "submitted"}
                      </span>
                    </div>
                    <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-zinc-300">
                      {appeal.appeal_reason ?? "Appeal reason not supplied."}
                    </p>
                    {appeal.id ? <AppealReviewActions appeal={appeal} /> : null}
                  </div>
                ))
              ) : (
                <EmptyState label={tableEmptyLabel("appeals", appeals.available)} />
              )}
            </div>
          </div>

          <div
            id="notifications"
            className="mb-8 scroll-mt-24 rounded-lg border border-zinc-800 bg-zinc-950 p-5"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-zinc-600">
                  User Updates
                </p>
                <h2 className="mt-2 text-xl font-semibold">
                  Recent Notifications
                </h2>
              </div>
              <Link
                href="/notifications"
                className="rounded-lg border border-zinc-700 px-3 py-2 text-xs text-zinc-300 hover:text-white"
              >
                Open Notifications
              </Link>
            </div>
            <div className="mt-5 grid gap-3">
              {notifications.rows.length ? (
                notifications.rows.map((notification, index) => (
                  <div
                    key={rowKey(notification, `notification-${index}`)}
                    className="rounded-lg border border-zinc-800 bg-black p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-zinc-100">
                          {notification.title ?? "Notification"}
                        </p>
                        <p className="mt-2 text-sm leading-6 text-zinc-400">
                          {notification.body ?? "Update recorded."}
                        </p>
                      </div>
                      <span className="rounded-full border border-zinc-700 px-2.5 py-1 text-xs text-zinc-300">
                        {notification.is_read ? "read" : "unread"}
                      </span>
                    </div>
                    <p className="mt-3 text-xs text-zinc-600">
                      {notification.notification_type ?? "update"} /{" "}
                      {formatDate(notification.created_at)}
                    </p>
                  </div>
                ))
              ) : (
                <EmptyState
                  label={tableEmptyLabel("notifications", notifications.available)}
                />
              )}
            </div>
          </div>

          <div
            id="trust-assistant"
            className="mb-8 rounded-lg border border-zinc-800 bg-zinc-950 p-5"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-zinc-600">
                  Trust Assistant
                </p>
                <h2 className="mt-2 text-xl font-semibold">
                  Assistant Review Queue
                </h2>
              </div>
              <Link
                href="/trust-assistant"
                className="rounded-lg border border-zinc-700 px-3 py-2 text-xs text-zinc-300 hover:text-white"
              >
                Open Trust Assistant
              </Link>
            </div>
            <div className="mt-5 grid gap-3">
              {trustAssistantQuestions.rows.length ? (
                trustAssistantQuestions.rows.map((question, index) => (
                  <div
                    key={rowKey(question, `trust-assistant-question-${index}`)}
                    className="rounded-lg border border-zinc-800 bg-black p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <p className="max-w-4xl text-zinc-300">
                        {question.question ?? "Trust Assistant question"}
                      </p>
                      <span className="inline-flex rounded-full border border-cyan-800/70 bg-cyan-950/20 px-2.5 py-1 text-xs text-cyan-100">
                        {question.status ?? "pending_review"}
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-zinc-600">
                      Asked by {question.asked_by_email ?? "n/a"} /{" "}
                      {formatDate(question.created_at)}
                    </p>
                    {question.answer ? (
                      <div className="mt-4 rounded-lg border border-zinc-800 bg-zinc-950 p-3">
                        <p className="text-xs uppercase tracking-[0.16em] text-zinc-600">
                          Answer
                        </p>
                        <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-zinc-300">
                          {question.answer}
                        </p>
                        <p className="mt-3 text-xs text-zinc-600">
                          {question.answer_source ?? "admin_review"} /{" "}
                          {question.answered_by ?? "n/a"}
                        </p>
                      </div>
                    ) : null}
                    {question.id ? (
                      <TrustAssistantQuestionActions question={question} />
                    ) : null}
                  </div>
                ))
              ) : (
                <EmptyState
                  label={tableEmptyLabel(
                    "trust_assistant_questions",
                    trustAssistantQuestions.available
                  )}
                />
              )}
            </div>
          </div>

          <div id="graph" className="mb-8 scroll-mt-24 rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-zinc-600">
                  Knowledge Base
                </p>
                <h2 className="mt-2 text-xl font-semibold">
                  Governed Content Layer
                </h2>
              </div>
              <Link
                href="/knowledge-base"
                className="rounded-lg border border-zinc-700 px-3 py-2 text-xs text-zinc-300 hover:text-white"
              >
                Open Knowledge Base
              </Link>
            </div>
            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              {[
                ["Latest Draft Articles", "draft"],
                ["Latest Approved Articles", "approved"],
              ].map(([label, status]) => {
                const rows = knowledgeArticles.rows
                  .filter((article) => article.status === status)
                  .slice(0, 5);

                return (
                  <div
                    key={status}
                    className="rounded-lg border border-zinc-800 bg-black p-4"
                  >
                    <h3 className="font-semibold text-zinc-100">{label}</h3>
                    <div className="mt-4 grid gap-3">
                      {rows.length ? (
                        rows.map((article, index) => (
                          <Link
                            key={rowKey(article, `knowledge-${status}-${index}`)}
                            href={`/knowledge-base?article_id=${encodeURIComponent(String(article.id))}`}
                            className="rounded-lg border border-zinc-800 bg-zinc-950 p-3 hover:border-cyan-800"
                          >
                            <p className="font-medium text-zinc-100">
                              {article.title ?? "Knowledge article"}
                            </p>
                            <p className="mt-1 text-xs text-zinc-600">
                              {article.category ?? "Uncategorized"} /{" "}
                              {formatDate(article.updated_at)}
                            </p>
                          </Link>
                        ))
                      ) : (
                        <EmptyState
                          label={`No ${status} knowledge articles yet.`}
                        />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <h2 className="mb-4 text-xl font-semibold">Audit And Signal Timelines</h2>
          <div className="grid gap-6 lg:grid-cols-3">
            <div id="signal-timeline" className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
              <h3 className="text-lg font-semibold">Signal Timeline</h3>
              <div className="mt-5 space-y-3">
                {signals.rows.length ? (
                  signals.rows.map((signal, index) => (
                    <div key={rowKey(signal, `signal-${index}`)} className="rounded-lg border border-zinc-800 p-4">
                      <p className="text-zinc-300">{signal.event ?? "Signal recorded"}</p>
                      <p className="mt-2 text-xs text-zinc-600">{formatDate(signal.created_at)}</p>
                    </div>
                  ))
                ) : (
                  <EmptyState label="No critical signals." />
                )}
              </div>
            </div>

            <div id="audit-timeline" className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
              <h3 className="text-lg font-semibold">Audit Timeline</h3>
              <div className="mt-5 space-y-3">
                {auditLogs.rows.length ? (
                  auditLogs.rows.map((log, index) => (
                    <div key={rowKey(log, `audit-log-${index}`)} className="rounded-lg border border-zinc-800 p-4">
                      <p className="text-zinc-300">{log.event_type ?? "Audit event"}</p>
                      <p className="mt-2 text-xs text-zinc-600">
                        {log.actor ?? "system"} / {formatDate(log.created_at)}
                      </p>
                    </div>
                  ))
                ) : (
                  <EmptyState label={tableEmptyLabel("audit_logs", auditLogs.available)} />
                )}
              </div>
            </div>

            <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
              <h3 className="text-lg font-semibold">Evidence Pending Scan</h3>
              <div className="mt-5 space-y-3">
                {pendingEvidenceFiles.length ? (
                  pendingEvidenceFiles.map((file, index) => (
                    <div key={rowKey(file, `evidence-file-${index}`)} className="rounded-lg border border-zinc-800 p-4">
                      <p className="font-medium">{file.file_name ?? file.evidence_type ?? "Evidence file"}</p>
                      <p className="mt-1 text-sm text-zinc-500">{file.file_type ?? file.evidence_type ?? file.media_type ?? "unknown"} / {evidenceStatus(file)}</p>
                      <p className="mt-1 text-xs text-zinc-600">
                        Uploaded: {formatDate(file.created_at)}
                      </p>
                      {file.public_url || file.file_url ? (
                        <Link
                          href={String(file.public_url ?? file.file_url)}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-3 inline-flex rounded-lg border border-zinc-700 px-3 py-2 text-xs text-zinc-300 hover:text-white"
                        >
                          Open Evidence
                        </Link>
                      ) : null}
                    </div>
                  ))
                ) : (
                  <EmptyState label={evidenceFiles.available ? "No evidence awaiting review." : tableEmptyLabel("evidence_files", evidenceFiles.available)} />
                )}
              </div>
            </div>
          </div>
        </section>

        <section id="intelligence" className="mt-8 scroll-mt-24 rounded-lg border border-zinc-800 bg-zinc-950 p-5">
          <details>
            <summary className="cursor-pointer list-none">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-xl font-semibold">Advanced Modules</h2>
                <span className="rounded-lg border border-zinc-700 px-3 py-2 text-xs text-zinc-300">
                  Show / Hide modules
                </span>
              </div>
            </summary>
            <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {moduleLinks.map(([label, href]) => (
                <Link
                  key={`${label}-${href}`}
                  href={href}
                  className="rounded-lg border border-zinc-800 bg-black px-3 py-2 text-sm text-zinc-300 hover:text-white"
                >
                  {label}
                </Link>
              ))}
            </div>
          </details>
        </section>

        <section className="mt-8 rounded-lg border border-zinc-800 bg-zinc-950 p-5">
          <details>
            <summary className="cursor-pointer list-none">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-xl font-semibold">Operational Intelligence</h2>
                <span className="rounded-lg border border-zinc-700 px-3 py-2 text-xs text-zinc-300">
                  Show / Hide intelligence
                </span>
              </div>
            </summary>
          <div className="mt-5 grid gap-6 lg:grid-cols-2">
            <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <h3 className="text-lg font-semibold">Trust Prediction Panel</h3>
                <span className="rounded-full border border-zinc-700 px-3 py-1 text-xs text-zinc-300">
                  {prediction.state}
                </span>
              </div>
              <p className="mt-2 text-sm text-zinc-500">{prediction.trend}</p>
              <div className="mt-5 grid gap-3 md:grid-cols-3">
                <div className="rounded-lg border border-zinc-800 bg-black p-4">
                  <p className="text-sm text-zinc-500">Prediction Score</p>
                  <p className="mt-2 text-3xl font-semibold">{prediction.score}</p>
                </div>
                <div className="rounded-lg border border-zinc-800 bg-black p-4">
                  <p className="text-sm text-zinc-500">Risk Direction</p>
                  <p className="mt-2 text-3xl font-semibold capitalize">{prediction.riskDirection}</p>
                </div>
                <div className="rounded-lg border border-zinc-800 bg-black p-4">
                  <p className="text-sm text-zinc-500">Recommended Action</p>
                  <p className="mt-2 text-lg font-semibold">{prediction.recommendedActions[0]}</p>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
              <h3 className="text-lg font-semibold">Trust Fabric</h3>
              <div className="mt-5 grid gap-3 md:grid-cols-4">
                {[
                  ["Active Nodes", trustFabric.active_nodes],
                  ["Signals", trustFabric.signals],
                  ["Relationships", trustFabric.relationships],
                  ["Health", trustFabric.health],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-lg border border-zinc-800 bg-black p-4">
                    <p className="text-sm text-zinc-500">{label}</p>
                    <p className="mt-2 text-2xl font-semibold capitalize">{value}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
              <h3 className="text-lg font-semibold">Recent Radar Activity</h3>
              <div className="mt-5 space-y-3">
                {radarSignals.map((signal, index) => (
                  <div key={signal.id ?? `radar-signal-${index}`} className="rounded-lg border border-zinc-800 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">
                          {signal.source_type}
                        </p>
                        <p className="mt-2 text-zinc-300">{signal.event ?? "Signal recorded"}</p>
                      </div>
                      <span className="rounded-full border border-zinc-700 px-2.5 py-1 text-xs text-zinc-300">
                        {signal.severity}
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-zinc-600">
                      {formatTimeAgo(signal.created_at)} / {signal.status}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
              <h3 className="text-lg font-semibold">Step-Up Requests</h3>
              <div className="mt-5 space-y-3">
                {stepUpRequests.length ? (
                  stepUpRequests.map((signal, index) => (
                    <div key={rowKey(signal, `step-up-${index}`)} className="rounded-lg border border-zinc-800 bg-black p-4">
                      <p className="text-zinc-300">{signal.event ?? "Signal recorded"}</p>
                      <p className="mt-2 text-xs text-zinc-600">{formatDate(signal.created_at)}</p>
                    </div>
                  ))
                ) : (
                  <EmptyState label="No live records yet. Create a Trust Passport or Hiring Shield report to populate this section." />
                )}
              </div>
            </div>

            <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
              <h3 className="text-lg font-semibold">Revocation Panel</h3>
              <div className="mt-5 space-y-3">
                {revocationEvents.length ? (
                  revocationEvents.map((signal, index) => (
                    <div key={rowKey(signal, `revocation-${index}`)} className="rounded-lg border border-zinc-800 bg-black p-4">
                      <p className="text-zinc-300">{signal.event ?? "Signal recorded"}</p>
                      <p className="mt-2 text-xs text-zinc-600">{formatDate(signal.created_at)}</p>
                    </div>
                  ))
                ) : (
                  <EmptyState label="No live records yet. Create a Trust Passport or Hiring Shield report to populate this section." />
                )}
              </div>
            </div>

            <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
              <h3 className="text-lg font-semibold">Recovery Queue</h3>
              <div className="mt-5 space-y-3">
                {recoveryEvents.length ? (
                  recoveryEvents.map((signal, index) => (
                    <div key={rowKey(signal, `recovery-${index}`)} className="rounded-lg border border-zinc-800 bg-black p-4">
                      <p className="text-zinc-300">{signal.event ?? "Signal recorded"}</p>
                      <p className="mt-2 text-xs text-zinc-600">{formatDate(signal.created_at)}</p>
                    </div>
                  ))
                ) : (
                  <EmptyState label="No live records yet. Create a Trust Passport or Hiring Shield report to populate this section." />
                )}
              </div>
            </div>

            <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
              <h3 className="text-lg font-semibold">Compliance Export</h3>
              <div className="mt-5 space-y-3">
                {complianceExportEvents.length ? (
                  complianceExportEvents.map((signal, index) => (
                    <div key={rowKey(signal, `compliance-export-${index}`)} className="rounded-lg border border-zinc-800 bg-black p-4">
                      <p className="text-zinc-300">{signal.event ?? "Signal recorded"}</p>
                      <p className="mt-2 text-xs text-zinc-600">{formatDate(signal.created_at)}</p>
                    </div>
                  ))
                ) : (
                  <EmptyState label="No live records yet. Create a Trust Passport or Hiring Shield report to populate this section." />
                )}
              </div>
            </div>

            <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
              <h3 className="text-lg font-semibold">LinkedIn Review Queue</h3>
              <div className="mt-5 grid gap-3">
                {linkedInReviewQueue.length ? (
                  linkedInReviewQueue.map((item, index) => (
                    <div key={item.id ?? `linkedin-review-${index}`} className="rounded-lg border border-zinc-800 p-4">
                      <p className="font-medium text-zinc-100">{item.subject_name}</p>
                      <p className="mt-1 break-all text-sm text-zinc-300">{item.linkedin_url}</p>
                      <p className="mt-2 text-xs text-zinc-600">
                        {item.status} / {[item.claimed_role, item.claimed_company].filter(Boolean).join(" / ") || "Not supplied"}
                      </p>
                    </div>
                  ))
                ) : (
                  <EmptyState label="No live records yet. Create a Trust Passport or Hiring Shield report to populate this section." />
                )}
              </div>
            </div>

            <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
              <h3 className="text-lg font-semibold">Waitlist Entries</h3>
              <div className="mt-5 grid gap-3">
                {waitlist.rows.length ? (
                  waitlist.rows.map((entry, index) => (
                    <div key={rowKey(entry, `waitlist-${index}`)} className="rounded-lg border border-zinc-800 p-4">
                      <p className="font-medium text-zinc-100">{entry.email ?? "Unknown email"}</p>
                      <p className="mt-1 text-sm text-zinc-500">
                        {[entry.company, entry.role, entry.use_case].filter(Boolean).join(" / ") || "No details supplied"}
                      </p>
                      <p className="mt-2 text-xs text-zinc-600">{formatDate(entry.created_at)}</p>
                    </div>
                  ))
                ) : (
                  <EmptyState label={tableEmptyLabel("waitlist", waitlist.available)} />
                )}
              </div>
            </div>
          </div>
          </details>
        </section>
      </div>

      <a
        href="#top"
        className="fixed bottom-4 right-4 z-50 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-zinc-300 shadow-lg hover:text-white"
      >
        Back to top
      </a>
    </main>
  );
}
