import { BumicertCardSkeleton } from "@/app/(marketplace)/explore/_components/BumicertCard";

/**
 * loading.tsx — Content-slot skeleton for the organization bumicerts tab.
 *
 * The OrgHero and OrgTabBar are rendered by the parent layout.tsx, so this
 * skeleton only covers the bumicerts grid below the tab bar.
 */
export default function OrgBumicertsLoading() {
  return (
    <section className="py-6">
      <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-5">
        {Array.from({ length: 6 }).map((_, i) => (
          <BumicertCardSkeleton key={i} />
        ))}
      </div>
    </section>
  );
}
