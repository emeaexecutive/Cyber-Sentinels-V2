import type { Metadata } from "next";
import Link from "next/link";
import {
  GlobalNavigation,
  type NavigationAccessLevel,
} from "@/components/global-navigation";
import {
  EnterpriseTrustOSShell,
  type TrustOSStatusItem,
} from "@/components/trust-os/enterprise-shell";
import { hasAdminVerifiedCookie, isAdminAllowlisted } from "@/lib/admin-auth";
import { buildPlatformHealth } from "@/lib/core/platform-health";
import { createNavigationClient } from "@/lib/supabase/server";
import { ReportIssue } from "@/components/report-issue";
import { PublicPageAdoptionRail } from "@/components/public-page-adoption-rail";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.cybersentinels.com"),
  title: "Cyber Sentinels | Operational Trust Infrastructure",
  description:
    "Continuously verify humans, AI agents, machine identities and regulated workflows before, during and after critical actions.",
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
      ["/platform#trust-engine", "Trust Orchestrator"],
      ["/platform#runtime-engine", "Runtime Trust"],
      ["/platform#authorization-gateway", "Authorization & Enforcement"],
      ["/platform#trust-fabric", "Enterprise Trust Fabric™"],
    ],
  },
  {
    title: "Trust",
    links: [
      ["/trust#living-trust-profile", "Living Trust Profile"],
      ["/trust#trust-dna", "Trust DNA™"],
      ["/trust#trust-memory", "Trust Memory™"],
      ["/verification-replay", "Replay"],
      ["/trust#evidence-audit", "Evidence & Audit"],
      ["/governance", "Governance"],
      ["/trust/data-sovereignty", "AI Sovereignty"],
      ["/trust#ml-validation", "Validation Transparency"],
    ],
  },
  {
    title: "Solutions",
    links: [
      ["/solutions#ai-operations", "AI Agent Operations"],
      ["/solutions#vendor-access", "Machine Identity"],
      ["/solutions#privileged-operations", "Regulated Workflows"],
      ["/solutions#financial-services", "Financial Services"],
      ["/solutions#insurance", "Insurance"],
      ["/solutions#critical-infrastructure", "Critical Infrastructure"],
      ["/enterprise/hiring-security", "Hiring Security"],
    ],
  },
  {
    title: "Enterprise",
    links: [
      ["/security", "Security"],
      ["/enterprise#compliance", "Compliance"],
      ["/enterprise#deployment", "Deployment"],
      ["/platform#trust-fabric", "Architecture"],
      ["/enterprise/buyer-documentation", "Buyer Documentation"],
      ["/enterprise/pilot-checklist", "Pilot Checklist"],
      ["/enterprise/pilot", "Pilot Programme"],
      ["/enterprise#support", "Enterprise Support"],
    ],
  },
  {
    title: "Developers & Resources",
    links: [
      ["/developers", "Developer Overview"],
      ["/developers/docs", "API Documentation"],
      ["/developers/authentication", "Authentication"],
      ["/developers/docs#webhooks", "Webhooks"],
      ["/developers/docs#integrations", "Integrations"],
      ["/methodology", "Methodology"],
      ["/journal", "Journal"],
      ["/regulatory", "Regulatory Material"],
    ],
  },
  {
    title: "Company",
    links: [
      ["/about", "About"],
      ["/about/mission", "Mission"],
      ["/our-people", "Our People"],
      ["/careers", "Careers"],
      ["/enterprise-access", "Contact"],
      ["/media-centre", "Media Centre"],
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
      ["/modern-slavery", "Modern Slavery"],
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

function getTrustOSStatus(accessLevel: Exclude<NavigationAccessLevel, "public">): TrustOSStatusItem[] {
  const isAdmin = accessLevel === "admin";
  const health = isAdmin ? buildPlatformHealth({ authConfigured: true }) : null;
  const unknown = "unknown" as const;

  return [
    { label: "Platform", status: health?.applicationStatus ?? unknown, href: "/dashboard", boundary: "Admin health derives from authenticated access and retained local diagnostics." },
    { label: "Trust", status: health?.replayHealth.status ?? unknown, href: "/trust-center", boundary: "Trust is workflow-specific; missing global measurements remain awaiting data." },
    { label: "Providers", status: health?.providerHealth.status ?? unknown, href: isAdmin ? "/admin/provider-status" : "/trust-center#providers", boundary: "Provider status is protected and never inferred from credentials alone." },
    { label: "Runtime", status: health?.runtimeHealth.status ?? unknown, href: "/dashboard/session-integrity", boundary: "Runtime health uses retained in-process samples only." },
    { label: "Queues", status: health?.queues.status ?? unknown, href: "/dashboard/governance", boundary: "Queue diagnostics are process-local, not fleet-wide telemetry." },
    { label: "Validation", status: health?.validationHealth.status ?? unknown, href: isAdmin ? "/dashboard/validation" : "/trust-center", boundary: "Validation remains blocked until reviewed dataset thresholds are met." },
    { label: "Security", status: health?.authHealth.status ?? (accessLevel === "admin-unverified" ? "degraded" : "healthy"), href: "/dashboard/session-security", boundary: "Status reflects authenticated workspace access, not a complete external security audit." },
  ];
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { accessLevel } = await getNavigationState();
  const trustOSStatus = accessLevel === "public" ? [] : getTrustOSStatus(accessLevel);

  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <div className="shell">
          <GlobalNavigation accessLevel={accessLevel} />
          {accessLevel === "public" ? children : (
            <EnterpriseTrustOSShell accessLevel={accessLevel} status={trustOSStatus}>
              {children}
            </EnterpriseTrustOSShell>
          )}
          {accessLevel === "public" ? <PublicPageAdoptionRail /> : null}
          {accessLevel !== "public" ? <ReportIssue authState={accessLevel} /> : null}
          {accessLevel === "public" ? <footer className="border-t border-zinc-900 bg-black px-6 py-10 text-sm text-zinc-500 md:px-8">
            <div className="mx-auto grid max-w-7xl gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
              {footerSections.map((section) => (
                <nav key={section.title} aria-label={`${section.title} footer navigation`} className="min-w-0">
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
          </footer> : null}
        </div>
      </body>
    </html>
  );
}
