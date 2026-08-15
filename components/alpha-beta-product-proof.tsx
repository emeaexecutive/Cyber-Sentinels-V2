"use client";

import { useRef, useState } from "react";
import { canonicalize } from "@/src/lib/trust-core/canonicalize";

type EntityInput = {
  entityId: string;
  displayName: "Agent Alpha" | "Agent Beta" | "Agent Gamma";
  accountableOwnerId: string;
  organizationId: string;
  authorityReference: string | null;
  activeCredentialId: string | null;
  runtimeEnvironment: string;
};

type Props = { enterpriseId: string; alpha: EntityInput; beta: EntityInput; gamma: EntityInput };
type BrowserIdentity = {
  keyPair: CryptoKeyPair;
  signingKeyId: string;
  credentialId: string;
  credentialFingerprint: string;
  manifestDigest: string;
  verification: Record<string, unknown>;
};
type Contract = {
  contractId: string;
  subject: { id: string };
  issuedAt: string;
  expiresAt: string;
  policyVersion: string;
  authorityVersion?: string;
  revocationState: "active" | "revoked";
};

function base64Url(value: ArrayBuffer | Uint8Array) {
  const bytes = value instanceof Uint8Array ? value : new Uint8Array(value);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/u, "");
}

function nonce(bytes = 24) {
  return base64Url(crypto.getRandomValues(new Uint8Array(bytes)));
}

async function sha256Hex(value: string) {
  const bytes = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)));
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function normalizedScope() {
  return {
    permittedActions: ["read_repository"],
    permittedTools: ["repository.reader"],
    permittedTargets: ["repository:a"],
    environments: ["preview-beta-runtime"],
    dataBoundary: "INTERNAL",
    financialLimit: 0,
    executionLimit: 10,
  };
}

