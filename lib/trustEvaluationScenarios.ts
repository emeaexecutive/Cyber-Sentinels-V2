export type EvaluationScenarioStatus =
  | "Simulated"
  | "Concept"
  | "Prototype"
  | "Placeholder";

export type EvaluationScenarioEvent = {
  time: string;
  title: string;
  whatHappened: string;
  trustChange: string;
  evidence: string;
  governance: string;
  reviewer: string;
  authorization: string;
  operationalState: string;
};

export type TrustEvaluationScenario = {
  id: string;
  name: string;
  category:
    | "Synthetic identity"
    | "Workflow anomaly"
    | "Replay divergence"
    | "Governance escalation"
    | "Provider-backed evidence";
  status: EvaluationScenarioStatus;
  summary: string;
  evaluationQuestion: string;
  providerState: "Simulated" | "Awaiting Credentials" | "Disabled";
  initialPosture: string;
  finalPosture: string;
  evidenceContinuity: string;
  limitation: string;
  events: EvaluationScenarioEvent[];
};

export const trustEvaluationScenarios: TrustEvaluationScenario[] = [
  {
    id: "executive-impersonation",
    name: "Executive Impersonation",
    category: "Synthetic identity",
    status: "Concept",
    summary:
      "A payment-approval request presents identity and communication signals that conflict with the expected executive workflow.",
    evaluationQuestion:
      "Does the workflow pause authority-sensitive action when identity evidence conflicts?",
    providerState: "Awaiting Credentials",
    initialPosture: "Review required",
    finalPosture: "Restricted",
    evidenceContinuity:
      "Request metadata, authorization record and reviewer decision remain linked.",
    limitation:
      "Concept scenario only. It does not demonstrate impersonation or deepfake detection accuracy.",
    events: [
      {
        time: "09:12",
        title: "Approval request opened",
        whatHappened: "A controlled executive-payment request entered the evaluation workflow.",
        trustChange: "Trust Posture moved from unknown to review required.",
        evidence: "Placeholder request metadata and declared executive identity.",
        governance: "No intervention; authority-sensitive requests require evidence review.",
        reviewer: "Workflow owner",
        authorization: "Payment authority remained unconfirmed.",
        operationalState: "Review required",
      },
      {
        time: "09:15",
        title: "Identity context conflicted",
        whatHappened: "The request channel differed from the expected approval channel.",
        trustChange: "Trust Posture moved from review required to elevated review.",
        evidence: "Simulated channel mismatch; identity provider remains Awaiting Credentials.",
        governance: "The mismatch required named Finance Security review.",
        reviewer: "Finance Security queue",
        authorization: "Approval authority was suspended pending confirmation.",
        operationalState: "Elevated review",
      },
      {
        time: "09:19",
        title: "Governance restricted the request",
        whatHappened: "The reviewer prevented the payment workflow from advancing.",
        trustChange: "Trust Posture moved from elevated review to restricted.",
        evidence: "Request chronology, channel mismatch and missing provider verification.",
        governance: "Restriction recorded because identity and authority remained unresolved.",
        reviewer: "Elena Ortiz · Finance Security",
        authorization: "Payment authority remained with the verified approval channel.",
        operationalState: "Restricted",
      },
    ],
  },
  {
    id: "proxy-candidate-interview",
    name: "Proxy Candidate Interview",
    category: "Provider-backed evidence",
    status: "Simulated",
    summary:
      "A candidate workflow combines a simulated provider response with a later session-identity inconsistency.",
    evaluationQuestion:
      "Can provider evidence remain visible without overriding a conflicting session event?",
    providerState: "Simulated",
    initialPosture: "Review required",
    finalPosture: "Restricted",
    evidenceContinuity:
      "Candidate intake, simulated provider fixture, Session Integrity event and reviewer action remain replayable.",
    limitation:
      "Controlled fixture only. No live identity, biometric or proxy-detection result is claimed.",
    events: [
      {
        time: "10:00",
        title: "Candidate verification opened",
        whatHappened: "A synthetic candidate record entered a consented demo workflow.",
        trustChange: "Trust Posture moved from unknown to review required.",
        evidence: "Synthetic profile and controlled workflow record.",
        governance: "No intervention; evidence collection was incomplete.",
        reviewer: "Workflow owner",
        authorization: "Recruiter intake authority recorded.",
        operationalState: "Review required",
      },
      {
        time: "10:03",
        title: "Provider evidence attached",
        whatHappened: "A provider-shaped response fixture was attached to the record.",
        trustChange: "Evidence increased, but Trust Posture remained review required.",
        evidence: "Controlled provider response explicitly marked Simulated.",
        governance: "Simulated provider evidence could not approve the workflow by itself.",
        reviewer: "System chronology",
        authorization: "Evidence attachment recorded; decision authority unchanged.",
        operationalState: "Evidence pending review",
      },
      {
        time: "10:06",
        title: "Session identity diverged",
        whatHappened: "A controlled session event conflicted with earlier identity context.",
        trustChange: "Trust Posture moved from review required to elevated review.",
        evidence: "Simulated channel discontinuity and session-risk event.",
        governance: "The conflict required People Security ownership.",
        reviewer: "Session Integrity reviewer",
        authorization: "Workflow progression moved to People Security review.",
        operationalState: "Elevated review",
      },
      {
        time: "10:09",
        title: "Governance restricted progression",
        whatHappened: "The reviewer prevented the hiring workflow from advancing.",
        trustChange: "Trust Posture moved from elevated review to restricted.",
        evidence: "Evidence Chain, provider fixture and Session Integrity chronology.",
        governance: "Stronger identity and channel evidence was requested.",
        reviewer: "Morgan Lee · Trust Operations",
        authorization: "Restriction recorded under named review authority.",
        operationalState: "Restricted",
      },
    ],
  },
  {
    id: "injected-session-workflow",
    name: "Injected Session Workflow",
    category: "Workflow anomaly",
    status: "Prototype",
    summary:
      "A controlled channel-integrity change occurs after a workflow has already accumulated identity evidence.",
    evaluationQuestion:
      "Does the workflow respond to a session anomaly without erasing earlier valid evidence?",
    providerState: "Disabled",
    initialPosture: "Evidence available",
    finalPosture: "Manual review required",
    evidenceContinuity:
      "Earlier evidence remains retained while the later channel anomaly is reviewed separately.",
    limitation:
      "Prototype workflow behavior only. No injection-detection performance is claimed.",
    events: [
      {
        time: "11:20",
        title: "Session evidence recorded",
        whatHappened: "Controlled identity and consent records were attached to the session.",
        trustChange: "Trust Posture moved to evidence available.",
        evidence: "Prototype identity fixture and consent record.",
        governance: "No intervention; channel monitoring remained active.",
        reviewer: "Session owner",
        authorization: "Session could continue under standard workflow authority.",
        operationalState: "Evidence available",
      },
      {
        time: "11:27",
        title: "Channel integrity changed",
        whatHappened: "A simulated media-channel discontinuity was recorded.",
        trustChange: "Trust Posture moved to elevated review.",
        evidence: "Simulated injection-risk event; external provider is Disabled.",
        governance: "The session was paused because the channel state changed materially.",
        reviewer: "Session Integrity queue",
        authorization: "Continuation authority moved to a human reviewer.",
        operationalState: "Elevated review",
      },
      {
        time: "11:31",
        title: "Reviewer requested corroboration",
        whatHappened: "The reviewer retained earlier evidence and requested a clean session check.",
        trustChange: "Trust Posture moved to manual review required.",
        evidence: "Original evidence plus the separately labelled channel event.",
        governance: "No automated rejection; additional evidence was requested.",
        reviewer: "Priya Shah · Session Review",
        authorization: "Resume authority withheld pending corroboration.",
        operationalState: "Manual review required",
      },
    ],
  },
  {
    id: "ai-agent-authorization-drift",
    name: "AI Agent Authorization Drift",
    category: "Governance escalation",
    status: "Prototype",
    summary:
      "An AI agent attempts an action outside the purpose and authorization recorded at delegation time.",
    evaluationQuestion:
      "Can authorization drift be explained and stopped before the action executes?",
    providerState: "Disabled",
    initialPosture: "Authorized",
    finalPosture: "Blocked",
    evidenceContinuity:
      "Agent identity, delegated purpose, attempted action and governance decision remain linked.",
    limitation:
      "Prototype policy scenario. It is not a claim about autonomous agent intent or model safety.",
    events: [
      {
        time: "13:40",
        title: "Agent authority delegated",
        whatHappened: "A prototype agent received read-only access for a defined review task.",
        trustChange: "Trust Posture moved to authorized for the declared purpose.",
        evidence: "Placeholder agent identity and prototype delegation record.",
        governance: "No intervention; scope and expiry were recorded.",
        reviewer: "Delegating operator",
        authorization: "Read-only review authority granted.",
        operationalState: "Authorized",
      },
      {
        time: "13:44",
        title: "Attempted action exceeded scope",
        whatHappened: "The agent attempted to modify a record outside its delegated purpose.",
        trustChange: "Trust Posture moved from authorized to governance review.",
        evidence: "Prototype action event and Authorization Lineage mismatch.",
        governance: "Policy blocked execution and opened review.",
        reviewer: "Agent Governance queue",
        authorization: "Write authority was absent and remained denied.",
        operationalState: "Governance review",
      },
      {
        time: "13:48",
        title: "Reviewer confirmed scope breach",
        whatHappened: "A human reviewer kept the action blocked and ended the delegation.",
        trustChange: "Trust Posture moved from governance review to blocked.",
        evidence: "Delegation record, attempted action and policy decision.",
        governance: "The reviewer revoked the prototype delegation pending investigation.",
        reviewer: "Noah Bennett · Agent Governance",
        authorization: "Delegated access revoked.",
        operationalState: "Blocked",
      },
    ],
  },
  {
    id: "provenance-conflict-event",
    name: "Provenance Conflict Event",
    category: "Replay divergence",
    status: "Placeholder",
    summary:
      "Two evidence references describe incompatible origins for the same workflow artifact.",
    evaluationQuestion:
      "Does replay expose provenance divergence before a receipt is issued?",
    providerState: "Awaiting Credentials",
    initialPosture: "Evidence available",
    finalPosture: "Receipt held",
    evidenceContinuity:
      "Both conflicting references remain visible; neither is silently overwritten.",
    limitation:
      "Placeholder chronology for interface validation. No provenance provider result is present.",
    events: [
      {
        time: "15:05",
        title: "Artifact evidence retained",
        whatHappened: "A placeholder workflow artifact and source reference were recorded.",
        trustChange: "Trust Posture moved to evidence available.",
        evidence: "Placeholder artifact hash and declared source.",
        governance: "No intervention; provenance confirmation remained pending.",
        reviewer: "Evidence owner",
        authorization: "Artifact could be reviewed but not certified.",
        operationalState: "Evidence available",
      },
      {
        time: "15:11",
        title: "Provenance references diverged",
        whatHappened: "A second placeholder reference named a conflicting origin.",
        trustChange: "Trust Posture moved to evidence conflict.",
        evidence: "Two retained source references; provider remains Awaiting Credentials.",
        governance: "Receipt issuance paused until the source conflict could be reviewed.",
        reviewer: "Evidence Governance queue",
        authorization: "Certification authority suspended.",
        operationalState: "Evidence conflict",
      },
      {
        time: "15:18",
        title: "Governance held receipt issuance",
        whatHappened: "The reviewer preserved both references and requested source confirmation.",
        trustChange: "Trust Posture moved from evidence conflict to receipt held.",
        evidence: "Conflicting references, audit chronology and reviewer note.",
        governance: "The conflict remained unresolved; no source was declared authoritative.",
        reviewer: "Amina Yusuf · Evidence Governance",
        authorization: "Receipt issuance remained withheld.",
        operationalState: "Receipt held",
      },
    ],
  },
];

export function getTrustEvaluationScenario(id?: string) {
  return (
    trustEvaluationScenarios.find((scenario) => scenario.id === id) ??
    trustEvaluationScenarios.find(
      (scenario) => scenario.id === "proxy-candidate-interview"
    )!
  );
}
