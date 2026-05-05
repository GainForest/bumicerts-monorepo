"use client";
import { useModal } from "@/components/ui/modal/context";
import { Loader2Icon, UploadIcon } from "lucide-react";
import { useFormStore } from "../../../form-store";
import { UploadLogoModal, UploadLogoModalId } from "./UploadLogoModal";
import { BumicertCardVisual } from "@/app/(marketplace)/explore/_components/BumicertCard";
import { useCurrentAccountIdentity } from "@/hooks/use-current-account-identity";

const BumicertPreviewCard = () => {
  const step1FormValues = useFormStore((state) => state.formValues[0]);
  const step2FormValues = useFormStore((state) => state.formValues[1]);
  const {
    coverImage,
    projectName: title,
    workType: objectives,
  } = step1FormValues;
  const { displayName: organizationName, logoUrl, query } =
    useCurrentAccountIdentity();
  const { show, pushModal } = useModal();
  const isLoadingOrganizationInfo = query.isLoading;

  const isBumicertArtReady = coverImage && title && objectives.length;

  return (
    <div className="rounded-xl border border-primary/10 shadow-lg overflow-hidden bg-primary/10 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-center text-center text-primary px-2 py-1">
        <span className="font-medium">Preview your bumicert</span>
      </div>

      <div className="bg-background p-3 rounded-xl flex-1 flex flex-col gap-3">
        {!logoUrl && (
          <div className="w-full flex items-start gap-2 border border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300 rounded-lg p-2 relative">
            <button
              type="button"
              className="absolute h-6 w-6 -top-1 -right-1 bg-amber-500 text-white rounded-full flex items-center justify-center cursor-pointer"
              onClick={() => {
                pushModal(
                  {
                    id: UploadLogoModalId,
                    content: <UploadLogoModal />,
                  },
                  true
                );
                show();
              }}
            >
              <UploadIcon className="size-4" />
            </button>
            <span className="text-sm text-pretty mr-3">
              Your organization doesn&apos;t have a logo. Do you want to add
              one?
            </span>
          </div>
        )}

        {isBumicertArtReady ? (
          // Full-width card — max-w keeps it readable on very wide panels
          <div className="w-full max-w-sm mx-auto aspect-3/4">
              <BumicertCardVisual
                logoUrl={logoUrl}
                coverImage={coverImage}
                title={title}
                description={
                  step2FormValues.shortDescription.length > 0
                    ? step2FormValues.shortDescription
                    : undefined
                }
                organizationName={organizationName}
                objectives={objectives}
                className="h-full"
              />
          </div>
        ) : isLoadingOrganizationInfo ? (
          <div className="flex-1 flex flex-col items-center justify-center py-8">
            <Loader2Icon className="animate-spin" />
            <span className="text-sm text-muted-foreground text-center text-pretty mt-2">
              Generating the preview...
            </span>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center py-8">
            <span className="text-sm text-muted-foreground text-center text-pretty">
              Complete the first step to preview your bumicert.
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default BumicertPreviewCard;
