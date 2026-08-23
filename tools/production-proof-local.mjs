#!/usr/bin/env node

import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { chromium } from "@playwright/test";

const CDP_URL = "http://127.0.0.1:9222";
const ALLOWED_HOSTNAMES = new Set(["www.cybersentinels.com", "cybersentinels.com"]);
const AUTHORIZED_ACTION = "read_repository";
const REQUESTED_ACTION = "write_repository";
const ARTIFACT_PATH = resolve("artifacts", "production-proof.json");
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SHA256 = /^[a-f0-9]{64}$/;

const result = {
  INVESTOR_DEMO_READY: "NO",
  PRODUCTION_SHA: null,
  CONSENT_STATUS: null,
  CONSENT_RECEIPT_ID: null,
  CONSENT_CORRELATION_ID: null,
  AUTHENTICATED_WORKSPACE: "FAIL",
  WORKSPACE_ID: null,
  ACTOR_ID: null,
  OPERATIONAL_ENTITY_ID: null,
  AUTHORITY_ID: null,
  AUTHORIZED_ACTION,
  REQUESTED_ACTION,
  WORKFLOW_ID: null,
  EVIDENCE_IDS: [],
  TRANSACTION_ID: null,
  DECISION_ID: null,
  DECISION: null,
  TRUST_STATE: null,
  REASON_CODES: [],
  INTERVENTION: "NOT_EXECUTED",
  INTERVENTION_ID: null,
  INTERVENTION_TYPE: null,
  INTERVENTION_STATUS: null,
  EVIDENCE_GRAPH: "FAIL",
  EVIDENCE_GRAPH_REFERENCE: null,
  REPLAY: "FAIL",
  REPLAY_ID: null,
  TRUST_MEMORY: "FAIL",
  TRUST_MEMORY_REFERENCE: null,
  RECEIPT: "FAIL",
  RECEIPT_ID: null,
  REFRESH_RETRIEVAL: "FAIL",
  RELOGIN_RETRIEVAL: "FAIL",
  API_HEALTH: "FAIL",
  API_READY: "FAIL",
  AUTHORITY_ENFORCEMENT: "FAIL",
  PROVIDER_NEUTRALITY: "FAIL",
  TENANT_ISOLATION_LIVE: "NOT_EXECUTED",
  CANONICAL_EVALUATION_DIAGNOSTICS: null,
  PRODUCTION_ROUTES: {},
  FINAL_CLASSIFICATION: "BLOCKED - proof not started",
};

class ProofError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "ProofError";
    this.code = code;
  }
}

function stop(code, message) {
  throw new ProofError(code, message);
}

function requireProof(condition, code, message) {
  if (!condition) stop(code, message);
}

function asObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function safeReference(value, field, pattern = /^[A-Za-z0-9_.:@/+-]{1,240}$/) {
  const candidate = typeof value === "string" ? value.trim() : "";
  requireProof(pattern.test(candidate), "SAFE_REFERENCE_INVALID", `${field} was absent or invalid.`);
  return candidate;
}

function safeReasonCodes(value) {
  return [...new Set(asArray(value).map(String).filter((item) => /^[A-Z0-9_:-]{1,160}$/.test(item)))].sort();
}

function safeDiagnosticText(value, fallback = null) {
  const candidate = typeof value === "string" ? value.replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, 240) : "";
  if (!candidate || forbiddenSensitiveValue(candidate)) return fallback;
  return candidate;
}

function evaluationDiagnostics(response) {
  const body = asObject(response.data);
  return {
    httpStatus: Number(response.status),
    apiCode: safeDiagnosticText(body.code),
    apiMessage: safeDiagnosticText(body.error),
    postgresCode: safeDiagnosticText(body.postgresCode ?? body.storageCode),
    rpcFunction: safeDiagnosticText(body.rpcFunction),
    correlationId: safeDiagnosticText(body.correlationId),
    responseShape: Object.keys(body).filter((key) => /^[A-Za-z][A-Za-z0-9_]{0,63}$/.test(key)).sort(),
    requestSchemaValidation: "PASS",
    responseSchemaValidation: response.status === 201 && body.ok === true && Object.keys(asObject(body.receipt)).length > 0 ? "PASS" : "FAIL",
  };
}

function allowedProductionUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && ALLOWED_HOSTNAMES.has(url.hostname.toLowerCase());
  } catch {
    return false;
  }
}

