"use client";
import React from "react";
import { Button } from "./ui/button";
import { CircleAlertIcon, HomeIcon, RefreshCcwIcon } from "lucide-react";

const ErrorPage = ({
  showRefreshButton = true,
  showHomeButton = true,
  title,
  description,
  error,
  cta,
}: {
  title?: string;
  description?: string;
  showRefreshButton?: boolean;
  showHomeButton?: boolean;
  error?: unknown;
  cta?: React.ReactNode;
}) => {
  error && console.error(error);
  return (
    <div className="flex flex-col items-center justify-center w-full py-16 px-6 gap-8">
      {/* Gradient line top */}
      <div className="h-px w-full max-w-xs bg-gradient-to-r from-transparent via-destructive/30 to-transparent" />

      <div className="flex flex-col items-center gap-6 max-w-md w-full">
        {/* Icon */}
        <div className="flex items-center justify-center size-14 rounded-full border border-destructive/20 bg-destructive/5">
          <CircleAlertIcon className="size-7 text-destructive/70" />
        </div>

        {/* Text */}
        <div className="flex flex-col items-center gap-3">
          <h1
            className="text-4xl font-light tracking-[-0.02em] leading-[1.1] text-center"
            style={{ fontFamily: "var(--font-garamond-var)" }}
          >
            {title ?? "Something went wrong."}
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed text-center text-balance">
            {description ??
              "We're sorry, but an error occurred while processing your request."}
          </p>
        </div>

        {/* Actions */}
        {(cta || showRefreshButton || showHomeButton) && (
          <div className="flex items-center gap-3 flex-wrap justify-center">
            {cta}
            {showRefreshButton && (
              <Button onClick={() => window.location.reload()}>
                <RefreshCcwIcon />
                Try again
              </Button>
            )}
            {showHomeButton && (
              <Button
                variant="outline"
                onClick={() => (window.location.href = "/")}
              >
                <HomeIcon />
                Home
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Gradient line bottom */}
      <div className="h-px w-full max-w-xs bg-gradient-to-r from-transparent via-border to-transparent" />
    </div>
  );
};

export default ErrorPage;
