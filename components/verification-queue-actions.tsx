import type { BackOfficeStatus, DecisionAction } from "@/lib/back-office";

type QueueAction = {
  label: string;
  decision: DecisionAction;
  status?: Extract<BackOfficeStatus, "escalated">;
};

const actions: QueueAction[] = [
  { label: "Approve", decision: "allow" },
  { label: "Reject", decision: "deny" },
  { label: "Needs More Evidence", decision: "needs_more_evidence" },
];

export function VerificationQueueActions({ caseId }: { caseId: string }) {
  return (
    <div className="flex flex-wrap gap-2">
      {actions.map((action) => (
        <form
          key={action.label}
          action={`/api/admin/verification-cases/${caseId}/decision`}
          method="POST"
        >
          <input type="hidden" name="decision" value={action.decision} />
          {action.status ? (
            <input type="hidden" name="status" value={action.status} />
          ) : null}
          <button
            type="submit"
            className="rounded-lg border border-zinc-700 px-3 py-2 text-xs font-medium text-zinc-200 hover:border-zinc-400 hover:text-white"
          >
            {action.label}
          </button>
        </form>
      ))}
    </div>
  );
}
