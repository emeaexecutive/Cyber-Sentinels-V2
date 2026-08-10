"use client";

import { useRef, useState } from "react";
import { canonicalize } from "@/src/lib/trust-core/canonicalize";

type Props = {
  enterpriseId: string;
  operationalEntityId: string;
  canonicalTrustObjectId: string;
  displayName: string;
  entityType: string;
  accountableOwnerId: string;
  organizationId: string;
  authorityReference: string | null;
  environmentReference: string | null;
  activeCredentialId: string | null;
};

type Contract = {
  contractId: string;
  subject: { type: string; id: string; displayName: string };
  workflow: { id: string; objective: string };
  authorizedObjective: string;
  requiredIdentityState: string;
  requiredAuthority: string[];
  requiredEnvironmentState: string;
  permittedScope: string[];
  permittedProviders: string[];
  requiredEvidenceTypes: string[];
  maximumEvidenceAgeSeconds: number;
  monitoringRequirements: string[];
  humanReviewThresholds: string[];
  contradictionPolicy: string;
  incidentThreshold: string;
  expiresAt: string;
  revokedAt: string | null;
  revocationState: "active" | "revoked";
  issuer: string;
  approver: string;
  policyId: string;
  policyVersion: string;
  evidenceReferences: Array<{ type: string; id: string; version?: string }>;
  issuedAt: string;
  supersedesContractId?: string | null;
};

type AlphaSession = {
  keyPair: CryptoKeyPair;
  credentialId: string;
  signingKeyId: string;
  manifest: Record<string, unknown>;
  manifestDigest: string;
  proof: Record<string, unknown>;
  runtimeObservation: Record<string, unknown>;
};

function base64Url(value: ArrayBuffer | Uint8Array) {
  const bytes = value instanceof Uint8Array ? value : new Uint8Array(value);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/u, "");
}

function randomNonce(bytes = 24) {
  return base64Url(crypto.getRandomValues(new Uint8Array(bytes)));
}

async function sha256Hex(value: string) {
  const bytes = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)));
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function nativeType(value: string) {
  const normalized = value.toUpperCase();
  if (normalized === "AI_AGENT") return "AI_AGENT";
  if (["WORKLOAD", "APPLICATION", "DEVICE", "MACHINE", "SERVICE", "MODEL_ENDPOINT"].includes(normalized)) return normalized;
  if (normalized === "SERVICE_ACCOUNT" || normalized === "API_CLIENT") return "SERVICE";
  return "APPLICATION";
}

function trustSubjectType(value: string) {
  const normalized = value.toLowerCase();
  if (normalized === "ai_agent") return "ai_agent";
  if (normalized === "device") return "device";
  if (normalized === "machine" || normalized === "workload" || normalized === "service_account" || normalized === "api_client") return "machine_identity";
  if (normalized === "model_endpoint") return "model";
  return "application";
}

