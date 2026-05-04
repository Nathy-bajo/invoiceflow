import clsx from "clsx";

export function Skeleton({ className }: { className?: string }) {
  return <div className={clsx("skeleton", className)} />;
}

export function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 border-t border-ink/5 px-4 py-3">
      <Skeleton className="h-5 w-16" />
      <Skeleton className="h-5 w-24" />
      <Skeleton className="h-5 w-20" />
      <Skeleton className="h-5 w-20 ml-auto" />
    </div>
  );
}
