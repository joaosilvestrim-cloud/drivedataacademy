"use client";

import { useState } from "react";
import { rateCourse } from "./actions";

function Star({ filled, half, onClick, onEnter, interactive }: { filled: boolean; half?: boolean; onClick?: () => void; onEnter?: () => void; interactive?: boolean }) {
  return (
    <button type="button" disabled={!interactive} onClick={onClick} onMouseEnter={onEnter} className={interactive ? "transition-transform hover:scale-110" : "cursor-default"} aria-label="estrela">
      <svg width="20" height="20" viewBox="0 0 24 24" className={filled ? "text-amber-300" : "text-slate-600"}>
        <defs><linearGradient id="half"><stop offset="50%" stopColor="currentColor" /><stop offset="50%" stopColor="transparent" /></linearGradient></defs>
        <path d="M12 3l2.9 5.9 6.5.9-4.7 4.6 1.1 6.5L12 17.8 6.2 21l1.1-6.5L2.6 9.8l6.5-.9L12 3z" fill={half ? "url(#half)" : filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
      </svg>
    </button>
  );
}

export default function RatingStars({ courseId, avg, count, mine }: { courseId: string; avg: number; count: number; mine: number }) {
  const [myRating, setMyRating] = useState(mine);
  const [hover, setHover] = useState(0);
  const [saved, setSaved] = useState(false);

  async function set(n: number) {
    setMyRating(n);
    setSaved(false);
    const r = await rateCourse(courseId, n);
    if (r.ok) { setSaved(true); setTimeout(() => setSaved(false), 2000); }
  }

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-xl border border-white/8 bg-white/[0.02] px-4 py-2.5">
      <div className="flex items-center gap-1.5">
        <span className="font-display text-lg font-bold text-amber-300">{avg ? avg.toFixed(1) : "—"}</span>
        <div className="flex" onMouseLeave={() => setHover(0)}>
          {[1, 2, 3, 4, 5].map((n) => (
            <Star key={n} filled={n <= Math.round(avg)} interactive={false} />
          ))}
        </div>
        <span className="text-xs text-slate-500">({count})</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs text-slate-400">Sua nota:</span>
        <div className="flex" onMouseLeave={() => setHover(0)}>
          {[1, 2, 3, 4, 5].map((n) => (
            <Star key={n} filled={n <= (hover || myRating)} interactive onClick={() => set(n)} onEnter={() => setHover(n)} />
          ))}
        </div>
        {saved && <span className="text-xs text-brand-green">obrigado!</span>}
      </div>
    </div>
  );
}
