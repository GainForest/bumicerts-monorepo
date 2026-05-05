"use client";

import { motion } from "framer-motion";
import { Building2Icon, MapPinIcon, MicIcon, TreePineIcon, UserIcon } from "lucide-react";
import BumicertIcon from "@/icons/BumicertIcon";
import { NavLeaf } from "./NavLeaf";
import { SignInPrompt } from "./SignInPrompt";
import { ErrorPrompt } from "./ErrorPrompt";
import { LoadingPrompt } from "./LoadingPrompt";
import { OnboardingPrompt } from "./OnboardingPrompt";
import { useAccount } from "@/components/providers/AccountProvider";
import { links } from "@/lib/links";
import type { NavLeaf as NavLeafItem } from "./data";
import { usePathname } from "next/navigation";

function isLeafActive(
  pathCheck: { equals?: string; startsWith?: string },
  pathname: string,
): boolean {
  if (pathCheck.equals) return pathname === pathCheck.equals;
  if (pathCheck.startsWith) return pathname.startsWith(pathCheck.startsWith);
  return false;
}

function useManageItems(): NavLeafItem[] {
  const { kind } = useAccount();

  if (kind === "user") {
    return [
      {
        kind: "leaf",
        id: "profile",
        text: "Profile",
        Icon: UserIcon,
        href: links.manage.home,
        pathCheck: { startsWith: links.manage.home },
      },
    ];
  }

  return [
    {
      kind: "leaf",
      id: "organization",
      text: "Organization",
      Icon: Building2Icon,
      href: links.manage.home,
      pathCheck: { equals: links.manage.home },
    },
    {
      kind: "leaf",
      id: "sites",
      text: "Sites",
      Icon: MapPinIcon,
      href: links.manage.sites,
      pathCheck: { startsWith: links.manage.sites },
    },
    {
      kind: "leaf",
      id: "audio",
      text: "Audio",
      Icon: MicIcon,
      href: links.manage.audio,
      pathCheck: { startsWith: links.manage.audio },
    },
    {
      kind: "leaf",
      id: "bumicerts-manage",
      text: "Bumicerts",
      Icon: BumicertIcon,
      href: links.manage.bumicerts,
      pathCheck: { startsWith: links.manage.bumicerts },
    },
    {
      kind: "leaf",
      id: "trees",
      text: "Trees",
      Icon: TreePineIcon,
      href: links.manage.trees,
      pathCheck: { startsWith: links.manage.trees },
    },
  ];
}

export function ManageSection() {
  const pathname = usePathname();
  const { query, kind } = useAccount();
  const items = useManageItems();
  const hasAccountError = query.isError || kind === null;

  return (
    <div className="flex flex-col gap-2">
      <motion.div
        initial={{ opacity: 0, x: -8 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{
          duration: 0.3,
          delay: 0,
          ease: [0.25, 0.1, 0.25, 1],
        }}
        className="px-3 py-1"
      >
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground/60">
          MANAGE
        </span>
      </motion.div>

      {query.isLoading ? (
        <LoadingPrompt />
      ) : hasAccountError ? (
        <ErrorPrompt />
      ) : kind === "unauthenticated" ? (
        <SignInPrompt />
      ) : kind === "unknown" ? (
        <OnboardingPrompt />
      ) : (
        <ul className="flex flex-col gap-0.5">
          {items.map((item, index) => (
            <NavLeaf
              key={item.id}
              item={item}
              isActive={isLeafActive(item.pathCheck, pathname)}
              index={index + 1}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
