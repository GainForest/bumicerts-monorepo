import { Skeleton } from "@/components/ui/skeleton";

/**
 * loading.tsx — Content-slot skeleton for the organization home tab.
 *
 * The OrgHero and OrgTabBar are rendered by layout.tsx from server data,
 * so they never flash a skeleton state — they appear immediately.
 * This skeleton only covers the OrgAbout content area below the tab bar.
 */
export default function OrganizationLoading() {
  return (
    <div className="py-6 space-y-3">
      <Skeleton className="h-4 w-full rounded" />
      <Skeleton className="h-4 w-full rounded" />
      <Skeleton className="h-4 w-5/6 rounded" />
      <Skeleton className="h-4 w-full rounded" />
      <Skeleton className="h-4 w-4/5 rounded" />
      <Skeleton className="h-4 w-full rounded" />
      <Skeleton className="h-4 w-3/4 rounded" />
    </div>
  );
}
