import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface PageSkeletonProps {
  className?: string;
  type?: "default" | "dashboard" | "prediction";
}

export function PageSkeleton({ className, type = "default" }: PageSkeletonProps) {
  if (type === "prediction") {
    return (
      <div className={cn("space-y-6 animate-in fade-in duration-500", className)}>
        {/* Header Area */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border/40 pb-5">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Skeleton className="h-11 w-11 rounded-2xl" />
              <div className="space-y-2">
                <Skeleton className="h-6 w-48 rounded-md" />
                <Skeleton className="h-4 w-32 rounded-md" />
              </div>
            </div>
            <Skeleton className="h-4 w-64 md:w-96 rounded-md ml-14" />
          </div>
          <Skeleton className="h-12 w-full sm:w-48 rounded-2xl" />
        </div>

        {/* Filters */}
        <div className="rounded-2xl border border-border bg-card/50 p-4">
          <Skeleton className="h-4 w-32 mb-3 rounded-md" />
          <div className="flex flex-wrap gap-2">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-9 w-24 rounded-xl" />
            ))}
          </div>
        </div>

        {/* Main Content Area */}
        <div className="space-y-6">
          <Skeleton className="h-64 w-full rounded-3xl" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-48 w-full rounded-3xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (type === "dashboard") {
    return (
      <div className={cn("space-y-6 animate-in fade-in duration-500", className)}>
        {/* Dashboard Header */}
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-8 w-40 rounded-md" />
            <Skeleton className="h-4 w-64 rounded-md" />
          </div>
          <Skeleton className="h-10 w-10 rounded-full" />
        </div>

        {/* Grid Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-28 w-full rounded-2xl" />
          ))}
        </div>

        {/* Chart / List Area */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton className="md:col-span-2 h-72 w-full rounded-3xl" />
          <Skeleton className="h-72 w-full rounded-3xl" />
        </div>
      </div>
    );
  }

  // Default type
  return (
    <div className={cn("space-y-4 animate-in fade-in duration-500", className)}>
      <Skeleton className="h-32 w-full rounded-3xl" />
      <Skeleton className="h-64 w-full rounded-3xl" />
    </div>
  );
}
