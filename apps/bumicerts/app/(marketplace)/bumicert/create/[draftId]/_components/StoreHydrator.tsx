"use client";
import React, { useEffect, useState } from "react";
import {
  Step1FormValues,
  Step2FormValues,
  Step3FormValues,
  useFormStore,
} from "../form-store";
import { textToLinearDocument } from "@/lib/utils/linearDocument";
import { LeafletLinearDocumentSchema } from "@gainforest/leaflet-react/schemas";
import { useModal } from "@/components/ui/modal/context";
import {
  ModalContent,
  ModalDescription,
  ModalFooter,
  ModalHeader,
  ModalTitle,
} from "@/components/ui/modal/modal";
import { Button } from "@/components/ui/button";
import { DraftBumicertResponse } from "@/app/api/supabase/drafts/bumicert/type";
import { cheapHash } from "@/lib/cheapHash";
import { AlertTriangleIcon } from "lucide-react";

const CreateBumicertHydrationErrorModalId = "create-bumicert-hydration-error";
const CreateBumicertHydrationErrorModalContent = () => {
  const { stack, popModal, hide } = useModal();
  return (
    <ModalContent>
      <ModalHeader>
        <ModalTitle>Error</ModalTitle>
        <ModalDescription>
          We were unable to load the data you saved. Please reach out to
          support.
        </ModalDescription>
      </ModalHeader>
      <ModalFooter>
        <Button
          onClick={
            stack.length === 1
              ? () => {
                  hide().then(() => {
                    popModal();
                  });
                }
              : popModal
          }
        >
          {stack.length === 1 ? "Close" : "Back"}
        </Button>
      </ModalFooter>
    </ModalContent>
  );
};

// Warning banner component for cover image load failure
const CoverImageWarningBanner = ({
  onDismiss,
}: {
  onDismiss: () => void;
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
        onClick={onDismiss}
      />
      {/* Banner */}
      <div className="relative bg-amber-50 dark:bg-amber-950 border-2 border-amber-300 dark:border-amber-700 rounded-xl p-6 shadow-2xl max-w-lg w-full animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 p-2 bg-amber-100 dark:bg-amber-900 rounded-full">
            <AlertTriangleIcon className="h-6 w-6 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-amber-800 dark:text-amber-200">
              Cover image couldn&apos;t be loaded
            </h3>
            <p className="text-amber-700 dark:text-amber-300 mt-2">
              Your draft data has been restored successfully, but the cover image couldn&apos;t be fetched. Please re-upload your cover image to continue.
            </p>
          </div>
        </div>
        <div className="mt-5 flex justify-end">
          <button
            onClick={onDismiss}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-medium rounded-lg transition-colors"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};

const urlToFile = async (url: string): Promise<File | null> => {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;

    const blob = await response.blob();
    const urlObj = new URL(url);
    const filename =
      urlObj.pathname.split("/").pop()?.split("?")[0] ?? "image.png";
    const finalFilename = filename.includes(".") ? filename : `${filename}.png`;

    return new File([blob], finalFilename, { type: blob.type });
  } catch {
    return null;
  }
};

const StoreHydrator = ({
  draftResponse,
  children,
}: {
  draftResponse: DraftBumicertResponse | null | undefined;
  children: React.ReactNode;
}) => {
  const isHydrated = useFormStore((state) => state.isHydrated);
  const hydrate = useFormStore((state) => state.hydrate);
  const [showCoverImageWarning, setShowCoverImageWarning] = useState(false);

  const { show, pushModal } = useModal();

  useEffect(() => {
    if (isHydrated) return;
    if (!draftResponse) {
      hydrate(null);
      return;
    }

    const hydrateStore = async () => {
      try {
        const draftData = draftResponse.data;

        let coverImageFile: File | null = null;
        let draftCoverImageHash: string | undefined;
        let coverImageLoadFailed = false;

        if (draftData.coverImage) {
          coverImageFile = await urlToFile(draftData.coverImage);
          if (!coverImageFile) {
            // Cover image failed to load, but continue with other data
            // Don't fail the entire hydration - just show a warning
            console.warn("Failed to load cover image from URL:", draftData.coverImage);
            coverImageFile = new File([], "cover-image.png");
            coverImageLoadFailed = true;
          } else {
            try {
              draftCoverImageHash = await cheapHash(coverImageFile);
            } catch {
              draftCoverImageHash = undefined;
            }
          }
        } else {
          coverImageFile = new File([], "cover-image.png");
        }

        // Parse dates with fallback
        const thisYear = new Date().getFullYear();
        const startDate = draftData.startDate
          ? isNaN(new Date(draftData.startDate).getTime())
            ? new Date(`${thisYear}-01-01`)
            : new Date(draftData.startDate)
          : new Date(`${thisYear}-01-01`);
        // endDate is null for ongoing bumicerts
        const endDate: Date | null = draftData.endDate
          ? isNaN(new Date(draftData.endDate).getTime())
            ? null
            : new Date(draftData.endDate)
          : null;
        const isOngoing = endDate === null;

        // Map draft data to form values
        const step1Data: Step1FormValues = {
          projectName: draftData.title ?? "",
          coverImage: coverImageFile,
          workType: draftData.workScopes ?? [],
          projectDateRange: [startDate, endDate],
          isOngoing,
        };

        // Parse draft description — V1 drafts stored it as a plain string,
        // V2+ store it as a LeafletLinearDocument. Handle both formats.
        const rawDescription = draftData.description;
        const parsedDescription = (() => {
          // Try to parse as LinearDocument first
          if (rawDescription && typeof rawDescription === "object") {
            const parseResult = LeafletLinearDocumentSchema.safeParse(rawDescription);
            if (parseResult.success) return parseResult.data;
          }
          // Fall back: treat as plain string (legacy V1 drafts)
          if (typeof rawDescription === "string" && rawDescription.trim()) {
            return textToLinearDocument(rawDescription);
          }
          return { blocks: [] as Step2FormValues["description"]["blocks"] };
        })();

        const step2Data: Step2FormValues = {
          shortDescription: draftData.shortDescription ?? "",
          description: parsedDescription,
        };

        const step3Data: Step3FormValues = {
          contributors: (draftData.contributors ?? []).map((name) => ({
            id: crypto.randomUUID(),
            name,
          })),
          siteBoundaries: draftData.siteBoundaries ?? [],
          confirmPermissions: false,
          agreeTnc: false,
        };

        const formValues = [step1Data, step2Data, step3Data] satisfies [
          Step1FormValues,
          Step2FormValues,
          Step3FormValues
        ];

        hydrate(formValues, draftCoverImageHash);
        
        // Show warning banner if cover image failed to load
        if (coverImageLoadFailed) {
          setShowCoverImageWarning(true);
        }
      } catch (error) {
        console.error("Error hydrating store:", error);
        pushModal({
          id: CreateBumicertHydrationErrorModalId,
          content: <CreateBumicertHydrationErrorModalContent />,
        });
        show();
        hydrate(null);
      }
    };

    hydrateStore();
  }, [isHydrated, draftResponse, hydrate, pushModal, show]);

  return (
    <>
      {showCoverImageWarning && (
        <CoverImageWarningBanner
          onDismiss={() => setShowCoverImageWarning(false)}
        />
      )}
      {children}
    </>
  );
};

export default StoreHydrator;
