import { LegalDraftPage } from "@/components/legal-draft-page";
import { legalDraftLinks } from "@/lib/legal/draftPages";

export default function RegulatoryPage() {
  return (
    <LegalDraftPage
      title="Regulatory"
      subtitle="Cyber Sentinels supports governance-aware trust workflows, but formal regulatory positions depend on jurisdiction, use case and legal review."
      sections={[
        {
          title: "AI Governance Posture",
          body: "The platform is structured to keep high-impact trust workflows explainable, auditable and subject to human review rather than ungoverned automation.",
        },
        {
          title: "GDPR Awareness",
          body: "Privacy, data-rights, retention, subprocessors and lawful-basis requirements should be assessed before using Cyber Sentinels with personal data in GDPR contexts.",
        },
        {
          title: "AI Act Awareness",
          body: "AI Act classification, provider/deployer responsibilities and high-risk obligations require separate review before any regulated AI deployment claim is made.",
        },
        {
          title: "Auditability",
          body: "Audit logs, signals, decisions and Trust Graph relationships are intended to support reviewability and operational accountability.",
        },
        {
          title: "Human Review",
          body: "Admin review, evidence assessment and decision workflows should remain human-governed for sensitive verification and execution contexts.",
        },
        {
          title: "No Formal Compliance Claim",
          body: "This draft does not claim SOC 2, ISO, GDPR, AI Act, biometric or sector-specific compliance unless separately verified and documented.",
        },
      ]}
      links={legalDraftLinks}
    />
  );
}
