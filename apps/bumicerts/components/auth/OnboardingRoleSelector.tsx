"use client";

import type { ReactNode } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { ChevronRight, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { links } from "@/lib/links";
import { cn } from "@/lib/utils";

type OnboardingRoleOption = {
  Icon: LucideIcon;
  optionName: string;
  optionDescription: string;
  onClick: () => void;
};

type BumicertsMarkProps = {
  showAnimations?: boolean;
  className?: string;
};

export function BumicertsMark({
  showAnimations = false,
  className,
}: BumicertsMarkProps) {
  return (
    <motion.div
      className={cn("relative h-20 w-20", className)}
      transition={{
        duration: 0.75,
        type: "spring",
      }}
      layoutId="bumicerts-icon"
      {...(showAnimations
        ? {
            initial: { scale: 0.2, filter: "blur(20px)", opacity: 0 },
            animate: { scale: 1, filter: "blur(0px)", opacity: 1 },
          }
        : {})}
    >
      <Image
        className="drop-shadow-2xl"
        src={links.public.icon}
        fill
        alt="Bumicerts Icon"
      />
    </motion.div>
  );
}

export function OnboardingRoleSelector({
  title,
  description,
  options,
  footer,
  className,
}: {
  title: string;
  description: string;
  options: OnboardingRoleOption[];
  footer?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center pt-8", className)}>
      <BumicertsMark />
      <h1 className="mt-3 text-center text-xl font-medium">{title}</h1>
      <p className="text-center text-sm text-muted-foreground">{description}</p>
      <div className="mt-4 grid w-full gap-2">
        {options.map((option) => (
          <OnboardingRoleOptionCard key={option.optionName} {...option} />
        ))}
      </div>
      {footer}
    </div>
  );
}

function OnboardingRoleOptionCard({
  onClick,
  Icon,
  optionName,
  optionDescription,
}: OnboardingRoleOption) {
  return (
    <Button
      variant="secondary"
      className="group relative h-auto w-full max-w-md flex-col items-start justify-between rounded-xl shadow-none hover:bg-primary/10"
      onClick={onClick}
    >
      <span
        className="flex items-center gap-1.5 text-2xl italic"
        style={{
          fontFamily: "var(--font-instrument-serif-var)",
          fontStyle: "italic",
        }}
      >
        <Icon className="text-primary opacity-50" />
        {optionName}
      </span>
      <span className="text-left text-muted-foreground text-pretty">
        {optionDescription}
      </span>
      <span className="absolute right-3 top-3 -translate-x-2 text-primary opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100">
        <ChevronRight />
      </span>
    </Button>
  );
}
