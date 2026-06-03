import { LegalDraftPage } from "@/components/legal-draft-page";

export default function MediaCentrePage() {
  return (
    <LegalDraftPage
      title="Media Centre"
      subtitle="Media resources and company updates for Cyber Sentinels will be maintained here after approval."
      sections={[
        {
          title: "Press Resources",
          body: "Approved boilerplate, media contacts, screenshots, logos and product descriptions should be added only after communications review.",
        },
        {
          title: "Public Statements",
          body: "Security, regulatory, compliance, customer and funding statements should not be published unless verified and approved.",
        },
        {
          title: "Brand Use",
          body: "Brand assets and trademarks should be used according to approved guidelines once those guidelines are finalized.",
        },
      ]}
    />
  );
}
