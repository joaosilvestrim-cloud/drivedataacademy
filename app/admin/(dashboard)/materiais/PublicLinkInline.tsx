"use client";

import { useEffect, useState } from "react";
import CopyButton from "./CopyButton";

export default function PublicLinkInline({ slug }: { slug: string }) {
  const [origin, setOrigin] = useState("");
  useEffect(() => setOrigin(window.location.origin), []);
  const url = `${origin}/materiais/${slug}`;

  return (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      <code className="truncate rounded-md border border-white/10 bg-ink-900/60 px-2 py-1 text-xs text-brand-teal">
        /materiais/{slug}
      </code>
      <CopyButton text={url} label="Copiar link" />
      <a
        href={`/materiais/${slug}`}
        target="_blank"
        rel="noreferrer"
        className="rounded-lg border border-white/10 px-3 py-1 text-xs font-medium text-slate-300 hover:border-white/30 hover:text-white"
      >
        Abrir
      </a>
    </div>
  );
}
