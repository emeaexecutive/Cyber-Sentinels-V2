import { InteractiveDemoScenario, type DemoScenarioStep } from "@/components/interactive-demo-scenario";

const steps: DemoScenarioStep[] = [
  { title: "Session begins", state: "Observed", explanation: "A verified candidate enters a governed remote interview session.", evidence: "Session identity, start time, workflow owner and channel context." },
  { title: "Identity state linked", state: "Partial match", explanation: "The identity result is linked to the session but is not treated as proof of trusted behaviour.", evidence: "Provider result, assurance context and candidate-provided evidence." },
  { title: "Integrity checks triggered", state: "Reviewable", explanation: "Liveness, deepfake risk, injection risk, device-channel integrity and anomalies are assessed separately.", evidence: "Independent verification signals with source and explanation." },
  { title: "Channel anomaly appears", state: "Elevated", explanation: "Channel evidence indicates that the live interview feed may no longer represent the verified context.", evidence: "Device-channel state, anomaly timestamp and evidence source." },
  { title: "Injection risk escalates", state: "High risk", explanation: "An injection-risk event crosses the governance threshold and pauses the workflow.", evidence: "Risk state, explanation and supporting channel evidence." },
  { title: "Governance owns review", state: "Assigned", explanation: "A human reviewer receives the session chronology instead of a hidden automated verdict.", evidence: "Assigned reviewer, policy context and open action." },
  { title: "Evidence is replayed", state: "Chronology ready", explanation: "The reviewer scans identity, session changes, risk events and prior actions in order.", evidence: "Replay timeline joining evidence, signals, actions and audit history." },
  { title: "Session is blocked", state: "Resolved", explanation: "The reviewer blocks the compromised session while keeping the candidate decision separate.", evidence: "Resolution notes, human authority and block timestamp." },
  { title: "Receipt becomes portable", state: "Issued", explanation: "Security, talent and compliance teams receive the same concise explanation of the outcome.", evidence: "Printable receipt with identity, deepfake, injection, governance and audit states." },
];

export default function SessionIntegrityDemoPage() {
  return <InteractiveDemoScenario label="Session Integrity" title="Verification happened at entry. Trust still changed during the session." summary="See why identity verification alone is insufficient and how Cyber Sentinels preserves evidence, governance and operational memory." steps={steps} />;
}
