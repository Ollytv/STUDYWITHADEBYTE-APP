export function SkeletonCard({ className = '' }: { className?: string }) {
  return (
    <div className={`bg-dark-800 rounded-2xl border border-white/5 overflow-hidden ${className}`}>
      <div className="p-4 space-y-3">
        <div className="h-4 bg-dark-700 rounded-lg w-3/4 animate-pulse" />
        <div className="h-3 bg-dark-700 rounded-lg w-1/2 animate-pulse" />
        <div className="h-3 bg-dark-700 rounded-lg w-2/3 animate-pulse" />
      </div>
    </div>
  );
}

export function SkeletonList({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

export function SkeletonText({ className = '' }: { className?: string }) {
  return <div className={`h-4 bg-dark-700 rounded-lg animate-pulse ${className}`} />;
}
