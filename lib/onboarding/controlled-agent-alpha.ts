import "server-only";

import type { SupabaseClient, User } from "@supabase/supabase-js";
import { registerCanonicalNativeAgent } from "@/lib/operational-entities/delegated-authority-server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { createTrustPolicy } from "@/src/lib/trust-architecture/service";
import { enterpriseTrustFabricRepository } from "@/src/lib/trust-fabric/repository";
import { validateTrustContract } from "@/src/lib/trust-fabric/validation";
import { hashCanonical } from "@/src/lib/trust-core/hash";

const policyId = "controlled-agent-alpha";
const policyVersion = "1.0.0";
const gammaPolicyId = "controlled-agent-gamma";

function fail(operation: string, error: unknown): never {
  console.error("Controlled Agent Alpha initialization failed safely.", {
    operation,
    code: (error as { code?: string })?.code ?? "UNKNOWN",
  });
  throw new Error("ENTITY_INITIALIZATION_FAILED");
}

async function ownedWorkspace(supabase: SupabaseClient, user: User) {
  const existing = await supabase
    .from("trust_workspaces")
    .select("id,name")
    .eq("created_by", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (existing.error) fail("workspace_lookup", existing.error);
  if (existing.data) return existing.data;

  const created = await supabase
    .from("trust_workspaces")
    .insert({
      name: "Cyber Sentinels Controlled Trust Workspace",
      slug: `controlled-trust-${crypto.randomUUID()}`,
      description:
        "Tenant-owned workspace for first-party native identity proof and controlled Repository A trust decisions.",
      created_by: user.id,
    })
    .select("id,name")
    .single();
  if (created.error || !created.data) fail("workspace_create", created.error);
  return created.data;
}

async function ensureOwnerMembership(
  supabase: SupabaseClient,
  user: User,
  enterpriseId: string,
) {
  const existing = await supabase
    .from("workspace_members")
    .select("id")
    .eq("workspace_id", enterpriseId)
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();
  if (existing.error) fail("membership_lookup", existing.error);
  if (existing.data) return;
  const created = await supabase.from("workspace_members").insert({
    workspace_id: enterpriseId,
    user_id: user.id,
    role: "owner",
  });
  if (created.error) fail("membership_create", created.error);
}

export async function ensureControlledAgentAlpha(input: {
  supabase: SupabaseClient;
  user: User;
}) {
  // The actor is established with the cookie-bound client above this boundary.
  // Bootstrap writes use the server-only client because a user cannot be a
  // workspace member until the workspace and first owner membership exist.
  const db = createServiceRoleClient();
  const workspace = await ownedWorkspace(db, input.user);
  const enterpriseId = String(workspace.id);
  await ensureOwnerMembership(db, input.user, enterpriseId);

  const existingAlpha = await db
    .from("operational_entities")
    .select("entity_id")
    .eq("enterprise_id", enterpriseId)
    .ilike("display_reference", "Agent Alpha")
    .limit(1)
    .maybeSingle();
  if (existingAlpha.error) fail("alpha_entity_lookup", existingAlpha.error);
  const entityId = existingAlpha.data?.entity_id
    ? String(existingAlpha.data.entity_id)
    : `agent-alpha:${enterpriseId}`;

  if (!existingAlpha.data) {
    await registerCanonicalNativeAgent(
      {
        supabase: input.supabase,
        user: input.user,
        enterpriseId,
        role: "owner",
      },
      {
        displayReference: "Agent Alpha",
        entityId,
        accountableOwnerId: "owner:alice",
        organizationReference: `workspace:${enterpriseId}`,
        environmentReference: "preview-alpha-runtime",
        workflowReference: "controlled-repositories",
      },
    );
  }

  const existingBeta = await db
    .from("operational_entities")
    .select("entity_id")
    .eq("enterprise_id", enterpriseId)
    .ilike("display_reference", "Agent Beta")
    .limit(1)
    .maybeSingle();
  if (existingBeta.error) fail("beta_entity_lookup", existingBeta.error);
  const betaEntityId = existingBeta.data?.entity_id
    ? String(existingBeta.data.entity_id)
    : `agent-beta:${enterpriseId}`;
  if (!existingBeta.data) {
    await registerCanonicalNativeAgent(
      { supabase: input.supabase, user: input.user, enterpriseId, role: "owner" },
      {
        displayReference: "Agent Beta",
        entityId: betaEntityId,
        accountableOwnerId: "owner:bob",
        organizationReference: `workspace:${enterpriseId}`,
        environmentReference: "preview-beta-runtime",
        workflowReference: "controlled-repository-a",
      },
    );
  }

  const existingGamma = await db
    .from("operational_entities")
    .select("entity_id")
    .eq("enterprise_id", enterpriseId)
    .ilike("display_reference", "Agent Gamma")
    .limit(1)
    .maybeSingle();
  if (existingGamma.error) fail("gamma_entity_lookup", existingGamma.error);
  const gammaEntityId = existingGamma.data?.entity_id
    ? String(existingGamma.data.entity_id)
    : `agent-gamma:${enterpriseId}`;
  if (!existingGamma.data) {
    await registerCanonicalNativeAgent(
      { supabase: input.supabase, user: input.user, enterpriseId, role: "owner" },
      {
        displayReference: "Agent Gamma",
        entityId: gammaEntityId,
        accountableOwnerId: "owner:grace",
        organizationReference: `workspace:${enterpriseId}`,
        environmentReference: "preview-gamma-runtime",
        workflowReference: "governed-repository-operations",
      },
    );
  }

  const policies = await db
    .from("trust_policy_versions")
    .select("policy_id,version,active")
    .eq("enterprise_id", enterpriseId)
    .eq("policy_id", policyId)
    .eq("version", policyVersion)
    .maybeSingle();
  if (policies.error) fail("policy_lookup", policies.error);
  if (!policies.data) {
    await createTrustPolicy({
      enterpriseId,
      actorId: input.user.id,
      correlationId: crypto.randomUUID(),
      value: {
        policyId,
        version: policyVersion,
        layer: "ENTERPRISE_OVERRIDE",
        active: true,
        validFrom: new Date(Date.now() - 1_000).toISOString(),
        rules: {
          purpose: "controlled_repository_access",
          allowedActions: ["read_repository"],
          requiredEvidenceTypes: ["NATIVE_ENTITY_IDENTITY_PROOF"],
          providerDependency: "none",
        },
      },
    });
  }

  const gammaPolicy = await db
    .from("trust_policy_versions")
    .select("policy_id,version,active")
    .eq("enterprise_id", enterpriseId)
    .eq("policy_id", gammaPolicyId)
    .eq("version", policyVersion)
    .maybeSingle();
  if (gammaPolicy.error) fail("gamma_policy_lookup", gammaPolicy.error);
  if (!gammaPolicy.data) {
    await createTrustPolicy({
      enterpriseId,
      actorId: input.user.id,
      correlationId: crypto.randomUUID(),
      value: {
        policyId: gammaPolicyId,
        version: policyVersion,
        layer: "ENTERPRISE_OVERRIDE",
        active: true,
        validFrom: new Date(Date.now() - 1_000).toISOString(),
        rules: {
          purpose: "governed_repository_operations",
          allowedActions: ["read_repository", "replace_configuration"],
          requiredEvidenceTypes: ["NATIVE_ENTITY_IDENTITY_PROOF"],
          providerDependency: "none",
        },
      },
    });
  }

  const repository = enterpriseTrustFabricRepository();
  const contracts = await repository.contracts(enterpriseId);
  const previousSubjectContract = contracts.find((candidate) => candidate.subject.id === entityId);
  let contract = contracts.find(
    (candidate) =>
      candidate.subject.id === entityId &&
      candidate.revocationState === "active" &&
      Date.parse(candidate.expiresAt) > Date.now() &&
      candidate.canDelegate === true &&
      candidate.maximumDelegationDepth === 1 &&
      candidate.authorityScope?.permittedTargets.includes("repository:a") &&
      candidate.authorityScope?.permittedTargets.includes("repository:b"),
  );
  if (!contract) {
    const issuedAt = new Date().toISOString();
    contract = validateTrustContract(
      {
        contractId: crypto.randomUUID(),
        subject: { type: "ai_agent", id: entityId, displayName: "Agent Alpha" },
        workflow: {
          id: "controlled-repositories",
          objective: "Read controlled Repositories A and B after native verification.",
        },
        authorizedObjective: "controlled_repository_access",
        requiredIdentityState: "verified",
        requiredAuthority: ["workspace_owner"],
        requiredEnvironmentState: "degraded",
        permittedScope: ["read_repository"],
        permittedProviders: ["cyber_sentinels_native"],
        requiredEvidenceTypes: ["NATIVE_ENTITY_IDENTITY_PROOF"],
        maximumEvidenceAgeSeconds: 3_600,
        monitoringRequirements: [],
        humanReviewThresholds: [],
        contradictionPolicy: "review",
        incidentThreshold: "material",
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1_000).toISOString(),
        revokedAt: null,
        revocationState: "active",
        issuer: `workspace:${enterpriseId}`,
        approver: `user:${input.user.id}`,
        policyId,
        policyVersion,
        evidenceReferences: [],
        issuedAt,
        supersedesContractId: previousSubjectContract?.contractId ?? null,
        authorityScope: {
          permittedActions: ["read_repository"],
          permittedTools: ["repository.reader"],
          permittedTargets: ["repository:a", "repository:b"],
          environments: ["preview-alpha-runtime", "preview-beta-runtime"],
          dataBoundary: "INTERNAL",
          financialLimit: 0,
          executionLimit: 100,
        },
        canDelegate: true,
        maximumDelegationDepth: 1,
        authorityVersion: "alpha-authority-v1",
      },
      enterpriseId,
    );
    await repository.persistContract(
      enterpriseId,
      input.user.id,
      contract,
      crypto.randomUUID(),
    );
    const replayBase = {
      event_id: crypto.randomUUID(),
      enterprise_id: enterpriseId,
      operational_entity_id: entityId,
      event_type: "ALPHA_AUTHORITY_ISSUED",
      actor_reference: `user:${input.user.id}`,
      attribution: "CYBER_SENTINELS_INTERPRETATION",
      evidence_references: [`trust_contract:${contract.contractId}`],
      reason_codes: ["PARENT_AUTHORITY_ACTIVE", "DELEGATION_PERMITTED"],
      payload: { authorityId: contract.contractId, scope: contract.authorityScope, policyVersion: contract.policyVersion },
      occurred_at: issuedAt,
    };
    const replay = await db.from("operational_entity_native_replay_events").insert({ ...replayBase, event_digest: hashCanonical(replayBase) });
    if (replay.error) fail("alpha_authority_replay", replay.error);
  }

  const authorityUpdate = await db
    .from("operational_entities")
    .update({ current_authority_references: [contract.contractId] })
    .eq("enterprise_id", enterpriseId)
    .eq("entity_id", entityId);
  if (authorityUpdate.error) fail("entity_authority_binding", authorityUpdate.error);

  const refreshedContracts = await repository.contracts(enterpriseId);
  const previousGammaContract = refreshedContracts.find(
    (candidate) => candidate.subject.id === gammaEntityId,
  );
  let gammaContract = refreshedContracts.find(
    (candidate) =>
      candidate.subject.id === gammaEntityId &&
      candidate.revocationState === "active" &&
      Date.parse(candidate.expiresAt) > Date.now() &&
      candidate.authorityScope?.permittedActions.includes("read_repository") &&
      candidate.authorityScope?.permittedActions.includes("replace_configuration") &&
      candidate.authorityScope?.permittedTargets.includes("repository:a"),
  );
  if (!gammaContract) {
    const issuedAt = new Date().toISOString();
    gammaContract = validateTrustContract(
      {
        contractId: crypto.randomUUID(),
        subject: { type: "ai_agent", id: gammaEntityId, displayName: "Agent Gamma" },
        workflow: {
          id: "governed-repository-operations",
          objective: "Read repositories and replace protected configuration under independent authority.",
        },
        authorizedObjective: "governed_repository_operations",
        requiredIdentityState: "verified",
        requiredAuthority: ["workspace_owner"],
        requiredEnvironmentState: "degraded",
        permittedScope: ["read_repository", "replace_configuration"],
        permittedProviders: ["cyber_sentinels_native"],
        requiredEvidenceTypes: ["NATIVE_ENTITY_IDENTITY_PROOF"],
        maximumEvidenceAgeSeconds: 3_600,
        monitoringRequirements: [],
        humanReviewThresholds: [],
        contradictionPolicy: "review",
        incidentThreshold: "material",
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1_000).toISOString(),
        revokedAt: null,
        revocationState: "active",
        issuer: `workspace:${enterpriseId}`,
        approver: `user:${input.user.id}`,
        policyId: gammaPolicyId,
        policyVersion,
        evidenceReferences: [],
        issuedAt,
        supersedesContractId: previousGammaContract?.contractId ?? null,
        authorityScope: {
          permittedActions: ["read_repository", "replace_configuration"],
          permittedTools: ["repository.reader", "configuration.writer"],
          permittedTargets: ["repository:a"],
          environments: ["preview-gamma-runtime"],
          dataBoundary: "INTERNAL",
          financialLimit: 0,
          executionLimit: 100,
        },
        canDelegate: false,
        maximumDelegationDepth: 0,
        authorityVersion: "gamma-authority-v1",
      },
      enterpriseId,
    );
    await repository.persistContract(
      enterpriseId,
      input.user.id,
      gammaContract,
      crypto.randomUUID(),
    );
  }

  const existingGammaReplay = await db
    .from("operational_entity_native_replay_events")
    .select("event_id")
    .eq("enterprise_id", enterpriseId)
    .eq("operational_entity_id", gammaEntityId)
    .eq("event_type", "GAMMA_AUTHORITY_ISSUED")
    .contains("evidence_references", [`trust_contract:${gammaContract.contractId}`])
    .limit(1)
    .maybeSingle();
  if (existingGammaReplay.error) fail("gamma_authority_replay_lookup", existingGammaReplay.error);
  if (!existingGammaReplay.data) {
    const replayBase = {
      event_id: crypto.randomUUID(),
      enterprise_id: enterpriseId,
      operational_entity_id: gammaEntityId,
      event_type: "GAMMA_AUTHORITY_ISSUED",
      actor_reference: `user:${input.user.id}`,
      attribution: "CYBER_SENTINELS_INTERPRETATION",
      evidence_references: [`trust_contract:${gammaContract.contractId}`],
      reason_codes: ["INDEPENDENT_PARENT_AUTHORITY_ACTIVE"],
      payload: {
        authorityId: gammaContract.contractId,
        scope: gammaContract.authorityScope,
        policyVersion: gammaContract.policyVersion,
      },
      occurred_at: gammaContract.issuedAt,
    };
    const gammaReplay = await db
      .from("operational_entity_native_replay_events")
      .insert({ ...replayBase, event_digest: hashCanonical(replayBase) });
    if (gammaReplay.error) fail("gamma_authority_replay", gammaReplay.error);
  }

  const gammaAuthorityUpdate = await db
    .from("operational_entities")
    .update({ current_authority_references: [gammaContract.contractId] })
    .eq("enterprise_id", enterpriseId)
    .eq("entity_id", gammaEntityId);
  if (gammaAuthorityUpdate.error) fail("gamma_authority_binding", gammaAuthorityUpdate.error);

  return {
    enterpriseId,
    entityId,
    betaEntityId,
    gammaEntityId,
    authorityId: contract.contractId,
    gammaAuthorityId: gammaContract.contractId,
  };
}

export type ControlledAgentAlphaResult = Awaited<
  ReturnType<typeof ensureControlledAgentAlpha>
>;
