import Container from "@/components/ui/container";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * loading.tsx — Organization profile page skeleton.
 *
 * Pure visual — no text — so crawlers never index a "loading" state.
 * The real page.tsx awaits data, which is what search engines see.
 */
export default function OrganizationLoading() {
  return (
    <main className="w-full">
      <Container className="pt-4 pb-8">

        {/* OrgHero: cover image card */}
        <section className="relative min-h-[260px] md:min-h-[320px] flex flex-col overflow-hidden rounded-2xl border border-border">
          <Skeleton className="absolute inset-0 rounded-none rounded-2xl" />

          {/* Share button placeholder */}
          <div className="absolute top-4 right-4 z-20">
            <Skeleton className="h-7 w-20 rounded-full" />
          </div>

          {/* Bottom content area */}
          <div className="relative z-10 flex-1 flex flex-col justify-end px-5 pb-6 pt-24">
            <div className="max-w-3xl flex flex-col gap-3">
              {/* Logo + name */}
              <div className="flex items-center gap-3">
                <Skeleton className="h-9 w-9 rounded-full shrink-0" />
                <Skeleton className="h-10 w-56 md:w-72 rounded-md" />
              </div>
              {/* Description lines */}
              <Skeleton className="h-4 w-full max-w-md rounded" />
              <Skeleton className="h-4 w-3/4 max-w-sm rounded" />
              {/* Pills */}
              <div className="flex flex-wrap gap-2 mt-1">
                <Skeleton className="h-6 w-24 rounded-full" />
                <Skeleton className="h-6 w-20 rounded-full" />
                <Skeleton className="h-6 w-28 rounded-full" />
              </div>
            </div>
          </div>
        </section>

        {/* OrgTabBar */}
        <div className="mt-3 border-b border-border pb-2.5 flex gap-4">
          <Skeleton className="h-4 w-12 rounded" />
          <Skeleton className="h-4 w-20 rounded" />
        </div>

        {/* OrgAbout: paragraph lines */}
        <div className="py-6 space-y-3">
          <Skeleton className="h-4 w-full rounded" />
          <Skeleton className="h-4 w-full rounded" />
          <Skeleton className="h-4 w-5/6 rounded" />
          <Skeleton className="h-4 w-full rounded" />
          <Skeleton className="h-4 w-4/5 rounded" />
          <Skeleton className="h-4 w-full rounded" />
          <Skeleton className="h-4 w-3/4 rounded" />
        </div>

      </Container>
    </main>
  );
}
