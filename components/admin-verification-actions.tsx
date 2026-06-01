import type { DecisionAction } from "@/lib/back-office";

type AdminVerificationActionsProps = {
  caseId: string;
};

type ActionConfig = {
  label: string;
  decision: DecisionAction;
  status?: "escalated";
};

const actions: ActionConfig[] = [
  { label: "Approve", decision: "allow" },
  { label: "Reject", decision: "deny" },
  { label: "Needs More Evidence", decision: "needs_more_evidence" },
];

export function AdminVerificationActions({
  caseId,
}: AdminVerificationActionsProps) {
  return (
    <div className="mt-4">
      <div className="flex flex-wrap gap-2">
        {actions.map((action) => (
          <form
            key={`${caseId}-${action.label}`}
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
    </div>
  );
}
