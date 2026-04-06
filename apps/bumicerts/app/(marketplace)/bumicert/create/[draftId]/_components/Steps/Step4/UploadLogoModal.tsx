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
import { toSerializableFile } from "@/lib/mutations-utils";
import { trpc } from "@/lib/trpc/client";
import { indexerTrpc } from "@/lib/trpc/indexer/client";
import { formatError } from "@/lib/utils/trpc-errors";


export const UploadLogoModalId = "upload/organization/logo";

export const UploadLogoModal = () => {
  const { stack, popModal, hide } = useModal();
  const [logo, setLogo] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const auth = useAtprotoStore((state) => state.auth);
  const indexerUtils = indexerTrpc.useUtils();

  const {
    mutate: _updateMutation,
    isPending: isUploadingLogo,
    isSuccess: isUploaded,
  } = trpc.organization.info.update.useMutation({
    onSuccess: () => {
      setUploadError(null);
      void indexerUtils.organization.invalidate();
    },
    onError: (err) => {
      setUploadError(formatError(err));
    },
  });

  const uploadLogo = async () => {
    if (!auth.user?.did) throw new Error("User is not authenticated");
    if (!logo) throw new Error("Logo is required");
    const logoFile = await toSerializableFile(logo);
    _updateMutation({
      data: {
        logo: {
          $type: "org.hypercerts.defs#smallImage" as const,
          image: logoFile,
        },
      },
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

      {uploadError && (
        <div
          className="p-2 bg-destructive/10 border border-destructive/20 rounded-lg"
          role="alert"
        >
          <p className="text-xs text-destructive">{uploadError}</p>
        </div>
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
