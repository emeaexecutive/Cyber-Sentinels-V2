import { LegalDraftPage } from "@/components/legal-draft-page";

export default function AboutUsPage() {
  return (
    <LegalDraftPage
      title="About Cyber Sentinels"
      subtitle="Cyber Sentinels is AI-assisted, human-governed operational trust infrastructure for identity, workforce, evidence, AI agents and governed decisions."
      sections={[
        {
          title: "What Cyber Sentinels Does",
          body: "Cyber Sentinels connects Trust Passports, evidence files, admin decisions, audit logs, signals and trust relationships into AI-assisted, human-governed operational trust infrastructure.",
        },
        {
          title: "Identity and Workforce Trust",
          body: "The platform supports workflows for people, workforce contexts, organizations, agents and high-risk actions where trust must be proven and reviewed.",
        },
        {
          title: "Evidence-Backed Decisions",
          body: "Verification outcomes should be tied to supporting evidence, human review, decision history and traceable audit records.",
        },
        {
          title: "AI Agents and Governance",
          body: "Autonomy, intent and execution workflows are designed to make agent and workflow permissions observable, explainable and governed.",
        },
        {
          title: "Review Status",
          body: "Company descriptions, claims, leadership details and public positioning require communications and legal review before production use.",
        },
      ]}
    />
  );
}
