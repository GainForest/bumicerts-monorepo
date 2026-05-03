"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAtprotoStore } from "@/components/stores/atproto";
import Container from "@/components/ui/container";
import Image from "next/image";
import { links } from "@/lib/links";
import {
  Building2Icon,
  ChevronRight,
  HandHeartIcon,
  Loader2Icon,
  LucideIcon,
  XIcon,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@/components/ui/button";

const HAS_SEEN_ONBOARDING_IN_PAST_KEY = (did: string) =>
  `has-${did}-seen-onboarding-in-past`;
const getHasSeenOnboardingInPast = (did: string) => {
  if (typeof localStorage === "undefined") return false;
  return localStorage.getItem(HAS_SEEN_ONBOARDING_IN_PAST_KEY(did)) !== null;
};

const AUTH_REDIRECT_KEY = "auth_redirect";
const getRedirectToUri = () => {
  if (typeof localStorage === "undefined") return "/";
  return localStorage.getItem(AUTH_REDIRECT_KEY) ?? "/";
};
/**
 * Lightweight page that handles post-login redirect.
 *
 * Both OAuth callbacks redirect here. This page reads the saved return path
 * from localStorage (set by LoginModal before login) and navigates there,
 * falling back to "/" if no path was saved.
 */
export default function AuthCompletePage() {
  const router = useRouter();
  const auth = useAtprotoStore((state) => state.auth);
  const userDid = auth.user?.did;
  const redirectToUriRef = useRef<string | null>(null);

  const getRedirectToUriCached = useCallback(() => {
    if (redirectToUriRef.current) return redirectToUriRef.current;

    const redirectToUri = getRedirectToUri();
    redirectToUriRef.current = redirectToUri;
    return redirectToUri;
  }, []);

  const redirect = useCallback(() => {
    const redirectToUri = getRedirectToUriCached();
    router.replace(redirectToUri);
    localStorage.removeItem(AUTH_REDIRECT_KEY);
  }, [router, getRedirectToUriCached]);

  // One time state to track if user has stayed on the page for more than 10 seconds.
  const [hasWaitedEnough, setHasWaitedEnough] = useState(false);
  setTimeout(() => {
    setHasWaitedEnough(true);
  }, 10000);

  const [didUserCancelOnboarding, setDidUserCancelOnboarding] = useState(false);
  const isOnboardingInProgress = useMemo(() => {
    if (!userDid) return false;
    if (didUserCancelOnboarding) return false;
    return !getHasSeenOnboardingInPast(userDid);
  }, [userDid, didUserCancelOnboarding]);

  const handleOnboardingOptionClick = useCallback(
    (href: string) => {
      // Silenty set the has seen onboarding value. Even if userDid is a nullish value.
      localStorage.setItem(
        HAS_SEEN_ONBOARDING_IN_PAST_KEY(userDid ?? "unknown"),
        "true",
      );
      localStorage.removeItem(AUTH_REDIRECT_KEY);
      setTimeout(() => {
        router.replace(href);
      });
    },
    [router, userDid],
  );

  const shouldRedirect = isOnboardingInProgress
    ? false
    : hasWaitedEnough
      ? true
      : userDid
        ? getHasSeenOnboardingInPast(userDid)
        : false;

  useEffect(() => {
    if (shouldRedirect) {
      redirect();
      return;
    }
  }, [shouldRedirect, redirect]);

  return (
    <Container className="flex flex-col items-center justify-center min-h-screen">
      <LayoutBumicertsIcon showAnimations />
      <motion.div
        initial={{ scale: 0.2, filter: "blur(20px)", opacity: 0.5 }}
        animate={{ scale: 1, filter: "blur(0px)", opacity: 1 }}
        transition={{
          delay: 0.5,
          duration: 0.5,
        }}
        className="flex flex-col items-center gap-1 mt-12 font-medium"
      >
        <Loader2Icon className="animate-spin size-6 text-primary" />
        Signing you in...
        {shouldRedirect && (
          <Button
            size={"sm"}
            variant={"link"}
            className="mt-2"
            onClick={redirect}
          >
            Taking too long? Click here to redirect.
          </Button>
        )}
      </motion.div>
      <AnimatePresence>
        {isOnboardingInProgress && (
          <motion.div
            className="fixed h-screen w-screen bg-black/0 sm:bg-black/20 flex items-center justify-center"
            initial={{
              backdropFilter: "blur(0px)",
              opacity: 0,
            }}
            animate={{ backdropFilter: "blur(10px)", opacity: 1 }}
          >
            <motion.div
              className="relative bg-background rounded-3xl shadow-none sm:shadow-2xl w-full max-w-sm h-screen flex flex-col justify-center sm:h-auto"
              initial={{
                scale: 0.4,
                filter: "blur(10px)",
                opacity: 0,
              }}
              animate={{
                scale: 1,
                filter: "blur(0px)",
                opacity: 1,
              }}
            >
              <Button
                variant={"secondary"}
                size={"icon-sm"}
                className="absolute top-3 right-3 hidden sm:inline-flex"
                onClick={() => setDidUserCancelOnboarding(true)}
              >
                <XIcon />
              </Button>
              <div className="flex flex-col items-center p-4 pt-8">
                <LayoutBumicertsIcon />
                <h1 className="font-medium text-xl mt-3">
                  How will you use Bumicerts?
                </h1>
                <p className="text-muted-foreground text-sm">
                  Choose your role to get started...
                </p>
                <div className="grid grid-rows-2 gap-2 mt-4 w-full">
                  <OnboardingOption
                    onClick={() =>
                      handleOnboardingOptionClick(getRedirectToUriCached())
                    }
                    Icon={HandHeartIcon}
                    optionName="Funder"
                    optionDescription="Explore and fund impactful regenerative projects"
                  />
                  <OnboardingOption
                    onClick={() =>
                      handleOnboardingOptionClick(links.manage.home)
                    }
                    Icon={Building2Icon}
                    optionName="Nature Steward"
                    optionDescription="Manage your organization, issue Bumicerts and upload supporting evidence"
                  />
                </div>
                <Button
                  className="mt-4 w-full"
                  variant={"ghost"}
                  onClick={() => setDidUserCancelOnboarding(true)}
                >
                  I&apos;ll decide later <ChevronRight />
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </Container>
  );
}

const LayoutBumicertsIcon = ({
  showAnimations = false,
}: {
  showAnimations?: boolean;
}) => {
  return (
    <motion.div
      className="relative h-20 w-20"
      transition={{
        duration: 0.75,
        type: "spring",
      }}
      layoutId="bumicerts-icon"
      {...(showAnimations
        ? {
            initial: { scale: 0.2, filter: "blur(20px)", opacity: 0 },
            animate: { scale: 1, filter: "blur(0px", opacity: 1 },
          }
        : {})}
    >
      <Image
        className="drop-shadow-2xl"
        src={links.public.icon}
        fill
        alt={"Bumicerts Icon"}
      />
    </motion.div>
  );
};

const OnboardingOption = ({
  onClick,
  Icon,
  optionName,
  optionDescription,
}: {
  onClick: () => void;
  Icon: LucideIcon;
  optionName: string;
  optionDescription: string;
}) => {
  return (
    <Button
      variant={"secondary"}
      className="group relative w-full h-auto flex flex-col items-start justify-between max-w-md rounded-xl shadow-none hover:bg-primary/10"
      onClick={onClick}
    >
      <span className="flex items-center font-instrument italic text-2xl gap-1.5">
        <Icon className="text-primary opacity-50 size-6" />
        {optionName}
      </span>
      <span className="text-muted-foreground text-left text-pretty">
        {optionDescription}
      </span>
      <span className="absolute top-3 right-3 text-primary transition-all opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0">
        <ChevronRight className="size-5" />
      </span>
    </Button>
  );
};
