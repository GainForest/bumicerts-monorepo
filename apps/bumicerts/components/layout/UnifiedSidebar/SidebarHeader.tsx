"use client";

import Image from "next/image";
import Link from "next/link";
import { PlusIcon } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { links } from "@/lib/links";
import { useMobileNav } from "@/hooks/useMobileNav";

export function SidebarHeader() {
  const closeMobileNav = useMobileNav((s) => s.setOpen);

  return (
    <div className="flex items-center justify-between gap-2 mb-4">
      {/* Logo + Bumicerts text */}
      <div className="flex items-center gap-2.5">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{
            duration: 0.5,
            delay: 0.1,
            type: "spring",
            stiffness: 300,
            damping: 20,
          }}
          className="h-8 w-8 flex items-center justify-center shrink-0"
        >
          <Image
            src="/assets/media/images/app-icon.png"
            alt="Bumicerts"
            width={28}
            height={28}
            className="drop-shadow-md"
          />
        </motion.div>

        <motion.span
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.15, ease: [0.25, 0.1, 0.25, 1] }}
          className="font-serif text-xl font-bold tracking-tight text-foreground"
        >
          Bumicerts
        </motion.span>
      </div>

      {/* Create button */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3, delay: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
      >
        <Button size="icon" asChild>
          <Link href={links.bumicert.create} onClick={() => closeMobileNav(false)}>
            <PlusIcon />
          </Link>
        </Button>
      </motion.div>
    </div>
  );
}
