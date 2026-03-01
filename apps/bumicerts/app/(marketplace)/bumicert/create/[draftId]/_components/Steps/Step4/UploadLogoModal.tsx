import {
  ModalContent,
  ModalDescription,
  ModalFooter,
  ModalHeader,
  ModalTitle,
} from "@/components/ui/modal/modal";
import FileInput from "../../../../../../../../components/ui/FileInput";
import { useState } from "react";
import { Loader2, UploadIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { allowedPDSDomains } from "@/lib/config/gainforest-sdk";
import { useAtprotoStore } from "@/components/stores/atproto";
import { useModal } from "@/components/ui/modal/context";
import { toBlobRefGenerator, toFileGenerator } from "gainforest-sdk/zod";
import { trpcApi } from "@/components/providers/TrpcProvider";
import { $Typed } from "gainforest-sdk/lex-api/utils";
import { PubLeafletBlocksText } from "gainforest-sdk/lex-api";

export const UploadLogoModalId = "upload/organization/logo";

export const UploadLogoModal = () => {
  const { stack, popModal, hide } = useModal();
  const [logo, setLogo] = useState<File | null>(null);
  const auth = useAtprotoStore((state) => state.auth);
  const utils = trpcApi.useUtils();

  const {
    data: organizationInfoResponse,
    isPending: isPendingOrganizationInfo,
    isPlaceholderData: isOlderData,
  } = trpcApi.gainforest.organization.info.get.useQuery({
    pdsDomain: allowedPDSDomains[0],
    did: auth.user?.did ?? "",
  });
  const organizationInfo = organizationInfoResponse?.value;
  const isLoadingOrganizationInfo = isPendingOrganizationInfo || isOlderData;
  const {
    mutate: uploadLogo,
    isPending: isUploadingLogo,
    isSuccess: isUploaded,
  } = trpcApi.gainforest.organization.info.createOrUpdate.useMutation({
    onSuccess: () => {
      utils.gainforest.organization.info.get.invalidate({
        did: auth.user?.did ?? "",
        pdsDomain: allowedPDSDomains[0],
      });
    },
  });

  const handleUploadLogo = async () => {
    if (!auth.user?.did) throw new Error("User is not authenticated");
    if (!logo) throw new Error("Logo is required");
    if (!organizationInfo)
      throw new Error("Organization information is required");
    
    const shortDescription = organizationInfo.shortDescription ?? { text: "", facets: [] };
    
    await uploadLogo({
      did: auth.user?.did ?? "",
      uploads: {
        logo: await toFileGenerator(logo),
      },
      info: {
        displayName: organizationInfo.displayName,
        // The TRPC mutation input types shortDescription as `string`, but the API
        // accepts the full Richtext object (text + facets). The SDK input type is
        // incorrect — same mismatch as longDescription below.
        // @ts-expect-error SDK input type incorrectly narrows shortDescription to string
        shortDescription,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        longDescription: organizationInfo.longDescription as any,
        objectives: organizationInfo.objectives,
        country: organizationInfo.country,
        visibility: organizationInfo.visibility,
        website: organizationInfo.website,
        startDate: organizationInfo.startDate,
        createdAt: organizationInfo.createdAt,
        logo: organizationInfo.logo
          ? toBlobRefGenerator(organizationInfo.logo.image)
          : undefined,
        coverImage: organizationInfo.coverImage
          ? toBlobRefGenerator(organizationInfo.coverImage.image)
          : undefined,
      },
      pdsDomain: allowedPDSDomains[0],
    });
  };
  return (
    <ModalContent>
      <ModalHeader
        backAction={
          stack.length === 1
            ? undefined
            : () => {
                popModal();
              }
        }
      >
        <ModalTitle>Upload Logo</ModalTitle>
        <ModalDescription>
          Upload a logo for your organization.
        </ModalDescription>
      </ModalHeader>
      {isLoadingOrganizationInfo ? (
        <div className="flex-1 flex flex-col items-center justify-center">
          <Loader2 className="animate-spin" />
          <span className="text-sm text-muted-foreground">
            Loading organization information...
          </span>
        </div>
      ) : (
        <FileInput
          placeholder="Upload a logo for your organization"
          supportedFileTypes={[
            "image/jpg",
            "image/jpeg",
            "image/png",
            "image/webp",
          ]}
          maxSizeInMB={5}
          value={logo}
          onFileChange={setLogo}
        />
      )}

      <ModalFooter>
        {isUploaded ? (
          <Button
            onClick={() => {
              if (stack.length === 1) {
                hide().then(() => {
                  popModal();
                });
              } else {
                popModal();
              }
            }}
          >
            Done
          </Button>
        ) : (
          <Button
            disabled={isLoadingOrganizationInfo || !logo || isUploadingLogo}
            onClick={() => handleUploadLogo()}
          >
            {isUploadingLogo ? (
              <Loader2 className="animate-spin" />
            ) : (
              <UploadIcon />
            )}
            {isUploadingLogo ? "Uploading..." : "Upload"}
          </Button>
        )}
      </ModalFooter>
    </ModalContent>
  );
};
