import { serializeJsonLd } from "@/lib/search/metadata";

export function StructuredData({ value }: { value: unknown }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(value) }} />;
}
