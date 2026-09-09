"use client";

import { useState } from "react";
import {
  IDKitRequestWidget,
  proofOfHuman,
  type IDKitResult,
  type RpContext,
} from "@worldcoin/idkit";

type SignatureResponse = {
  ok: boolean;
  sig: string;
  nonce: string;
  created_at: number;
  expires_at: number;
  rp_id: string;
  app_id: string;
  action: string;
  environment: "staging" | "production";
};

type QualificationResponse = {
  ok?: boolean;
  reasonCode?: string;
  worldProvider?: { status?: string; reference?: string | null };
  replayClaim?: { status?: string; reference?: string | null };
  identityAssurance?: { status?: string; score?: number | null; reference?: string | null };
  authority?: { status?: string; reference?: string | null };
  policy?: { status?: string; id?: string | null; version?: string | null };
  decision?: string | null;
  transactionId?: string | null;
  receiptReference?: string | null;
  replayReference?: string | null;
  trustMemoryReference?: string | null;
};

type QualificationContext = {
  subjectId: string;
  subjectType: "human";
  operationalEntityId?: string;
  requestedAction: string;
  requestedPurpose: string;
  resource: string;
  environment: string;
  payloadDigest: string;
};

async function sha256(value: string) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function reference(value: string | null | undefined) {
  return value || "—";
}

