import { LegalDraftPage } from "@/components/legal-draft-page";

export default function MediaCentrePage() {
  return (
    <LegalDraftPage
      title="Media Centre"
      subtitle="Media resources and company updates for Cyber Sentinels will be maintained here."
      sections={[
        {
          title: "Press Resources",
          body: "Approved brand materials, company descriptions and media contacts should be added after communications review.",
        },
        {
          title: "Public Statements",
          body: "No regulatory, compliance or certification statements should be made unless verified and approved.",
        },
      ]}
    />
  );
}
