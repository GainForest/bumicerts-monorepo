"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ChevronRightIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { links } from "@/lib/links";
import { useMobileNav } from "@/hooks/useMobileNav";

export function OnboardingPrompt() {
  const closeMobileNav = useMobileNav((state) => state.setOpen);

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.1, ease: [0.25, 0.1, 0.25, 1] }}
      className="mx-1 p-3 rounded-lg bg-muted/40 border border-border/50"
    >
      <p className="text-xs text-muted-foreground text-center mb-2">
        Complete onboarding to manage your account.
      </p>
      <Button variant="ghost" size="sm" className="w-full" asChild>
        <Link href={links.manage.home} onClick={() => closeMobileNav(false)}>
          Onboard
          <ChevronRightIcon />
        </Link>
      </Button>
    </motion.div>
  );
}