export function AlphaBetaProductProof({ enterpriseId, alpha, beta, gamma }: Props) {
  const alphaIdentity = useRef<BrowserIdentity | null>(null);
  const betaIdentity = useRef<BrowserIdentity | null>(null);
  const gammaIdentity = useRef<BrowserIdentity | null>(null);
  const delegationRecord = useRef<Record<string, unknown> | null>(null);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [proof, setProof] = useState<Record<string, Record<string, unknown>>>({});

  function record(stage: string, value: Record<string, unknown>) {
    setProof((current) => ({ ...current, [stage]: value }));
  }

  async function perform(stage: string, operation: () => Promise<void>) {
    setBusy(stage);
    setError("");
    try {
      await operation();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The proof failed safely.");
    } finally {
      setBusy("");
    }
  }

  async function post(url: string, body: Record<string, unknown>) {
    const response = await fetch(url, {
      method: "POST",
      credentials: "same-origin",
      headers: { "content-type": "application/json", "x-enterprise-id": enterpriseId },
      body: JSON.stringify(body),
    });
    const parsed = await response.json().catch(() => ({})) as Record<string, unknown>;
    if (!response.ok) throw new Error(String(parsed.message ?? parsed.error ?? "The canonical proof request failed."));
    return parsed;
  }

  async function verifyEntity(entity: EntityInput) {
    const endpoint = `/api/operational-entities/${encodeURIComponent(entity.entityId)}/native-verification`;
    const signingKeyId = `key:${entity.entityId}:${crypto.randomUUID()}`;
    const keyPair = await crypto.subtle.generateKey({ name: "Ed25519" }, false, ["sign", "verify"]);
    const publicJwk = await crypto.subtle.exportKey("jwk", keyPair.publicKey);
    publicJwk.alg = "EdDSA";
    publicJwk.use = "sig";
    publicJwk.key_ops = ["verify"];
    (publicJwk as JsonWebKey & { kid?: string }).kid = signingKeyId;
    const registration = await post(endpoint, {
      action: entity.activeCredentialId ? "rotate_credential" : "register_credential",
      signingKeyId,
      publicJwk,
      authorizationReference: entity.authorityReference ?? `owner:${entity.accountableOwnerId}`,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      ...(entity.activeCredentialId ? { rotateFromCredentialId: entity.activeCredentialId } : {}),
    });
    const credential = (registration.result ?? {}) as Record<string, unknown>;
    const issuedAt = new Date().toISOString();
    const applicationId = `application:${entity.entityId}`;
    const entitySlug = entity.displayName.split(" ").at(-1)?.toLowerCase() ?? "agent";
    const applicationVersion = `${entitySlug}-1`;
    const runtimeVersion = `${entitySlug}-runtime-1`;
    const buildDigest = await sha256Hex(canonicalize({ applicationId, applicationVersion, runtimeVersion, proofClient: "alpha-beta-product-proof-v1" }));
    const manifestClaims = {
      manifestVersion: "1.0",
      operationalEntityId: entity.entityId,
      entityType: "AI_AGENT",
      displayName: entity.displayName,
      enterpriseId,
      owner: { accountableOwnerId: entity.accountableOwnerId, organizationId: entity.organizationId },
      software: { applicationId, version: applicationVersion, buildDigest, sourceDigest: null, artifactDigest: null, packageReference: null },
      ai: { modelProvider: null, modelIdentifier: `agent-${entitySlug}-model`, modelVersion: "1", agentFramework: "native-proof", declaredTools: entity.displayName === "Agent Gamma" ? ["repository.reader", "configuration.writer"] : ["repository.reader"] },
      runtime: { runtimeType: "browser-agent-simulator", environment: entity.runtimeEnvironment, region: "eu", workloadIdentifier: `workload:${entity.entityId}`, deploymentIdentifier: `deployment:${entity.entityId}`, runtimeVersion },
      authority: { authorityReference: entity.authorityReference },
      credentials: { publicCredentialReferences: [signingKeyId] },
      declaredCapabilities: entity.displayName === "Agent Gamma" ? ["read_repository", "replace_configuration"] : ["read_repository"],
      issuedAt,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      nonce: nonce(),
      signingKeyId,
    };
    const manifestCanonical = canonicalize(manifestClaims);
    const manifestDigest = await sha256Hex(manifestCanonical);
    const manifestSignature = base64Url(await crypto.subtle.sign("Ed25519", keyPair.privateKey, new TextEncoder().encode(manifestCanonical)));
    await post(endpoint, { action: "register_manifest", manifest: { ...manifestClaims, manifestDigest, signature: manifestSignature } });
    const challengeResponse = await post(endpoint, { action: "issue_challenge" });
    const challenge = (challengeResponse.result ?? {}) as Record<string, unknown>;
    const challengeCanonical = canonicalize({
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
    const submittedAt = new Date().toISOString();
    const proofSubmission = {
      challengeId: challenge.challengeId,
      enterpriseId,
      operationalEntityId: entity.entityId,
      nonce: challenge.nonce,
      audience: challenge.audience,
      manifestDigest,
      signingKeyId,
      signature: base64Url(await crypto.subtle.sign("Ed25519", keyPair.privateKey, new TextEncoder().encode(challengeCanonical))),
      submittedAt,
    };
    const credentialFingerprint = await sha256Hex(canonicalize({ crv: publicJwk.crv, kty: publicJwk.kty, x: publicJwk.x }));
    const verificationResponse = await post(endpoint, {
      action: "submit_proof",
      proof: proofSubmission,
      runtimeObservation: { ...manifestClaims.runtime, manifestDigest, credentialFingerprint, observedAt: submittedAt, source: `enterprise_asserted_${entity.displayName.toLowerCase().replaceAll(" ", "_")}` },
      softwareObservation: { buildDigest, artifactDigest: null, sourceDigest: null, observedAt: submittedAt, source: "browser_product_proof_build_descriptor" },
    });
    const verification = (verificationResponse.result ?? {}) as Record<string, unknown>;
    if (verification.status !== "VERIFIED") throw new Error(`${entity.displayName} identity remained ${String(verification.status ?? "UNKNOWN")}.`);
    return { keyPair, signingKeyId, credentialId: String(credential.credentialId), credentialFingerprint, manifestDigest, verification } satisfies BrowserIdentity;
  }

  async function loadParentAuthority() {
    const response = await fetch("/api/trust-fabric/contracts", { credentials: "same-origin", headers: { "x-enterprise-id": enterpriseId } });
    const parsed = await response.json().catch(() => ({})) as Record<string, unknown>;
    if (!response.ok || !Array.isArray(parsed.contracts)) throw new Error("Alpha's canonical parent authority could not be resolved.");
    const contract = (parsed.contracts as Contract[]).find((candidate) => candidate.contractId === alpha.authorityReference && candidate.subject.id === alpha.entityId);
    if (!contract) throw new Error("Alpha's canonical parent authority is missing.");
    return contract;
  }

  async function createAndAcceptDelegation() {
    const alphaSession = alphaIdentity.current;
    const betaSession = betaIdentity.current;
    if (!alphaSession || !betaSession) throw new Error("Verify both Alpha and Beta before delegation.");
    const parent = await loadParentAuthority();
    if (parent.revocationState !== "active") throw new Error("Alpha's parent authority is already revoked.");
    const issuedAt = new Date().toISOString();
    const expiresAt = new Date(Math.min(Date.parse(parent.expiresAt) - 1_000, Date.now() + 12 * 60 * 60 * 1000)).toISOString();
    const identityEvidenceReferences = [alphaSession.verification.evidenceReferences, betaSession.verification.evidenceReferences]
      .flatMap((references) => Array.isArray(references) ? references.map(String) : [])
      .filter(Boolean);
    const delegation = {
      delegationId: crypto.randomUUID(),
      enterpriseId,
      delegatorOperationalEntityId: alpha.entityId,
      delegateOperationalEntityId: beta.entityId,
      parentAuthorityId: parent.contractId,
      parentDelegationId: null,
      objective: "controlled_repository_access",
      scope: normalizedScope(),
      canRedelegate: false,
      maximumDelegationDepth: 0,
      depth: 1,
      issuedAt,
      notBefore: issuedAt,
      expiresAt,
      revokedAt: null,
      policyVersion: parent.policyVersion,
      authorityVersion: parent.authorityVersion ?? parent.policyVersion,
      nonce: nonce(),
      signingKeyId: alphaSession.signingKeyId,
      delegationDigest: "",
      signature: "",
      status: "PENDING",
      evidenceReferences: identityEvidenceReferences,
    };
    const signingClaims = {
      delegationId: delegation.delegationId,
      delegatorOperationalEntityId: delegation.delegatorOperationalEntityId,
      delegateOperationalEntityId: delegation.delegateOperationalEntityId,
      parentAuthorityId: delegation.parentAuthorityId,
      parentDelegationId: delegation.parentDelegationId,
      scopeDigest: await sha256Hex(canonicalize(delegation.scope)),
      policyVersion: delegation.policyVersion,
      authorityVersion: delegation.authorityVersion,
      issuedAt: delegation.issuedAt,
      expiresAt: delegation.expiresAt,
      nonce: delegation.nonce,
    };
    delegation.delegationDigest = await sha256Hex(canonicalize({ enterpriseId: delegation.enterpriseId, objective: delegation.objective, scope: delegation.scope, canRedelegate: delegation.canRedelegate, maximumDelegationDepth: delegation.maximumDelegationDepth, depth: delegation.depth, notBefore: delegation.notBefore, ...signingClaims }));
    delegation.signature = base64Url(await crypto.subtle.sign("Ed25519", alphaSession.keyPair.privateKey, new TextEncoder().encode(canonicalize(signingClaims))));
    const created = await post(`/api/operational-entities/${encodeURIComponent(alpha.entityId)}/delegated-authority`, { action: "create_delegation", delegation });
    const acceptedAt = new Date().toISOString();
    const acceptanceClaims = {
      acceptanceId: crypto.randomUUID(),
      enterpriseId,
      delegationId: delegation.delegationId,
      delegationDigest: delegation.delegationDigest,
      delegateOperationalEntityId: beta.entityId,
      credentialFingerprint: betaSession.credentialFingerprint,
      manifestDigest: betaSession.manifestDigest,
      signingKeyId: betaSession.signingKeyId,
      acceptedAt,
      nonce: nonce(),
    };
    const acceptanceSignature = base64Url(await crypto.subtle.sign("Ed25519", betaSession.keyPair.privateKey, new TextEncoder().encode(canonicalize(acceptanceClaims))));
    const acceptance = { ...acceptanceClaims, signature: acceptanceSignature, acceptanceDigest: await sha256Hex(canonicalize({ ...acceptanceClaims, signature: acceptanceSignature })) };
    const accepted = await post(`/api/operational-entities/${encodeURIComponent(beta.entityId)}/delegated-authority`, { action: "accept_delegation", acceptance });
    delegationRecord.current = delegation;
    record("delegation", { state: "ACTIVE", delegationId: delegation.delegationId, delegationDigest: delegation.delegationDigest, alphaSignature: delegation.signature, betaAcceptanceId: acceptance.acceptanceId, betaAcceptanceDigest: acceptance.acceptanceDigest, scope: delegation.scope, parentAuthorityId: parent.contractId, policyVersion: parent.policyVersion, subset: (created.result as Record<string, unknown>)?.subset, acceptance: accepted.result });
  }

  async function betaAction(actionType: "read_repository" | "write_repository", stage: string) {
    const delegation = delegationRecord.current;
    if (!delegation) throw new Error("Activate the Alpha to Beta delegation first.");
    const request = {
      type: actionType,
      tool: "repository.reader",
      target: "repository:a",
      environment: "preview-beta-runtime",
      purpose: "controlled_repository_access",
      dataBoundary: "INTERNAL",
      executionCount: 1,
      workflowId: "controlled-repository-a",
      payloadDigest: await sha256Hex(canonicalize({ entityId: beta.entityId, actionType, target: "repository:a", at: new Date().toISOString() })),
      idempotencyKey: `alpha-beta-proof-${stage}-${crypto.randomUUID()}`,
    };
    const response = await post(`/api/operational-entities/${encodeURIComponent(beta.entityId)}/delegated-authority`, { action: "evaluate_delegated_action", delegationId: delegation.delegationId, request });
    const result = (response.result ?? {}) as Record<string, unknown>;
    const transaction = (result.canonicalTransaction ?? {}) as Record<string, unknown>;
    record(stage, { identity: "VERIFIED", delegation: result.decision === "ALLOW" ? "ACTIVE" : "EVALUATED", decision: result.decision, reasonCodes: result.reasonCodes, evaluationId: result.evaluationId, transactionId: transaction.transactionId, historyUrl: transaction.historyUrl, receiptUrl: transaction.transactionId ? `/api/trust/transactions/${String(transaction.transactionId)}/receipt` : null, authorityLineage: result.authorityLineage, evidenceGraph: transaction.evidenceGraphReference, replay: transaction.replayReference, trustMemory: transaction.trustMemoryReference, consequence: transaction.consequence });
  }

  async function governedAgentCase(caseType: "compatible" | "conflict", stage: string) {
    const delegation = delegationRecord.current;
    if (!delegation) throw new Error("Activate the Alpha to Beta delegation first.");
    if (!gammaIdentity.current) throw new Error("Verify Gamma before evaluating the relationship.");
    const response = await post(`/api/operational-entities/${encodeURIComponent(beta.entityId)}/delegated-authority`, {
      action: "evaluate_inter_agent_action",
      caseType,
      delegationId: delegation.delegationId,
      targetEntityId: gamma.entityId,
      idempotencyKey: `alpha-beta-gamma-${caseType}-${crypto.randomUUID()}`,
    });
    const result = (response.result ?? {}) as Record<string, unknown>;
    const source = (result.source ?? {}) as Record<string, unknown>;
    const sourceTransaction = (source.canonicalTransaction ?? {}) as Record<string, unknown>;
    const conflict = (result.interAgentAuthorityConflict ?? {}) as Record<string, unknown>;
    const capability = (result.capabilityGovernance ?? {}) as Record<string, unknown>;
    record(stage, {
      caseType,
      decision: source.decision,
      transactionId: sourceTransaction.transactionId,
      historyUrl: sourceTransaction.historyUrl,
      receiptUrl: sourceTransaction.transactionId ? `/api/trust/transactions/${String(sourceTransaction.transactionId)}/receipt` : null,
      capabilityDecision: capability.decision,
      capabilityEvidence: result.evidence,
      conflictState: conflict.conflictState,
      conflictDecision: conflict.decision,
      policyResponse: conflict.policyResponse,
      reasonCodes: conflict.reasonCodes,
      authorityIntersection: conflict.authorityIntersection,
      target: result.target,
      evidenceGraph: sourceTransaction.evidenceGraphReference,
      replay: sourceTransaction.replayReference,
      trustMemory: sourceTransaction.trustMemoryReference,
    });
  }

  async function revokeParentAuthority() {
    const delegation = delegationRecord.current;
    if (!delegation) throw new Error("Activate the Alpha to Beta delegation first.");
    const response = await post(`/api/operational-entities/${encodeURIComponent(alpha.entityId)}/delegated-authority`, { action: "revoke_parent_authority", parentAuthorityId: delegation.parentAuthorityId, reason: "Product proof: demonstrate dependent authority invalidation." });
    record("revocation", { identity: { alpha: "VERIFIED", beta: "VERIFIED" }, parentAuthority: "REVOKED", delegation: "INVALIDATED", result: response.result });
  }

  const stages = Object.entries(proof);
  const transactionLinks = stages.flatMap(([stage, item]) => item.historyUrl ? [{ stage, href: String(item.historyUrl), receipt: String(item.receiptUrl ?? "") }] : []);

  return (
    <section id="alpha-beta-proof" className="rounded-2xl border border-cyan-200 bg-cyan-50 p-6 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-800">Alpha → Beta + independent Gamma end-to-end product proof</p>
      <h2 className="mt-2 text-2xl font-semibold text-slate-950">Identity, bounded authority, decision, evidence, Replay, memory, receipt.</h2>
      <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-700">Every button calls the persisted native verification, delegated-authority, canonical transaction, Evidence Graph, Replay, Trust Memory, and receipt paths. Private Ed25519 keys remain non-extractable browser memory.</p>

      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <article className="rounded-xl border border-cyan-200 bg-white p-4"><p className="text-xs uppercase text-slate-500">Alpha</p><p className="mt-2 font-semibold">{alpha.entityId}</p><p className="mt-1 text-sm text-slate-600">Owner: Alice · {alpha.accountableOwnerId}</p></article>
        <article className="rounded-xl border border-cyan-200 bg-white p-4"><p className="text-xs uppercase text-slate-500">Beta</p><p className="mt-2 font-semibold">{beta.entityId}</p><p className="mt-1 text-sm text-slate-600">Owner: Bob · {beta.accountableOwnerId}</p></article>
        <article className="rounded-xl border border-cyan-200 bg-white p-4"><p className="text-xs uppercase text-slate-500">Gamma</p><p className="mt-2 font-semibold">{gamma.entityId}</p><p className="mt-1 text-sm text-slate-600">Owner: Grace · independently authorized</p></article>
        <article className="rounded-xl border border-cyan-200 bg-white p-4"><p className="text-xs uppercase text-slate-500">Alpha authority</p><p className="mt-2 break-all text-xs font-semibold">{alpha.authorityReference ?? "UNKNOWN"}</p><p className="mt-1 text-sm text-slate-600">READ Repository A + Repository B · delegable depth 1</p></article>
        <article className="rounded-xl border border-cyan-200 bg-white p-4"><p className="text-xs uppercase text-slate-500">Beta authority</p><p className="mt-2 font-semibold">READ Repository A only</p><p className="mt-1 text-sm text-slate-600">Must be signed by Alpha and accepted by Beta.</p></article>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <button data-testid="verify-alpha" type="button" disabled={Boolean(busy)} onClick={() => perform("alpha", async () => { const identity = await verifyEntity(alpha); alphaIdentity.current = identity; record("alphaIdentity", { entityId: alpha.entityId, owner: "Alice", status: identity.verification.status, credentialFingerprint: identity.credentialFingerprint, manifestDigest: identity.manifestDigest, evidenceReferences: identity.verification.evidenceReferences, runtime: alpha.runtimeEnvironment }); })} className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">VERIFY AGENT ALPHA</button>
        <button data-testid="verify-beta" type="button" disabled={Boolean(busy) || !alphaIdentity.current} onClick={() => perform("beta", async () => { const identity = await verifyEntity(beta); betaIdentity.current = identity; record("betaIdentity", { entityId: beta.entityId, owner: "Bob", status: identity.verification.status, credentialFingerprint: identity.credentialFingerprint, manifestDigest: identity.manifestDigest, evidenceReferences: identity.verification.evidenceReferences, runtime: beta.runtimeEnvironment, distinctFromAlpha: identity.credentialFingerprint !== alphaIdentity.current?.credentialFingerprint }); })} className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">VERIFY AGENT BETA</button>
        <button data-testid="verify-gamma" type="button" disabled={Boolean(busy) || !betaIdentity.current} onClick={() => perform("gamma", async () => { const identity = await verifyEntity(gamma); gammaIdentity.current = identity; record("gammaIdentity", { entityId: gamma.entityId, owner: "Grace", status: identity.verification.status, credentialFingerprint: identity.credentialFingerprint, manifestDigest: identity.manifestDigest, evidenceReferences: identity.verification.evidenceReferences, runtime: gamma.runtimeEnvironment, distinctFromAlphaAndBeta: ![alphaIdentity.current?.credentialFingerprint, betaIdentity.current?.credentialFingerprint].includes(identity.credentialFingerprint) }); })} className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">VERIFY AGENT GAMMA</button>
        <button data-testid="create-delegation" type="button" disabled={Boolean(busy) || !alphaIdentity.current || !betaIdentity.current} onClick={() => perform("delegation", createAndAcceptDelegation)} className="rounded-lg bg-violet-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">CREATE ALPHA TO BETA DELEGATION</button>
        <button data-testid="beta-read" type="button" disabled={Boolean(busy) || !delegationRecord.current} onClick={() => perform("betaRead", () => betaAction("read_repository", "betaRead"))} className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">BETA READ REPOSITORY A</button>
        <button data-testid="compatible-case" type="button" disabled={Boolean(busy) || !delegationRecord.current || !gammaIdentity.current} onClick={() => perform("compatible", () => governedAgentCase("compatible", "compatible"))} className="rounded-lg bg-emerald-800 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">BETA + GAMMA COMPATIBLE READ</button>
        <button data-testid="conflict-case" type="button" disabled={Boolean(busy) || !delegationRecord.current || !gammaIdentity.current} onClick={() => perform("conflict", () => governedAgentCase("conflict", "conflict"))} className="rounded-lg bg-amber-800 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">EVALUATE PROTECTED CONFLICT</button>
        <button data-testid="beta-write" type="button" disabled={Boolean(busy) || !delegationRecord.current} onClick={() => perform("betaWrite", () => betaAction("write_repository", "betaWrite"))} className="rounded-lg bg-amber-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">BETA WRITE REPOSITORY A</button>
        <button data-testid="revoke-alpha" type="button" disabled={Boolean(busy) || !delegationRecord.current} onClick={() => perform("revocation", revokeParentAuthority)} className="rounded-lg bg-rose-800 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">REVOKE ALPHA AUTHORITY</button>
        <button data-testid="beta-read-revoked" type="button" disabled={Boolean(busy) || !proof.revocation} onClick={() => perform("betaReadAfterRevocation", () => betaAction("read_repository", "betaReadAfterRevocation"))} className="rounded-lg border border-rose-700 bg-white px-4 py-2 text-sm font-semibold text-rose-800 disabled:opacity-50">BETA READ AFTER REVOCATION</button>
      </div>

      {busy ? <p role="status" className="mt-4 text-sm font-semibold text-cyan-900">Running {busy} through canonical persisted services…</p> : null}
      {error ? <p role="alert" className="mt-4 rounded-lg border border-rose-300 bg-white p-3 text-sm text-rose-800">{error}</p> : null}
      {stages.length ? <div className="mt-5 grid gap-3 lg:grid-cols-2">{stages.map(([stage, item]) => <article key={stage} data-testid={`proof-${stage}`} className="rounded-xl border border-cyan-200 bg-white p-4"><p className="text-xs font-semibold uppercase tracking-wide text-cyan-800">{stage}</p><pre className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap break-all text-xs text-slate-700">{JSON.stringify(item, null, 2)}</pre></article>)}</div> : null}
      {transactionLinks.length ? <div className="mt-5 flex flex-wrap gap-2">{transactionLinks.map((item) => <span key={item.stage} className="inline-flex gap-2"><a className="rounded-lg bg-white px-3 py-2 text-sm font-semibold text-slate-900 underline" href={item.href}>Open {item.stage} transaction</a>{item.receipt ? <a className="rounded-lg border border-cyan-300 bg-white px-3 py-2 text-sm font-semibold text-slate-900 underline" href={item.receipt}>Retrieve {item.stage} receipt</a> : null}</span>)}</div> : null}
    </section>
  );
}
