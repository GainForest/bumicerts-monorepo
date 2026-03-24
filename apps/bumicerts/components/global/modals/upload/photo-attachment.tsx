"use client";

import { useCallback, useRef, useState } from "react";
import { Camera, ImagePlus, Loader2, Upload } from "lucide-react";
import {
  ModalContent,
  ModalTitle,
  ModalDescription,
  ModalFooter,
} from "@/components/ui/modal/modal";
import { useModal } from "@/components/ui/modal/context";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc/client";
import { toSerializableFile } from "@/lib/mutations-utils";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type PhotoAttachModalProps = {
  occurrenceUri: string;
  speciesName: string;
  onPhotoUploaded: (multimediaUri: string) => void;
};

type SubjectPart =
  | "entireOrganism"
  | "leaf"
  | "bark"
  | "flower"
  | "fruit"
  | "seed"
  | "stem"
  | "twig"
  | "bud"
  | "root";

type UploadState = "idle" | "uploading" | "success" | "error";

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const SUBJECT_PARTS: { value: SubjectPart; label: string }[] = [
  { value: "entireOrganism", label: "Entire Organism" },
  { value: "leaf", label: "Leaf" },
  { value: "bark", label: "Bark" },
  { value: "flower", label: "Flower" },
  { value: "fruit", label: "Fruit" },
  { value: "seed", label: "Seed" },
  { value: "stem", label: "Stem" },
  { value: "twig", label: "Twig" },
  { value: "bud", label: "Bud" },
  { value: "root", label: "Root" },
];

const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic"];
const ACCEPTED_EXTENSIONS = ".jpg,.jpeg,.png,.webp,.heic";
const MAX_IMAGE_BYTES = 20 * 1024 * 1024; // 20 MB practical UX limit

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export default function PhotoAttachModal({
  occurrenceUri,
  speciesName,
  onPhotoUploaded,
}: PhotoAttachModalProps) {
  const createMultimedia = trpc.ac.multimedia.create.useMutation();
  const { hide, popModal, stack } = useModal();

  const [selectedPart, setSelectedPart] = useState<SubjectPart>("entireOrganism");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [uploadError, setUploadError] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  const handleClose = async () => {
    // Clean up preview URL on close
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    if (stack.length === 1) {
      await hide();
      popModal();
    } else {
      popModal();
    }
  };

  const handleFile = useCallback((file: File) => {
    setFileError(null);
    setUploadError(null);
    setUploadState("idle");

    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      setFileError("Only JPEG, PNG, WebP, and HEIC images are supported.");
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setFileError(`File is too large. Maximum size is 20 MB (got ${formatBytes(file.size)}).`);
      return;
    }

    // Revoke previous preview URL to avoid memory leaks
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    setImageFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  }, [previewUrl]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = "";
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleUpload = async () => {
    if (!imageFile) return;

    setUploadState("uploading");
    setUploadError(null);

    try {
      const serializableFile = await toSerializableFile(imageFile);
      const result = await createMultimedia.mutateAsync({
        imageFile: serializableFile,
        occurrenceRef: occurrenceUri,
        subjectPart: selectedPart,
        caption: caption.trim() || undefined,
        format: imageFile.type,
      });

      setUploadState("success");
      onPhotoUploaded(result.uri);
      await handleClose();
    } catch (err) {
      setUploadState("error");
      setUploadError(String(err));
    }
  };

  const isUploading = uploadState === "uploading";
  const isSuccess = uploadState === "success";

  return (
    <ModalContent>
      <ModalTitle className="flex items-center gap-2">
        <Camera className="h-4 w-4 shrink-0" />
        Add Photo to {speciesName}
      </ModalTitle>
      <ModalDescription className="sr-only">
        Attach a photo to this tree occurrence record
      </ModalDescription>

      <div className="space-y-4 mt-4">
        {/* Subject Part Selector */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Subject Part</label>
          <Select
            value={selectedPart}
            onValueChange={(v) => setSelectedPart(v as SubjectPart)}
            disabled={isUploading || isSuccess}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SUBJECT_PARTS.map((part) => (
                <SelectItem key={part.value} value={part.value}>
                  {part.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Image Drop Zone */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Image</label>
          <div
            className={`relative cursor-pointer rounded-lg border-2 border-dashed transition-colors ${
              isDragging
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/60 hover:bg-muted/30"
            } ${isUploading || isSuccess ? "pointer-events-none opacity-60" : ""}`}
            onClick={() => inputRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            {previewUrl ? (
              <div className="relative flex flex-col items-center gap-2 p-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="max-h-48 w-full rounded-md object-contain"
                />
                <span className="text-xs text-muted-foreground">
                  {imageFile?.name} ({formatBytes(imageFile?.size ?? 0)})
                </span>
                {!isUploading && !isSuccess && (
                  <span className="text-xs text-muted-foreground">
                    Click or drag to replace
                  </span>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 py-8 text-muted-foreground">
                <ImagePlus className="h-8 w-8" />
                <span className="text-sm font-medium">
                  Drag &amp; drop or click to select
                </span>
                <span className="text-xs">JPEG, PNG, WebP, HEIC — max 20 MB</span>
              </div>
            )}
          </div>

          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED_EXTENSIONS}
            className="hidden"
            onChange={handleInputChange}
          />

          {fileError && (
            <p className="text-xs text-destructive">{fileError}</p>
          )}
        </div>

        {/* Optional Caption */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium">
            Caption{" "}
            <span className="text-muted-foreground font-normal">(optional)</span>
          </label>
          <Input
            placeholder="Describe the photo…"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            disabled={isUploading || isSuccess}
          />
        </div>

        {/* Upload error */}
        {uploadError && (
          <p className="text-xs text-destructive">{uploadError}</p>
        )}
      </div>

      <ModalFooter className="mt-4">
        <Button
          variant="outline"
          onClick={handleClose}
          disabled={isUploading}
        >
          Cancel
        </Button>
        <Button
          onClick={handleUpload}
          disabled={!imageFile || isUploading}
        >
          {isUploading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Uploading…
            </>
          ) : (
            <>
              <Upload className="h-4 w-4" />
              Upload Photo
            </>
          )}
        </Button>
      </ModalFooter>
    </ModalContent>
  );
}
