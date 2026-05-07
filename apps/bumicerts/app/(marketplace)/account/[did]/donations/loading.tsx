import { Skeleton } from "@/components/ui/skeleton";

export default function AccountDonationsLoading() {
  return (
    <section className="py-6 space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Skeleton className="h-16 rounded-lg" />
        <Skeleton className="h-16 rounded-lg" />
      </div>

      <div className="rounded-lg border border-border bg-card p-3">
        <div className="space-y-2.5">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="flex items-center gap-3">
              <Skeleton className="h-7 w-7 rounded-full shrink-0" />
              <div className="flex-1 space-y-1">
                <Skeleton className="h-3 w-32" />
                <Skeleton className="h-2.5 w-20" />
              </div>
              <Skeleton className="h-3 w-3 shrink-0" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
