"use client";

import { useState } from "react";
import { canonicalize } from "@/src/lib/trust-core/canonicalize";

type Props = {
  enterpriseId: string;
  operationalEntityId: string;
  displayName: string;
  entityType: string;
  accountableOwnerId: string;
  organizationId: string;
  authorityReference: string | null;
  activeCredentialId: string | null;
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

export function NativeEntityVerificationPanel(props: Props) {
  const [state, setState] = useState<"idle" | "running" | "complete" | "failed">("idle");
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState("");
  const endpoint = `/api/operational-entities/${encodeURIComponent(props.operationalEntityId)}/native-verification`;

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
    return { stage, outcome: "FAIL", reasonCodes: reasons, httpStatus: response.status };
  }

  async function verifyEntity() {
    setState("running");
    setError("");
    setResult(null);
    try {
      if (!crypto.subtle) throw new Error("Web Cryptography is unavailable in this browser.");
      const keyPair = await crypto.subtle.generateKey({ name: "Ed25519" }, false, ["sign", "verify"]);
      const publicJwk = await crypto.subtle.exportKey("jwk", keyPair.publicKey);
      publicJwk.alg = "EdDSA";
      publicJwk.use = "sig";
      publicJwk.key_ops = ["verify"];
      const signingKeyId = `key:${props.operationalEntityId}:${crypto.randomUUID()}`;
      (publicJwk as JsonWebKey & { kid?: string }).kid = signingKeyId;
      const authorizationReference = props.authorityReference ?? `owner:${props.accountableOwnerId}`;
      await action({
        action: props.activeCredentialId ? "rotate_credential" : "register_credential",
        signingKeyId,
        publicJwk,
        authorizationReference,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        ...(props.activeCredentialId ? { rotateFromCredentialId: props.activeCredentialId } : {}),
      });

      const issuedAt = new Date().toISOString();
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      const claims = {
        manifestVersion: "1.0",
        operationalEntityId: props.operationalEntityId,
        entityType: nativeType(props.entityType),
        displayName: props.displayName,
        enterpriseId: props.enterpriseId,
        owner: { accountableOwnerId: props.accountableOwnerId, organizationId: props.organizationId },
        software: { applicationId: `application:${props.operationalEntityId}`, version: "demo-1", buildDigest: null, sourceDigest: null, artifactDigest: null, packageReference: null },
        ai: { modelProvider: null, modelIdentifier: props.entityType === "ai_agent" ? "demo-agent-model" : null, modelVersion: null, agentFramework: props.entityType === "ai_agent" ? "native-demo" : null, declaredTools: ["read_repository"] },
        runtime: { runtimeType: "browser-agent-simulator", environment: "preview", region: null, workloadIdentifier: `workload:${props.operationalEntityId}`, deploymentIdentifier: `deployment:${props.operationalEntityId}:demo`, runtimeVersion: "browser-webcrypto-ed25519" },
        authority: { authorityReference: props.authorityReference },
        credentials: { publicCredentialReferences: [signingKeyId] },
        declaredCapabilities: ["read_repository"],
        issuedAt,
        expiresAt,
        nonce: randomNonce(),
        signingKeyId,
      };
      const canonicalManifest = canonicalize(claims);
      const manifestDigest = await sha256Hex(canonicalManifest);
      const manifestSignature = base64Url(await crypto.subtle.sign("Ed25519", keyPair.privateKey, new TextEncoder().encode(canonicalManifest)));
      const manifest = { ...claims, manifestDigest, signature: manifestSignature };
      await action({ action: "register_manifest", manifest });

      const audience = `${window.location.origin}/native-verification`;
      const challengeResponse = await action({ action: "issue_challenge", audience });
      const challenge = (challengeResponse.result ?? {}) as Record<string, unknown>;
      async function signedProof(challengeValue: Record<string, unknown>, privateSigningKey: CryptoKey, overrides: Record<string, unknown> = {}) {
        const challengePayload = canonicalize({
          challengeId: challengeValue.challengeId,
          enterpriseId: challengeValue.enterpriseId,
          operationalEntityId: challengeValue.operationalEntityId,
          nonce: challengeValue.nonce,
          audience: challengeValue.audience,
          issuer: challengeValue.issuer,
          subject: challengeValue.subject,
          manifestDigest: challengeValue.manifestDigest,
          signingKeyId: challengeValue.signingKeyId,
          issuedAt: challengeValue.issuedAt,
          expiresAt: challengeValue.expiresAt,
        });
        return {
          challengeId: challengeValue.challengeId,
          enterpriseId: props.enterpriseId,
          operationalEntityId: props.operationalEntityId,
          nonce: challengeValue.nonce,
          audience: challengeValue.audience,
          manifestDigest,
          signingKeyId,
          signature: base64Url(await crypto.subtle.sign("Ed25519", privateSigningKey, new TextEncoder().encode(challengePayload))),
          submittedAt: new Date().toISOString(),
          ...overrides,
        };
      }
      const proof = await signedProof(challenge, keyPair.privateKey);
      const runtimeObservation = {
        ...claims.runtime,
        manifestDigest,
        credentialFingerprint: await sha256Hex(canonicalize({ crv: publicJwk.crv, kty: publicJwk.kty, x: publicJwk.x })),
        observedAt: proof.submittedAt,
        source: "enterprise_asserted_browser_demo",
      };
      const verified = await action({
        action: "submit_proof", proof,
        runtimeObservation,
      });

      const demonstrations: Array<Record<string, unknown>> = [{
        stage: props.activeCredentialId ? "ROTATE_REVERIFY_RECOVER" : "AGENT_ALPHA_NATIVE_PROOF",
        outcome: String((verified.result as Record<string, unknown> | undefined)?.status ?? "UNKNOWN"),
        reasonCodes: (verified.result as Record<string, unknown> | undefined)?.reasonCodes ?? [],
      }];
      if (!props.activeCredentialId) {
        demonstrations.push(await expectedFailure("REPLAY_CHALLENGE", { action: "submit_proof", proof, runtimeObservation }, "CHALLENGE_REPLAY"));

        const copiedChallenge = ((await action({ action: "issue_challenge" })).result ?? {}) as Record<string, unknown>;
        const attackerKey = await crypto.subtle.generateKey({ name: "Ed25519" }, false, ["sign", "verify"]);
        demonstrations.push(await expectedFailure("COPIED_ENTITY_ID_WITHOUT_PRIVATE_KEY", {
          action: "submit_proof", proof: await signedProof(copiedChallenge, attackerKey.privateKey), runtimeObservation,
        }, "INVALID_SIGNATURE"));

        const tamperChallenge = ((await action({ action: "issue_challenge" })).result ?? {}) as Record<string, unknown>;
        demonstrations.push(await expectedFailure("ALTERED_SIGNED_MANIFEST", {
          action: "submit_proof",
          proof: await signedProof(tamperChallenge, keyPair.privateKey, { manifestDigest: "0".repeat(64) }),
          runtimeObservation,
        }, "MANIFEST_TAMPERED"));

        const driftChallenge = ((await action({ action: "issue_challenge" })).result ?? {}) as Record<string, unknown>;
        const driftProof = await signedProof(driftChallenge, keyPair.privateKey);
        const drift = await action({
          action: "submit_proof", proof: driftProof,
          runtimeObservation: { ...runtimeObservation, environment: "runtime-drifted", observedAt: driftProof.submittedAt },
        });
        demonstrations.push({
          stage: "RUNTIME_CHANGED",
          outcome: String((drift.result as Record<string, unknown> | undefined)?.status ?? "UNKNOWN"),
          reasonCodes: (drift.result as Record<string, unknown> | undefined)?.reasonCodes ?? [],
          changedAttributes: (drift.result as Record<string, unknown> | undefined)?.changedAttributes ?? [],
        });
      }
      setResult({ verification: verified, demonstrations });
      setState("complete");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Native verification failed safely.");
      setState("failed");
    }
  }

  return (
    <div className="mt-5 rounded-xl border border-cyan-200 bg-cyan-50 p-4">
      <p className="text-sm text-slate-700">Non-Production agent simulator. The private Ed25519 key is generated in this browser, used for one proof flow, never sent to Cyber Sentinels, and discarded when this page is closed. Runtime fields are enterprise-asserted demo observations; no build or source integrity is fabricated.</p>
      <button type="button" onClick={verifyEntity} disabled={state === "running"} className="mt-4 rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
        {state === "running" ? "VERIFYING CRYPTOGRAPHIC PROOF..." : props.activeCredentialId ? "ROTATE KEY AND REVERIFY ENTITY" : "VERIFY ENTITY"}
      </button>
      {state === "complete" ? <pre className="mt-4 max-h-80 overflow-auto rounded-lg bg-slate-950 p-4 text-xs text-cyan-100">{JSON.stringify(result, null, 2)}</pre> : null}
      {state === "failed" ? <p className="mt-4 text-sm font-medium text-red-700">{error}</p> : null}
    </div>
  );
}
