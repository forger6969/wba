export function SkeletonKpis({ count = 4, className = 'grid-cols-2 lg:grid-cols-4' }) {
  return (
    <div className={`grid gap-4 ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card" style={{ background: 'var(--surface)' }}><div className="card-body p-5 gap-3">
          <div className="flex items-center gap-3">
            <div className="skeleton w-10 h-10 rounded-xl" />
            <div className="skeleton h-3 w-20" />
          </div>
          <div className="skeleton h-8 w-24 mt-1" />
          <div className="skeleton h-3 w-16" />
        </div></div>
      ))}
    </div>
  );
}

export function SkeletonKpisStrict({ count = 6 }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={`
          animate-scale-in stagger-${i + 1}
          bg-white
          border border-[var(--border-subtle)]
          rounded-[var(--radius-card)]
          p-4 md:p-5
          shadow-[var(--shadow-card)]
        `}>
          <div className="flex items-center justify-between">
            <div className="skeleton w-10 h-10 rounded-[var(--radius-tight)]" />
          </div>
          <div className="skeleton h-3 w-20 mt-3" />
          <div className="skeleton h-8 w-24 mt-1" />
          <div className="skeleton h-3 w-16 mt-1" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonTable({ rows = 5, cols = 5 }) {
  return (
    <div className="card" style={{ background: 'var(--surface)' }}><div className="card-body">
      <div className="skeleton h-4 w-40 mb-3" />
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="flex items-center gap-3">
            <div className="skeleton w-9 h-9 rounded-full shrink-0" />
            {Array.from({ length: cols - 1 }).map((_, c) => (
              <div key={c} className="skeleton h-3 flex-1" />
            ))}
          </div>
        ))}
      </div>
    </div></div>
  );
}

export function SkeletonList({ rows = 5 }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <div className="skeleton w-8 h-8 rounded-full shrink-0" />
          <div className="flex-1 space-y-1.5">
            <div className="skeleton h-3 w-2/3" />
            <div className="skeleton h-2 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}
