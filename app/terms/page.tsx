import { LegalDraftPage } from "@/components/legal-draft-page";
import { legalDraftLinks } from "@/lib/legal/draftPages";

export default function TermsPage() {
  return (
    <LegalDraftPage
      title="Terms and Conditions"
      subtitle="These draft terms describe expected use of Cyber Sentinels trust workflows, admin review tools and evidence-backed decision systems."
      sections={[
        {
          title: "Acceptable Use",
          body: "Users must submit accurate information, use the service for authorized trust workflows and avoid misleading, unlawful or abusive verification activity.",
        },
        {
          title: "Account Responsibility",
          body: "Users are responsible for maintaining account security, protecting credentials and ensuring that admin access is granted only to authorized personnel.",
        },
        {
          title: "Prohibited Misuse",
          body: "Prohibited uses include fraudulent evidence submission, unauthorized monitoring, attempts to bypass admin controls, abuse of data-rights workflows or misuse of trust scores.",
        },
        {
          title: "Admin Decisions",
          body: "Admin decisions should be based on evidence, policy and human review. The platform provides workflow support and does not replace organizational judgment.",
        },
        {
          title: "No Guaranteed Outcome",
          body: "Cyber Sentinels does not guarantee that a verification, trust score or graph result will approve, reject or validate any person, organization, agent or workflow.",
        },
        {
          title: "Suspension",
          body: "Accounts, workflows or access may be suspended where misuse, security risk, unauthorized access or policy violation is suspected.",
        },
        {
          title: "Limitation of Liability Placeholder",
          body: "Liability limits, warranty disclaimers, dispute terms and governing law require legal drafting before production use.",
        },
      ]}
      links={legalDraftLinks}
    />
  );
}
