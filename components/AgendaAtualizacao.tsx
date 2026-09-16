"use client";

import { useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";

// Refreshes the server-rendered agenda, using the same authentication and
// published-events query as the initial request. No public copy of student data.
export default function AgendaAtualizacao() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === "visible" && !pending) {
        startTransition(() => router.refresh());
      }
    };
    const interval = window.setInterval(refresh, 60_000);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [router, pending]);
  return null;
}
