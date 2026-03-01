import FileInput from "@/components/ui/FileInput";
import {
  ModalContent,
  ModalDescription,
  ModalFooter,
  ModalHeader,
  ModalTitle,
} from "@/components/ui/modal/modal";
import { getBlobUrl, type BlobRef } from "@/lib/atproto/blobs";
import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Loader2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useModal } from "@/components/ui/modal/context";
import { allowedPDSDomains } from "@/lib/config/pds";

const isBlobRef = (value: unknown): value is BlobRef => {
  return Boolean(value && typeof value === "object" && "ref" in value);
};

const getFileFromURL = async (url: string) => {
  const response = await fetch(url);
  const blob = await response.blob();

  const filetype = blob.type.split("/")[1];
  return new File([blob], `image.${filetype}`, { type: blob.type });
};

export const ImageEditorModalId = "image-editor-modal";

export const ImageEditorModal = ({
  title,
  description,
  initialImage,
  did,
  onImageChange,
}: {
  title: string;
  description: string;
  initialImage: File | BlobRef | undefined;
  did?: string;
  onImageChange: (image: File | BlobRef | undefined) => void;
}) => {
  const { popModal, stack, hide } = useModal();
  const initialBlobImageURL =
    isBlobRef(initialImage) && did
      ? getBlobUrl(did, initialImage, allowedPDSDomains[0])
      : null;
  const [isInitialBlobImageLoading, setIsInitialBlobImageLoading] = useState(
    Boolean(initialBlobImageURL)
  );
  const { mutate: getInitialBlobImage } = useMutation({
    mutationKey: [initialBlobImageURL],
    mutationFn: async () => {
      if (!initialBlobImageURL) return null;
      return await getFileFromURL(initialBlobImageURL);
    },
    onSuccess: (data) => {
      setImage(data ?? undefined);
      setIsInitialBlobImageLoading(false);
    },
    onError: (error) => {
      console.error(error);
      setIsInitialBlobImageLoading(false);
    },
  });
  const [image, setImage] = useState<File | undefined>(
    isBlobRef(initialImage) ? undefined : initialImage
  );

  useEffect(() => {
    if (initialBlobImageURL) {
      getInitialBlobImage();
    }
  }, [initialBlobImageURL, getInitialBlobImage]);

  const handleDone = () => {
    onImageChange(image);
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
      <ModalHeader>
        <ModalTitle>{title}</ModalTitle>
        <ModalDescription>{description}</ModalDescription>
      </ModalHeader>
      <div className="flex flex-col gap-4 mt-4">
        {isInitialBlobImageLoading ? (
          <div className="w-full h-40 rounded-lg bg-muted flex flex-col gap-1 items-center justify-center">
            <Loader2Icon className="size-5 animate-spin" />
            <span className="text-sm text-muted-foreground">Loading...</span>
          </div>
        ) : (
          <FileInput
            supportedFileTypes={[
              "image/jpg",
              "image/jpeg",
              "image/png",
              "image/webp",
            ]}
            maxSizeInMB={5}
            value={image}
            onFileChange={(file) => {
              setImage(file ?? undefined);
            }}
          />
        )}
      </div>
      <ModalFooter>
        <Button
          onClick={() => {
            handleDone();
          }}
        >
          Done
        </Button>
      </ModalFooter>
    </ModalContent>
  );
};
