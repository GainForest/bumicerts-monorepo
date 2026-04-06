"use client";

import { Button } from "@/components/ui/button";
import { useFormStore } from "../form-store";
import { useAtprotoStore } from "@/components/stores/atproto";
import StepHeader from "./StepProgress";
import { useModal } from "@/components/ui/modal/context";
import SaveAsDraftModal, { SaveAsDraftModalId } from "./SaveAsDraftModal";
import DeleteDraftModal, { DeleteDraftModalId } from "./DeleteDraftModal";
import { usePathname } from "next/navigation";
import { Trash2Icon } from "lucide-react";
import { HeaderContent } from "@/app/(marketplace)/_components/Header/HeaderContent";

// ── Slot components ─────────────────────────────────────────────────────────

const RightContent = () => {
  const isHydrated = useFormStore((state) => state.isHydrated);
  const auth = useAtprotoStore((state) => state.auth);
  const { pushModal, show } = useModal();
  const pathname = usePathname();

  if (!isHydrated || !auth.authenticated) return null;

  const draftIdMatch = pathname.match(/\/create\/(\d+)$/);
  const draftId = draftIdMatch ? parseInt(draftIdMatch[1], 10) : null;
  const showDeleteButton = draftId !== null && draftId !== 0 && !isNaN(draftId);

  const handleSaveDraft = () => {
    pushModal({ id: SaveAsDraftModalId, content: <SaveAsDraftModal /> }, true);
    show();
  };

  const handleDeleteDraft = () => {
    pushModal({ id: DeleteDraftModalId, content: <DeleteDraftModal /> }, true);
    show();
  };

  return (
    <div className="flex items-center gap-2">
      {showDeleteButton && (
        <Button
          size={"icon-sm"}
          variant="ghost"
          onClick={handleDeleteDraft}
          className="text-destructive hover:text-destructive"
        >
          <Trash2Icon />
        </Button>
      )}
      <Button size={"sm"} onClick={handleSaveDraft}>
        Save as Draft
      </Button>
    </div>
  );
};

const SubHeaderContent = () => {
  const isHydrated = useFormStore((state) => state.isHydrated);
  const auth = useAtprotoStore((state) => state.auth);

  if (!isHydrated || !auth.authenticated) return null;
  return (
    <div className="w-full pt-1">
      <StepHeader />
    </div>
  );
};

// ── Exported injector ────────────────────────────────────────────────────────

/**
 * Renders the header slots for the draft editing page.
 * HeaderContent auto-clears all slots when this component unmounts.
 */
const DraftHeaderContent = () => (
  <HeaderContent right={<RightContent />} sub={<SubHeaderContent />} />
);

export default DraftHeaderContent;
