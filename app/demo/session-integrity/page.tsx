import { InteractiveDemoScenario } from "@/components/interactive-demo-scenario";
import {
  getSimulationScenario,
  scenarioReplaySteps,
} from "@/lib/simulationScenarios";

const signalSummary = [
  {
    label: "Liveness",
    state: "Placeholder",
    explanation: "No live liveness provider result is attached.",
  },
  {
    label: "Injection risk",
    state: "Simulated flag",
    explanation: "Controlled channel discontinuity requires review.",
  },
  {
    label: "Deepfake indicators",
    state: "Not determined",
    explanation: "No binary fake/not-fake conclusion is made.",
  },
  {
    label: "Device / channel",
    state: "Integrity changed",
    explanation: "Prototype device and media context diverged.",
  },
  {
    label: "Manual review",
    state: "Required",
    explanation: "A named reviewer determines the workflow outcome.",
  },
];

export default function SessionIntegrityDemoPage() {
  const scenario = getSimulationScenario("injected-verification-session");
  return (
    <InteractiveDemoScenario
      label="Session Integrity"
      title="Verification happened at entry. Workflow trust still changed during the session."
      summary="Liveness, injection risk, deepfake indicators, device/channel integrity and manual review remain separate throughout this prototype workflow."
      steps={scenarioReplaySteps(scenario)}
      status={scenario.status}
      providerState={scenario.providerState}
      manualReviewIndicator={scenario.manualReviewIndicator}
      replayHref={`/replay/demo?scenario=${scenario.id}`}
      signalSummary={signalSummary}
    />
  );
}
