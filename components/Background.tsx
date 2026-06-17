"use client";

/**
 * Lightweight, dependency-free ambient background: dark base, brand-colored
 * glow orbs and a faint grid. Pure CSS so it renders everywhere (no WebGL).
 */
export default function Background() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-ink-900">
      {/* radial brand glows */}
      <div className="absolute -top-40 left-1/2 h-[42rem] w-[42rem] -translate-x-1/2 rounded-full bg-brand-blue/10 blur-[140px]" />
      <div className="absolute left-[-10rem] top-1/3 h-[34rem] w-[34rem] rounded-full bg-brand-green/10 blur-[150px]" />
      <div className="absolute bottom-[-12rem] right-[-8rem] h-[36rem] w-[36rem] rounded-full bg-brand-teal/10 blur-[150px]" />
      {/* grid + noise */}
      <div className="absolute inset-0 grid-bg opacity-60" />
      <div className="absolute inset-0 noise opacity-40" />
    </div>
  );
}
