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
import { GlobeIcon, LockIcon, CheckIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type Visibility = "Public" | "Unlisted";

interface VisibilityOption {
  value: Visibility;
  label: string;
  description: string;
  Icon: typeof GlobeIcon;
}

const OPTIONS: VisibilityOption[] = [
  {
    value: "Public",
    label: "Public",
    description:
      "Visible to everyone. Appears in organization listings and search results.",
    Icon: GlobeIcon,
  },
  {
    value: "Unlisted",
    label: "Unlisted",
    description:
      "Only accessible via direct link. Not listed publicly or in search.",
    Icon: LockIcon,
  },
];

interface VisibilitySelectorModalProps {
  current: Visibility;
  onConfirm: (value: Visibility) => void;
}

export function VisibilitySelectorModal({
  current,
  onConfirm,
}: VisibilitySelectorModalProps) {
  const { hide, popModal, stack } = useModal();
  const [selected, setSelected] = useState<Visibility>(current);

  const handleClose = async () => {
    if (stack.length === 1) {
      await hide();
      popModal();
    } else {
      popModal();
    }
  };

  const handleConfirm = async () => {
    onConfirm(selected);
    await handleClose();
  };

  return (
    <ModalContent>
      <ModalHeader backAction={stack.length > 1 ? handleClose : undefined}>
        <ModalTitle>Discoverability</ModalTitle>
        <ModalDescription>
          Choose who can discover your organization.
        </ModalDescription>
      </ModalHeader>

      <div className="flex flex-col gap-2 py-4">
        {OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => setSelected(opt.value)}
            className={cn(
              "flex items-start gap-3 w-full px-4 py-3 rounded-xl border text-left transition-colors cursor-pointer",
              selected === opt.value
                ? "border-primary/40 bg-primary/5"
                : "border-border hover:bg-muted/60",
            )}
          >
            <opt.Icon
              className={cn(
                "h-4 w-4 mt-0.5 shrink-0",
                selected === opt.value
                  ? "text-primary"
                  : "text-muted-foreground",
              )}
            />
            <div className="flex-1 min-w-0">
              <p
                className={cn(
                  "text-sm font-medium",
                  selected === opt.value ? "text-primary" : "text-foreground",
                )}
              >
                {opt.label}
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">
                {opt.description}
              </p>
            </div>
            {selected === opt.value && (
              <CheckIcon className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            )}
          </button>
        ))}
      </div>

      <ModalFooter className="flex justify-end gap-2">
        <Button variant="outline" onClick={handleClose}>
          Cancel
        </Button>
        <Button onClick={handleConfirm}>Save</Button>
      </ModalFooter>
    </ModalContent>
  );
}
