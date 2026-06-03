import type { Metadata } from "next";
import { GlobalNavigation } from "@/components/global-navigation";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cyber Sentinels V2 | AI Trust Infrastructure",
  description: "Proof-before-permission infrastructure for humans, autonomous agents and synthetic content.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <div className="shell">
          <GlobalNavigation />
          {children}
          <footer className="border-t border-zinc-900 bg-black px-6 py-8 text-sm text-zinc-500 md:px-8">
            <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4">
              <p>©2026 Cyber Sentinels™</p>
              <nav className="flex flex-wrap gap-3">
                {[
                  ["/privacy", "Privacy"],
                  ["/terms", "Terms"],
                  ["/cookies", "Cookies"],
                  ["/legal", "Legal"],
                  ["/regulatory", "Regulatory"],
                  ["/accessibility", "Accessibility"],
                  ["/security", "Security and online safety"],
                  ["/data-rights", "Data Rights"],
                  ["/about", "About us"],
                  ["/media-centre", "Media centre"],
                  ["/careers", "Careers"],
                  ["/modern-slavery", "Modern Slavery"],
                  ["/sustainability", "Sustainability"],
                ].map(([href, label]) => (
                  <Link key={href} href={href} className="hover:text-white">
                    {label}
                  </Link>
                ))}
              </nav>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
