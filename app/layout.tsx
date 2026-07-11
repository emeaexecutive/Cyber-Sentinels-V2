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
  title: "Cyber Sentinels | Operational Trust Control Plane",
  description:
    "The operational trust control plane for humans, AI agents, machine identities and regulated workflows.",
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
    title: "Platform",
    links: [
      ["/platform", "Trust Control Plane"],
      ["/platform#runtime-engine", "Runtime Trust"],
      ["/platform#authorization-gateway", "Authorization"],
      ["/platform#evidence-graph", "Evidence Graph"],
      ["/trust#trust-memory", "Trust Memory\u2122"],
    ],
  },
  {
    title: "Trust",
    links: [
      ["/trust", "Trust Center"],
      ["/verification-replay", "Replay"],
      ["/governance", "Governance"],
      ["/trust#provenance", "Provenance"],
      ["/trust/data-sovereignty", "AI Sovereignty"],
      ["/trust#ml-validation", "Validation Transparency"],
    ],
  },
  {
    title: "Solutions",
    links: [
      ["/enterprise/agent-governance", "AI Agents"],
      ["/solutions#machine-identity-trust", "Machine Identities"],
      ["/solutions#financial-services", "Financial Services"],
      ["/solutions#insurance", "Insurance"],
      ["/solutions#executive-protection", "Executive Protection"],
      ["/enterprise/hiring-security", "Hiring Security"],
    ],
  },
  {
    title: "Developers",
    links: [
      ["/developers/docs", "API Docs"],
      ["/developers/authentication", "Authentication"],
      ["/developers/docs#webhooks", "Webhooks"],
      ["/developers/docs#integrations", "Integrations"],
      ["/developers/api-keys", "Developer Console"],
    ],
  },
  {
    title: "Company",
    links: [
      ["/about", "About"],
      ["/about/mission", "Mission"],
      ["/our-people", "Our People"],
      ["/careers", "Careers"],
      ["/enterprise-access", "Contact / Enterprise Access"],
    ],
  },
  {
    title: "Legal & Support",
    links: [
      ["/help", "Help"],
      ["/accessibility", "Accessibility"],
      ["/privacy", "Privacy"],
      ["/terms", "Terms"],
      ["/cookies", "Cookies"],
      ["/legal", "Legal"],
      ["/security", "Security"],
      ["/status", "Status"],
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
            <div className="mx-auto grid max-w-7xl gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
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
                Cyber Sentinels connects identity, authority, runtime risk,
                enforcement, replay and governance in one operational trust record.
              </p>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
