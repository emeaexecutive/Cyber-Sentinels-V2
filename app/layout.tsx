import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cyber Sentinels V2 | AI Trust Infrastructure",
  description: "Proof-before-permission infrastructure for humans, autonomous agents and synthetic content.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
