import { LegalDraftPage } from "@/components/legal-draft-page";
import { commonLegalSections, legalDraftLinks } from "@/lib/legal/draftPages";

export default function CookiesPage() {
  return (
    <LegalDraftPage
      title="Cookies and Preferences"
      subtitle="Cyber Sentinels may use essential cookies for authentication, session handling, admin verification and security controls."
      sections={[
        ...commonLegalSections,
        {
          title: "Essential Cookies",
          body: "Authentication and admin verification cookies support secure access to protected workflows and Back Office routes.",
        },
        {
          title: "Preferences",
          body: "Preference controls should be added before optional analytics or marketing cookies are enabled.",
        },
      ]}
      links={legalDraftLinks}
    />
  );
}
