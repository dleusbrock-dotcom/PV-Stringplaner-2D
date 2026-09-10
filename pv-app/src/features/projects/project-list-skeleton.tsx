export function ProjectListSkeleton() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="bg-[var(--panel)] border border-[var(--line)] rounded-[var(--radius)] overflow-hidden animate-pulse"
        >
          <div className="h-1 bg-[var(--line)]" />
          <div className="p-4 space-y-3">
            <div className="flex gap-2">
              <div className="h-4 w-24 bg-[var(--line)] rounded" />
              <div className="h-4 w-16 bg-[var(--line)] rounded-full" />
            </div>
            <div className="h-4 w-3/4 bg-[var(--line)] rounded" />
            <div className="space-y-1.5">
              <div className="h-3 w-1/2 bg-[var(--line)] rounded" />
              <div className="h-3 w-2/3 bg-[var(--line)] rounded" />
            </div>
            <div className="h-px bg-[var(--line)]" />
            <div className="flex gap-4">
              <div className="h-3 w-12 bg-[var(--line)] rounded" />
              <div className="h-3 w-12 bg-[var(--line)] rounded" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
