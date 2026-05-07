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
import type { AuthenticatedAccountState } from "@/lib/account";
import { Button } from "@/components/ui/button";
import { useAtprotoStore } from "@/components/stores/atproto";
import { useModal } from "@/components/ui/modal/context";
import { toSerializableFile } from "@/lib/mutations-utils";
import { indexerTrpc } from "@/lib/trpc/indexer/client";
import { trpc } from "@/lib/trpc/client";
import { formatError } from "@/lib/utils/trpc-errors";
import { useCurrentAccountIdentity } from "@/hooks/use-current-account-identity";
import {
  BUMICERT_COVER_IMAGE_MAX_SIZE_MB,
  BUMICERT_COVER_IMAGE_SUPPORTED_TYPES,
} from "../../../constants";


export const UploadLogoModalId = "upload/organization/logo";

export const UploadLogoModal = () => {
  const { stack, popModal, hide } = useModal();
  const [logo, setLogo] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const auth = useAtprotoStore((state) => state.auth);
  const accountUtils = indexerTrpc.useUtils();
  const { account } = useCurrentAccountIdentity();

  const {
    mutate: _updateMutation,
    isPending: isUploadingLogo,
    isSuccess: isUploaded,
  } = trpc.certified.actor.profile.update.useMutation({
    onSuccess: (result) => {
      setUploadError(null);
      const did = auth.user?.did;

      if (
        did &&
        logo &&
        account &&
        (account.kind === "user" || account.kind === "organization")
      ) {
        const optimisticLogoUrl = URL.createObjectURL(logo);
        const optimisticLogoUri = optimisticLogoUrl as `${string}:${string}`;

        const nextAccount: AuthenticatedAccountState = {
          ...account,
          profile: {
            ...result.record,
            avatar: {
              $type: "org.hypercerts.defs#uri",
              uri: optimisticLogoUri,
            },
          },
        };

        accountUtils.account.current.setData(undefined, nextAccount);
        accountUtils.account.byDid.setData({ did }, nextAccount);
      }
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
        avatar: {
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
          Upload a logo for your account.
        </ModalDescription>
      </ModalHeader>
      <FileInput
        placeholder="Upload a logo for your account"
        supportedFileTypes={[...BUMICERT_COVER_IMAGE_SUPPORTED_TYPES]}
        maxSizeInMB={BUMICERT_COVER_IMAGE_MAX_SIZE_MB}
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
