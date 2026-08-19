"use client";

import { useState } from "react";

// Mascote/assistente DriveData. Usa /assistente.png; se faltar, cai num SVG.
export default function Mascot({ className = "h-12 w-12" }: { className?: string }) {
  const [err, setErr] = useState(false);
  if (err) {
    return (
      <svg viewBox="0 0 64 64" className={className} fill="none" aria-hidden>
        <rect x="14" y="18" width="36" height="30" rx="12" fill="#0b1220" />
        <rect x="12" y="14" width="40" height="24" rx="12" fill="#e8edf5" />
        <rect x="18" y="19" width="28" height="14" rx="7" fill="#0b1220" />
        <circle cx="26" cy="26" r="2.4" fill="#3b9dff" />
        <circle cx="38" cy="26" r="2.4" fill="#3b9dff" />
        <path d="M27 30q5 3 10 0" stroke="#2ee6d6" strokeWidth="1.6" strokeLinecap="round" />
        <rect x="20" y="40" width="24" height="14" rx="6" fill="#e8edf5" />
        <path d="M28 44l3 3 5-5" stroke="#34e8a0" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src="/assistente.png" alt="Assistente DriveData" className={`object-contain ${className}`} onError={() => setErr(true)} />;
}
