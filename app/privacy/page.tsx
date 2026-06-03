import { LegalDraftPage } from "@/components/legal-draft-page";
import { commonLegalSections, legalDraftLinks } from "@/lib/legal/draftPages";

export default function PrivacyPage() {
  return (
    <LegalDraftPage
      title="Privacy Policy"
      subtitle="Cyber Sentinels stores trust workflow records such as passports, evidence metadata, decisions, signals and audit events for operational verification."
      sections={[
        ...commonLegalSections,
        {
          title: "Personal Data",
          body: "Data may include account identifiers, requester email, profile details supplied by users, evidence metadata and review history. Evidence file access should remain private and controlled.",
        },
        {
          title: "Data Rights",
          body: "Users can request access, deletion, correction or export through the Data Rights page. Requests are reviewed before action is taken.",
        },
      ]}
      links={legalDraftLinks}
    />
  );
}
