import { ExploreShell } from "./_components/ExploreShell";
import { BumicertCardSkeleton } from "./_components/BumicertCard";

/**
 * loading.tsx — streams instantly while page.tsx awaits the data fetch.
 *
 * Uses the same ExploreShell as page.tsx so the static chrome (heading, search,
 * sort) is visible immediately. The grid slot gets a skeleton.
 * bumicerts=[] means the filter chips Suspense boundary shows its skeleton too.
 *
 * What crawlers see: page.tsx (full grid + all data). loading.tsx is for users only.
 */
export default function ExploreLoading() {
  return (
    <ExploreShell bumicerts={[]} animate={true}>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-6 lg:gap-8 items-stretch">
        {Array.from({ length: 8 }).map((_, i) => (
          <BumicertCardSkeleton key={i} />
        ))}
      </div>
    </ExploreShell>
  );
}
