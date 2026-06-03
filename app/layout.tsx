import type { Metadata } from "next";
import Link from "next/link";
import { GlobalNavigation } from "@/components/global-navigation";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cyber Sentinels V2 | AI Trust Infrastructure",
  description:
    "Proof-before-permission infrastructure for humans, autonomous agents and synthetic content.",
};

const footerSections = [
  {
    title: "Company",
    links: [
      ["/about", "About us"],
      ["/media-centre", "Media centre"],
      ["/careers", "Careers"],
      ["/our-people", "Our people"],
      ["/sustainability", "Corporate sustainability"],
      ["/modern-slavery", "Modern Slavery statement"],
    ],
  },
  {
    title: "Trust & Safety",
    links: [
      ["/security", "Security and online safety"],
      ["/help", "Help"],
      ["/how-to-use", "How to Use"],
      ["/data-rights", "Data Rights"],
      ["/status", "System Status"],
    ],
  },
  {
    title: "Legal",
    links: [
      ["/privacy", "Privacy policy"],
      ["/cookies", "Cookies and preferences"],
      ["/terms", "Terms & conditions"],
      ["/legal", "Legal"],
      ["/regulatory", "Regulatory"],
      ["/accessibility", "Accessibility"],
    ],
  },
  {
    title: "Social",
    links: [
      ["https://www.linkedin.com", "LinkedIn"],
      ["https://x.com", "Twitter / X"],
    ],
  },
];

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
          <footer className="border-t border-zinc-900 bg-black px-6 py-10 text-sm text-zinc-500 md:px-8">
            <div className="mx-auto grid max-w-7xl gap-8 md:grid-cols-4">
              {footerSections.map((section) => (
                <nav key={section.title}>
                  <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-300">
                    {section.title}
                  </h2>
                  <div className="mt-4 grid gap-2">
                    {section.links.map(([href, label]) => {
                      const external = href.startsWith("http");

                      return (
                        <Link
                          key={href}
                          href={href}
                          target={external ? "_blank" : undefined}
                          rel={external ? "noreferrer" : undefined}
                          className="hover:text-white"
                        >
                          {label}
                        </Link>
                      );
                    })}
                  </div>
                </nav>
              ))}
            </div>
            <div className="mx-auto mt-8 max-w-7xl border-t border-zinc-900 pt-6">
              <p>&copy;2026 Cyber Sentinels&trade;. All rights reserved.</p>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
