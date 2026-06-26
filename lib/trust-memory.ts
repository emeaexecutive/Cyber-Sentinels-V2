import type {
  EvolvingWorkflowTrust,
  WorkflowTrustState,
  WorkflowTrustTransition,
} from "@/lib/trust-engine";

export type TrustMemorySubjectType = "workflow" | "identity" | "agent" | "autonomous_system";

export type AuthorizationGrant = {
  id: string;
  principalId: string;
  principalType: "human" | "agent" | "service";
  delegatedBy: string;
  scope: string[];
  purpose: string;
  grantedAt: string;
  expiresAt: string | null;
  status: "active" | "review_required" | "revoked" | "expired";
  evidenceReferences: string[];
};

export type GovernedExecutionRecord = {
  id: string;
  workflowId: string;
  actorId: string;
  actorType: AuthorizationGrant["principalType"];
  authorizationGrantId: string;
  action: string;
  requestedAt: string;
  completedAt: string | null;
  outcome: "allowed" | "denied" | "review_required" | "completed" | "failed";
  explanation: string;
  evidenceReferences: string[];
  reviewer: string | null;
};

export type TrustMemoryEntry = {
  id: string;
  sequence: number;
  recordedAt: string;
  transition: WorkflowTrustTransition;
  state: WorkflowTrustState;
  evidenceContinuity: string[];
  governanceLineage: string[];
  authorizationGrantIds: string[];
  previousEntryId: string | null;
};

export type OperationalTrustMemory = {
  schemaVersion: 1;
  memoryId: string;
  subjectType: TrustMemorySubjectType;
  subjectId: string;
  createdAt: string;
  updatedAt: string;
  entries: TrustMemoryEntry[];
  authorizationGrants: AuthorizationGrant[];
  governedExecutions: GovernedExecutionRecord[];
};

export type HistoricalPostureComparison = {
  from: Pick<WorkflowTrustState, "version" | "score" | "posture" | "updatedAt">;
  to: Pick<WorkflowTrustState, "version" | "score" | "posture" | "updatedAt">;
  scoreDelta: number;
  anomalyProgression: number;
  governanceInterventions: number;
  authorizationChanged: boolean;
  evidenceAdded: string[];
};

export function createOperationalTrustMemory(input: {
  subjectType: TrustMemorySubjectType;
  subjectId: string;
  createdAt?: string;
}): OperationalTrustMemory {
  const createdAt = input.createdAt ?? new Date().toISOString();
  return {
    schemaVersion: 1,
    memoryId: `trust-memory:${input.subjectType}:${input.subjectId}`,
    subjectType: input.subjectType,
    subjectId: input.subjectId,
    createdAt,
    updatedAt: createdAt,
    entries: [],
    authorizationGrants: [],
    governedExecutions: [],
  };
}

export function rememberTrustEvolution(
  memory: OperationalTrustMemory,
  evolution: EvolvingWorkflowTrust,
  authorizationGrantIds: string[] = []
): OperationalTrustMemory {
  const known = new Set(memory.entries.map((entry) => entry.transition.id));
  let entries = [...memory.entries];

  for (const transition of evolution.chronology.filter((item) => !known.has(item.id))) {
    const previousEntry = entries.at(-1) ?? null;
    entries.push({
      id: `${memory.memoryId}:entry:${entries.length + 1}`,
      sequence: entries.length + 1,
      recordedAt: transition.occurredAt,
      transition,
      state: transition.stateSnapshot,
      evidenceContinuity: [...transition.evidenceContributed],
      governanceLineage: transition.governanceAction
        ? [`${transition.governanceAction.action} by ${transition.governanceAction.reviewer}`]
        : [],
      authorizationGrantIds: [...authorizationGrantIds],
      previousEntryId: previousEntry?.id ?? null,
    });
  }

  return {
    ...memory,
    entries,
    updatedAt: entries.at(-1)?.recordedAt ?? memory.updatedAt,
  };
}

export function addAuthorizationGrant(
  memory: OperationalTrustMemory,
  grant: AuthorizationGrant
): OperationalTrustMemory {
  return {
    ...memory,
    updatedAt: grant.grantedAt,
    authorizationGrants: [
      ...memory.authorizationGrants.filter((item) => item.id !== grant.id),
      grant,
    ],
  };
}

export function recordGovernedExecution(
  memory: OperationalTrustMemory,
  execution: GovernedExecutionRecord
): OperationalTrustMemory {
  const grant = memory.authorizationGrants.find(
    (item) => item.id === execution.authorizationGrantId
  );
  const authorized =
    grant?.status === "active" &&
    grant.principalId === execution.actorId &&
    grant.scope.includes(execution.action);
  const normalized: GovernedExecutionRecord = authorized
    ? execution
    : {
        ...execution,
        outcome: "denied",
        explanation: grant
          ? "Execution did not match the active delegated authority scope."
          : "Execution has no replayable authorization grant.",
      };

  return {
    ...memory,
    updatedAt: normalized.completedAt ?? normalized.requestedAt,
    governedExecutions: [...memory.governedExecutions, normalized],
  };
}

export function reconstructTrustState(
  memory: OperationalTrustMemory,
  asOf?: string
) {
  const cutoff = asOf ? new Date(asOf).getTime() : Number.POSITIVE_INFINITY;
  return [...memory.entries]
    .filter((entry) => new Date(entry.recordedAt).getTime() <= cutoff)
    .sort((left, right) => left.sequence - right.sequence)
    .at(-1)?.state ?? null;
}

export function compareHistoricalPosture(
  memory: OperationalTrustMemory,
  fromSequence = 1,
  toSequence = memory.entries.length
): HistoricalPostureComparison | null {
  const from = memory.entries.find((entry) => entry.sequence === fromSequence);
  const to = memory.entries.find((entry) => entry.sequence === toSequence);
  if (!from || !to) return null;

  const range = memory.entries.filter(
    (entry) => entry.sequence >= fromSequence && entry.sequence <= toSequence
  );
  return {
    from: from.state,
    to: to.state,
    scoreDelta: to.state.score - from.state.score,
    anomalyProgression:
      to.state.dimensions.workflowAnomalies - from.state.dimensions.workflowAnomalies,
    governanceInterventions: range.filter((entry) => entry.transition.governanceAction).length,
    authorizationChanged:
      from.state.authorizationContinuity !== to.state.authorizationContinuity,
    evidenceAdded: [...new Set(range.flatMap((entry) => entry.evidenceContinuity))],
  };
}
