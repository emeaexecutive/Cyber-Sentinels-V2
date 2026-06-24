import { InteractiveDemoScenario, type DemoScenarioStep } from "@/components/interactive-demo-scenario";

const steps: DemoScenarioStep[] = [
  { title: "Fake candidate enters workflow", state: "Observed", explanation: "A verified-looking candidate enters a governed remote interview session.", evidence: "Session identity, start time, workflow owner and channel context.", action: "Start from the operational workflow, not a generic alert queue." },
  { title: "Verification begins", state: "Partial match", explanation: "The identity result is linked to the session but is not treated as proof of trusted behaviour.", evidence: "Provider result, assurance context and candidate-provided evidence.", action: "Keep identity assurance separate from session authenticity." },
  { title: "Session integrity fails", state: "High risk", explanation: "Channel evidence indicates that the live interview feed may no longer represent the verified context.", evidence: "Device-channel state, anomaly timestamp, injection risk and evidence source.", action: "Escalate the changed session state before the interview outcome advances." },
  { title: "Governance review opens", state: "Assigned", explanation: "A human reviewer receives the session chronology instead of a hidden automated verdict.", evidence: "Assigned reviewer, policy context and open action.", action: "Route the case to a named reviewer with policy context and evidence." },
  { title: "Replay evidence generated", state: "Chronology ready", explanation: "The reviewer scans identity, session changes, risk events and prior actions in order.", evidence: "Replay timeline joining evidence, signals, actions and audit history.", action: "Make the decision path readable without asking teams to reconstruct it manually." },
  { title: "Threat blocked", state: "Resolved", explanation: "The reviewer blocks the compromised session while keeping the candidate decision separate.", evidence: "Resolution notes, human authority and block timestamp.", action: "Stop the compromised session and preserve the human rationale." },
  { title: "Verification receipt issued", state: "Issued", explanation: "Security, talent and compliance teams receive the same concise explanation of the outcome.", evidence: "Printable receipt with identity, deepfake, injection, governance and audit states.", action: "Create an audit-ready explanation for follow-up review." },
];

export default function SessionIntegrityDemoPage() {
  return <InteractiveDemoScenario label="Session Integrity" title="Verification happened at entry. Trust still changed during the session." summary="See why identity verification alone is insufficient and how Cyber Sentinels preserves evidence, governance and operational memory." steps={steps} />;
}
