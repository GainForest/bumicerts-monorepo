"use client";

import ErrorPage from "@/components/error-page";

export default function DashboardError({
  error,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ErrorPage
      error={error}
      showRefreshButton
      showHomeButton
    />
  );
}
