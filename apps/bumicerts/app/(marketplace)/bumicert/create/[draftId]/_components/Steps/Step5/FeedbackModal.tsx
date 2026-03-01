"use client";

import React from "react";
import { ExternalLinkIcon, MessageSquareHeartIcon } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const FEEDBACK_FORM_URL =
  "https://docs.google.com/forms/d/e/1FAIpQLSfCTtRzKzfwmnpJoPFYyOeGokTlRcKkvpb-Urme84gpBrCCPA/viewform";

type FeedbackModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const FeedbackModal = ({ open, onOpenChange }: FeedbackModalProps) => {
  const handleProvideFeedback = () => {
    window.open(FEEDBACK_FORM_URL, "_blank", "noopener,noreferrer");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center sm:text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <MessageSquareHeartIcon className="h-8 w-8 text-primary" />
          </div>
          <DialogTitle className="text-xl">
            Congratulations on your Bumicert!
          </DialogTitle>
          <DialogDescription className="text-base pt-2">
            We&apos;d love to hear about your experience creating your Bumicert.
            Your feedback helps us improve the platform for everyone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button onClick={handleProvideFeedback} className="w-full">
            Share Feedback
            <ExternalLinkIcon className="ml-2 h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="w-full text-muted-foreground"
          >
            Maybe later
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default FeedbackModal;
