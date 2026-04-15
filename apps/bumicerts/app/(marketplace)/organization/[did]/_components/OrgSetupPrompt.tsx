"use client";

import Link from "next/link";
import { Building2Icon, ArrowRightIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { links } from "@/lib/links";

interface OrgSetupPromptProps {
  did: string;
}

/**
 * Displayed when a user navigates to /manage but hasn't set up their
 * organization yet. Prompts them to complete org setup first.
 */
export function OrgSetupPrompt({ did }: OrgSetupPromptProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="inline-flex items-center justify-center rounded-full bg-primary/10 p-4 mb-4">
        <Building2Icon className="size-8 text-primary" />
      </div>
      <h2 className="font-serif text-2xl font-light tracking-[-0.02em] mb-2">
        Set up your organization
      </h2>
      <p className="text-muted-foreground max-w-md mb-6">
        Before you can upload content, you need to set up your organization
        profile. This only takes a few minutes.
      </p>
      <Button asChild>
        <Link href={links.manage.home}>
          Set Up Organization
          <ArrowRightIcon />
        </Link>
      </Button>
    </div>
  );
}
