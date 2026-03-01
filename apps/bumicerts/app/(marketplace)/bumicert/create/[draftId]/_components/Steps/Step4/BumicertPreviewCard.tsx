"use client";
import { trpcApi } from "@/components/providers/TrpcProvider";
import { useAtprotoStore } from "@/components/stores/atproto";
import { useModal } from "@/components/ui/modal/context";
import { ProgressiveBlur } from "@/components/ui/progressive-blur";
import { allowedPDSDomains } from "@/lib/config/gainforest-sdk";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { getBlobUrl } from "gainforest-sdk/utilities/atproto";
import { Loader2, UploadIcon } from "lucide-react";
import Image from "next/image";
import { useFormStore } from "../../../form-store";
import { UploadLogoModal, UploadLogoModalId } from "./UploadLogoModal";

export const BumicertArt = ({
  logoUrl,
  coverImage,
  title,
  objectives,
  startDate,
  endDate,
  className,
  performant = true,
}: {
  logoUrl: string | null;
  coverImage: File | string;
  title: string;
  objectives: string[];
  startDate?: Date;
  endDate?: Date;
  className?: string;
  performant?: boolean;
}) => {
  return (
    <div
      className={cn(
        "group p-2 rounded-3xl shadow-2xl bg-white dark:bg-neutral-800 border border-black/10 dark:border-white/10",
        className
      )}
    >
      <div className="w-[256px] h-[360px] relative overflow-hidden rounded-2xl">
        <Image
          src={
            typeof coverImage === "string"
              ? coverImage
              : URL.createObjectURL(coverImage)
          }
          alt="Bumicert"
          fill
          className="object-cover rounded-2xl scale-105 group-hover:scale-100 transition-all duration-300"
        />
        {!performant && (
          <ProgressiveBlur
            position="bottom"
            height="55%"
            className="z-0"
            borderRadiusClassName="rounded-2xl"
          />
        )}
        {/* Gradient to improve contrast */}
        <div
          className={cn(
            "rounded-b-2xl absolute inset-0 top-[50%] bg-black/50 z-0 mask-t-from-50%",
            performant ? "backdrop-blur-xl" : ""
          )}
        ></div>
        <div className="absolute top-3 left-3 h-9 w-9 rounded-full bg-white border-2 border-black/10 shadow-lg">
          {logoUrl && (
            <Image src={logoUrl} alt="Logo" fill className="rounded-full" />
          )}
        </div>
        <div className="absolute bottom-3 left-3 right-3 flex flex-col">
          <span className="font-serif font-semibold text-white text-shadow-lg text-3xl mt-2">
            {title}
          </span>
          <span className="text-xs text-gray-200 text-shadow-lg mt-1">
            {startDate && format(startDate, "LLL dd, y")}
            {startDate && endDate && " → "}
            {endDate && format(endDate, "LLL dd, y")}
          </span>
          <div className="flex items-center gap-1 flex-wrap mt-2">
            {objectives.slice(0, 2).map((objective) => (
              <span
                key={objective}
                className="text-xs bg-white/50 text-black backdrop-blur-lg rounded-md px-3 py-1.5 w-fit font-medium text-shadow-lg shadow-lg"
              >
                {objective}
              </span>
            ))}
            {objectives.length > 2 && (
              <span className="text-xs bg-white/10 text-white backdrop-blur-lg rounded-md px-2 py-1.5 w-fit font-medium text-shadow-lg shadow-lg">
                +{objectives.length - 2}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

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
    data: organizationInfoResponse,
    isPending: isPendingOrganizationInfo,
    isPlaceholderData: isOlderData,
  } = trpcApi.gainforest.organization.info.get.useQuery(
    {
      did: auth.user?.did ?? "",
      pdsDomain: allowedPDSDomains[0],
    },
    {
      enabled: !!auth.user?.did,
    }
  );
  const organizationInfo = organizationInfoResponse?.value;
  const logoFromData = isOlderData ? undefined : organizationInfo?.logo;
  const logoUrl = logoFromData
    ? getBlobUrl(auth.user?.did ?? "", logoFromData.image, allowedPDSDomains[0])
    : null;

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
          <BumicertArt
            logoUrl={logoUrl}
            coverImage={coverImage}
            title={title}
            objectives={objectives}
            startDate={startDate}
            endDate={endDate}
          />
        ) : isLoadingOrganizationInfo ? (
          <div className="flex-1 flex flex-col items-center justify-center">
            <Loader2 className="animate-spin" />
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
