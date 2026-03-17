import { Skeleton } from "@/components/ui/skeleton";

export function LeaderboardSkeleton() {
  return (
    <div className="space-y-3">
      {/* Skeleton rows for leaderboard entries */}
      {Array.from({ length: 10 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 p-4 rounded-xl border border-border bg-background"
        >
          {/* Rank */}
          <Skeleton className="h-8 w-8 rounded-full shrink-0" />
          {/* Avatar */}
          <Skeleton className="h-10 w-10 rounded-full shrink-0" />
          {/* Name/ID */}
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-20" />
          </div>
          {/* Amount */}
          <div className="text-right space-y-1">
            <Skeleton className="h-5 w-24 ml-auto" />
            <Skeleton className="h-3 w-16 ml-auto" />
          </div>
        </div>
      ))}
    </div>
  );
}
