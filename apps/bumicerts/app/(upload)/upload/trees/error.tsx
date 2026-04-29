"use client";

import { useSearchParams } from "next/navigation";
import ErrorPage from "@/components/error-page";
import Container from "@/components/ui/container";

export default function TreesError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const searchParams = useSearchParams();
  const isUploadMode = searchParams.get("mode") === "upload";

  return (
    <Container className="pt-4">
      <ErrorPage
        title={isUploadMode ? "Couldn't load tree upload" : "Couldn't load tree manager"}
        description={
          isUploadMode
            ? "We had trouble opening the tree upload flow. Please try again."
            : "We had trouble fetching your uploaded tree records. Please try again."
        }
        error={error}
        showRefreshButton={false}
        showHomeButton={false}
        cta={
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 h-10 px-4 rounded-full border border-border text-sm font-medium hover:bg-muted/60 transition-colors cursor-pointer"
          >
            Try again
          </button>
        }
      />
    </Container>
  );
}
