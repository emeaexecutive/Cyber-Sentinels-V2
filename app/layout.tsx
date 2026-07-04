import type { Metadata } from "next";
import Link from "next/link";
import {
  GlobalNavigation,
  type NavigationAccessLevel,
} from "@/components/global-navigation";
import { hasAdminVerifiedCookie, isAdminAllowlisted } from "@/lib/admin-auth";
import { createNavigationClient } from "@/lib/supabase/server";
import { ReportIssue } from "@/components/report-issue";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.cybersentinels.com"),
  title: "Cyber Sentinels | TrustOps Operating System",
  description:
    "Cyber Sentinels preserves operational trust continuity across humans, AI agents and enterprise workflows with replayable enterprise memory.",
  alternates: {
    canonical: "/",
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "32x32" },
      { url: "/favicon.png", type: "image/png", sizes: "32x32" },
    ],
    shortcut: "/favicon.ico",
  },
};

const footerSections = [
  {
    title: "Company",
    links: [
      ["/about", "About us"],
      ["/platform", "Platform"],
      ["/pricing", "Pricing"],
      ["/enterprise", "Enterprise"],
      ["/investor", "Investor overview"],
      ["/enterprise-access", "Enterprise access"],
      ["/design-partner", "Design partners"],
      ["/careers", "Careers"],
    ],
  },
  {
    title: "Security & Trust",
    links: [
      ["/help", "Help"],
      ["/security", "Security & Trust"],
      ["/trust", "Trust Center"],
      ["/methodology", "Methodology"],
      ["/security#responsible-disclosure", "Responsible Disclosure"],
      ["/trust/data-sovereignty", "AI & Data Sovereignty"],
      ["/data-rights", "Data Rights"],
      ["/transparency", "Transparency"],
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
      ["/modern-slavery", "Modern Slavery statement"],
    ],
  },
  {
    title: "Contact",
    links: [
      ["mailto:contact@cybersentinels.ai", "Company contact"],
      ["mailto:security@cybersentinels.ai", "Security contact"],
      ["mailto:trust@cybersentinels.ai", "Trust contact"],
      ["mailto:abuse@cybersentinels.ai", "Report abuse"],
      ["https://www.linkedin.com", "LinkedIn"],
      ["https://x.com", "Twitter/X"],
    ],
  },
];

type NavigationState = {
  accessLevel: NavigationAccessLevel;
};

type NavigationLogState = typeof globalThis & {
  __cyberSentinelsNavigationAuthWarningShown?: boolean;
};

function warnNavigationAuthUnavailable(error: unknown) {
  const state = globalThis as NavigationLogState;
  if (state.__cyberSentinelsNavigationAuthWarningShown) {
    return;
  }
  state.__cyberSentinelsNavigationAuthWarningShown = true;
  console.warn(
    "Navigation auth status unavailable",
    error instanceof Error ? error.message : "Unknown navigation auth error."
  );
}

async function getNavigationState(): Promise<NavigationState> {
  try {
    const supabase = await createNavigationClient();
    if (!supabase) {
      return { accessLevel: "public" };
    }
    const { data, error } = await supabase.auth.getSession();

    if (error) {
      warnNavigationAuthUnavailable(error);
      return { accessLevel: "public" };
    }

    const user = data.session?.user ?? null;

    if (!user) {
      return { accessLevel: "public" };
    }

    if (isAdminAllowlisted(user.email)) {
      if (await hasAdminVerifiedCookie()) {
        return { accessLevel: "admin" };
      }

      return { accessLevel: "admin-unverified" };
    }

    return { accessLevel: "user" };
  } catch (error) {
    warnNavigationAuthUnavailable(error);

    return { accessLevel: "public" };
  }
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { accessLevel } = await getNavigationState();

  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <div className="shell">
          <GlobalNavigation accessLevel={accessLevel} />
          {children}
          {accessLevel !== "public" ? <ReportIssue authState={accessLevel} /> : null}
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
              <p className="mt-3 max-w-3xl leading-6">
                Cyber Sentinels maintains Operational Trust through Persistent
                Trust Posture, Replay Timeline, protected evidence handling and
                accountable Governance Review.
              </p>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
