"use client";

import { useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Loader2Icon } from "lucide-react";
import { motion } from "framer-motion";
import { BumicertsMark } from "@/components/auth/OnboardingRoleSelector";
import { Button } from "@/components/ui/button";
import Container from "@/components/ui/container";
import { links } from "@/lib/links";

const AUTH_REDIRECT_KEY = "auth_redirect";

function getRedirectToUri() {
  if (typeof localStorage === "undefined") {
    return links.root;
  }

  return localStorage.getItem(AUTH_REDIRECT_KEY) ?? links.root;
}

export default function AuthCompletePage() {
  const router = useRouter();
  const redirectToUriRef = useRef<string | null>(null);
  const didAttemptAutoRedirectRef = useRef(false);

  const getRedirectToUriCached = useCallback(() => {
    if (redirectToUriRef.current) {
      return redirectToUriRef.current;
    }

    const redirectToUri = getRedirectToUri();
    redirectToUriRef.current = redirectToUri;
    return redirectToUri;
  }, []);

  const redirect = useCallback(() => {
    const redirectToUri = getRedirectToUriCached();
    localStorage.removeItem(AUTH_REDIRECT_KEY);
    router.replace(redirectToUri);
  }, [getRedirectToUriCached, router]);

  useEffect(() => {
    if (didAttemptAutoRedirectRef.current) {
      return;
    }

    didAttemptAutoRedirectRef.current = true;
    redirect();
  }, [redirect]);

  return (
    <Container className="flex min-h-screen flex-col items-center justify-center">
      <BumicertsMark showAnimations />
      <motion.div
        initial={{ scale: 0.2, filter: "blur(20px)", opacity: 0.5 }}
        animate={{ scale: 1, filter: "blur(0px)", opacity: 1 }}
        transition={{ delay: 0.5, duration: 0.5 }}
        className="mt-12 flex flex-col items-center gap-1 font-medium"
      >
        <Loader2Icon className="size-6 animate-spin text-primary" />
        Signing you in...
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 10, duration: 0.25 }}
          className="mt-2"
        >
          <Button
            size="sm"
            variant="link"
            onClick={redirect}
          >
            Taking too long? Click here to redirect.
          </Button>
        </motion.div>
      </motion.div>
    </Container>
  );
}
