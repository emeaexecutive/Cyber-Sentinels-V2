import { LegalDraftPage } from "@/components/legal-draft-page";
import { legalDraftLinks } from "@/lib/legal/draftPages";

export default function AiGovernancePage() {
  return (
    <LegalDraftPage
      title="AI Governance"
      subtitle="Cyber Sentinels treats AI as an assistive capability inside evidence-backed, human-governed trust workflows."
      links={legalDraftLinks}
      sections={[
        {
          title: "AI-Assisted Workflows",
          body: "AI may be used to assist administrative workflows, draft explanations, summarize approved knowledge material or support operational review. AI assistance should remain bounded by approved sources, evidence context and human oversight.",
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
          body: "Cyber Sentinels is designed so AI assistance supports controlled workflows rather than replacing accountability. High-risk trust outcomes should involve escalation, evidence verification and review paths.",
        },
        {
          title: "Appeals And Review Paths",
          body: "Where a trust assessment affects access, status or review outcomes, users may need practical routes to request review, correction or deletion according to applicable policy and legal requirements.",
        },
      ]}
    />
  );
}
