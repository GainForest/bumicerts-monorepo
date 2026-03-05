import {
  ModalContent,
  ModalDescription,
  ModalFooter,
  ModalHeader,
  ModalTitle,
} from "@/components/ui/modal/modal";
import FileInput from "../../../../../../../../components/ui/FileInput";
import { useState } from "react";
import { Loader2Icon, UploadIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAtprotoStore } from "@/components/stores/atproto";
import { useModal } from "@/components/ui/modal/context";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toSerializableFile } from "@/lib/mutations-utils";
import { updateOrganizationInfoAction } from "@/lib/actions/organizations";
import { queries } from "@/lib/graphql/queries/index";

export const UploadLogoModalId = "upload/organization/logo";

export const UploadLogoModal = () => {
  const { stack, popModal, hide } = useModal();
  const [logo, setLogo] = useState<File | null>(null);
  const auth = useAtprotoStore((state) => state.auth);
  const queryClient = useQueryClient();

  const {
    mutate: uploadLogo,
    isPending: isUploadingLogo,
    isSuccess: isUploaded,
  } = useMutation({
    mutationFn: async () => {
      if (!auth.user?.did) throw new Error("User is not authenticated");
      if (!logo) throw new Error("Logo is required");

      const logoFile = await toSerializableFile(logo);

      return updateOrganizationInfoAction({
        data: {
          logo: {
            $type: "org.hypercerts.defs#smallImage" as const,
            image: logoFile,
          },
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queries.organization.key() });
    },
  });

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
            disabled={!logo || isUploadingLogo}
            onClick={() => uploadLogo()}
          >
            {isUploadingLogo ? (
              <Loader2Icon className="animate-spin" />
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
