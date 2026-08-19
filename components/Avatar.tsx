// Avatar de iniciais com gradiente determinístico pelo nome.
const GRADIENTS: [string, string][] = [
  ["#34e8a0", "#2ee6d6"],
  ["#3b9dff", "#22d3ee"],
  ["#2ee6d6", "#3b9dff"],
  ["#a78bfa", "#3b9dff"],
  ["#f0abfc", "#a78bfa"],
  ["#fbbf24", "#f59e0b"],
  ["#34e8a0", "#3b9dff"],
  ["#22d3ee", "#34e8a0"],
];

const SIZES: Record<string, string> = {
  xs: "h-7 w-7 text-[0.65rem]",
  sm: "h-9 w-9 text-xs",
  md: "h-11 w-11 text-sm",
  lg: "h-14 w-14 text-base",
};

function initials(name: string): string {
  const parts = (name || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function Avatar({ name, size = "sm", className = "" }: { name: string; size?: keyof typeof SIZES; className?: string }) {
  let hash = 0;
  for (let i = 0; i < (name || "").length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  const [a, b] = GRADIENTS[hash % GRADIENTS.length];
  return (
    <span
      className={`grid shrink-0 place-items-center rounded-full font-bold text-ink-900 shadow-sm ${SIZES[size]} ${className}`}
      style={{ backgroundImage: `linear-gradient(135deg, ${a}, ${b})` }}
      aria-hidden
    >
      {initials(name)}
    </span>
  );
}
