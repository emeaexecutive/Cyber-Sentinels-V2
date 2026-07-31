import type { Metadata } from "next";
import { LegalDraftPage } from "@/components/legal-draft-page";
import { legalDraftLinks } from "@/lib/legal/draftPages";

export const metadata: Metadata = {
  title: "Accessibility | Cyber Sentinels",
  description: "Cyber Sentinels accessibility commitments and support information.",
  alternates: { canonical: "/accessibility" },
};

export default function AccessibilityPage() {
  return (
    <LegalDraftPage
      title="Accessibility"
      subtitle="Cyber Sentinels aims to provide clear, readable and keyboard-friendly trust operations workflows."
      sections={[
        {
          title: "WCAG Intent",
          body: "The product should move toward WCAG-aligned design, including meaningful structure, readable text, sufficient contrast and accessible form labels.",
        },
        {
          title: "Keyboard Navigation",
          body: "Core navigation, forms and admin actions should remain usable with keyboard input, including Escape behavior for dropdown menus.",
        },
        {
          title: "Readable Contrast",
          body: "The dark product interface should preserve strong contrast for headings, labels, form controls, status chips and operational text.",
        },
        {
          title: "Feedback Contact",
          body: "Accessibility feedback should be routed to a monitored contact channel once support ownership and response timelines are approved.",
        },
        {
          title: "Formal Review",
          body: "A formal accessibility audit should be completed before claiming WCAG conformance or certified accessibility compliance.",
        },
      ]}
      links={legalDraftLinks}
    />
  );
}