function originFor(page) {
  requireProof(allowedProductionUrl(page.url()), "WRONG_HOSTNAME", "The selected page is not a permitted Cyber Sentinels Production hostname.");
  return new URL(page.url()).origin;
}

async function browserFetch(page, path, options = {}) {
  const response = await page.evaluate(async ({ path: requestPath, options: requestOptions }) => {
    const headers = new Headers(requestOptions.headers ?? {});
    const hasBody = requestOptions.body !== undefined;
    if (hasBody && !headers.has("content-type")) headers.set("content-type", "application/json");
    const raw = await fetch(requestPath, {
      method: requestOptions.method ?? "GET",
      headers,
      body: hasBody ? JSON.stringify(requestOptions.body) : undefined,
      cache: "no-store",
      credentials: "same-origin",
      redirect: "follow",
    });
    const contentType = raw.headers.get("content-type") ?? "";
    const data = contentType.includes("application/json") ? await raw.json().catch(() => null) : null;
    return {
      status: raw.status,
      ok: raw.ok,
      finalUrl: raw.url,
      contentType,
      data,
    };
  }, { path, options });

  requireProof(allowedProductionUrl(response.finalUrl), "UNEXPECTED_RESPONSE_HOST", `A request for ${path} left the permitted Production host.`);
  return response;
}

async function authenticatedPage(browser) {
  const contexts = browser.contexts();
  requireProof(contexts.length > 0, "NO_BROWSER_CONTEXT", "Chrome exposed no browser context.");
  const pages = contexts.flatMap((context) => context.pages()).filter((page) => !page.isClosed());
  requireProof(pages.length > 0, "NO_BROWSER_PAGE", "Chrome exposed no open page.");
  const candidates = pages.filter((page) => allowedProductionUrl(page.url()));
  requireProof(candidates.length > 0, "WRONG_HOSTNAME", "No open page uses an allowed Cyber Sentinels Production hostname.");

  for (const page of candidates) {
    const probe = await browserFetch(page, "/api/operational-entities").catch(() => null);
    if (probe?.status === 200 && asObject(probe.data).ok === true) return { page, probe };
  }
  stop("AUTHENTICATED_PAGE_REQUIRED", "No authenticated Cyber Sentinels Production page was found.");
}

function headersFor(workspaceId) {
  return { "x-enterprise-id": workspaceId };
}

async function requireHtmlRoute(page, route) {
  const response = await browserFetch(page, route);
  requireProof(response.status === 200 && new URL(response.finalUrl).pathname === route, "PRODUCTION_ROUTE_UNAVAILABLE", `${route} did not remain on its authenticated Production route.`);
}

async function getJson(page, path, headers = {}) {
  const response = await browserFetch(page, path, { headers });
  requireProof(response.status === 200 && response.data, "PRODUCTION_GET_FAILED", `${path} did not return authenticated Production JSON.`);
  return response.data;
}

async function postJson(page, path, body, headers = {}) {
  return browserFetch(page, path, { method: "POST", headers, body });
}

function graphHasEdge(graph, fromExternalId, toExternalId, edgeType) {
  const nodes = asArray(graph.nodes);
  const from = nodes.find((node) => node.externalId === fromExternalId);
  const to = nodes.find((node) => node.externalId === toExternalId);
  if (!from || !to) return false;
  return asArray(graph.edges).some((edge) => edge.fromNodeId === from.nodeId && edge.toNodeId === to.nodeId && edge.edgeType === edgeType);
}

