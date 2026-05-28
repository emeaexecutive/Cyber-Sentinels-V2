"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { BackOfficeStatus, DecisionAction } from "@/lib/back-office";

type QueueAction = {
  label: string;
  decision: DecisionAction;
  status?: Extract<BackOfficeStatus, "escalated">;
};

const actions: QueueAction[] = [
  { label: "Approve", decision: "allow" },
  { label: "Reject", decision: "deny" },
  { label: "Escalate", decision: "manual_review", status: "escalated" },
  { label: "Manual Review", decision: "manual_review" },
  { label: "Needs More Evidence", decision: "needs_more_evidence" },
];

export function VerificationQueueActions({ caseId }: { caseId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState("");

  function submit(action: QueueAction) {
    setMessage("");

    startTransition(async () => {
      const response = await fetch(
        `/api/admin/verification-cases/${caseId}/decision`,
        {
          method: "POST",
          credentials: "include",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            decision: action.decision,
            ...(action.status ? { status: action.status } : {}),
          }),
        }
      );

      if (!response.ok) {
        setMessage("Action failed");
        return;
      }

      setMessage(`${action.label} saved`);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-wrap gap-2">
      {actions.map((action) => (
        <button
          key={action.label}
          type="button"
          disabled={isPending}
          onClick={() => submit(action)}
          className="rounded-lg border border-zinc-700 px-3 py-2 text-xs font-medium text-zinc-200 hover:border-zinc-400 hover:text-white disabled:opacity-50"
        >
          {action.label}
        </button>
      ))}
      {message ? <p className="w-full text-xs text-zinc-500">{message}</p> : null}
    </div>
  );
}
