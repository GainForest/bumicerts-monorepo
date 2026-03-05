"use client";
import { useModal } from "@/components/ui/modal/context";
import {
  ModalContent,
  ModalDescription,
  ModalFooter,
  ModalHeader,
  ModalTitle,
} from "@/components/ui/modal/modal";
import { Button } from "@/components/ui/button";
import { useMutation } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { useFormStore } from "../form-store";
import useNewBumicertStore from "../store";
import { usePathname, useRouter } from "next/navigation";
import { links } from "@/lib/links";
import { ArrowRightIcon, CircleCheckIcon, Loader2Icon, SaveIcon } from "lucide-react";
import CircularProgressBar from "@/components/circular-progressbar";
import { cheapHash } from "@/lib/cheapHash";
import { DraftBumicertResponse } from "@/app/api/supabase/drafts/bumicert/type";
import { trackDraftSaved } from "@/lib/analytics/hotjar";

export const SaveAsDraftModalId = "bumicert/save-as-draft";

const uploadImageToS3 = async (file: File): Promise<string> => {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(links.api.aws.upload.image, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || "Failed to upload image");
  }

  const data = await response.json();
  return data.url;
};

const SaveAsDraftModal = () => {
  const { stack, popModal, hide } = useModal();
  const formValues = useFormStore((state) => state.formValues);
  const draftCoverImageHash = useFormStore(
    (state) => state.draftCoverImageHash
  );
  const setDraftCoverImageHash = useFormStore(
    (state) => state.setDraftCoverImageHash
  );
  const markAsSaved = useFormStore((state) => state.markAsSaved);
  const formCompletionPercentages = useFormStore(
    (state) => state.formCompletionPercentages
  );
  const { currentStepIndex } = useNewBumicertStore();
  const stepPercentages =
    formCompletionPercentages.reduce((acc, curr) => acc + curr, 0) /
    formCompletionPercentages.length;
  const pathname = usePathname();
  const router = useRouter();

  const {
    mutate: saveDraft,
    isPending,
    isSuccess: success,
    error,
  } = useMutation({
    mutationFn: async () => {
      const [step1, step2, step3] = formValues;

      const draftIdMatch = pathname.match(/\/create\/(\d+)$/);
      const draftId = draftIdMatch ? parseInt(draftIdMatch[1], 10) : null;
      const isUpdate = draftId !== null && draftId !== 0 && !isNaN(draftId);

      let coverImageUrl: string | undefined;
      let newCoverImageHash: string | undefined;

      if (step1.coverImage && step1.coverImage.size > 0) {
        const currentCoverImageHash = await cheapHash(step1.coverImage);
        newCoverImageHash = currentCoverImageHash;

        if (
          isUpdate &&
          draftCoverImageHash &&
          currentCoverImageHash === draftCoverImageHash
        ) {
          const draftResponse = await fetch(
            links.api.drafts.bumicert.get({ draftIds: [draftId!] }),
            {
              method: "GET",
              credentials: "include",
            }
          );

          if (draftResponse.ok) {
            const draftData = await draftResponse.json();
            const draft: DraftBumicertResponse | undefined =
              draftData.drafts?.[0];
            if (draft?.data?.coverImage) {
              coverImageUrl = draft.data.coverImage;
            } else {
              coverImageUrl = await uploadImageToS3(step1.coverImage);
            }
          } else {
            coverImageUrl = await uploadImageToS3(step1.coverImage);
          }
        } else {
          coverImageUrl = await uploadImageToS3(step1.coverImage);
        }
      }

      // Map form data to API format
      const draftData = {
        title: step1.projectName || undefined,
        startDate: step1.projectDateRange[0]?.toISOString(),
        endDate: step1.projectDateRange[1]?.toISOString(),
        workScopes: step1.workType.length > 0 ? step1.workType : undefined,
        coverImage: coverImageUrl,
        description: step2.description || undefined,
        shortDescription: step2.shortDescription || undefined,
        contributors:
          step3.contributors.length > 0
            ? step3.contributors.map((c) => c.name)
            : undefined,
        siteBoundaries:
          step3.siteBoundaries.length > 0 ? step3.siteBoundaries : undefined,
      };

      const requestBody = isUpdate
        ? { id: draftId, data: draftData }
        : { data: draftData };

      const response = await fetch(links.api.drafts.bumicert.post, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to save draft");
      }

      const result = await response.json();
      return { result, isUpdate, draftId: draftId ?? 0, newCoverImageHash };
    },
    onSuccess: async (data) => {
      // Mark form as saved (clears dirty state for beforeunload warning)
      markAsSaved();
      
      if (data.newCoverImageHash) {
        setDraftCoverImageHash(data.newCoverImageHash);
      }

      const savedDraftId = data.result.draft?.id;

      // Track draft saved event
      if (savedDraftId) {
        trackDraftSaved({
          draftId: savedDraftId,
          stepIndex: currentStepIndex,
          isUpdate: data.isUpdate,
        });
      }

      // For new drafts, show success message briefly before redirecting
      if (savedDraftId && data.draftId !== savedDraftId) {
        // Wait 1.5 seconds so user can see the success message
        await new Promise((resolve) => setTimeout(resolve, 1500));
        await hide();
        popModal();
        router.push(links.bumicert.createWithDraftId(savedDraftId.toString()));
      }
    },
  });

  const handleSave = () => {
    saveDraft();
  };

  const handleClose = () => {
    if (stack.length === 1) {
      hide().then(() => {
        popModal();
      });
    } else {
      popModal();
    }
  };

  return (
    <ModalContent>
      <ModalHeader
        backAction={
          stack.length === 1 || success
            ? undefined
            : () => {
                popModal();
              }
        }
      >
        <ModalTitle>Save as Draft</ModalTitle>
        <ModalDescription>
          {success
            ? "Your draft has been saved successfully."
            : "Save your current progress as a draft."}
        </ModalDescription>
      </ModalHeader>
      <AnimatePresence>
        {!success ? (
          <motion.div
            className="flex flex-col items-center gap-1 mt-4"
            exit={{ opacity: 0, filter: "blur(10px)", scale: 0.5 }}
          >
            <div className="p-4 w-full bg-muted rounded-xl flex flex-col items-center justify-center">
              <CircularProgressBar value={stepPercentages} size={34} />
              <span className="text-center text-pretty text-muted-foreground mt-2">
                Save your progress for <br />
                <strong className="font-medium text-foreground">
                  {formValues[0].projectName.trim() === ""
                    ? "Untitled Draft"
                    : formValues[0].projectName}
                </strong>
              </span>
            </div>
            {error && (
              <div className="text-red-500 w-full text-left text-sm">
                {error.message}
              </div>
            )}
            <ModalFooter className="w-full">
              <Button
                disabled={isPending}
                onClick={handleSave}
                className="w-full"
              >
                {isPending ? (
                  <>
                    <Loader2Icon className="mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    Save Draft
                    <ArrowRightIcon />
                  </>
                )}
              </Button>
            </ModalFooter>
          </motion.div>
        ) : (
          <motion.div
            className="flex flex-col items-center gap-4 mt-8"
            initial={{ opacity: 0, filter: "blur(10px)", scale: 0.5 }}
            animate={{ opacity: 1, filter: "blur(0px)", scale: 1 }}
          >
            <div className="flex items-center justify-center relative">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="h-20 w-20 bg-primary blur-2xl rounded-full animate-pulse"></div>
              </div>
              <CircleCheckIcon className="size-20 text-primary" />
            </div>
            <p className="text-center text-muted-foreground font-medium text-pretty">
              Your draft has been saved. You can continue working on it later.
            </p>
            <ModalFooter className="w-full">
              <Button onClick={handleClose} className="w-full">
                Close
              </Button>
            </ModalFooter>
          </motion.div>
        )}
      </AnimatePresence>
    </ModalContent>
  );
};

export default SaveAsDraftModal;
