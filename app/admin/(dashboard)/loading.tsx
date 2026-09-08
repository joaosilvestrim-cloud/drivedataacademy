export default function AdminLoading() {
  return (
    <div className="animate-pulse">
      <div className="h-8 w-56 rounded-lg bg-white/[0.05]" />
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-20 rounded-2xl border border-white/8 bg-white/[0.03]" />
        ))}
      </div>
      <div className="mt-8 space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-14 rounded-xl border border-white/8 bg-white/[0.03]" />
        ))}
      </div>
    </div>
  );
}
