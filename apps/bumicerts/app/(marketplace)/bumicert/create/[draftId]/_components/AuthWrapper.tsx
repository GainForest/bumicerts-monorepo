"use client";
import Container from "@/components/ui/container";
import ErrorPage from "@/components/error-page";
import React from "react";
import { Loader2Icon, UserIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import AtprotoSignInButton from "@/components/global/Header/AtprotoSignInButton";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { motion } from "framer-motion";
import { links } from "@/lib/links";
import { useCurrentAccountIdentity } from "@/hooks/use-current-account-identity";

const AuthWrapper = ({
  children,
  className,
  footer,
}: {
  children: React.ReactNode;
  className?: string;
  footer?: React.ReactNode;
}) => {
  const { auth, account, query } = useCurrentAccountIdentity();

  const isAuthenticated = auth.status === "AUTHENTICATED";
  const isUnauthenticated = auth.status === "UNAUTHENTICATED";
  const isResuming = auth.status === "RESUMING";
  const isLoadingAccount = isAuthenticated && query.isLoading;
  const hasAccountError = !!query.error;
  const hasBumicertAccount =
    account?.kind === "user" || account?.kind === "organization";
  const isContentReady =
    isAuthenticated && hasBumicertAccount && !isLoadingAccount && !hasAccountError;
  const shouldShowOverlay = !isContentReady;

  const renderOverlayContent = () => {
    if (isUnauthenticated) {
      return (
        <ErrorPage
          title="You are not signed in."
          description="Please sign in to create a bumicert."
          showRefreshButton={false}
          cta={<AtprotoSignInButton />}
        />
      );
    }

    if (hasAccountError) {
      return (
        <ErrorPage
          title="Couldn't load your account"
          description="We had trouble loading your account. Please try again."
          error={query.error}
          showRefreshButton
          showHomeButton={false}
        />
      );
    }

    if (isAuthenticated && !hasBumicertAccount && !isLoadingAccount) {
      return (
        <ErrorPage
          title="Your account is not set up yet."
          description="Please complete your account information to create a bumicert."
          showRefreshButton={false}
          cta={
            <Link href={links.manage.home}>
              <Button>
                <UserIcon />
                Manage my account
              </Button>
            </Link>
          }
        />
      );
    }

    if (isResuming || isLoadingAccount) {
      return (
        <div className="flex flex-col items-center justify-center">
          <Loader2Icon className="animate-spin text-primary" />
          <span className="text-muted-foreground font-medium mt-2">
            Please wait...
          </span>
        </div>
      );
    }

    return null;
  };

  return (
    <section className="w-full relative flex flex-col min-h-full">
      <Container
        className={cn(
          "flex-1 z-5",
          isContentReady ? "" : "opacity-70 blur-lg pointer-events-none",
          className,
        )}
      >
        {children}
      </Container>

      {shouldShowOverlay && (
        <motion.div
          className="absolute top-0 bottom-0 left-[50%] translate-x-[-50%] w-full bg-background z-10"
          initial={{ opacity: 0, y: 10, filter: "blur(10px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          exit={{ opacity: 0, y: 10, filter: "blur(10px)" }}
          transition={{ duration: 0.3 }}
        >
          <Container className="mt-10">{renderOverlayContent()}</Container>
        </motion.div>
      )}
      {footer}
    </section>
  );
};

export default AuthWrapper;
