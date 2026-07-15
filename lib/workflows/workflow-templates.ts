import type { TrustLifecycleTemplate } from "../core/trust-lifecycle.ts";

export const WORKFLOW_TEMPLATE_IDS = [
  "hiring",
  "ai_agent_operations",
  "privileged_access",
  "financial_approval",
  "vendor_access",
  "healthcare",
  "insurance",
  "critical_infrastructure",
] as const;

export type WorkflowTemplateId = (typeof WORKFLOW_TEMPLATE_IDS)[number];

export type WorkflowTemplateDefinition = {
  id: WorkflowTemplateId;
  label: string;
  lifecycleTemplate: TrustLifecycleTemplate;
  accountableOwner: string;
  defaultPurpose: string;
  minimumEvidence: number;
  reviewRequired: boolean;
  requiredServices: readonly string[];
  boundary: string;
};

const requiredServices = [
  "Identity",
  "Authority",
  "Trust Engine",
  "Runtime",
  "Policy",
  "Decision Intelligence",
  "Enforcement",
  "Replay",
  "Evidence Graph",
  "Trust Memory\u2122",
  "Validation",
  "Provider Orchestrator",
  "Governance",
] as const;

export const workflowTemplates: Record<WorkflowTemplateId, WorkflowTemplateDefinition> = {
  hiring: { id: "hiring", label: "Hiring", lifecycleTemplate: "hiring", accountableOwner: "People security owner", defaultPurpose: "governed_hiring_workflow", minimumEvidence: 2, reviewRequired: true, requiredServices, boundary: "Hiring is one workflow template, not the platform identity." },
  ai_agent_operations: { id: "ai_agent_operations", label: "AI Agent Operations", lifecycleTemplate: "ai_agent", accountableOwner: "AI governance owner", defaultPurpose: "governed_agent_operation", minimumEvidence: 3, reviewRequired: true, requiredServices, boundary: "Agent actions remain bounded by external authority and policy." },
  privileged_access: { id: "privileged_access", label: "Privileged Access", lifecycleTemplate: "machine_identity", accountableOwner: "Identity and access owner", defaultPurpose: "privileged_access", minimumEvidence: 3, reviewRequired: true, requiredServices, boundary: "Privilege is scoped, expiring and replayable." },
  financial_approval: { id: "financial_approval", label: "Financial Approval", lifecycleTemplate: "financial_workflow", accountableOwner: "Financial risk owner", defaultPurpose: "financial_approval", minimumEvidence: 3, reviewRequired: true, requiredServices, boundary: "Financial authority never expands through workflow configuration." },
  vendor_access: { id: "vendor_access", label: "Vendor Access", lifecycleTemplate: "vendor", accountableOwner: "Third-party risk owner", defaultPurpose: "vendor_access", minimumEvidence: 2, reviewRequired: true, requiredServices, boundary: "Vendor provider evidence remains separate from authorization." },
  healthcare: { id: "healthcare", label: "Healthcare", lifecycleTemplate: "healthcare", accountableOwner: "Healthcare governance owner", defaultPurpose: "regulated_healthcare_workflow", minimumEvidence: 3, reviewRequired: true, requiredServices, boundary: "Clinical or legal decisions remain with accountable humans." },
  insurance: { id: "insurance", label: "Insurance", lifecycleTemplate: "financial_workflow", accountableOwner: "Insurance governance owner", defaultPurpose: "regulated_insurance_workflow", minimumEvidence: 3, reviewRequired: true, requiredServices, boundary: "Provider signals do not autonomously determine claims outcomes." },
  critical_infrastructure: { id: "critical_infrastructure", label: "Critical Infrastructure", lifecycleTemplate: "government", accountableOwner: "Critical operations owner", defaultPurpose: "critical_infrastructure_operation", minimumEvidence: 4, reviewRequired: true, requiredServices, boundary: "Ambiguous authority or evidence fails closed." },
};

export function getWorkflowTemplate(id: WorkflowTemplateId) {
  return workflowTemplates[id];
}
