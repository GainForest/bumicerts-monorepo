"use client";
import Container from "@/components/ui/container";
import ErrorPage from "@/components/error-page";
import React from "react";
import { useAtprotoStore } from "@/components/stores/atproto";
import { BuildingIcon, Loader2Icon } from "lucide-react";
import { cn } from "@/lib/utils";
import AtprotoSignInButton from "@/components/global/Header/AtprotoSignInButton";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { motion } from "framer-motion";
import { queries } from "@/lib/graphql/queries/index";
import { links } from "@/lib/links";

const AuthWrapper = ({
  children,
  className,
  footer,
}: {
  children: React.ReactNode;
  className?: string;
  footer?: React.ReactNode;
}) => {
  const auth = useAtprotoStore((state) => state.auth);

  const {
    isPending: isPendingOrganizationInfo,
    error: organizationInfoError,
    data: orgData,
    isPlaceholderData: isOlderData,
  } = queries.organization.useQuery({ did: auth.user?.did ?? "" });

  const isLoadingOrganizationInfo = isPendingOrganizationInfo || isOlderData;
  const isAuthenticated = auth.status === "AUTHENTICATED";
  const isUnauthenticated = auth.status === "UNAUTHENTICATED";
  const isResuming = auth.status === "RESUMING";
  const hasOrganizationError = !!organizationInfoError;
  const isContentReady =
    isAuthenticated && !isLoadingOrganizationInfo && !hasOrganizationError;
  const shouldShowOverlay = !isContentReady;

  const renderOverlayContent = () => {
    if (isUnauthenticated || hasOrganizationError) {
      return (
        <ErrorPage
          title={
            isUnauthenticated
              ? "You are not signed in."
              : "Your organization is not set up yet."
          }
          description={
            isUnauthenticated
              ? "Please sign in to create a bumicert."
              : "Please complete your organization information to create a bumicert."
          }
          showRefreshButton={false}
          cta={
            isUnauthenticated ? (
              <AtprotoSignInButton />
            ) : (
              <Link href={links.upload.organization(auth.user?.did)}>
                <Button>
                  <BuildingIcon />
                  Manage my organization
                </Button>
              </Link>
            )
          }
        />
      );
    }

    if (isResuming || isLoadingOrganizationInfo) {
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
          className
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
