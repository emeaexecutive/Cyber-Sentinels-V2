import { publicPageAlternates } from "@/lib/i18n/public-locales";
import { publicSocialMetadata } from "@/lib/search/metadata";
import type { Metadata } from "next";
import { LegalDraftPage } from "@/components/legal-draft-page";

export const metadata: Metadata = {
  robots: { index: false, follow: true },
  ...publicSocialMetadata("Media Centre | Cyber Sentinels", "Publication status: this page is under review; an approved version has not been published.", "/media-centre"),
  title: "Media Centre | Cyber Sentinels",
  description: "Publication status: this page is under review; an approved version has not been published.",
  alternates: publicPageAlternates("/media-centre"),
};

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
