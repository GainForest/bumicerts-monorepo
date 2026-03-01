"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { links } from "@/lib/links";
import { trackBumicertFlowStarted } from "@/lib/analytics/hotjar";

const GetStartedButton = () => {
  const handleClick = () => {
    trackBumicertFlowStarted({ draftId: "0" });
  };

  return (
    <Link href={links.bumicert.createWithDraftId("0")} onClick={handleClick}>
      <Button>
        Get Started
        <ArrowRight />
      </Button>
    </Link>
  );
};

export default GetStartedButton;
