import { LegalDraftPage } from "@/components/legal-draft-page";

export default function OurPeoplePage() {
  return (
    <LegalDraftPage
      title="Our People"
      subtitle="Cyber Sentinels is built around human-governed trust operations, security review and accountable decision workflows."
      sections={[
        {
          title: "Human Governance",
          body: "The product direction centers human review for sensitive evidence, decisions, trust graph interpretation and high-risk workflow authorization.",
        },
        {
          title: "Accountable Operations",
          body: "Operational roles, responsibilities and escalation paths should be documented before production deployment.",
        },
        {
          title: "Public Team Information",
          body: "Leadership, advisors, hiring contacts and team biographies should be published only after consent and communications review.",
        },
      ]}
    />
  );
}
