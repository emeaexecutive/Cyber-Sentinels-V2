import { InteractiveDemoScenario } from "@/components/interactive-demo-scenario";
import {
  getSimulationScenario,
  scenarioReplaySteps,
} from "@/lib/simulationScenarios";

export default function HiringAttackDemoPage() {
  const scenario = getSimulationScenario("proxy-candidate-interview");
  return (
    <InteractiveDemoScenario
      label="Hiring Security"
      title="A synthetic applicant reaches the interview. The workflow does not have to guess."
      summary="Follow one simulated operational chain from candidate intake through provider evidence, Session Integrity, governance review and final Trust Posture."
      steps={scenarioReplaySteps(scenario)}
      status={scenario.status}
      providerState={scenario.providerState}
      manualReviewIndicator={scenario.manualReviewIndicator}
      replayHref={`/replay/demo?scenario=${scenario.id}`}
      nextScenario={{ href: "/verify/session", label: "Review Session Evidence" }}
    />
  );
}
