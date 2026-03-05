"use client";
import { useAtprotoStore } from "@/components/stores/atproto";
import { useModal } from "@/components/ui/modal/context";
import { Loader2Icon, UploadIcon } from "lucide-react";
import { useFormStore } from "../../../form-store";
import { UploadLogoModal, UploadLogoModalId } from "./UploadLogoModal";
import { queries } from "@/lib/graphql/queries/index";
import { BumicertCardVisual } from "@/app/(marketplace)/explore/_components/BumicertCard";

const BumicertPreviewCard = () => {
  const step1FormValues = useFormStore((state) => state.formValues[0]);
  const {
    coverImage,
    projectName: title,
    workType: objectives,
    projectDateRange: [startDate, endDate],
  } = step1FormValues;
  const auth = useAtprotoStore((state) => state.auth);
  const { show, pushModal } = useModal();
  const {
    data: orgLogoData,
    isPending: isPendingOrganizationInfo,
    isPlaceholderData: isOlderData,
  } = queries.organization.logo.useQuery({ did: auth.user?.did ?? "" });

  const logoFromData = isOlderData ? undefined : orgLogoData;
  const logoUrl = logoFromData ?? null;

  const isLoadingOrganizationInfo = isPendingOrganizationInfo || isOlderData;

  const isBumicertArtReady =
    coverImage && title && objectives.length;

  return (
    <div className="rounded-xl border border-primary/10 shadow-lg overflow-hidden bg-primary/10 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-center text-center text-primary px-2 py-1">
        <span className="font-medium">Preview your bumicert</span>
      </div>

      <div className="bg-background p-2 rounded-xl flex-1 flex flex-col gap-2 items-center justify-center">
        {!logoFromData && (
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
          <BumicertCardVisual
            logoUrl={logoUrl}
            coverImage={coverImage}
            title={title}
            organizationName=""
            objectives={objectives}
          />
        ) : isLoadingOrganizationInfo ? (
          <div className="flex-1 flex flex-col items-center justify-center">
            <Loader2Icon className="animate-spin" />
            <span className="text-sm text-muted-foreground text-center text-pretty">
              Generating the preview...
            </span>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center">
            <span className="text-sm text-muted-foreground text-center text-pretty">
              You need to complete the first step to preview the bumicert.
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default BumicertPreviewCard;
