import "server-only";

import type { SupabaseClient, User } from "@supabase/supabase-js";
import { registerCanonicalNativeAgent } from "@/lib/operational-entities/delegated-authority-server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { createTrustPolicy } from "@/src/lib/trust-architecture/service";
import { enterpriseTrustFabricRepository } from "@/src/lib/trust-fabric/repository";
import { validateTrustContract } from "@/src/lib/trust-fabric/validation";

const policyId = "controlled-agent-alpha";
const policyVersion = "1.0.0";

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

  const existingEntity = await db
    .from("operational_entities")
    .select("entity_id")
    .eq("enterprise_id", enterpriseId)
    .ilike("display_reference", "Agent Alpha")
    .limit(1)
    .maybeSingle();
  if (existingEntity.error) fail("entity_lookup", existingEntity.error);
  const entityId = existingEntity.data?.entity_id
    ? String(existingEntity.data.entity_id)
    : `agent-alpha:${enterpriseId}`;

  if (!existingEntity.data) {
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
        accountableOwnerId: `user:${input.user.id}`,
        organizationReference: `workspace:${enterpriseId}`,
        environmentReference: "controlled-runtime",
        workflowReference: "controlled-repository-a",
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
          purpose: "controlled_repository_a",
          allowedActions: ["read_repository"],
          requiredEvidenceTypes: ["NATIVE_ENTITY_IDENTITY_PROOF"],
          providerDependency: "none",
        },
      },
    });
  }

  const repository = enterpriseTrustFabricRepository();
  const contracts = await repository.contracts(enterpriseId);
  let contract = contracts.find(
    (candidate) =>
      candidate.subject.id === entityId &&
      candidate.revocationState === "active" &&
      Date.parse(candidate.expiresAt) > Date.now(),
  );
  if (!contract) {
    const issuedAt = new Date().toISOString();
    contract = validateTrustContract(
      {
        contractId: crypto.randomUUID(),
        subject: { type: "ai_agent", id: entityId, displayName: "Agent Alpha" },
        workflow: {
          id: "controlled-repository-a",
          objective: "Read controlled Repository A after native verification.",
        },
        authorizedObjective: "read_repository",
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
        supersedesContractId: null,
      },
      enterpriseId,
    );
    await repository.persistContract(
      enterpriseId,
      input.user.id,
      contract,
      crypto.randomUUID(),
    );
  }

  const authorityUpdate = await db
    .from("operational_entities")
    .update({ current_authority_references: [contract.contractId] })
    .eq("enterprise_id", enterpriseId)
    .eq("entity_id", entityId);
  if (authorityUpdate.error) fail("entity_authority_binding", authorityUpdate.error);

  return { enterpriseId, entityId, authorityId: contract.contractId };
}

export type ControlledAgentAlphaResult = Awaited<
  ReturnType<typeof ensureControlledAgentAlpha>
>;
