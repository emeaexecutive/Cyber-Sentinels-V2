import { LegalDraftPage } from "@/components/legal-draft-page";

export default function CareersPage() {
  return (
    <LegalDraftPage
      title="Careers"
      subtitle="Careers information for Cyber Sentinels will be published as roles become available."
      sections={[
        {
          title: "Current Status",
          body: "Open roles, hiring process details and candidate privacy notices are not yet published.",
        },
        {
          title: "Hiring Principles",
          body: "Future hiring workflows should be fair, transparent, privacy-aware and reviewed before public launch.",
        },
      ]}
    />
  );
}