async function retrieveProofBundle(page, proof) {
  const tenantHeaders = headersFor(proof.workspaceId);
  const workflowBody = asObject(await getJson(page, `/api/trust/protected-workflows/${encodeURIComponent(proof.workflowId)}`, tenantHeaders));
  const workflow = asObject(workflowBody.workflow);
  const transactions = asArray(workflowBody.canonicalTransactions);
  const transaction = transactions.find((item) => item.transaction_id === proof.transactionId);
  requireProof(workflow.id === proof.workflowId && transaction, "WORKFLOW_TRANSACTION_RETRIEVAL_FAILED", "The protected workflow did not return the same canonical transaction.");
  requireProof(transaction.decision === proof.decision && safeReasonCodes(transaction.reason_codes).join("|") === proof.reasonCodes.join("|"), "DECISION_RETRIEVAL_MISMATCH", "The persisted decision or reason codes changed.");

  const evidenceIds = asArray(workflowBody.evidence).map((item) => String(item.evidence_id));
  requireProof(proof.evidenceIds.every((id) => evidenceIds.includes(id)), "EVIDENCE_RETRIEVAL_FAILED", "The same protected-workflow evidence was not retrievable.");

  if (proof.interventionId) {
    const intervention = asArray(workflowBody.interventions).find((item) => item.id === proof.interventionId);
    requireProof(intervention && intervention.canonical_transaction_id === proof.transactionId, "INTERVENTION_RETRIEVAL_FAILED", "The same intervention was not linked to the canonical transaction.");
    requireProof(intervention.evidence_graph_reference === proof.evidenceGraphReference, "INTERVENTION_GRAPH_MISMATCH", "The intervention did not retain the canonical Evidence Graph reference.");
  }

  const transactionGraphBody = asObject(await getJson(page, `/api/trust-architecture/subjects/${encodeURIComponent(proof.transactionId)}/graph`, tenantHeaders));
  const transactionGraph = asObject(transactionGraphBody.graph);
  requireProof(graphHasEdge(transactionGraph, proof.entityId, proof.transactionId, "PARTICIPATED_IN"), "EVIDENCE_GRAPH_SUBJECT_LINK_MISSING", "The Evidence Graph did not link the Operational Entity to the transaction.");
  requireProof(graphHasEdge(transactionGraph, proof.transactionId, proof.authorityId, "AUTHORIZED_BY"), "EVIDENCE_GRAPH_AUTHORITY_LINK_MISSING", "The Evidence Graph did not link the transaction to its authority.");
  requireProof(graphHasEdge(transactionGraph, proof.decisionId, proof.transactionId, "RESULTED_IN"), "EVIDENCE_GRAPH_DECISION_LINK_MISSING", "The Evidence Graph did not link the decision to the transaction.");

  const decisionGraphBody = asObject(await getJson(page, `/api/trust-architecture/subjects/${encodeURIComponent(proof.decisionId)}/graph`, tenantHeaders));
  const decisionGraph = asObject(decisionGraphBody.graph);
  const decisionNode = asArray(decisionGraph.nodes).find((node) => node.externalId === proof.decisionId);
  requireProof(decisionNode, "EVIDENCE_GRAPH_DECISION_MISSING", "The canonical decision node was absent from the Evidence Graph.");
  requireProof(asArray(decisionGraph.edges).some((edge) => edge.toNodeId === decisionNode.nodeId && edge.edgeType === "SUPPORTED"), "EVIDENCE_GRAPH_EVIDENCE_LINK_MISSING", "No persisted evidence supported the decision node.");
  requireProof(asArray(decisionGraph.edges).some((edge) => edge.toNodeId === decisionNode.nodeId && edge.edgeType === "APPLIES_TO"), "EVIDENCE_GRAPH_POLICY_LINK_MISSING", "The policy version was not linked to the decision node.");

  const replayBody = asObject(await getJson(page, `/api/replay/${encodeURIComponent(proof.replayId)}`));
  const replay = asObject(replayBody.replay);
  requireProof(replay.id === proof.replayId && replay.subject_id === proof.transactionId && replay.generated_by === "canonical_trust_transaction", "REPLAY_RETRIEVAL_FAILED", "Canonical Replay did not resolve to the same transaction.");
  const replaySummary = String(replay.replay_summary ?? "");
  requireProof(replaySummary.includes(proof.decision) && proof.reasonCodes.every((code) => replaySummary.includes(code)), "REPLAY_DECISION_MISMATCH", "Replay did not reconstruct the persisted decision and reason codes.");

  const timelineBody = asObject(await getJson(page, `/api/trust-architecture/subjects/${encodeURIComponent(proof.entityId)}/timeline`, tenantHeaders));
  const memory = asArray(asObject(timelineBody.timeline).memory).find((item) => item.memory_id === proof.trustMemoryReference);
  requireProof(memory && memory.source_id === proof.transactionId, "TRUST_MEMORY_RETRIEVAL_FAILED", "Trust Memory did not return the material canonical transaction event.");
  const memorySummary = asObject(memory.summary);
  requireProof(memorySummary.decision === proof.decision && memorySummary.trustState === proof.trustState, "TRUST_MEMORY_MISMATCH", "Trust Memory did not retain the same decision state.");

  const receipt = asObject(await getJson(page, `/api/trust/transactions/${encodeURIComponent(proof.transactionId)}/receipt`));
  requireProof(receipt.transactionId === proof.transactionId && receipt.decision === proof.decision && receipt.trustState === proof.trustState, "RECEIPT_RETRIEVAL_FAILED", "The canonical Receipt did not match the transaction decision.");
  requireProof(receipt.authorityReference === proof.authorityId && receipt.evidenceGraphReference === proof.evidenceGraphReference && receipt.replayReference === proof.replayId && receipt.trustMemoryReference === proof.trustMemoryReference, "RECEIPT_REFERENCE_MISMATCH", "The Receipt did not retain the same authority, graph, Replay, and Trust Memory references.");
  requireProof(asArray(receipt.evidenceReferences).length > 0 && asObject(receipt.protectedWorkflow).workflow?.id === proof.workflowId, "RECEIPT_EVIDENCE_MISSING", "The Receipt did not expose the protected workflow and canonical evidence references.");

  return { workflowBody, transactionGraph, decisionGraph, replayBody, timelineBody, receipt };
}

