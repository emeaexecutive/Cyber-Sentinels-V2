import { LegalDraftPage } from "@/components/legal-draft-page";
import { commonLegalSections, legalDraftLinks } from "@/lib/legal/draftPages";

export default function AccessibilityPage() {
  return (
    <LegalDraftPage
      title="Accessibility"
      subtitle="Cyber Sentinels should be usable with clear navigation, readable contrast, keyboard-friendly controls and accessible forms."
      sections={[
        ...commonLegalSections,
        {
          title: "Current Intent",
          body: "The product aims for readable layouts, clear labels and predictable navigation across trust workflows.",
        },
        {
          title: "Future Review",
          body: "Formal WCAG testing and remediation should be completed before any certified accessibility claim is made.",
        },
      ]}
      links={legalDraftLinks}
    />
  );
}
