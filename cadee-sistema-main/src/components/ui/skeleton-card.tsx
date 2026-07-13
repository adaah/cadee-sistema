export function SkeletonCard() {
  return (
    <div className="bg-card rounded-xl border border-border p-5">
      <div className="flex items-start justify-between mb-3">
        <div className="h-7 w-20 bg-muted rounded-lg" />
        <div className="flex gap-1">
          <div className="h-8 w-8 bg-muted rounded-lg" />
          <div className="h-8 w-8 bg-muted rounded-lg" />
        </div>
      </div>
      <div className="h-5 w-3/4 bg-muted rounded mb-2" />
      <div className="h-4 w-1/2 bg-muted rounded mb-3" />
      <div className="pt-3 border-t border-border">
        <div className="h-3 w-32 bg-muted rounded" />
      </div>
    </div>
  );
}
