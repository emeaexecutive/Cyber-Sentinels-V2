import { InteractiveDemoScenario, type DemoScenarioStep } from "@/components/interactive-demo-scenario";

const steps: DemoScenarioStep[] = [
  { title: "Fake candidate enters workflow", state: "Observed", explanation: "A verified-looking candidate enters a governed remote interview session.", evidence: "Session identity, start time, workflow owner and channel context." },
  { title: "Verification begins", state: "Partial match", explanation: "The identity result is linked to the session but is not treated as proof of trusted behaviour.", evidence: "Provider result, assurance context and candidate-provided evidence." },
  { title: "Session integrity fails", state: "High risk", explanation: "Channel evidence indicates that the live interview feed may no longer represent the verified context.", evidence: "Device-channel state, anomaly timestamp, injection risk and evidence source." },
  { title: "Governance review opens", state: "Assigned", explanation: "A human reviewer receives the session chronology instead of a hidden automated verdict.", evidence: "Assigned reviewer, policy context and open action." },
  { title: "Replay evidence generated", state: "Chronology ready", explanation: "The reviewer scans identity, session changes, risk events and prior actions in order.", evidence: "Replay timeline joining evidence, signals, actions and audit history." },
  { title: "Threat blocked", state: "Resolved", explanation: "The reviewer blocks the compromised session while keeping the candidate decision separate.", evidence: "Resolution notes, human authority and block timestamp." },
  { title: "Verification receipt issued", state: "Issued", explanation: "Security, talent and compliance teams receive the same concise explanation of the outcome.", evidence: "Printable receipt with identity, deepfake, injection, governance and audit states." },
];

export default function SessionIntegrityDemoPage() {
  return <InteractiveDemoScenario label="Session Integrity" title="Verification happened at entry. Trust still changed during the session." summary="See why identity verification alone is insufficient and how Cyber Sentinels preserves evidence, governance and operational memory." steps={steps} />;
}
