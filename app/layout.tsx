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
      ["/platform", "Platform"],
      ["/pricing", "Pricing"],
      ["/enterprise", "Enterprise"],
      ["/enterprise-access", "Enterprise access"],
      ["/journal", "Founder journal"],
      ["/design-partners", "Design partners"],
      ["/careers", "Careers"],
    ],
  },
  {
    title: "Governance",
    links: [
      ["/help", "Help"],
      ["/security", "Security"],
      ["/data-rights", "Data Rights"],
      ["/trust-principles", "Trust Principles"],
      ["/operational-principles", "Operational Principles"],
      ["/ai-governance", "AI Governance"],
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
    title: "Social",
    links: [
      ["https://www.linkedin.com", "LinkedIn"],
      ["https://x.com", "Twitter/X"],
    ],
  },
];

type NavigationState = {
  accessLevel: NavigationAccessLevel;
  authStatusError: string | null;
};

function getSafeAuthStatusError(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "Auth status check failed.";
}

async function getNavigationState(): Promise<NavigationState> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.getUser();
    const user = data.user;

    if (error) {
      console.error("Navigation auth status failed.", error);

      return {
        accessLevel: "public",
        authStatusError: getSafeAuthStatusError(error),
      };
    }

    if (!user) {
      return { accessLevel: "public", authStatusError: null };
    }

    if (isAdminAllowlisted(user.email)) {
      if (await hasAdminVerifiedCookie()) {
        return { accessLevel: "admin", authStatusError: null };
      }

      return { accessLevel: "admin-unverified", authStatusError: null };
    }

    return { accessLevel: "user", authStatusError: null };
  } catch (error) {
    console.error("Navigation auth status check crashed.", error);

    return {
      accessLevel: "public",
      authStatusError: getSafeAuthStatusError(error),
    };
  }
}

function TemporaryAuthDiagnostic({ message }: { message: string }) {
  return (
    <div className="border-b border-amber-500/40 bg-amber-950 px-6 py-3 text-sm text-amber-100 md:px-8">
      <div className="mx-auto max-w-7xl">
        <p className="font-semibold">Temporary loading diagnostic</p>
        <p className="mt-1 text-amber-100/85">
          Auth status failed, so Cyber Sentinels rendered the public homepage
          instead of waiting indefinitely. {message}
        </p>
      </div>
    </div>
  );
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { accessLevel, authStatusError } = await getNavigationState();

  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <div className="shell">
          <GlobalNavigation accessLevel={accessLevel} />
          {authStatusError ? (
            <TemporaryAuthDiagnostic message={authStatusError} />
          ) : null}
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