export function NativeEntityVerificationPanel(props: Props) {
  const [state, setState] = useState<"idle" | "running" | "complete" | "failed">("idle");
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState("");
  const session = useRef<AlphaSession | null>(null);
  const endpoint = `/api/operational-entities/${encodeURIComponent(props.operationalEntityId)}/native-verification`;
  const isAgentAlpha = props.displayName.trim().toLowerCase() === "agent alpha";

  function publish(stage: string, output: Record<string, unknown>) {
    setResult((prior) => {
      const stages = Array.isArray(prior?.stages) ? prior.stages : [];
      return { operationalEntityId: props.operationalEntityId, stages: [...stages, { stage, ...output }] };
    });
  }

  async function run(operation: () => Promise<void>) {
    setState("running");
    setError("");
    try {
      await operation();
      setState("complete");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Native verification failed safely.");
      setState("failed");
    }
  }

  async function requestAction(input: Record<string, unknown>) {
    const response = await fetch(endpoint, {
      method: "POST",
      credentials: "same-origin",
      headers: { "content-type": "application/json", "x-enterprise-id": props.enterpriseId },
      body: JSON.stringify(input),
    });
    const parsed = await response.json().catch(() => ({})) as Record<string, unknown>;
    return { response, parsed };
  }

  async function action(input: Record<string, unknown>) {
    const { response, parsed } = await requestAction(input);
    if (!response.ok) throw new Error(String(parsed.message ?? parsed.error ?? "Native verification request failed."));
    return parsed;
  }

  async function expectedFailure(stage: string, input: Record<string, unknown>, expectedReason: string) {
    const { response, parsed } = await requestAction(input);
    const verification = parsed.result && typeof parsed.result === "object" ? parsed.result as Record<string, unknown> : {};
    const reasons = Array.isArray(verification.reasonCodes) ? verification.reasonCodes.map(String) : [String(parsed.error ?? "")];
    if (response.ok || !reasons.includes(expectedReason)) throw new Error(`${stage} did not fail with ${expectedReason}.`);
    publish(stage, { outcome: "FAIL", reasonCodes: reasons, httpStatus: response.status });
  }

  async function generateKey(signingKeyId: string) {
    const keyPair = await crypto.subtle.generateKey({ name: "Ed25519" }, false, ["sign", "verify"]);
    const publicJwk = await crypto.subtle.exportKey("jwk", keyPair.publicKey);
    publicJwk.alg = "EdDSA";
    publicJwk.use = "sig";
    publicJwk.key_ops = ["verify"];
    (publicJwk as JsonWebKey & { kid?: string }).kid = signingKeyId;
    return { keyPair, publicJwk };
  }

  async function signedManifest(keyPair: CryptoKeyPair, signingKeyId: string, prior?: Record<string, unknown>, authorityReference?: string | null) {
    const issuedAt = new Date().toISOString();
    const claims = prior ? {
      ...prior,
      issuedAt,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      nonce: randomNonce(),
      signingKeyId,
      credentials: { publicCredentialReferences: [signingKeyId] },
      authority: { authorityReference: authorityReference ?? props.authorityReference },
    } : {
      manifestVersion: "1.0",
      operationalEntityId: props.operationalEntityId,
      entityType: nativeType(props.entityType),
      displayName: props.displayName,
      enterpriseId: props.enterpriseId,
      owner: { accountableOwnerId: props.accountableOwnerId, organizationId: props.organizationId },
      software: { applicationId: `application:${props.operationalEntityId}`, version: "demo-1", buildDigest: null, sourceDigest: null, artifactDigest: null, packageReference: null },
      ai: { modelProvider: null, modelIdentifier: isAgentAlpha ? "agent-alpha-model-declared" : null, modelVersion: null, agentFramework: isAgentAlpha ? "native-demo" : null, declaredTools: ["read_repository"] },
      runtime: { runtimeType: "browser-agent-simulator", environment: "preview", region: null, workloadIdentifier: `workload:${props.operationalEntityId}`, deploymentIdentifier: `deployment:${props.operationalEntityId}:demo`, runtimeVersion: "browser-webcrypto-ed25519" },
      authority: { authorityReference: props.authorityReference },
      credentials: { publicCredentialReferences: [signingKeyId] },
      declaredCapabilities: ["read_repository"],
      issuedAt,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      nonce: randomNonce(),
      signingKeyId,
    };
    const unsigned = { ...claims } as Record<string, unknown>;
    delete unsigned.manifestDigest;
    delete unsigned.signature;
    const canonicalManifest = canonicalize(unsigned);
    const manifestDigest = await sha256Hex(canonicalManifest);
    const signature = base64Url(await crypto.subtle.sign("Ed25519", keyPair.privateKey, new TextEncoder().encode(canonicalManifest)));
    return { manifest: { ...unsigned, manifestDigest, signature }, manifestDigest };
  }

  async function signedProof(challenge: Record<string, unknown>, privateSigningKey: CryptoKey, manifestDigest: string, signingKeyId: string) {
    const challengePayload = canonicalize({
      challengeId: challenge.challengeId,
      enterpriseId: challenge.enterpriseId,
      operationalEntityId: challenge.operationalEntityId,
      nonce: challenge.nonce,
      audience: challenge.audience,
      issuer: challenge.issuer,
      subject: challenge.subject,
      manifestDigest: challenge.manifestDigest,
      signingKeyId: challenge.signingKeyId,
      issuedAt: new Date(String(challenge.issuedAt)).toISOString(),
      expiresAt: new Date(String(challenge.expiresAt)).toISOString(),
    });
    return {
      challengeId: challenge.challengeId,
      enterpriseId: props.enterpriseId,
      operationalEntityId: props.operationalEntityId,
      nonce: challenge.nonce,
      audience: challenge.audience,
      manifestDigest,
      signingKeyId,
      signature: base64Url(await crypto.subtle.sign("Ed25519", privateSigningKey, new TextEncoder().encode(challengePayload))),
      submittedAt: new Date().toISOString(),
    };
  }

  async function runtimeObservation(manifest: Record<string, unknown>, manifestDigest: string, publicJwk: JsonWebKey, environment = "preview") {
    const runtime = manifest.runtime as Record<string, unknown>;
    return {
      ...runtime,
      environment,
      manifestDigest,
      credentialFingerprint: await sha256Hex(canonicalize({ crv: publicJwk.crv, kty: publicJwk.kty, x: publicJwk.x })),
      observedAt: new Date().toISOString(),
      source: "enterprise_asserted_browser_demo",
    };
  }

  async function executeCanonicalAction(requestedAction: string) {
    const response = await fetch("/api/trust/execute", {
      method: "POST",
      credentials: "same-origin",
      headers: { "content-type": "application/json", "x-enterprise-id": props.enterpriseId },
      body: JSON.stringify({
        subject_type: trustSubjectType(props.entityType),
        subject_id: props.canonicalTrustObjectId,
        operational_entity_id: props.operationalEntityId,
        requested_action: requestedAction,
        requested_purpose: requestedAction,
        resource: requestedAction === "initiate_payment" ? "payment:restricted:agent-alpha" : "repository:agent-alpha",
        environment: props.environmentReference ?? "preview",
        payload_digest: await sha256Hex(canonicalize({ operationalEntityId: props.operationalEntityId, requestedAction, at: new Date().toISOString() })),
        idempotency_key: `native-alpha-${crypto.randomUUID()}`,
      }),
    });
    const parsed = await response.json().catch(() => ({})) as Record<string, unknown>;
    if (!response.ok) throw new Error(String(parsed.message ?? parsed.error ?? "Canonical trust transaction failed."));
    return (parsed.receipt ?? {}) as Record<string, unknown>;
  }

  async function loadCurrentContract() {
    const response = await fetch("/api/trust-fabric/contracts", { credentials: "same-origin", headers: { "x-enterprise-id": props.enterpriseId } });
    const parsed = await response.json().catch(() => ({})) as Record<string, unknown>;
    if (!response.ok || !Array.isArray(parsed.contracts)) throw new Error("Agent Alpha authority could not be resolved.");
    const contract = (parsed.contracts as Contract[]).find((item) => item.subject?.id === props.canonicalTrustObjectId);
    if (!contract) throw new Error("Agent Alpha has no canonical Authority Lineage contract.");
    return contract;
  }

  async function supersedeAuthority(state: "active" | "revoked") {
    const current = await loadCurrentContract();
    const now = new Date().toISOString();
    const body = {
      contractId: crypto.randomUUID(), subject: current.subject, workflow: current.workflow,
      authorizedObjective: current.authorizedObjective, requiredIdentityState: current.requiredIdentityState,
      requiredAuthority: current.requiredAuthority, requiredEnvironmentState: current.requiredEnvironmentState,
      permittedScope: current.permittedScope, permittedProviders: current.permittedProviders,
      requiredEvidenceTypes: current.requiredEvidenceTypes, maximumEvidenceAgeSeconds: current.maximumEvidenceAgeSeconds,
      monitoringRequirements: current.monitoringRequirements, humanReviewThresholds: current.humanReviewThresholds,
      contradictionPolicy: current.contradictionPolicy, incidentThreshold: current.incidentThreshold,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), revokedAt: state === "revoked" ? now : null,
      revocationState: state, issuer: current.issuer, approver: props.accountableOwnerId, policyId: current.policyId,
      policyVersion: current.policyVersion, evidenceReferences: current.evidenceReferences, issuedAt: now,
      supersedesContractId: current.contractId,
    };
    const response = await fetch("/api/trust-fabric/contracts", {
      method: "POST", credentials: "same-origin",
      headers: { "content-type": "application/json", "x-enterprise-id": props.enterpriseId }, body: JSON.stringify(body),
    });
    const parsed = await response.json().catch(() => ({})) as Record<string, unknown>;
    if (!response.ok) throw new Error(String(parsed.message ?? parsed.error ?? "Authority transition failed."));
    return body;
  }

  async function verifyEntity() {
    await run(async () => {
      if (!crypto.subtle) throw new Error("Web Cryptography is unavailable in this browser.");
      const signingKeyId = `key:${props.operationalEntityId}:${crypto.randomUUID()}`;
      const { keyPair, publicJwk } = await generateKey(signingKeyId);
      const registration = await action({
        action: props.activeCredentialId ? "rotate_credential" : "register_credential",
        signingKeyId, publicJwk, authorizationReference: props.authorityReference ?? `owner:${props.accountableOwnerId}`,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        ...(props.activeCredentialId ? { rotateFromCredentialId: props.activeCredentialId } : {}),
      });
      const credential = (registration.result ?? {}) as Record<string, unknown>;
      const created = await signedManifest(keyPair, signingKeyId);
      await action({ action: "register_manifest", manifest: created.manifest });
      const challenge = ((await action({ action: "issue_challenge" })).result ?? {}) as Record<string, unknown>;
      const proof = await signedProof(challenge, keyPair.privateKey, created.manifestDigest, signingKeyId);
      const runtime = await runtimeObservation(created.manifest, created.manifestDigest, publicJwk);
      const verification = await action({ action: "submit_proof", proof, runtimeObservation: runtime });
      const receipt = await executeCanonicalAction("read_repository");
      session.current = { keyPair, credentialId: String(credential.credentialId), signingKeyId, manifest: created.manifest, manifestDigest: created.manifestDigest, proof, runtimeObservation: runtime };
      publish("NATIVE_IDENTITY_PROOF", {
        identity: (verification.result as Record<string, unknown>)?.status,
        proof: "CRYPTOGRAPHIC",
        credentialFingerprint: credential.credentialFingerprint,
        manifestDigest: created.manifestDigest,
        challengeId: challenge.challengeId,
        evidenceReferences: (verification.result as Record<string, unknown>)?.evidenceReferences,
        owner: props.accountableOwnerId,
        authority: receipt.authorityReference,
        consequence: receipt.consequence,
        decision: receipt.decision,
        reasonCodes: receipt.reasonCodes,
        confidence: receipt.confidenceInConclusion,
        transactionId: receipt.transactionId,
        historyUrl: receipt.historyUrl,
        evidenceGraph: receipt.evidenceGraphReference,
        replay: receipt.replayReference,
        trustMemory: receipt.trustMemoryReference,
        execution: receipt.externalExecution,
      });
    });
  }

  async function copyAlphaId() {
    await run(async () => {
      const current = session.current;
      if (!current) throw new Error("Verify Agent Alpha before running an attack simulation.");
      const challenge = ((await action({ action: "issue_challenge" })).result ?? {}) as Record<string, unknown>;
      const attacker = await crypto.subtle.generateKey({ name: "Ed25519" }, false, ["sign", "verify"]);
      const proof = await signedProof(challenge, attacker.privateKey, current.manifestDigest, current.signingKeyId);
      await expectedFailure("COPY_ALPHA_ID", { action: "submit_proof", proof, runtimeObservation: current.runtimeObservation }, "INVALID_SIGNATURE");
    });
  }

  async function replayOldProof() {
    await run(async () => {
      const current = session.current;
      if (!current) throw new Error("Verify Agent Alpha before replaying its proof.");
      await expectedFailure("REPLAY_OLD_PROOF", { action: "submit_proof", proof: current.proof, runtimeObservation: current.runtimeObservation }, "CHALLENGE_REPLAY");
    });
  }

  async function alterManifest() {
    await run(async () => {
      const current = session.current;
      if (!current) throw new Error("Verify Agent Alpha before altering its manifest binding.");
      const challenge = ((await action({ action: "issue_challenge" })).result ?? {}) as Record<string, unknown>;
      const proof = { ...(await signedProof(challenge, current.keyPair.privateKey, current.manifestDigest, current.signingKeyId)), manifestDigest: "0".repeat(64) };
      await expectedFailure("ALTER_MANIFEST", { action: "submit_proof", proof, runtimeObservation: current.runtimeObservation }, "MANIFEST_TAMPERED");
    });
  }

  async function changeRuntime() {
    await run(async () => {
      const current = session.current;
      if (!current) throw new Error("Verify Agent Alpha before changing its runtime.");
      const challenge = ((await action({ action: "issue_challenge" })).result ?? {}) as Record<string, unknown>;
      const proof = await signedProof(challenge, current.keyPair.privateKey, current.manifestDigest, current.signingKeyId);
      const runtime = { ...current.runtimeObservation, environment: "preview-runtime-changed", observedAt: proof.submittedAt };
      const verification = await action({ action: "submit_proof", proof, runtimeObservation: runtime });
      const receipt = await executeCanonicalAction("initiate_payment");
      publish("CHANGE_RUNTIME_AND_OUT_OF_SCOPE_ACTION", { identity: (verification.result as Record<string, unknown>)?.status, changedAttributes: (verification.result as Record<string, unknown>)?.changedAttributes, runtimeBinding: (verification.result as Record<string, unknown>)?.runtimeBinding, decision: receipt.decision, reasonCodes: receipt.reasonCodes, consequence: receipt.consequence, confidence: receipt.confidenceInConclusion, transactionId: receipt.transactionId, historyUrl: receipt.historyUrl, replay: receipt.replayReference, trustMemory: receipt.trustMemoryReference });
    });
  }

  async function revokeAuthority() {
    await run(async () => {
      const current = session.current;
      if (!current) throw new Error("Verify Agent Alpha before revoking authority.");
      const contract = await supersedeAuthority("revoked");
      const challenge = ((await action({ action: "issue_challenge" })).result ?? {}) as Record<string, unknown>;
      const proof = await signedProof(challenge, current.keyPair.privateKey, current.manifestDigest, current.signingKeyId);
      const verification = await action({ action: "submit_proof", proof, runtimeObservation: { ...current.runtimeObservation, observedAt: proof.submittedAt } });
      const receipt = await executeCanonicalAction("read_repository");
      publish("REVOKE_AUTHORITY", { identity: (verification.result as Record<string, unknown>)?.status, authority: contract.revocationState, authorityContractId: contract.contractId, decision: receipt.decision, reasonCodes: receipt.reasonCodes, transactionId: receipt.transactionId, historyUrl: receipt.historyUrl, replay: receipt.replayReference, trustMemory: receipt.trustMemoryReference });
    });
  }

  async function rotateKey() {
    await run(async () => {
      const current = session.current;
      if (!current) throw new Error("Verify Agent Alpha before rotating its credential.");
      const signingKeyId = `key:${props.operationalEntityId}:${crypto.randomUUID()}`;
      const { keyPair, publicJwk } = await generateKey(signingKeyId);
      const registration = await action({ action: "rotate_credential", signingKeyId, publicJwk, authorizationReference: `rotation:${props.accountableOwnerId}`, rotateFromCredentialId: current.credentialId, expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() });
      const credential = (registration.result ?? {}) as Record<string, unknown>;
      const authority = await supersedeAuthority("active");
      const created = await signedManifest(keyPair, signingKeyId, current.manifest, authority.contractId);
      await action({ action: "register_manifest", manifest: created.manifest });
      const challenge = ((await action({ action: "issue_challenge" })).result ?? {}) as Record<string, unknown>;
      const proof = await signedProof(challenge, keyPair.privateKey, created.manifestDigest, signingKeyId);
      const runtime = await runtimeObservation(created.manifest, created.manifestDigest, publicJwk);
      const verification = await action({ action: "submit_proof", proof, runtimeObservation: runtime });
      const receipt = await executeCanonicalAction("read_repository");
      session.current = { keyPair, credentialId: String(credential.credentialId), signingKeyId, manifest: created.manifest, manifestDigest: created.manifestDigest, proof, runtimeObservation: runtime };
      publish("ROTATE_KEY", { identity: (verification.result as Record<string, unknown>)?.status, oldCredentialState: "RETIRED", newCredentialFingerprint: credential.credentialFingerprint, authority: authority.revocationState, decision: receipt.decision, reasonCodes: receipt.reasonCodes, recovery: receipt.trustState, transactionId: receipt.transactionId, historyUrl: receipt.historyUrl, replay: receipt.replayReference, trustMemory: receipt.trustMemoryReference });
    });
  }

  const attackDisabled = state === "running" || !session.current;
  const resultStages = Array.isArray(result?.stages)
    ? result.stages as Array<Record<string, unknown>>
    : [];
  const latestHistoryUrl = [...resultStages]
    .reverse()
    .map((stage) => String(stage.historyUrl ?? ""))
    .find(Boolean);

  return (
    <div className="mt-5 rounded-xl border border-cyan-700/60 bg-cyan-950/20 p-5 text-slate-100">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">Native identity proof</p>
      <h2 className="mt-2 text-xl font-semibold">{isAgentAlpha ? "Cryptographically verify existing Agent Alpha" : `Cryptographically verify ${props.displayName}`}</h2>
      <p className="mt-3 text-sm leading-6 text-slate-300">The private Ed25519 key is generated as non-extractable browser memory, used by this non-Production signer, never sent to Cyber Sentinels, never persisted, and discarded when the page closes. Runtime fields are enterprise-asserted; no build or source integrity is fabricated.</p>
      <p className="mt-3 rounded-lg border border-cyan-900/60 bg-slate-950/60 p-3 text-sm text-cyan-100"><strong>Why do we know this is Alpha?</strong> Alpha proves possession of the private key corresponding to its registered public credential using a single-use challenge bound to this Operational Entity and manifest.</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" onClick={verifyEntity} disabled={state === "running"} className="rounded-lg bg-cyan-300 px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-50">{state === "running" ? "RUNNING..." : props.activeCredentialId ? "ROTATE AND VERIFY CURRENT ENTITY" : isAgentAlpha ? "VERIFY AGENT ALPHA" : "VERIFY ENTITY"}</button>
        {isAgentAlpha ? <>
          <button type="button" onClick={copyAlphaId} disabled={attackDisabled} className="rounded-lg border border-slate-700 px-3 py-2 text-sm disabled:opacity-40">COPY ALPHA ID</button>
          <button type="button" onClick={replayOldProof} disabled={attackDisabled} className="rounded-lg border border-slate-700 px-3 py-2 text-sm disabled:opacity-40">REPLAY OLD PROOF</button>
          <button type="button" onClick={alterManifest} disabled={attackDisabled} className="rounded-lg border border-slate-700 px-3 py-2 text-sm disabled:opacity-40">ALTER MANIFEST</button>
          <button type="button" onClick={changeRuntime} disabled={attackDisabled} className="rounded-lg border border-slate-700 px-3 py-2 text-sm disabled:opacity-40">CHANGE RUNTIME + TEST DENY</button>
          <button type="button" onClick={revokeAuthority} disabled={attackDisabled} className="rounded-lg border border-red-800 px-3 py-2 text-sm text-red-200 disabled:opacity-40">REVOKE AUTHORITY</button>
          <button type="button" onClick={rotateKey} disabled={attackDisabled} className="rounded-lg border border-emerald-800 px-3 py-2 text-sm text-emerald-200 disabled:opacity-40">ROTATE KEY + RECOVER</button>
        </> : null}
      </div>
      {latestHistoryUrl ? <a href={latestHistoryUrl} className="mt-4 inline-flex rounded-lg bg-white px-4 py-2 text-sm font-semibold text-slate-950">Open transaction, Replay and receipt</a> : null}
      {result ? <pre className="mt-4 max-h-96 overflow-auto rounded-lg bg-slate-950 p-4 text-xs text-cyan-100">{JSON.stringify(result, null, 2)}</pre> : null}
      {state === "failed" ? <p className="mt-4 text-sm font-medium text-red-300">{error}</p> : null}
    </div>
  );
}
