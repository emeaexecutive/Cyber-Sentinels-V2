import type { Metadata } from "next";
import { LegalDraftPage } from "@/components/legal-draft-page";

export const metadata: Metadata = {
  title: "Careers | Cyber Sentinels",
  description: "Career and hiring information for Cyber Sentinels.",
  alternates: { canonical: "/careers" },
};

export default function CareersPage() {
  return (
    <LegalDraftPage
      title="Careers"
      subtitle="Cyber Sentinels career information will be published when roles, hiring process details and candidate privacy notices are approved."
      sections={[
        {
          title: "Current Status",
          body: "No public roles are listed in this draft. Future postings should include role scope, location expectations, compensation practices where required and application instructions.",
        },
        {
          title: "Candidate Privacy",
          body: "Candidate data handling, retention and review access should be documented before collecting applications through the site.",
        },
        {
          title: "Hiring Principles",
          body: "Hiring workflows should be fair, transparent, privacy-aware and reviewed before public launch.",
        },
      ]}
    />
  );
}
