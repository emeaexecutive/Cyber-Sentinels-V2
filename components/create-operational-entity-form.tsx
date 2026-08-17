"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export function CreateOperationalEntityForm({ workspaceId }: { workspaceId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    const entityId = `agent:${crypto.randomUUID()}`;
    try {
      const response = await fetch("/api/operational-entities", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-enterprise-id": workspaceId,
        },
        body: JSON.stringify({
          action: "register_native_agent",
          entityId,
          displayReference: String(form.get("displayReference") ?? ""),
          accountableOwnerId: String(form.get("accountableOwnerId") ?? ""),
          organizationReference: `workspace:${workspaceId}`,
          environmentReference: "customer-workspace",
          workflowReference: "customer-onboarding",
        }),
      });
      const result = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok || !result.ok) {
        setMessage(result.error === "OPERATIONAL_ENTITY_ALREADY_EXISTS"
          ? "An Operational Entity with that reference already exists."
          : "The Operational Entity could not be created. Check the details and retry.");
        return;
      }
      setMessage("Operational Entity created. Identity and authority are not yet verified.");
      event.currentTarget.reset();
      router.refresh();
    } catch {
      setMessage("The Operational Entity could not be created. Retry shortly.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-5 grid gap-4" aria-label="Create your first Operational Entity">
      <label className="grid gap-2 text-sm font-medium text-slate-900">
        Entity name
        <input name="displayReference" required maxLength={240} className="rounded-lg border border-slate-300 bg-white px-3 py-2" placeholder="Repository Review Agent" />
      </label>
      <label className="grid gap-2 text-sm font-medium text-slate-900">
        Accountable owner reference
        <input name="accountableOwnerId" required pattern="[A-Za-z0-9_.:/-]{1,240}" className="rounded-lg border border-slate-300 bg-white px-3 py-2" placeholder="owner:security-team" />
      </label>
      <button disabled={pending} type="submit" className="w-fit rounded-lg bg-slate-950 px-5 py-3 font-semibold text-white hover:bg-slate-800 disabled:cursor-wait disabled:opacity-60">
        {pending ? "Creating…" : "Create Operational Entity"}
      </button>
      {message ? <p role="status" className="text-sm text-slate-700">{message}</p> : null}
    </form>
  );
}
