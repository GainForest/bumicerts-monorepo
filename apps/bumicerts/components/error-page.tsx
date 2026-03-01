"use client";
import React from "react";
import { Button } from "./ui/button";
import { CircleAlert, HomeIcon, RefreshCcwIcon } from "lucide-react";
import { getStripedBackground } from "@/lib/getStripedBackground";

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
    <div
      className="flex flex-col items-center gap-4 w-full p-4 rounded-xl"
      style={{
        background: getStripedBackground(
          { variable: "--destructive", opacity: 5 },
          { variable: "--muted", opacity: 10 }
        ),
      }}
    >
      <CircleAlert className="size-10 text-destructive/50" />
      <div className="flex flex-col items-center gap-2">
        <h1 className="text-3xl text-center font-bold font-serif">
          {title ?? "Oops! Something went wrong."}
        </h1>
        <p className="text-muted-foreground text-center text-balance">
          {description ??
            "We're sorry, but an error occurred while processing your request."}
        </p>
        <div className="flex items-center gap-2 mt-4">
          {cta}
          {showRefreshButton && (
            <Button onClick={() => window.location.reload()}>
              <RefreshCcwIcon />
              Refresh
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
      </div>
    </div>
  );
};

export default ErrorPage;
