import { Skeleton } from "@/components/ui/skeleton";

function KPICardSkeleton() {
  return (
    <div className="rounded-2xl border border-border bg-background p-5 flex flex-col gap-3">
      <Skeleton className="h-3 w-28" />
      <Skeleton className="h-9 w-32" />
      <Skeleton className="h-3 w-20" />
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="rounded-2xl border border-border bg-background p-5 space-y-3">
      <Skeleton className="h-3 w-24" />
      {Array.from({ length: 5 }).map((_, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: skeleton rows have no identity
        <Skeleton key={i} className="h-8 w-full" />
      ))}
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-12">
      {/* KPI row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: skeleton cards have no identity
          <KPICardSkeleton key={i} />
        ))}
      </div>

      {/* Chart */}
      <div className="rounded-2xl border border-border bg-background p-5 space-y-4">
        <Skeleton className="h-3 w-40" />
        <Skeleton className="h-[240px] w-full" />
      </div>

      {/* Donors + Orgs */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <TableSkeleton />
        <TableSkeleton />
      </div>

      {/* Recent transactions */}
      <TableSkeleton />
    </div>
  );
}
