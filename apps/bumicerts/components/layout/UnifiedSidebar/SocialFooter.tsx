"use client";

import Link from "next/link";
import { GithubIcon, TwitterIcon, BookOpenIcon, GlobeIcon } from "lucide-react";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { links } from "@/lib/links";
import { cn } from "@/lib/utils";

const SOCIAL_LINKS = [
  { href: links.external.github, label: "GitHub", Icon: GithubIcon },
  { href: links.external.docs, label: "Documentation", Icon: BookOpenIcon },
  { href: links.external.twitter, label: "X (Twitter)", Icon: TwitterIcon },
  { href: links.external.gainforest, label: "GainForest", Icon: GlobeIcon },
];

export function SocialFooter() {
  return (
    <div className="flex items-center justify-between px-2">
      {/* Social icons */}
      <div className="flex items-center gap-1">
        {SOCIAL_LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={link.label}
            className={cn(
              "p-1.5 rounded-md",
              "text-muted-foreground hover:text-foreground hover:bg-muted/60",
              "transition-colors duration-150",
            )}
          >
            <link.Icon className="h-3.5 w-3.5" />
          </Link>
        ))}
      </div>

      {/* Version + Theme toggle */}
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-muted-foreground/50">v0.2.0</span>
        <ThemeToggle />
      </div>
    </div>
  );
}
