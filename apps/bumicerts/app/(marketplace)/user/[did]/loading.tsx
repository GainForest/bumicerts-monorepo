import Container from "@/components/ui/container";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * loading.tsx — User profile page skeleton.
 *
 * Mirrors the final page structure:
 * - Left sidebar with avatar/profile meta, DID card, and activity card
 * - Right content area with donation history summary + list
 */
export default function UserProfileLoading() {
  return (
    <Container className="max-w-5xl py-8">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left sidebar */}
        <div className="lg:col-span-1">
          <div className="space-y-6 lg:sticky lg:top-8">
            <div className="flex flex-col items-center space-y-3 text-center">
              <Skeleton className="h-24 w-24 rounded-full border-2 border-border" />

              <div className="space-y-2">
                <Skeleton className="mx-auto h-6 w-40 rounded" />
                <Skeleton className="mx-auto h-4 w-28 rounded" />
              </div>

              <div className="w-full space-y-2">
                <Skeleton className="h-4 w-full rounded" />
                <Skeleton className="h-4 w-5/6 rounded" />
              </div>

              <Skeleton className="h-4 w-28 rounded" />
            </div>

            <div className="rounded-lg border border-border bg-card p-3">
              <Skeleton className="mb-2 h-3 w-28 rounded" />
              <Skeleton className="h-3 w-full rounded" />
              <Skeleton className="mt-1 h-3 w-4/5 rounded" />
            </div>

            <div className="rounded-lg border border-border bg-card p-4">
              <Skeleton className="mb-3 h-3 w-16 rounded" />
              <div className="flex items-center justify-between">
                <Skeleton className="h-3 w-20 rounded" />
                <Skeleton className="h-3 w-16 rounded" />
              </div>
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="space-y-4 lg:col-span-2">
          <Skeleton className="h-7 w-44 rounded" />

          <div className="grid grid-cols-2 gap-3">
            <Skeleton className="h-16 rounded-lg" />
            <Skeleton className="h-16 rounded-lg" />
          </div>

          <div className="rounded-lg border border-border bg-card p-3">
            <div className="space-y-2.5">
              {[0, 1, 2, 3].map((row) => (
                <div key={row} className="flex items-center gap-3">
                  <Skeleton className="h-7 w-7 shrink-0 rounded-full" />
                  <div className="flex-1 space-y-1">
                    <Skeleton className="h-3 w-32 rounded" />
                    <Skeleton className="h-2.5 w-20 rounded" />
                  </div>
                  <Skeleton className="h-3 w-3 shrink-0 rounded" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Container>
  );
}
