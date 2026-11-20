import type { Metadata } from "next";
import Link from "next/link";
import { publicEnglishFallbackHref } from "@/lib/i18n/public-locales";

export const metadata: Metadata = {
  title: "Contenido en español no disponible | Cyber Sentinels",
  description: "Esta página todavía no tiene una traducción al español revisada.",
  robots: { index: false, follow: true },
};

type UnavailablePageProps = {
  searchParams?: Promise<{ path?: string }>;
};

export default async function SpanishContentUnavailable({ searchParams }: UnavailablePageProps) {
  const params = await searchParams;
  const englishHref = publicEnglishFallbackHref(params?.path);

  return (
    <main lang="es" className="min-h-[65vh] bg-[#04070c] px-6 py-16 text-white md:px-8">
      <section className="mx-auto max-w-3xl rounded-xl border border-zinc-800 bg-black p-6 md:p-10">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-200">Cyber Sentinels · Idioma</p>
        <h1 className="mt-4 text-3xl font-semibold md:text-4xl">El contenido en español aún no está disponible en esta página.</h1>
        <p className="mt-5 text-base leading-7 text-zinc-300">
          No mostraremos una traducción incompleta como si estuviera terminada. Puedes elegir una de las páginas traducidas o continuar en inglés.
        </p>
        <div className="mt-7 flex flex-wrap gap-3">
          <Link href="/es" className="brand-primary-action">Ir a la página traducida</Link>
          <a href={englishHref} lang="en" className="brand-secondary-action">Continuar en inglés</a>
        </div>
      </section>
    </main>
  );
}
