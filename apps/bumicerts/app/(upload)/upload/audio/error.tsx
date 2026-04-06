"use client";

import { Button } from "@/components/ui/button";
import Container from "@/components/ui/container";

interface AudioErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function AudioError({ error, reset }: AudioErrorProps) {
  return (
    <Container className="pt-8 pb-8">
      <div className="flex flex-col items-center justify-center h-48 gap-4 text-center">
        <p className="text-xl font-semibold text-destructive">
          Something went wrong
        </p>
        <p className="text-sm text-muted-foreground max-w-sm">
          {error.message ?? "Failed to load audio recordings. Please try again."}
        </p>
        <Button variant="outline" onClick={reset}>
          Try again
        </Button>
      </div>
    </Container>
  );
}
