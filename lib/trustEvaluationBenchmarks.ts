export type TrustEvaluationBenchmarkStatus =
  | "Concept"
  | "Prototype"
  | "Planned";

export type TrustEvaluationBenchmark = {
  name: string;
  status: TrustEvaluationBenchmarkStatus;
  scope: string;
  evaluationFocus: string[];
  boundary: string;
};

export type TrustEvaluationDomain = {
  title: string;
  summary: string;
  questions: string[];
};

export const trustEvaluationBenchmarks: TrustEvaluationBenchmark[] = [
  {
    name: "AgentTrustBench",
    status: "Prototype",
    scope:
      "Evaluates whether an AI agent remains inside its assigned identity, authority and workflow boundaries.",
    evaluationFocus: [
      "Agent identity and declared purpose",
      "Authorization lineage",
      "Action evidence and governance handoff",
    ],
    boundary:
      "Prototype scenarios only. No agent reliability or model-accuracy result is claimed.",
  },
  {
    name: "SyntheticIdentityBench",
    status: "Concept",
    scope:
      "Defines evaluation scenarios for identity continuity when synthetic, proxy or conflicting identity signals are present.",
    evaluationFocus: [
      "Identity evidence continuity",
      "Provider-state handling",
      "Manual-review escalation",
    ],
    boundary:
      "Concept definition only. No biometric, deepfake or fraud-detection accuracy is claimed.",
  },
  {
    name: "WorkflowIntegrityBench",
    status: "Prototype",
    scope:
      "Exercises how a workflow responds when session, authorization or evidence conditions change.",
    evaluationFocus: [
      "Trust Posture transitions",
      "Replay Timeline completeness",
      "Final operational outcome",
    ],
    boundary:
      "Prototype fixtures validate workflow behavior, not real-world detection performance.",
  },
  {
    name: "ProvenanceRiskBench",
    status: "Planned",
    scope:
      "Plans evaluation of provenance gaps, conflicting evidence references and incomplete authorization history.",
    evaluationFocus: [
      "Evidence Chain completeness",
      "Source and provider attribution",
      "Authorization Lineage",
    ],
    boundary:
      "Planned evaluation design. No provenance-risk benchmark has been run.",
  },
  {
    name: "DeepfakeWorkflowBench",
    status: "Concept",
    scope:
      "Defines workflow-level scenarios for handling reported deepfake risk without turning a provider signal into an automated verdict.",
    evaluationFocus: [
      "Session Integrity separation",
      "Provider evidence summaries",
      "Governance Review and false-positive handling",
    ],
    boundary:
      "Concept definition only. No deepfake detection rate or provider comparison is claimed.",
  },
];

export const trustEvaluationDomains: TrustEvaluationDomain[] = [
  {
    title: "Human Verification",
    summary:
      "Tests whether identity evidence, session context and reviewer decisions remain connected throughout a human-led workflow.",
    questions: [
      "Is the identity evidence attributable and current?",
      "Are uncertainty and manual-review requirements visible?",
      "Does the Verification Receipt match the final workflow state?",
    ],
  },
  {
    title: "AI Agent Verification",
    summary:
      "Tests whether an agent is identifiable, appropriately authorized and accountable for the actions it attempts.",
    questions: [
      "Which agent acted, and for whom?",
      "Was the action inside its assigned authorization?",
      "Can the action be paused or escalated for human review?",
    ],
  },
  {
    title: "Workflow Integrity",
    summary:
      "Tests whether trust-relevant state changes are handled consistently from initiation through final outcome.",
    questions: [
      "Did Trust Posture change when material evidence changed?",
      "Were blocked or escalated actions enforced?",
      "Does the Replay Timeline explain the operational outcome?",
    ],
  },
  {
    title: "Provenance & Evidence",
    summary:
      "Tests whether evidence sources, provider states and authorization history can be inspected without overstating certainty.",
    questions: [
      "Is every material signal linked to a source?",
      "Are Live, Simulated, Awaiting Credentials and Disabled states explicit?",
      "Does the Evidence Chain preserve relevant references?",
    ],
  },
  {
    title: "Trust Drift",
    summary:
      "Tests whether a workflow responds when identity, session, authority or evidence conditions diverge over time.",
    questions: [
      "What changed from the prior trusted state?",
      "Was the change recorded at the correct point in the chronology?",
      "Did policy and reviewer actions respond proportionately?",
    ],
  },
  {
    title: "Governance Readiness",
    summary:
      "Tests whether uncertain or high-impact states reach an accountable reviewer with sufficient context.",
    questions: [
      "Is reviewer ownership visible?",
      "Can false positives be recorded and resolved?",
      "Are the decision, rationale and final state retained?",
    ],
  },
];
