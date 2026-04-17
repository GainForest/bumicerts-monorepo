"use client";

import ErrorPage from "@/components/error-page";
import Container from "@/components/ui/container";

export default function UploadError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <Container className="pt-4">
      <ErrorPage
        title="Something went wrong"
        description="We had trouble loading your organization's data. Please try again."
        error={error}
        showRefreshButton
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
