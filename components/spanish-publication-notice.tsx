import Link from "next/link";
import { spanishPublicationNotices, type SpanishNoticePath } from "@/lib/i18n/public-notices";

// Translate the ACTUAL public notice, never the unpublished legal draft.
export function SpanishPublicationNotice({ path }: { path: SpanishNoticePath }) {
  return <main className="min-h-screen bg-[#04070c] px-6 py-12 text-white md:px-8">
    <div className="mx-auto max-w-3xl">
      <h1 className="text-4xl font-semibold">{spanishPublicationNotices[path]}</h1>
      <p className="mt-5 leading-7 text-zinc-300">El contenido de esta página está en revisión. Todavía no se ha publicado una versión aprobada.</p>
      <nav id="responsible-disclosure" aria-label="Contacto y privacidad" className="mt-6 flex flex-wrap gap-6">
        <Link href="/es/enterprise-access?intent=trust-team" className="text-cyan-200 underline">Contactar con Cyber Sentinels</Link>
        <Link href="/privacy/preferences" hrefLang="en" className="text-cyan-200 underline">Gestionar preferencias de privacidad (en inglés)</Link>
        {path === "/privacy" && <Link href="/privacy/cookies" hrefLang="en" className="text-cyan-200 underline">Catálogo de cookies (en inglés)</Link>}
      </nav>
    </div>
  </main>;
}
