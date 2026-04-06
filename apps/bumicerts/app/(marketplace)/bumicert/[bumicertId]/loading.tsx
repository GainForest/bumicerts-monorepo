import Container from "@/components/ui/container";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * loading.tsx — Bumicert detail page skeleton.
 *
 * Pure visual — no text — so crawlers never index a "loading" state.
 * The real page.tsx awaits data, which is what search engines see.
 */
export default function BumicertDetailLoading() {
  return (
    <main className="w-full">
      <Container className="pt-3 pb-12">
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6 lg:gap-10 lg:px-2">

          {/* Sidebar — desktop only */}
          <div className="hidden lg:flex flex-col gap-4">
            {/* Creation meta: avatar + name/date + share */}
            <div className="flex items-center gap-3">
              <Skeleton className="h-9 w-9 rounded-full shrink-0" />
              <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                <Skeleton className="h-3.5 w-32 rounded" />
                <Skeleton className="h-3 w-20 rounded" />
              </div>
              <Skeleton className="h-7 w-20 rounded-full shrink-0" />
            </div>

            {/* Cover image */}
            <Skeleton className="rounded-2xl aspect-[3/4] w-full" />

            {/* Title + description + chips */}
            <div className="flex flex-col gap-2">
              <Skeleton className="h-6 w-4/5 rounded" />
              <Skeleton className="h-4 w-full rounded" />
              <Skeleton className="h-4 w-3/4 rounded" />
              <div className="flex gap-1.5 mt-1">
                <Skeleton className="h-5 w-20 rounded-full" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
            </div>
          </div>

          {/* Main content column */}
          <div className="flex flex-col gap-4">

            {/* Mobile-only sticky meta */}
            <div className="flex flex-col gap-4 lg:hidden">
              <div className="border border-border rounded-xl bg-background px-4 py-3">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-9 w-9 rounded-full shrink-0" />
                  <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                    <Skeleton className="h-3.5 w-28 rounded" />
                    <Skeleton className="h-3 w-20 rounded" />
                  </div>
                  <Skeleton className="h-7 w-20 rounded-full shrink-0" />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <Skeleton className="rounded-2xl w-full sm:w-1/2 aspect-[3/4] max-h-[50vh]" />
                <div className="sm:w-1/2 flex flex-col gap-2">
                  <Skeleton className="h-6 w-4/5 rounded" />
                  <Skeleton className="h-4 w-full rounded" />
                  <Skeleton className="h-4 w-3/4 rounded" />
                  <div className="flex gap-1.5 mt-1">
                    <Skeleton className="h-5 w-20 rounded-full" />
                    <Skeleton className="h-5 w-16 rounded-full" />
                  </div>
                </div>
              </div>
            </div>

            {/* Content sections */}
            <div className="space-y-8 py-1">
              {/* Description block */}
              <div className="space-y-3">
                <Skeleton className="h-4 w-full rounded" />
                <Skeleton className="h-4 w-full rounded" />
                <Skeleton className="h-4 w-5/6 rounded" />
                <Skeleton className="h-4 w-full rounded" />
                <Skeleton className="h-4 w-4/5 rounded" />
                <Skeleton className="h-4 w-full rounded" />
                <Skeleton className="h-4 w-2/3 rounded" />
              </div>

              <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />

              {/* Site boundaries card */}
              <div className="rounded-xl border border-border overflow-hidden">
                <Skeleton className="h-40 w-full rounded-none" />
                <div className="px-4 py-3 border-t border-border bg-muted/10 flex items-center justify-between">
                  <Skeleton className="h-3 w-24 rounded" />
                  <Skeleton className="h-3 w-20 rounded" />
                </div>
              </div>
            </div>
          </div>

        </div>
      </Container>
    </main>
  );
}
