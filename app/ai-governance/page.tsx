import { LegalDraftPage } from "@/components/legal-draft-page";
import { legalDraftLinks } from "@/lib/legal/draftPages";

export default function AiGovernancePage() {
  return (
    <LegalDraftPage
      title="AI Governance"
      subtitle="Cyber Sentinels governs AI execution inside authorization-aware, evidence-backed enterprise workflows."
      links={legalDraftLinks}
      sections={[
        {
          title: "Governed AI Execution",
          body: "AI agents and assistive models operate within approved workflow purpose, delegated authority, provider policy and data-classification boundaries. Runtime actions remain attributable to accountable enterprise ownership.",
        },
        {
          title: "Replayable AI Actions",
          body: "AI-assisted actions should retain the actor, workflow, authorization state, evidence context, provider decision and operational outcome required for replay and review.",
        },
        {
          title: "Runtime Trust Visibility",
          body: "Trust posture can evolve, decay, escalate, recover or require reverification as runtime context, evidence and authorization change. Posture informs review; it is not an automated verdict.",
        },
        {
          title: "Human Review",
          body: "Cyber Sentinels does not rely solely on automated decision-making for high-risk trust outcomes. Human review, escalation and evidence verification are part of the governance posture for sensitive decisions.",
        },
        {
          title: "Explainability",
          body: "AI-supported outputs should be understandable, reviewable and connected to source material where possible. Operators should be able to see whether an answer, summary or assessment came from approved knowledge, workflow data or human review.",
        },
        {
          title: "Limitations Of AI Analysis",
          body: "AI analysis can be incomplete, uncertain or incorrect. It should not be treated as a guarantee of identity authenticity, fraud prevention, trustworthiness or regulatory compliance.",
        },
        {
          title: "AI Risk Awareness",
          body: "The platform recognizes risks including over-reliance, biased or incomplete context, automation drift and unclear accountability. Governance controls should reduce these risks through evidence-backed review and auditability.",
        },
        {
          title: "Governance-First Design",
          body: "Cyber Sentinels keeps AI execution subordinate to enterprise policy and accountable people. High-risk outcomes require visible authorization, evidence verification, escalation and review paths.",
        },
        {
          title: "Enterprise AI Sovereignty",
          body: "Customer-owned operational memory, restricted-data controls and provider-agnostic governance keep enterprise policy stable when AI providers change. Provider-specific guarantees must be verified before sensitive processing.",
        },
        {
          title: "Appeals And Review Paths",
          body: "Where a trust assessment affects access, status or review outcomes, users may need practical routes to request review, correction or deletion according to applicable policy and legal requirements.",
        },
      ]}
    />
  );
}
