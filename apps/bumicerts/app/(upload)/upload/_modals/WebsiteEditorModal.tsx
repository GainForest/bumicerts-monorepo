"use client";

import { useState } from "react";
import { useModal } from "@/components/ui/modal/context";
import {
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalDescription,
  ModalFooter,
} from "@/components/ui/modal/modal";
import { Button } from "@/components/ui/button";

interface WebsiteEditorModalProps {
  currentUrl: string | null;
  onConfirm: (url: string | null) => void;
}

export function WebsiteEditorModal({
  currentUrl,
  onConfirm,
}: WebsiteEditorModalProps) {
  const { hide, popModal, stack } = useModal();
  const [value, setValue] = useState(currentUrl ?? "");
  const [error, setError] = useState<string | null>(null);

  const handleClose = async () => {
    if (stack.length === 1) {
      await hide();
      popModal();
    } else {
      popModal();
    }
  };

  const validate = (url: string): boolean => {
    if (!url) return true; // empty = remove website
    try {
      const parsed = new URL(url.startsWith("http") ? url : `https://${url}`);
      return parsed.hostname.includes(".");
    } catch {
      return false;
    }
  };

  const handleConfirm = async () => {
    const trimmed = value.trim();
    if (trimmed && !validate(trimmed)) {
      setError("Please enter a valid URL (e.g. https://yourorg.com)");
      return;
    }
    const normalised = trimmed
      ? trimmed.startsWith("http")
        ? trimmed
        : `https://${trimmed}`
      : null;
    onConfirm(normalised);
    await handleClose();
  };

  return (
    <ModalContent>
      <ModalHeader backAction={stack.length > 1 ? handleClose : undefined}>
        <ModalTitle>Website</ModalTitle>
        <ModalDescription>
          Enter your organization&apos;s website address.
        </ModalDescription>
      </ModalHeader>

      <div className="py-4 flex flex-col gap-2">
        <input
          type="url"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setError(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") void handleConfirm();
          }}
          placeholder="https://yourorganization.com"
          className="w-full h-10 px-3 text-sm bg-muted/40 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-colors"
          autoFocus
        />
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>

      <ModalFooter className="flex justify-end gap-2">
        <Button onClick={handleConfirm}>Save</Button>
        <div className="flex items-center gap-1">
          {value && (
            <Button
              variant="outline"
              onClick={() => {
                setValue("");
                setError(null);
              }}
              className="text-destructive hover:text-destructive flex-1"
            >
              Remove
            </Button>
          )}
          <Button variant="outline" onClick={handleClose} className="flex-1">
            Cancel
          </Button>
        </div>
      </ModalFooter>
    </ModalContent>
  );
}
