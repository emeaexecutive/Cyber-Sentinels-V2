"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function TrustRadarRefresh() {
  const router = useRouter();

  useEffect(() => {
    const interval = window.setInterval(() => {
      router.refresh();
    }, 12000);

    return () => window.clearInterval(interval);
  }, [router]);

  return null;
}
