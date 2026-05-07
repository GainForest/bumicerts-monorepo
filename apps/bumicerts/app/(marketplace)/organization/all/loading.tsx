import { OrganizationCardSkeleton } from "./_components/OrganizationCard";
import { AllOrgsShell } from "./_components/AllOrgsShell";

function OrgsGridSkeleton() {
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-8 lg:gap-10">
      {Array.from({ length: 8 }).map((_, i) => (
        <OrganizationCardSkeleton key={i} />
      ))}
    </div>
  );
}

export default function AllOrganizationsLoading() {
  return (
    <AllOrgsShell organizations={[]} animate={true}>
      <OrgsGridSkeleton />
    </AllOrgsShell>
  );
}
