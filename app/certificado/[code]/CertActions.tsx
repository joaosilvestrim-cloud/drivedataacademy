"use client";

export default function CertActions({ shareUrl }: { shareUrl: string }) {
  const linkedin = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`;
  return (
    <div className="no-print mt-8 flex flex-wrap items-center justify-center gap-3">
      <button
        onClick={() => window.print()}
        className="rounded-xl bg-gradient-to-r from-brand-green to-brand-blue px-6 py-3 text-sm font-semibold text-ink-900 transition-transform hover:scale-[1.02]"
      >
        Baixar / Imprimir PDF
      </button>
      <a
        href={linkedin}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-6 py-3 text-sm font-semibold text-white transition-colors hover:border-brand-green/50 hover:text-brand-green"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M4.98 3.5C4.98 4.88 3.87 6 2.5 6S0 4.88 0 3.5 1.12 1 2.5 1s2.48 1.12 2.48 2.5zM.5 8h4V24h-4V8zm7.5 0h3.8v2.2h.05c.53-1 1.83-2.2 3.77-2.2 4.03 0 4.78 2.65 4.78 6.1V24h-4v-6.8c0-1.62-.03-3.7-2.25-3.7-2.25 0-2.6 1.76-2.6 3.58V24h-4V8z" /></svg>
        Compartilhar no LinkedIn
      </a>
    </div>
  );
}
