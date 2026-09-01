/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Vercel retains its existing output path. Docker alone opts into Next.js
  // output tracing so the final image contains only the standalone runtime.
  output: process.env.CYBER_SENTINELS_DOCKER_BUILD === "1" ? "standalone" : undefined,
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "cybersentinels.com" }],
        destination: "https://www.cybersentinels.com/:path*",
        permanent: true,
      },
      { source: "/about-us", destination: "/about", permanent: true },
      { source: "/design-partners", destination: "/design-partner", permanent: true },
      { source: "/modern-slavery-statement", destination: "/modern-slavery", permanent: true },
      { source: "/trust-posture", destination: "/trust#trust-posture", permanent: true },
      { source: "/reality-os", destination: "/platform", permanent: true },
      { source: "/trust-os", destination: "/platform", permanent: true },
      { source: "/trust-fabric", destination: "/platform#trust-fabric", permanent: true },
      { source: "/docs/BUYER_JOURNEYS.md", destination: "/enterprise/buyer-documentation", permanent: true },
      { source: "/docs/ENTERPRISE_PILOT_CHECKLIST.md", destination: "/enterprise/pilot-checklist", permanent: true },
    ];
  },
  async headers() {
    const previewHeaders = process.env.VERCEL_ENV === "production"
      ? []
      : [{ key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" }];
    const securityHeaders = [
      ...(process.env.NODE_ENV === "development" ? [] : [{
        key: "Content-Security-Policy",
        value: [
          "default-src 'self'",
          "base-uri 'self'",
          "frame-ancestors 'none'",
          "object-src 'none'",
          "img-src 'self' data: blob: https:",
          "font-src 'self' data:",
          "style-src 'self' 'unsafe-inline'",
          "script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com",
          "connect-src 'self' https://*.supabase.co https://api.stripe.com https://*.stripe.com https://api.openai.com https://challenges.cloudflare.com",
          "frame-src https://*.stripe.com https://challenges.cloudflare.com",
          "form-action 'self'",
          "upgrade-insecure-requests",
        ].join("; "),
      }]),
      { key: "X-Frame-Options", value: "DENY" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "X-Content-Type-Options", value: "nosniff" },
      {
        key: "Strict-Transport-Security",
        value: "max-age=63072000; includeSubDomains; preload",
      },
      {
        key: "Permissions-Policy",
        value: "camera=(), microphone=(), geolocation=(), payment=(self)",
      },
      { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
      { key: "Cross-Origin-Resource-Policy", value: "same-site" },
      ...previewHeaders,
    ];

    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
      ...[
        "/login",
        "/verify-email",
        "/reset-password",
        "/privacy/preferences",
        "/privacy/consent-history",
      ].map((source) => ({
        source,
        headers: [
          { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" },
        ],
      })),
    ];
  },
};

export default nextConfig;
