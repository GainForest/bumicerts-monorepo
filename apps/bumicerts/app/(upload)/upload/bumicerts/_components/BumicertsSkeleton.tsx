import { Skeleton } from "@/components/ui/skeleton";
import Container from "@/components/ui/container";

export function BumicertsSkeleton() {
  return (
    <Container className="pt-4 pb-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-9 w-32 rounded-full" />
      </div>
      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="aspect-3/4 rounded-2xl" />
        ))}
      </div>
    </Container>
  );
}