function forbiddenSensitiveValue(value) {
  if (typeof value !== "string") return false;
  return /\bBearer\s+[A-Za-z0-9._~-]+|eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}|(?:access|refresh|turnstile)[_-]?token\s*[:=]|service[_-]?role\s*[:=]|password\s*[:=]|cookie\s*[:=]/i.test(value);
}

function assertSanitized(value) {
  if (forbiddenSensitiveValue(value)) stop("SANITIZATION_FAILED", "A sensitive-looking value was blocked from the artifact.");
  if (Array.isArray(value)) value.forEach(assertSanitized);
  else if (value && typeof value === "object") Object.values(value).forEach(assertSanitized);
}

async function writeArtifact() {
  assertSanitized(result);
  await mkdir(resolve("artifacts"), { recursive: true });
  await writeFile(ARTIFACT_PATH, `${JSON.stringify(result, null, 2)}\n`, { encoding: "utf8" });
}

async function main() {
  let browser;
  try {
    browser = await chromium.connectOverCDP("http://127.0.0.1:9222");
  } catch {
    stop("CHROME_CDP_UNAVAILABLE", `Chrome CDP is unavailable at ${CDP_URL}.`);
  }

  const initial = await authenticatedPage(browser);
  let page = initial.page;
  const origin = originFor(page);

  const healthResponse = await browserFetch(page, "/api/health");
  const health = asObject(healthResponse.data);
  requireProof(healthResponse.status === 200 && health.ok === true && health.status === "ok", "PRODUCTION_HEALTH_FAILED", "Production /api/health was not healthy.");
  const readyResponse = await browserFetch(page, "/api/ready");
  const ready = asObject(readyResponse.data);
  requireProof(readyResponse.status === 200 && ready.status === "READY", "PRODUCTION_READY_FAILED", "Production /api/ready was not READY.");
  const healthSha = String(health.release_version ?? "");
  const readySha = String(asObject(ready.runtime).commitSha ?? "");
  requireProof(/^[a-f0-9]{40}$/i.test(healthSha) && healthSha === readySha, "PRODUCTION_SHA_MISMATCH", "Health and readiness did not expose the same Production SHA.");
  result.PRODUCTION_SHA = healthSha;
  result.API_HEALTH = "PASS (200)";
  result.API_READY = "PASS (200 READY)";

  const entitiesBody = asObject(initial.probe.data);
  const entities = asArray(entitiesBody.entities);
  requireProof(entities.length > 0, "OPERATIONAL_ENTITY_REQUIRED", "The authenticated workspace returned no Operational Entities.");
  const workspaceId = safeReference(entities[0]?.enterpriseId, "WORKSPACE_ID", UUID);
  requireProof(entities.every((entity) => entity.enterpriseId === workspaceId), "WORKSPACE_SCOPE_MISMATCH", "Operational Entities crossed a workspace boundary.");
  const tenantHeaders = headersFor(workspaceId);

  await requireHtmlRoute(page, "/workspace");
  await requireHtmlRoute(page, "/dashboard/track-block");
  result.AUTHENTICATED_WORKSPACE = "PASS";
  result.WORKSPACE_ID = workspaceId;

  const contractsBody = asObject(await getJson(page, "/api/trust-fabric/contracts", tenantHeaders));
  const contracts = asArray(contractsBody.contracts);
  const pair = entities.map((entity) => ({
    entity,
    contract: contracts.find((contract) =>
      asObject(contract.subject).id === entity.entityId
      && contract.revocationState === "active"
      && Date.parse(String(contract.expiresAt)) > Date.now()
      && asArray(contract.permittedScope).includes(AUTHORIZED_ACTION)
      && !asArray(contract.permittedScope).includes(REQUESTED_ACTION)
      && asArray(entity.currentAuthorityReferences).includes(contract.contractId)),
  })).find((candidate) => candidate.contract);
  requireProof(pair, "CONTROLLED_AUTHORITY_NOT_FOUND", "No active Production authority permits read_repository while excluding write_repository.");
  const entity = pair.entity;
  const contract = pair.contract;
  const entityId = safeReference(entity.entityId, "OPERATIONAL_ENTITY_ID");
  const authorityId = safeReference(contract.contractId, "AUTHORITY_ID", UUID);
  result.OPERATIONAL_ENTITY_ID = entityId;
  result.AUTHORITY_ID = authorityId;

  const policiesBody = asObject(await getJson(page, "/api/admin/trust-architecture/policies", tenantHeaders));
  const policy = asArray(policiesBody.policies).find((item) => item.policy_id === contract.policyId && item.version === contract.policyVersion && item.active === true);
  requireProof(policy && SHA256.test(String(policy.policy_hash)), "CANONICAL_POLICY_NOT_FOUND", "The Trust Contract's exact active policy version was not retrievable.");

  const consentState = asObject(await getJson(page, "/api/consent"));
  const consentVersion = safeReference(asObject(consentState.policy).version, "CONSENT_POLICY_VERSION");
  const consentResponse = await postJson(page, "/api/consent/cookies", {
    consentVersion,
    anonymousId: crypto.randomUUID(),
    choices: { necessary: true, preferences: true, analytics: false, marketing: false, aiImprovements: false },
    source: "cookie_preferences",
    idempotencyKey: crypto.randomUUID(),
    action: "SAVE_PREFERENCES",
  }, tenantHeaders);
  result.CONSENT_STATUS = consentResponse.status;
  if (consentResponse.status === 503) stop("CONSENT_503_REPAIR_FAILED", "POST /api/consent/cookies returned 503.");
  const consent = asObject(consentResponse.data);
  requireProof([200, 201].includes(consentResponse.status) && consent.success === true, "CONSENT_PERSISTENCE_FAILED", "POST /api/consent/cookies did not return 200/201 persisted success.");
  const consentReceiptId = safeReference(consent.receiptId, "CONSENT_RECEIPT_ID", UUID);
  const consentCorrelationId = safeReference(consent.correlationId, "CONSENT_CORRELATION_ID", UUID);
  const consentReceipt = asObject(await getJson(page, `/api/consent/receipt/${encodeURIComponent(consentReceiptId)}`, tenantHeaders));
  requireProof(asObject(consentReceipt.receipt).receipt_id === consentReceiptId && SHA256.test(String(asObject(consentReceipt.receipt).receipt_hash)), "CONSENT_RECEIPT_RETRIEVAL_FAILED", "The persisted Consent Receipt could not be verified.");
  result.CONSENT_RECEIPT_ID = consentReceiptId;
  result.CONSENT_CORRELATION_ID = consentCorrelationId;

  const createResponse = await postJson(page, "/api/trust/protected-workflows", {
    workflowType: "agent_action",
    subjectEntityId: entityId,
    consentReference: consentReceiptId,
    metadata: {
      aiAssistancePolicy: "allowed",
      controlledProductionProof: true,
      authorizedAction: AUTHORIZED_ACTION,
      requestedAction: REQUESTED_ACTION,
    },
  }, tenantHeaders);
  const createBody = asObject(createResponse.data);
  requireProof(createResponse.status === 201 && createBody.ok === true, "WORKFLOW_CREATE_FAILED", "The Production protected workflow was not created.");
  const workflow = asObject(createBody.workflow);
  const workflowId = safeReference(workflow.id, "WORKFLOW_ID", UUID);
  const actorId = safeReference(workflow.created_by, "ACTOR_ID", UUID);
  requireProof(workflow.workspace_id === workspaceId && workflow.subject_entity_id === entityId && workflow.policy_reference === `${contract.policyId}:${contract.policyVersion}` && workflow.consent_reference === consentReceiptId, "WORKFLOW_BINDING_MISMATCH", "The protected workflow did not bind to the expected tenant, entity, authority policy, and consent.");
  result.WORKFLOW_ID = workflowId;
  result.ACTOR_ID = actorId;

  const observedAt = new Date().toISOString();
  const evidenceResponse = await postJson(page, `/api/trust/protected-workflows/${encodeURIComponent(workflowId)}/evidence`, {
    category: "policy",
    evidenceType: "POLICY_EVIDENCE",
    source: "cyber_sentinels_native",
    sourceParty: "cyber_sentinels",
    observedAt,
    classification: "policy_in_force",
    severity: "informational",
    metadata: {
      workspace: workspaceId,
      workflow: workflowId,
      policyId: contract.policyId,
      policyVersion: contract.policyVersion,
      policyEffectiveAt: policy.valid_from,
      policySource: "cyber_sentinels_policy_registry",
      policyDigest: policy.policy_hash,
      policyScope: contract.permittedScope,
      permittedAiAssistance: [],
      prohibitedAiAssistance: [],
      requiredDisclosure: false,
      requiredConsent: true,
      requiredIdentityControls: contract.requiredEvidenceTypes,
      candidateAcknowledgement: "NOT_RECORDED",
      acknowledgementTimestamp: null,
      acknowledgementMethod: null,
      sessionId: null,
      interviewId: null,
      evidenceReferences: [`trust-contract:${authorityId}`],
      decisionTransactionReference: null,
    },
  }, tenantHeaders);
  const evidenceBody = asObject(evidenceResponse.data);
  requireProof(evidenceResponse.status === 201 && evidenceBody.ok === true, "POLICY_EVIDENCE_PERSISTENCE_FAILED", "Canonical policy evidence was not persisted through the product API.");
  const policyEvidenceId = safeReference(asObject(evidenceBody.evidence).evidence_id, "POLICY_EVIDENCE_ID", UUID);
  result.EVIDENCE_IDS = [policyEvidenceId];

  const environment = safeReference(asArray(asObject(contract.authorityScope).environments)[0] ?? asArray(entity.environmentReferences)[0] ?? "production", "ACTION_ENVIRONMENT");
  const resource = safeReference(asArray(asObject(contract.authorityScope).permittedTargets)[0] ?? "repository:a", "ACTION_RESOURCE");
  const evaluateResponse = await postJson(page, `/api/trust/protected-workflows/${encodeURIComponent(workflowId)}/evaluate`, {
    actionType: REQUESTED_ACTION,
    purpose: contract.authorizedObjective,
    resource,
    environment,
  }, tenantHeaders);
  const evaluateBody = asObject(evaluateResponse.data);
  result.CANONICAL_EVALUATION_DIAGNOSTICS = evaluationDiagnostics(evaluateResponse);
  if (evaluateResponse.status !== 201 || evaluateBody.ok !== true) {
    const diagnostic = result.CANONICAL_EVALUATION_DIAGNOSTICS;
    stop("CANONICAL_EVALUATION_FAILED", `HTTP ${diagnostic.httpStatus}; ${diagnostic.apiCode ?? "API_ERROR"}: ${diagnostic.apiMessage ?? "The real Track + Block evaluator did not persist a canonical result."}`);
  }
  const canonical = asObject(evaluateBody.receipt);
  const transactionId = safeReference(canonical.transactionId, "TRANSACTION_ID", UUID);
  const decisionId = safeReference(canonical.decisionReference, "DECISION_ID", UUID);
  const decision = safeReference(canonical.decision, "DECISION", /^(ALLOW|REVIEW|DENY)$/);
  const trustState = safeReference(canonical.trustState, "TRUST_STATE", /^(verified|degraded|suspended)$/);
  const reasonCodes = safeReasonCodes(canonical.reasonCodes);
  const evidenceGraphReference = safeReference(canonical.evidenceGraphReference, "EVIDENCE_GRAPH_REFERENCE", UUID);
  const replayId = safeReference(canonical.replayReference, "REPLAY_ID", UUID);
  const trustMemoryReference = safeReference(canonical.trustMemoryReference, "TRUST_MEMORY_REFERENCE", UUID);
  requireProof(canonical.enterpriseId === workspaceId && canonical.operationalEntityId === entityId && asObject(canonical.actor).id === actorId, "CANONICAL_SCOPE_MISMATCH", "The canonical transaction was not bound to the same tenant, entity, and authenticated actor.");
  requireProof(asObject(canonical.action).type === REQUESTED_ACTION && asObject(canonical.action).purpose === contract.authorizedObjective && canonical.authorityReference === authorityId, "CANONICAL_AUTHORITY_BINDING_MISMATCH", "The canonical transaction did not retain the requested action and authority lineage.");
  result.TRANSACTION_ID = transactionId;
  result.DECISION_ID = decisionId;
  result.DECISION = decision;
  result.TRUST_STATE = trustState;
  result.REASON_CODES = reasonCodes;
  result.EVIDENCE_GRAPH_REFERENCE = evidenceGraphReference;
  result.REPLAY_ID = replayId;
  result.TRUST_MEMORY_REFERENCE = trustMemoryReference;
  result.RECEIPT_ID = transactionId;

  const scopeRejected = decision !== "ALLOW" && reasonCodes.includes("AUTHORITY_SCOPE_INVALID");
  result.AUTHORITY_ENFORCEMENT = scopeRejected ? "PASS" : "FAIL";

  const neutralEvidence = asArray(canonical.providerNeutralEvidence);
  const policyIsProviderIndependent = asObject(policy.rules).providerDependency === "none";
  const neutralSchema = neutralEvidence.length > 0 && neutralEvidence.every((item) => item.providerId && item.evidenceType && item.evidenceDigest && item.observedAt && item.outcome);
  result.PROVIDER_NEUTRALITY = policyIsProviderIndependent && neutralSchema && canonical.authorityReference === authorityId ? "PASS" : "FAIL";

  let interventionId = null;
  if (decision === "ALLOW") {
    result.INTERVENTION = "NOT_REQUIRED";
  } else {
    const suggestedIntervention = safeReference(evaluateBody.suggestedIntervention, "SUGGESTED_INTERVENTION", /^(WARNING|CHALLENGE|STEP_UP_VERIFICATION|STEP_UP_VERIFY|PAUSE|REVIEW|BLOCK|TERMINATE)$/);
    const interventionResponse = await postJson(page, `/api/trust/protected-workflows/${encodeURIComponent(workflowId)}/interventions`, {
      interventionType: suggestedIntervention,
      idempotencyKey: `production-proof-${crypto.randomUUID()}`,
      outcome: {
        classification: "controlled_production_proof",
        authorityReference: authorityId,
        requestedAction: REQUESTED_ACTION,
      },
    }, tenantHeaders);
    const interventionBody = asObject(interventionResponse.data);
    requireProof([200, 201].includes(interventionResponse.status) && interventionBody.ok === true, "INTERVENTION_PERSISTENCE_FAILED", "The evaluator-recommended intervention was not persisted.");
    const intervention = asObject(interventionBody.intervention);
    interventionId = safeReference(intervention.id, "INTERVENTION_ID", UUID);
    requireProof(intervention.canonical_transaction_id === transactionId && intervention.intervention_type === suggestedIntervention && ["APPLIED", "RESOLVED"].includes(String(intervention.status)), "INTERVENTION_BINDING_MISMATCH", "The intervention was not bound to the same canonical transaction.");
    result.INTERVENTION = "PASS";
    result.INTERVENTION_ID = interventionId;
    result.INTERVENTION_TYPE = suggestedIntervention;
    result.INTERVENTION_STATUS = intervention.status;
  }

  const proof = {
    workspaceId,
    entityId,
    authorityId,
    workflowId,
    evidenceIds: [policyEvidenceId],
    transactionId,
    decisionId,
    decision,
    trustState,
    reasonCodes,
    interventionId,
    evidenceGraphReference,
    replayId,
    trustMemoryReference,
  };

  await retrieveProofBundle(page, proof);
  result.EVIDENCE_GRAPH = "PASS";
  result.REPLAY = "PASS";
  result.TRUST_MEMORY = "PASS";
  result.RECEIPT = "PASS";

  const isolationResponse = await browserFetch(page, `/api/trust/protected-workflows/${encodeURIComponent(workflowId)}`, { headers: headersFor(crypto.randomUUID()) });
  result.TENANT_ISOLATION_LIVE = isolationResponse.status === 403 ? "PASS" : "FAIL";

  result.PRODUCTION_ROUTES = {
    login: `${origin}/login`,
    workspace: `${origin}/workspace`,
    operationalEntities: `${origin}/operational-entities`,
    trackBlock: `${origin}/dashboard/track-block`,
    protectedWorkflow: `${origin}/api/trust/protected-workflows/${workflowId}`,
    transaction: `${origin}/trust/transactions/${transactionId}`,
    evidenceGraph: `${origin}/api/trust-architecture/subjects/${encodeURIComponent(transactionId)}/graph`,
    replay: `${origin}/api/replay/${replayId}`,
    trustMemory: `${origin}/api/trust-architecture/subjects/${encodeURIComponent(entityId)}/timeline`,
    receipt: `${origin}/api/trust/transactions/${transactionId}/receipt`,
    health: `${origin}/api/health`,
    ready: `${origin}/api/ready`,
  };

  await page.goto(result.PRODUCTION_ROUTES.trackBlock, { waitUntil: "domcontentloaded" });
  await page.reload({ waitUntil: "domcontentloaded" });
  await retrieveProofBundle(page, proof);
  result.REFRESH_RETRIEVAL = "PASS";

  console.log("HUMAN_ACTION_REQUIRED:");
  console.log("Sign out and sign back in through normal Production login/Turnstile,");
  console.log("then press ENTER in PowerShell.");
  const prompt = createInterface({ input, output });
  await prompt.question("");
  prompt.close();

  const afterRelogin = await authenticatedPage(browser);
  page = afterRelogin.page;
  const reloginEntities = asArray(asObject(afterRelogin.probe.data).entities);
  requireProof(reloginEntities.some((item) => item.enterpriseId === workspaceId && item.entityId === entityId), "RELOGIN_WORKSPACE_MISMATCH", "The re-authenticated session did not return the same workspace and Operational Entity.");
  await retrieveProofBundle(page, proof);
  result.RELOGIN_RETRIEVAL = "PASS";

  const mandatory = [
    [result.API_HEALTH === "PASS (200)", "Production health"],
    [result.API_READY === "PASS (200 READY)", "Production readiness"],
    [[200, 201].includes(result.CONSENT_STATUS), "Consent repair"],
    [result.AUTHENTICATED_WORKSPACE === "PASS", "Authenticated workspace"],
    [Boolean(result.TRANSACTION_ID && result.DECISION_ID && result.DECISION), "Canonical Track + Block transaction"],
    [result.AUTHORITY_ENFORCEMENT === "PASS", "Authority enforcement"],
    [["PASS", "NOT_REQUIRED"].includes(result.INTERVENTION), "Intervention"],
    [result.EVIDENCE_GRAPH === "PASS", "Evidence Graph"],
    [result.REPLAY === "PASS", "Replay"],
    [result.TRUST_MEMORY === "PASS", "Trust Memory"],
    [result.RECEIPT === "PASS", "Canonical Receipt"],
    [result.REFRESH_RETRIEVAL === "PASS", "Refresh retrieval"],
    [result.RELOGIN_RETRIEVAL === "PASS", "Relogin retrieval"],
    [result.PROVIDER_NEUTRALITY === "PASS", "Provider neutrality"],
    [result.TENANT_ISOLATION_LIVE === "PASS", "Tenant isolation"],
  ];
  const failed = mandatory.find(([passed]) => !passed);
  if (failed) {
    result.FINAL_CLASSIFICATION = `BLOCKED - ${failed[1]} did not pass.`;
    process.exitCode = 1;
  } else {
    result.INVESTOR_DEMO_READY = "YES";
    result.FINAL_CLASSIFICATION = "PRODUCTION_PROOF_PASS";
  }
}

try {
  await main();
} catch (error) {
  const code = error instanceof ProofError ? error.code : "UNEXPECTED_PROOF_FAILURE";
  const message = error instanceof ProofError ? error.message : "The local proof harness stopped on an unexpected failure.";
  result.INVESTOR_DEMO_READY = "NO";
  result.FINAL_CLASSIFICATION = `BLOCKED - ${code}: ${message}`;
  process.exitCode = 1;
} finally {
  await writeArtifact().catch(() => {
    process.exitCode = 1;
  });
  console.log(`SANITIZED_RESULT: ${ARTIFACT_PATH}`);
  if (result.CANONICAL_EVALUATION_DIAGNOSTICS) console.log(`CANONICAL_EVALUATION_DIAGNOSTICS: ${JSON.stringify(result.CANONICAL_EVALUATION_DIAGNOSTICS)}`);
  console.log(`INVESTOR_DEMO_READY: ${result.INVESTOR_DEMO_READY}`);
  console.log(`FINAL_CLASSIFICATION: ${result.FINAL_CLASSIFICATION}`);
}
