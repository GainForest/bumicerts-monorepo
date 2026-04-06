"use client";

import ErrorPage from "@/components/error-page";

export default function CheckoutError({
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
