import Container from "@/components/ui/container";
import { Skeleton } from "@/components/ui/skeleton";

export function TreeUploadSkeleton() {
  return (
    <Container className="max-w-3xl py-8 space-y-8">
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>

      <div className="flex gap-3">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="flex-1 space-y-2">
            <Skeleton className="mx-auto h-8 w-8 rounded-full" />
            <Skeleton className="h-3 w-20 mx-auto" />
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-border p-6 space-y-4">
        <Skeleton className="h-12 w-full rounded-xl" />
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    </Container>
  );
}
