"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRightIcon } from "lucide-react";
import { BumicertCard, cardVariants } from "@/app/(marketplace)/explore/_components/BumicertCard";
import type { BumicertData } from "@/lib/types";

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.05 } },
};

export function OrgBumicerts({
  bumicerts,
  orgDid,
}: {
  bumicerts: BumicertData[];
  orgDid: string;
}) {
  return (
    <div className="p-4 md:p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-serif text-2xl font-bold">
          Bumicerts
          <span className="ml-2 text-sm font-normal text-muted-foreground font-sans">
            ({bumicerts.length})
          </span>
        </h2>
        <Link
          href="/explore"
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          View all <ArrowRightIcon className="h-3.5 w-3.5" />
        </Link>
      </div>

      {bumicerts.length === 0 ? (
        <div className="w-full h-36 bg-muted/20 rounded-xl flex items-center justify-center border border-border">
          <p className="font-serif text-lg text-muted-foreground font-bold text-center px-4">
            No bumicerts yet. The first one is always the hardest.
          </p>
        </div>
      ) : (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-4"
        >
          {bumicerts.map((b) => (
            <BumicertCard key={b.id} bumicert={b} />
          ))}
        </motion.div>
      )}
    </div>
  );
}
