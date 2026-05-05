"use client";

import Image from "next/image";
import { ImageIcon } from "lucide-react";
import { ImageEditorModalId } from "@/components/modals/image-editor";
import { ImageEditorModal } from "@/components/modals/image-editor";
import { useModal } from "@/components/ui/modal/context";
import { InputGroup, InputGroupInput } from "@/components/ui/input-group";
import type { OnboardingKind } from "./types";
import { useObjectUrl } from "./useObjectUrl";

export function OnboardingMediaField({
  kind,
  primaryImage,
  bannerImage,
  displayName,
  displayNamePlaceholder,
  displayNameError,
  onPrimaryImageChange,
  onBannerImageChange,
  onDisplayNameChange,
}: {
  kind: OnboardingKind;
  primaryImage: File | undefined;
  bannerImage: File | undefined;
  displayName: string;
  displayNamePlaceholder: string;
  displayNameError?: string;
  onPrimaryImageChange: (image: File | undefined) => void;
  onBannerImageChange: (image: File | undefined) => void;
  onDisplayNameChange: (value: string) => void;
}) {
  const { pushModal, show } = useModal();
  const primaryImageUrl = useObjectUrl(primaryImage);
  const bannerImageUrl = useObjectUrl(bannerImage);
  const primaryLabel = kind === "organization" ? "Logo" : "Avatar";

  const openImageEditor = (
    target: "primary" | "banner",
    currentImage: File | undefined,
  ) => {
    const isPrimary = target === "primary";

    pushModal(
      {
        id: ImageEditorModalId,
        content: (
          <ImageEditorModal
            title={`Upload ${isPrimary ? primaryLabel.toLowerCase() : "banner"}`}
            description={
              isPrimary
                ? `Choose a clear ${primaryLabel.toLowerCase()} for your profile.`
                : "Choose a banner that sets the tone for your profile."
            }
            initialImage={currentImage}
            onImageChange={(image) => {
              if (isPrimary) {
                onPrimaryImageChange(image);
                return;
              }

              onBannerImageChange(image);
            }}
          />
        ),
      },
      true,
    );

    show();
  };

  return (
    <div className="space-y-0 pt-2">
      <button
        type="button"
        onClick={() => openImageEditor("banner", bannerImage)}
        className="relative block w-full overflow-hidden rounded-[24px] bg-muted/40 border text-left"
      >
        <div className="aspect-[16/6] w-full">
          {bannerImageUrl ? (
            <div className="relative h-full w-full">
              <Image
                src={bannerImageUrl}
                alt="Banner preview"
                fill
                unoptimized
                className="object-cover"
              />
            </div>
          ) : (
            <div className="flex h-full w-full items-center justify-center text-muted-foreground">
              <div className="flex flex-col items-center gap-2 text-center">
                <ImageIcon className="size-8 opacity-60" />
                <p className="text-sm text-foreground">Banner</p>
              </div>
            </div>
          )}
        </div>

        <span className="absolute bottom-3 right-3 rounded-full bg-background/75 px-2.5 py-1 text-xs text-foreground backdrop-blur-sm">
          {bannerImageUrl ? "Change banner" : "Add banner"}
        </span>
      </button>

      <div className="flex items-start gap-4 pl-4">
        <button
          type="button"
          onClick={() => openImageEditor("primary", primaryImage)}
          className="relative -mt-14 flex h-28 aspect-square shrink-0 items-center justify-center overflow-hidden rounded-full border border-border/50 bg-background"
          aria-label={`Upload ${primaryLabel.toLowerCase()}`}
        >
          {primaryImageUrl ? (
            <Image
              src={primaryImageUrl}
              alt={`${primaryLabel} preview`}
              fill
              unoptimized
              className="object-cover"
            />
          ) : (
            <ImageIcon className="size-8 text-muted-foreground/60" />
          )}
        </button>

        <div className="min-w-0 flex-1 space-y-2 pt-3">
          <InputGroup className="rounded-full">
            <InputGroupInput
              value={displayName}
              onChange={(event) => onDisplayNameChange(event.target.value)}
              placeholder={displayNamePlaceholder}
              aria-invalid={displayNameError ? true : undefined}
            />
          </InputGroup>
          {displayNameError ? (
            <p className="text-xs text-destructive">{displayNameError}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
