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
import { Calendar } from "@/components/ui/calendar";

interface StartDateSelectorModalProps {
  currentDate: string | null;
  onConfirm: (date: string | null) => void;
}

export function StartDateSelectorModal({
  currentDate,
  onConfirm,
}: StartDateSelectorModalProps) {
  const { hide, popModal, stack } = useModal();
  const [selected, setSelected] = useState<Date | undefined>(
    currentDate ? new Date(currentDate) : undefined,
  );

  const handleClose = async () => {
    if (stack.length === 1) {
      await hide();
      popModal();
    } else {
      popModal();
    }
  };

  const handleConfirm = async () => {
    const iso = selected ? selected.toISOString().slice(0, 10) : null;
    onConfirm(iso);
    await handleClose();
  };

  return (
    <ModalContent>
      <ModalHeader backAction={stack.length > 1 ? handleClose : undefined}>
        <ModalTitle>Founding Date</ModalTitle>
        <ModalDescription>
          Select the date your organization was founded or began operations.
        </ModalDescription>
      </ModalHeader>

      <div className="flex justify-center py-2">
        <Calendar
          captionLayout="dropdown"
          mode="single"
          selected={selected}
          onSelect={setSelected}
        />
      </div>

      <ModalFooter className="flex justify-end gap-2">
        <Button onClick={handleConfirm}>Confirm</Button>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            onClick={() => setSelected(undefined)}
            className="text-destructive hover:text-destructive flex-1"
            disabled={!selected}
          >
            Clear
          </Button>
          <Button variant="outline" onClick={handleClose} className="flex-1">
            Cancel
          </Button>
        </div>
      </ModalFooter>
    </ModalContent>
  );
}
