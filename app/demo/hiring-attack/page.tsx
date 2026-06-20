import { InteractiveDemoScenario, type DemoScenarioStep } from "@/components/interactive-demo-scenario";

const steps: DemoScenarioStep[] = [
  { title: "Synthetic candidate enters", state: "Intake recorded", explanation: "A clearly labelled synthetic applicant enters a remote hiring workflow with a convincing profile and incomplete provenance.", evidence: "Candidate profile, application source and declared identity context." },
  { title: "Verification initiated", state: "Verification active", explanation: "Cyber Sentinels opens a verification workflow instead of treating the application as trusted by default.", evidence: "Verification request, workflow owner and initiation timestamp." },
  { title: "Session checks triggered", state: "Checks running", explanation: "Identity, liveness, media risk, channel integrity and session anomalies remain separate review states.", evidence: "Session-check configuration and evidence-source references." },
  { title: "Injection risk detected", state: "Flag raised", explanation: "The interview channel produces an injection-risk signal consistent with an externally supplied video feed.", evidence: "Signal category, source, confidence context and explanation." },
  { title: "Governance review opened", state: "Review required", explanation: "The workflow pauses and routes the signal, identity context and session evidence to accountable human review.", evidence: "Governance action, reviewer assignment and escalation reason." },
  { title: "Audit trail generated", state: "Audit available", explanation: "Every material workflow transition becomes visible in an ordered operational history.", evidence: "Timeline events, actor context and audit references linked to the session." },
  { title: "Manual review escalated", state: "Human decision", explanation: "A reviewer examines the partial verification, session evidence and injection-risk flag before acting.", evidence: "Reviewer action, supporting evidence and resolution notes." },
  { title: "Threat blocked", state: "Session blocked", explanation: "The suspicious interview session is stopped without making an automated judgment about candidate worth.", evidence: "Block action, human authority, timestamp and operational rationale." },
  { title: "Receipt issued", state: "Review complete", explanation: "An enterprise receipt summarizes what was verified, what failed, who reviewed it and where replay is available.", evidence: "Verification receipt, evidence summary, audit references and replay link." },
];

export default function HiringAttackDemoPage() {
  return <InteractiveDemoScenario label="Hiring Security" title="A synthetic applicant reaches the interview. The workflow does not have to guess." summary="Follow the operational chain from candidate intake to session block, human review, replay and verification receipt." steps={steps} nextScenario={{ href: "/demo/session-integrity", label: "Open Session Integrity" }} />;
}
