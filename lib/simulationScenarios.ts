export type SimulationScenarioStatus =
  | "Simulated"
  | "Concept"
  | "Prototype"
  | "Placeholder";

export type SimulationReplayEvent = {
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

export type SimulationScenario = {
  id: string;
  name: string;
  category:
    | "Synthetic identity"
    | "Workflow anomaly"
    | "Replay divergence"
    | "Governance escalation"
    | "Provider-backed evidence";
  status: SimulationScenarioStatus;
  summary: string;
  riskType: string;
  evaluationQuestion: string;
  providerState: "Simulated" | "Awaiting Credentials" | "Disabled";
  providerEvidenceSummaries: string[];
  initialPosture: string;
  finalPosture: string;
  evidenceContinuity: string;
  manualReviewIndicator: string;
  falsePositiveHandling: string;
  governanceEvents: string[];
  limitation: string;
  replayEvents: SimulationReplayEvent[];
};

export const simulationScenarios: SimulationScenario[] = [
  {
    id: "executive-impersonation",
    name: "Executive Impersonation",
    category: "Synthetic identity",
    status: "Concept",
    summary:
      "A payment-approval request presents identity and communication signals that conflict with the expected executive workflow.",
    riskType: "Identity and authorization conflict",
    evaluationQuestion:
      "Does the workflow pause authority-sensitive action when identity evidence conflicts?",
    providerState: "Awaiting Credentials",
    providerEvidenceSummaries: [
      "Identity provider: Awaiting Credentials; no provider verification attached.",
      "Channel mismatch: Simulated workflow evidence.",
    ],
    initialPosture: "Review required",
    finalPosture: "Restricted",
    evidenceContinuity:
      "Request metadata, authorization record and reviewer decision remain linked.",
    manualReviewIndicator:
      "Required — Finance Security must confirm identity and payment authority.",
    falsePositiveHandling:
      "A reviewer can resolve the channel conflict as explained context while preserving the original flag and notes.",
    governanceEvents: [
      "Finance Security review assigned after the channel conflict.",
      "Payment progression restricted pending identity and authority confirmation.",
    ],
    limitation:
      "Concept scenario only. It does not demonstrate impersonation or deepfake detection accuracy.",
    replayEvents: [
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
    riskType: "Proxy identity and session continuity",
    evaluationQuestion:
      "Can provider evidence remain visible without overriding a conflicting session event?",
    providerState: "Simulated",
    providerEvidenceSummaries: [
      "Identity response: Simulated provider-shaped fixture.",
      "Session continuity: Simulated channel inconsistency.",
    ],
    initialPosture: "Review required",
    finalPosture: "Restricted",
    evidenceContinuity:
      "Candidate intake, simulated provider fixture, Session Integrity event and reviewer action remain replayable.",
    manualReviewIndicator:
      "Required — People Security owns the final workflow decision.",
    falsePositiveHandling:
      "A reviewer can record a legitimate session handoff and resolve the flag without deleting the evidence chronology.",
    governanceEvents: [
      "People Security review assigned after session identity divergence.",
      "Hiring progression restricted pending stronger evidence.",
    ],
    limitation:
      "Controlled fixture only. No live identity, biometric or proxy-detection result is claimed.",
    replayEvents: [
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
    id: "injected-verification-session",
    name: "Injected Verification Session",
    category: "Workflow anomaly",
    status: "Prototype",
    summary:
      "A controlled channel-integrity change occurs after a workflow has already accumulated identity evidence.",
    riskType: "Session injection and channel integrity",
    evaluationQuestion:
      "Does the workflow respond to a session anomaly without erasing earlier valid evidence?",
    providerState: "Disabled",
    providerEvidenceSummaries: [
      "Injection provider: Disabled; no external result is claimed.",
      "Channel event: Simulated prototype workflow signal.",
    ],
    initialPosture: "Evidence available",
    finalPosture: "Manual review required",
    evidenceContinuity:
      "Earlier evidence remains retained while the later channel anomaly is reviewed separately.",
    manualReviewIndicator:
      "Required — reviewer must separate liveness, injection, media and channel context.",
    falsePositiveHandling:
      "A clean-session corroboration can resolve the injection flag as explained while retaining both session records.",
    governanceEvents: [
      "Session paused after the controlled channel-integrity change.",
      "Reviewer requested corroboration instead of issuing an automated rejection.",
    ],
    limitation:
      "Prototype workflow behavior only. No injection-detection performance is claimed.",
    replayEvents: [
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
    id: "synthetic-identity-conflict",
    name: "Synthetic Identity Conflict",
    category: "Synthetic identity",
    status: "Simulated",
    summary:
      "Two controlled identity references conflict while the surrounding workflow evidence remains internally consistent.",
    riskType: "Conflicting identity evidence",
    evaluationQuestion:
      "Does the workflow preserve both identity references and request review instead of selecting one automatically?",
    providerState: "Simulated",
    providerEvidenceSummaries: [
      "Identity comparison: Simulated provider-shaped fixture.",
      "Evidence references: Two controlled records with conflicting attributes.",
    ],
    initialPosture: "Evidence available",
    finalPosture: "Identity review required",
    evidenceContinuity:
      "Both identity references, their sources and the reviewer decision remain in the Evidence Chain.",
    manualReviewIndicator:
      "Required — identity conflict cannot be resolved by a single score.",
    falsePositiveHandling:
      "Verified source context can resolve the conflict without rewriting either retained identity reference.",
    governanceEvents: [
      "Identity Review queue opened when retained attributes conflicted.",
      "Named reviewer requested source confirmation.",
    ],
    limitation:
      "Simulated identity conflict. No biometric match or synthetic-identity detection result is claimed.",
    replayEvents: [
      {
        time: "12:05",
        title: "Identity evidence attached",
        whatHappened: "Two controlled identity references were attached to one workflow.",
        trustChange: "Trust Posture moved from unknown to evidence available.",
        evidence: "Simulated provider fixture and placeholder enterprise record.",
        governance: "No intervention while sources were normalized.",
        reviewer: "Workflow owner",
        authorization: "Workflow remained review-only.",
        operationalState: "Evidence available",
      },
      {
        time: "12:08",
        title: "Identity attributes conflicted",
        whatHappened: "Material identity attributes did not agree across the retained references.",
        trustChange: "Trust Posture moved to identity conflict.",
        evidence: "Both source references and the normalized conflict marker.",
        governance: "Automatic progression paused; neither source was declared authoritative.",
        reviewer: "Identity Review queue",
        authorization: "Decision authority moved to a named reviewer.",
        operationalState: "Identity conflict",
      },
      {
        time: "12:13",
        title: "Reviewer requested source confirmation",
        whatHappened: "The reviewer preserved both references and requested corroboration.",
        trustChange: "Trust Posture moved to identity review required.",
        evidence: "Conflicting references, source metadata and reviewer note.",
        governance: "Additional evidence requested without a fraud or authenticity verdict.",
        reviewer: "Sofia Marin · Identity Review",
        authorization: "Progression withheld pending confirmation.",
        operationalState: "Identity review required",
      },
    ],
  },
  {
    id: "governance-escalation-chain",
    name: "Governance Escalation Chain",
    category: "Governance escalation",
    status: "Prototype",
    summary:
      "A controlled high-impact workflow moves from operator review to security and policy ownership as evidence remains incomplete.",
    riskType: "Escalation ownership and evidence sufficiency",
    evaluationQuestion:
      "Does each escalation preserve responsibility, evidence and the reason authority changed?",
    providerState: "Awaiting Credentials",
    providerEvidenceSummaries: [
      "External verification: Awaiting Credentials.",
      "Operational evidence: Prototype policy and reviewer records.",
    ],
    initialPosture: "Review required",
    finalPosture: "Deferred pending evidence",
    evidenceContinuity:
      "Reviewer assignments, operational notes and escalation reasons remain ordered in replay.",
    manualReviewIndicator:
      "Required — each handoff needs a named owner and explicit next step.",
    falsePositiveHandling:
      "Reviewers can resolve the trigger as explained context with an operational note and complete escalation history.",
    governanceEvents: [
      "Operations reviewer escalated the protected action to Security Review.",
      "Policy owner deferred the outcome pending provider evidence.",
    ],
    limitation:
      "Prototype governance workflow. It does not represent a completed enterprise policy validation.",
    replayEvents: [
      {
        time: "14:20",
        title: "Operator review opened",
        whatHappened: "A controlled high-impact action lacked sufficient supporting evidence.",
        trustChange: "Trust Posture moved to review required.",
        evidence: "Prototype action request and missing-evidence summary.",
        governance: "Operator review opened with evidence collection requested.",
        reviewer: "Operations reviewer",
        authorization: "Execution authority withheld.",
        operationalState: "Review required",
      },
      {
        time: "14:26",
        title: "Security escalation assigned",
        whatHappened: "The operator escalated because the action affected a protected workflow.",
        trustChange: "Trust Posture moved to escalated.",
        evidence: "Original request, operator note and policy reference.",
        governance: "Security reviewer assigned; escalation reason preserved.",
        reviewer: "Jordan Kim · Security Review",
        authorization: "Decision authority moved to Security Review.",
        operationalState: "Escalated",
      },
      {
        time: "14:34",
        title: "Policy owner deferred outcome",
        whatHappened: "The policy owner requested provider evidence before approval.",
        trustChange: "Trust Posture moved to deferred pending evidence.",
        evidence: "Full escalation chain and Awaiting Credentials provider state.",
        governance: "Outcome deferred with an accountable evidence request.",
        reviewer: "Rina Patel · Policy Owner",
        authorization: "Execution remained blocked pending evidence.",
        operationalState: "Deferred pending evidence",
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
    riskType: "Authorization drift",
    evaluationQuestion:
      "Can authorization drift be explained and stopped before the action executes?",
    providerState: "Disabled",
    providerEvidenceSummaries: [
      "Authorization evidence: Prototype delegation record.",
      "External agent assurance provider: Disabled.",
    ],
    initialPosture: "Authorized",
    finalPosture: "Blocked",
    evidenceContinuity:
      "Agent identity, delegated purpose, attempted action and governance decision remain linked.",
    manualReviewIndicator:
      "Required — Agent Governance confirms scope and revocation.",
    falsePositiveHandling:
      "If delegated scope was recorded incorrectly, a reviewer can correct the lineage and mark the policy flag as explained.",
    governanceEvents: [
      "Policy blocked execution after the Authorization Lineage mismatch.",
      "Agent Governance revoked the prototype delegation.",
    ],
    limitation:
      "Prototype policy scenario. It is not a claim about autonomous agent intent or model safety.",
    replayEvents: [
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
    id: "replay-divergence-event",
    name: "Replay Divergence Event",
    category: "Replay divergence",
    status: "Placeholder",
    summary:
      "Two evidence references describe incompatible origins for the same workflow artifact.",
    riskType: "Replay and provenance divergence",
    evaluationQuestion:
      "Does replay expose provenance divergence before a receipt is issued?",
    providerState: "Awaiting Credentials",
    providerEvidenceSummaries: [
      "Provenance provider: Awaiting Credentials.",
      "Source references: Placeholder conflict records.",
    ],
    initialPosture: "Evidence available",
    finalPosture: "Receipt held",
    evidenceContinuity:
      "Both conflicting references remain visible; neither is silently overwritten.",
    manualReviewIndicator:
      "Required — Evidence Governance must resolve or preserve the conflict.",
    falsePositiveHandling:
      "A source-format mismatch can be resolved as explained while both replay references and the reviewer note remain preserved.",
    governanceEvents: [
      "Receipt issuance paused when replay references diverged.",
      "Evidence Governance retained both references pending confirmation.",
    ],
    limitation:
      "Placeholder chronology for interface validation. No provenance provider result is present.",
    replayEvents: [
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

export function getSimulationScenario(id?: string) {
  return (
    simulationScenarios.find((scenario) => scenario.id === id) ??
    simulationScenarios.find(
      (scenario) => scenario.id === "proxy-candidate-interview"
    )!
  );
}

export function scenarioReplaySteps(scenario: SimulationScenario) {
  return scenario.replayEvents.map((event) => ({
    title: event.title,
    state: event.operationalState,
    explanation: `${event.whatHappened} ${event.trustChange}`,
    evidence: event.evidence,
    action: `${event.governance} ${event.authorization}`,
  }));
}

// Compatibility aliases keep existing evaluation and replay imports connected
// to this canonical simulation source.
export type EvaluationScenarioStatus = SimulationScenarioStatus;
export type EvaluationScenarioEvent = SimulationReplayEvent;
export type TrustEvaluationScenario = SimulationScenario;
export const trustEvaluationScenarios = simulationScenarios;
export const getTrustEvaluationScenario = getSimulationScenario;
