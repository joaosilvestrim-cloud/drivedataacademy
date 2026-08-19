"use client";

import { useEffect } from "react";

export default function OpenAssistant({ auto = false, className = "", children }: { auto?: boolean; className?: string; children: React.ReactNode }) {
  useEffect(() => {
    if (auto) {
      const t = setTimeout(() => window.dispatchEvent(new CustomEvent("open-assistant")), 400);
      return () => clearTimeout(t);
    }
  }, [auto]);

  return (
    <button onClick={() => window.dispatchEvent(new CustomEvent("open-assistant"))} className={className}>
      {children}
    </button>
  );
}
