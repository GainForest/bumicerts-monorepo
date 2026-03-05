"use client";

import Image from "next/image";
import type { BumicertData } from "@/lib/types";
import { BumicertCreationMeta, BumicertMeta } from "./BumicertInfoBar";

interface BumicertSidebarProps {
  bumicert: BumicertData;
}

export function BumicertSidebar({ bumicert }: BumicertSidebarProps) {
  return (
    <div className="lg:sticky lg:top-28 flex flex-col gap-4">
      <BumicertCreationMeta bumicert={bumicert} />

      {bumicert.coverImageUrl && (
        <div className="rounded-2xl border border-border overflow-hidden aspect-[3/4] relative">
          <Image
            src={bumicert.coverImageUrl}
            alt={bumicert.title}
            fill
            className="object-cover"
          />
        </div>
      )}

      <BumicertMeta bumicert={bumicert} />
    </div>
  );
}
