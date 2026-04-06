import { Skeleton } from "@/components/ui/skeleton";

export default function CheckoutLoading() {
  return (
    <div className="container max-w-2xl mx-auto py-12 px-6">
      {/* Header */}
      <div className="mb-8">
        <Skeleton className="h-9 w-32" />
        <Skeleton className="h-4 w-56 mt-2" />
      </div>

      {/* Items list */}
      <div className="border border-border rounded-2xl overflow-hidden mb-8">
        <div className="px-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="flex items-center gap-4 py-4 border-b border-border/40 last:border-0"
            >
              <div className="flex-1 space-y-2">
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-3 w-32" />
              </div>
              <Skeleton className="h-8 w-20 rounded-xl" />
              <Skeleton className="size-8 rounded-md" />
            </div>
          ))}
        </div>
      </div>

      {/* Summary */}
      <div className="border border-border rounded-2xl overflow-hidden mb-8">
        <div className="px-4 py-3 bg-muted/30 border-b border-border">
          <Skeleton className="h-3 w-16" />
        </div>
        <div className="px-4 py-4 space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center justify-between">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
          <div className="h-px bg-border my-3" />
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-6 w-28" />
          </div>
        </div>
      </div>

      {/* Payment section */}
      <div className="border border-border rounded-2xl overflow-hidden">
        <div className="px-4 py-3 bg-muted/30 border-b border-border">
          <Skeleton className="h-3 w-16" />
        </div>
        <div className="px-4 py-8 flex flex-col items-center gap-4">
          <Skeleton className="h-4 w-56" />
          <Skeleton className="h-10 w-36 rounded-full" />
        </div>
      </div>
    </div>
  );
}
