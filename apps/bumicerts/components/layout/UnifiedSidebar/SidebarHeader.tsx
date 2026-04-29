"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { links } from "@/lib/links";

export function SidebarHeader() {
  return (
    <div className="flex flex-col w-full gap-2 mb-4">
      {/* Logo + Bumicerts text */}
      <Link className="flex items-center gap-2.5" href={links.explore}>
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
          transition={{
            duration: 0.4,
            delay: 0.15,
            ease: [0.25, 0.1, 0.25, 1],
          }}
          className="font-serif text-xl font-bold tracking-tight text-foreground"
        >
          Bumicerts
        </motion.span>
      </Link>
    </div>
  );
}
