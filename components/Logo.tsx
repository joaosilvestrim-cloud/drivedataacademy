"use client";

type Props = {
  size?: number;
  withWordmark?: boolean;
  className?: string;
  glow?: boolean;
};

/**
 * DriveData brand mark — a layered "D": a green→cyan→blue disc with two
 * blade strokes (blue + green) to its lower-left, evoking forward motion.
 * Shared with the institutional site so the Academy stays on-brand.
 */
export function LogoMark({ size = 34, glow = false }: { size?: number; glow?: boolean }) {
  return (
    <svg
      width={size}
      height={size * (498 / 500)}
      viewBox="0 0 500 498"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      style={glow ? { filter: "drop-shadow(0 0 24px rgba(46,230,214,0.45))" } : undefined}
    >
      <defs>
        <linearGradient id="dd-main" x1="350" y1="20" x2="190" y2="480" gradientUnits="userSpaceOnUse">
          <stop stopColor="#5fe06a" />
          <stop offset="0.5" stopColor="#13b8ef" />
          <stop offset="1" stopColor="#0a74e8" />
        </linearGradient>
        <linearGradient id="dd-blue" x1="60" y1="120" x2="250" y2="360" gradientUnits="userSpaceOnUse">
          <stop stopColor="#0b62cf" />
          <stop offset="1" stopColor="#1a86e0" />
        </linearGradient>
        <linearGradient id="dd-green" x1="20" y1="190" x2="160" y2="410" gradientUnits="userSpaceOnUse">
          <stop stopColor="#46d07c" />
          <stop offset="1" stopColor="#1f9fa3" />
        </linearGradient>
      </defs>

      {/* Main D body: flat top, right disc, slanted left stem */}
      <path d="M88 6 L250 6 A244 244 0 0 1 250 494 L158 492 Z" fill="url(#dd-main)" />

      {/* Green blade (behind, lower-left) */}
      <path d="M18 190 L92 190 L168 400 L94 400 Z" fill="url(#dd-green)" />

      {/* Blue blade (front) */}
      <path d="M48 108 L132 108 L252 352 L168 352 Z" fill="url(#dd-blue)" />
    </svg>
  );
}

export default function Logo({ size = 34, withWordmark = true, className = "", glow = false }: Props) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <LogoMark size={size} glow={glow} />
      {withWordmark && (
        <span className="font-display text-xl font-bold leading-none tracking-tight">
          <span className="text-white">Drive</span>
          <span className="text-gradient-blue">Data</span>
          <span className="ml-1.5 align-middle text-[0.62rem] font-semibold uppercase tracking-[0.32em] text-brand-green/90">
            Academy
          </span>
        </span>
      )}
    </span>
  );
}