export function WorldIdHumanProof() {
  const [open, setOpen] = useState(false);
  const [signature, setSignature] = useState<SignatureResponse | null>(null);
  const [context, setContext] = useState<QualificationContext | null>(null);
  const [result, setResult] = useState<QualificationResponse | null>(null);
  const [status, setStatus] = useState("Enter an existing tenant-bound identity subject and canonical action context.");
  const [subjectId, setSubjectId] = useState("");
  const [operationalEntityId, setOperationalEntityId] = useState("");
  const [requestedAction, setRequestedAction] = useState("");
  const [requestedPurpose, setRequestedPurpose] = useState("");
  const [resource, setResource] = useState("");
  const [environment, setEnvironment] = useState("staging");

  async function begin() {
    if (![subjectId, requestedAction, requestedPurpose, resource, environment].every((value) => value.trim())) {
      setStatus("Subject, action, purpose, resource, and environment are required.");
      return;
    }
    setResult(null);
    setStatus("Creating a short-lived relying-party request...");
    const requestContext: QualificationContext = {
      subjectId: subjectId.trim(),
      subjectType: "human",
      ...(operationalEntityId.trim() ? { operationalEntityId: operationalEntityId.trim() } : {}),
      requestedAction: requestedAction.trim(),
      requestedPurpose: requestedPurpose.trim(),
      resource: resource.trim(),
      environment: environment.trim(),
      payloadDigest: await sha256(JSON.stringify({ subjectId: subjectId.trim(), requestedAction: requestedAction.trim(), requestedPurpose: requestedPurpose.trim(), resource: resource.trim(), environment: environment.trim() })),
    };
    const response = await fetch("/api/world-id/rp-signature", { method: "POST" });
    const body = await response.json() as SignatureResponse & { error?: string };
    if (!response.ok || !body.ok) {
      setStatus(body.error ?? "World ID relying-party configuration is unavailable.");
      return;
    }
    setContext(requestContext);
    setSignature(body);
    setOpen(true);
    setStatus("Complete the genuine proof in World App.");
  }

  async function verify(idkitResponse: IDKitResult) {
    if (!context) throw new Error("Qualification context is unavailable.");
    setStatus("Running provider verification, durable replay, identity assurance, authority, policy, and canonical persistence...");
    const response = await fetch("/api/verify/world", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...context, idkitResponse }),
    });
    const body = await response.json() as QualificationResponse;
    setResult(body);
    if (!response.ok || !body.ok) {
      setStatus(`Qualification failed closed: ${body.reasonCode ?? "WORLD_ID_QUALIFICATION_FAILED"}`);
      throw new Error(body.reasonCode ?? "World ID qualification failed.");
    }
    setStatus(`Canonical qualification completed with decision ${body.decision}.`);
  }

  const rpContext: RpContext | null = signature ? {
    rp_id: signature.rp_id,
    nonce: signature.nonce,
    created_at: signature.created_at,
    expires_at: signature.expires_at,
    signature: signature.sig,
  } : null;

  const fields = [
    ["WORLD PROVIDER", result?.worldProvider?.status],
    ["REPLAY CLAIM", result?.replayClaim?.status],
    ["IDENTITY ASSURANCE", result?.identityAssurance ? `${result.identityAssurance.status ?? "UNKNOWN"}${result.identityAssurance.score === null || result.identityAssurance.score === undefined ? "" : ` (${result.identityAssurance.score})`}` : null],
    ["AUTHORITY", result?.authority?.status],
    ["POLICY", result?.policy?.status],
    ["DECISION", result?.decision],
    ["TRANSACTION", result?.transactionId],
    ["RECEIPT", result?.receiptReference],
    ["REPLAY", result?.replayReference],
    ["TRUST MEMORY", result?.trustMemoryReference],
  ];

  return <section className="rounded-xl border border-zinc-800 bg-zinc-950 p-6">
    <p className="text-sm leading-6 text-zinc-300">{status}</p>
    <div className="mt-6 grid gap-4 md:grid-cols-2">
      <label className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Identity subject UUID
        <input value={subjectId} onChange={(event) => setSubjectId(event.target.value)} className="mt-2 w-full rounded-md border border-zinc-700 bg-black px-3 py-2 text-sm font-normal normal-case tracking-normal text-white" autoComplete="off" />
      </label>
      <label className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Operational entity reference (optional)
        <input value={operationalEntityId} onChange={(event) => setOperationalEntityId(event.target.value)} className="mt-2 w-full rounded-md border border-zinc-700 bg-black px-3 py-2 text-sm font-normal normal-case tracking-normal text-white" autoComplete="off" />
      </label>
      <label className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Requested action
        <input value={requestedAction} onChange={(event) => setRequestedAction(event.target.value)} className="mt-2 w-full rounded-md border border-zinc-700 bg-black px-3 py-2 text-sm font-normal normal-case tracking-normal text-white" autoComplete="off" />
      </label>
      <label className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Requested purpose
        <input value={requestedPurpose} onChange={(event) => setRequestedPurpose(event.target.value)} className="mt-2 w-full rounded-md border border-zinc-700 bg-black px-3 py-2 text-sm font-normal normal-case tracking-normal text-white" autoComplete="off" />
      </label>
      <label className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Resource
        <input value={resource} onChange={(event) => setResource(event.target.value)} className="mt-2 w-full rounded-md border border-zinc-700 bg-black px-3 py-2 text-sm font-normal normal-case tracking-normal text-white" autoComplete="off" />
      </label>
      <label className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Canonical environment
        <input value={environment} onChange={(event) => setEnvironment(event.target.value)} className="mt-2 w-full rounded-md border border-zinc-700 bg-black px-3 py-2 text-sm font-normal normal-case tracking-normal text-white" autoComplete="off" />
      </label>
    </div>
    <button type="button" onClick={() => void begin()} className="mt-5 rounded-lg bg-white px-5 py-3 text-sm font-semibold text-black hover:bg-zinc-200">
      Verify and run canonical qualification
    </button>
    <dl className="mt-8 divide-y divide-zinc-800 border-y border-zinc-800 text-sm">
      {fields.map(([label, value]) => <div key={label} className="grid gap-1 py-3 sm:grid-cols-[12rem_1fr]">
        <dt className="font-semibold text-zinc-400">{label}</dt>
        <dd className="break-all text-zinc-100">{reference(value)}</dd>
      </div>)}
    </dl>
    {signature && rpContext ? <IDKitRequestWidget
      open={open}
      onOpenChange={setOpen}
      app_id={signature.app_id as `app_${string}`}
      action={signature.action}
      rp_context={rpContext}
      allow_legacy_proofs={false}
      environment={signature.environment}
      preset={proofOfHuman()}
      handleVerify={verify}
      onSuccess={() => setOpen(false)}
      onError={(code) => setStatus((current) => current.startsWith("Qualification failed closed:") ? current : `World ID did not complete: ${code}`)}
    /> : null}
  </section>;
}
