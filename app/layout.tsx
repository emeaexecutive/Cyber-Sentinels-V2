import type { Metadata } from "next";
import Link from "next/link";
import {
  GlobalNavigation,
  type NavigationAccessLevel,
} from "@/components/global-navigation";
import { hasAdminVerifiedCookie, isAdminAllowlisted } from "@/lib/admin-auth";
import { createClient } from "@/lib/supabase/server";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cyber Sentinels | Governed Trust Infrastructure",
  description:
    "Evidence-backed trust infrastructure for governed verification and operational transparency.",
};

const footerSections = [
  {
    title: "Company",
    links: [
      ["/about", "About us"],
      ["/enterprise-access", "Enterprise access"],
      ["/enterprise", "Enterprise"],
      ["/design-partners", "Design partners"],
      ["/pricing", "Pricing"],
      ["/trustops", "TrustOps"],
      ["/platform", "Platform"],
      ["/journal", "Founder journal"],
      ["/careers", "Careers"],
      ["/media-centre", "Media centre"],
      ["/sustainability", "Sustainability"],
      ["/modern-slavery", "Modern Slavery statement"],
    ],
  },
  {
    title: "Trust & Safety",
    links: [
      ["/security", "Security"],
      ["/help", "Help"],
      ["/data-rights", "Data Rights"],
      ["/trust-principles", "Trust Principles"],
      ["/operational-principles", "Operational Principles"],
      ["/ai-governance", "AI Governance"],
      ["/transparency", "Transparency"],
      ["/why-now", "Why Now"],
      ["/timeline", "Timeline"],
      ["/trust-os", "Trust OS"],
    ],
  },
  {
    title: "Legal",
    links: [
      ["/privacy", "Privacy"],
      ["/cookies", "Cookies"],
      ["/terms", "Terms"],
      ["/legal", "Legal"],
      ["/regulatory", "Regulatory"],
      ["/accessibility", "Accessibility"],
    ],
  },
  {
    title: "Social",
    links: [
      ["https://www.linkedin.com", "LinkedIn"],
      ["https://x.com", "Twitter/X"],
    ],
  },
];

async function getNavigationAccessLevel(): Promise<NavigationAccessLevel> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return "public";
    }

    if (isAdminAllowlisted(user.email)) {
      if (await hasAdminVerifiedCookie()) {
        return "admin";
      }

      return "admin-unverified";
    }

    return "user";
  } catch {
    return "public";
  }
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const accessLevel = await getNavigationAccessLevel();

  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <div className="shell">
          <GlobalNavigation accessLevel={accessLevel} />
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
