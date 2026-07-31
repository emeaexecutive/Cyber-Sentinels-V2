import type { Metadata } from "next";
import { LegalDraftPage } from "@/components/legal-draft-page";
import { legalDraftLinks } from "@/lib/legal/draftPages";

export const metadata: Metadata = {
  title: "Cookies and Preferences | Cyber Sentinels",
  description: "How Cyber Sentinels uses cookies, browser storage and privacy preferences.",
  alternates: { canonical: "/cookies" },
};

export default function CookiesPage() {
  return (
    <LegalDraftPage
      title="Cookies and Preferences"
      subtitle="This draft explains how cookies and similar browser storage may support Cyber Sentinels sessions, security and future preferences."
      sections={[
        {
          title: "Essential Cookies",
          body: "Essential cookies support core service operation, including routing, session continuity, authentication and secure access to protected workflows.",
        },
        {
          title: "Authentication Cookies",
          body: "Authentication cookies help maintain signed-in sessions and admin verification state. Removing them may end the session or require re-verification.",
        },
        {
          title: "Analytics Placeholder",
          body: "Analytics cookies are not described as active here. If analytics are added, they should be documented with consent and preference controls where required.",
        },
        {
          title: "Preferences",
          body: "Preference controls should allow users to manage optional cookies before optional tracking or marketing technologies are enabled.",
        },
        {
          title: "Managing Cookies",
          body: "Users can manage cookies through browser settings. Blocking essential cookies may prevent login, admin access or evidence workflows from working correctly.",
        },
      ]}
      links={legalDraftLinks}
    />
  );
}
