import { SpanishPublicationNotice } from "@/components/spanish-publication-notice";
import { spanishNoticeMetadata } from "@/lib/i18n/public-notices";
export const dynamic = "force-dynamic";
export function generateMetadata() { return spanishNoticeMetadata("/security"); }
export default function Page() { return <SpanishPublicationNotice path="/security" />; }
