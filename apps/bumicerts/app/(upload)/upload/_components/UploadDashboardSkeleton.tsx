import { Skeleton } from "@/components/ui/skeleton";
import Container from "@/components/ui/container";

/**
 * Full-page skeleton for the Upload dashboard.
 * Layout mirrors the real page to prevent layout shift on swap.
 * No text labels — pure Skeleton blocks only.
 */
export function UploadDashboardSkeleton() {
  return (
    <Container className="pt-4 pb-8 space-y-6">
      {/* Hero skeleton */}
      <div className="relative min-h-[260px] md:min-h-[320px] rounded-2xl overflow-hidden border border-border">
        {/* Cover image area */}
        <Skeleton className="absolute inset-0 rounded-2xl" />

        {/* Bottom content area */}
        <div className="relative z-10 flex flex-col justify-end px-5 pb-6 pt-24">
          <div className="flex items-center gap-3 mb-3">
            <Skeleton className="h-9 w-9 rounded-full shrink-0" />
            <Skeleton className="h-10 w-56" />
          </div>
          <Skeleton className="h-4 w-80 mb-4" />
          <div className="flex gap-2">
            <Skeleton className="h-6 w-20 rounded-full" />
            <Skeleton className="h-6 w-24 rounded-full" />
            <Skeleton className="h-6 w-16 rounded-full" />
          </div>
        </div>
      </div>

      {/* About skeleton */}
      <div className="space-y-3 py-4">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-[90%]" />
        <Skeleton className="h-4 w-[75%]" />
      </div>

      {/* Sites preview skeleton */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-16" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
        </div>
      </div>

      {/* Bumicerts preview skeleton */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-16" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Skeleton className="h-36 rounded-xl" />
          <Skeleton className="h-36 rounded-xl" />
        </div>
      </div>
    </Container>
  );
}
