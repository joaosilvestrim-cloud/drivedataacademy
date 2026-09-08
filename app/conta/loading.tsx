export default function ContaLoading() {
  return (
    <div className="animate-pulse">
      <div className="h-28 rounded-3xl border border-white/8 bg-white/[0.03]" />
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 rounded-2xl border border-white/8 bg-white/[0.03]" />
        ))}
      </div>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-40 rounded-2xl border border-white/8 bg-white/[0.03]" />
        ))}
      </div>
    </div>
  );
}
