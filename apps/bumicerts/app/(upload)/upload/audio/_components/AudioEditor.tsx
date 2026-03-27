"use client";

import { useState, useEffect, type ChangeEvent } from "react";
import { CheckIcon, Loader2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import FileInput from "@/components/ui/FileInput";
import { trpc } from "@/lib/trpc/client";
import { indexerTrpc } from "@/lib/trpc/indexer/client";
import { toSerializableFile } from "@/lib/mutations-utils";
import { formatError } from "@/lib/utils/trpc-errors";
import type { AudioRecordingItem } from "@/lib/graphql-dev/queries/audio";

// ── Constants ─────────────────────────────────────────────────────────────────

const AUTO_CLOSE_MS = 3000;

const AUDIO_MIME_TYPES = [
  "audio/mpeg",
  "audio/wav",
  "audio/ogg",
  "audio/mp4",
  "audio/webm",
  "audio/flac",
  "audio/aac",
  "audio/x-m4a",
  "audio/aiff",
];

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Extract duration from an audio file using the Web Audio API.
 * Returns a fallback "0" if extraction fails.
 */
async function extractAudioDuration(file: File): Promise<string> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const audio = new Audio(url);
    audio.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve(isFinite(audio.duration) ? String(audio.duration) : "0");
    };
    audio.onerror = () => {
      URL.revokeObjectURL(url);
      resolve("0");
    };
  });
}

/** Clean a filename stem into a human-friendly name. */
function cleanFilename(filename: string): string {
  const lastDot = filename.lastIndexOf(".");
  let stem = lastDot > 0 ? filename.slice(0, lastDot) : filename;
  stem = stem.replace(/[_\-.]/g, " ").trim();
  if (!stem) return "Untitled";
  return stem.charAt(0).toUpperCase() + stem.slice(1);
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface AudioEditorProps {
  mode: "add" | "edit";
  initialData: AudioRecordingItem | null;
  onClose: () => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function AudioEditor({ mode, initialData, onClose }: AudioEditorProps) {
  const indexerUtils = indexerTrpc.useUtils();

  const rkey = initialData?.metadata?.rkey;
  const initRecord = initialData?.record;

  const [name, setName] = useState(initRecord?.name ?? "");
  const [description, setDescription] = useState(() => {
    const desc = initRecord?.description;
    if (!desc || typeof desc !== "object") return "";
    return String((desc as Record<string, unknown>)["text"] ?? "");
  });
  const [coordinates, setCoordinates] = useState(
    initRecord?.metadata?.coordinates ?? ""
  );
  const [recordedAt, setRecordedAt] = useState(() => {
    const recorded = initRecord?.metadata?.recordedAt;
    if (recorded) {
      return new Date(recorded).toISOString().slice(0, 16);
    }
    return new Date().toISOString().slice(0, 16);
  });
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isCompleted, setIsCompleted] = useState(false);
  const [countdownStarted, setCountdownStarted] = useState(false);

  const isNameValid = name.trim().length > 0;
  const disableSubmission =
    !isNameValid || (mode === "add" && audioFile === null);

  // ── Mutations ───────────────────────────────────────────────────────────────

  const { mutate: createAudio, isPending: isCreating } =
    trpc.organization.recordings.audio.create.useMutation({
      onSuccess: () => {
        void indexerUtils.audio.list.invalidate();
        setIsCompleted(true);
      },
      onError: (err) => {
        setError(formatError(err));
      },
    });

  const { mutate: updateAudio, isPending: isUpdating } =
    trpc.organization.recordings.audio.update.useMutation({
      onSuccess: () => {
        void indexerUtils.audio.list.invalidate();
        setIsCompleted(true);
      },
      onError: (err) => {
        setError(formatError(err));
      },
    });

  const isPending = isCreating || isUpdating;

  // Auto-close after success
  useEffect(() => {
    if (!isCompleted) return;
    requestAnimationFrame(() => setCountdownStarted(true));
    const timer = setTimeout(onClose, AUTO_CLOSE_MS);
    return () => clearTimeout(timer);
  }, [isCompleted, onClose]);

  // ── Submit ──────────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    setError(null);

    if (mode === "add") {
      if (!audioFile) return;

      const duration = await extractAudioDuration(audioFile);
      const serializableFile = await toSerializableFile(audioFile);

      createAudio({
        name: name.trim(),
        description: description.trim()
          ? { text: description.trim() }
          : undefined,
        audioFile: serializableFile,
        metadata: {
          codec: audioFile.type,
          channels: 1,
          duration,
          sampleRate: 44100,
          recordedAt: new Date(recordedAt).toISOString(),
          coordinates: coordinates.trim() || undefined,
        },
      });
    } else {
      if (!rkey) return;

      let newAudioFile: Awaited<ReturnType<typeof toSerializableFile>> | undefined;
      let newTechnicalMetadata:
        | { codec: string; channels: number; duration: string; sampleRate: number }
        | undefined;

      if (audioFile) {
        const duration = await extractAudioDuration(audioFile);
        newAudioFile = await toSerializableFile(audioFile);
        newTechnicalMetadata = {
          codec: audioFile.type,
          channels: 1,
          duration,
          sampleRate: 44100,
        };
      }

      updateAudio({
        rkey,
        data: {
          name: name.trim(),
          description: description.trim()
            ? { text: description.trim() }
            : undefined,
          metadata: {
            recordedAt: new Date(recordedAt).toISOString(),
            coordinates: coordinates.trim() || undefined,
          },
        },
        ...(newAudioFile ? { newAudioFile, newTechnicalMetadata } : {}),
      });
    }
  };

  // ── Success state ───────────────────────────────────────────────────────────

  if (isCompleted) {
    return (
      <div className="flex flex-col items-center justify-center h-40 text-center mt-4">
        <div className="h-10 w-10 bg-primary rounded-full flex items-center justify-center">
          <CheckIcon className="size-6 text-white" />
        </div>
        <span className="text-lg font-medium mt-2">
          {mode === "add" ? "Recording uploaded" : "Recording updated"} successfully
        </span>
        <div className="w-full max-w-xs h-1 bg-muted rounded-full overflow-hidden mt-4">
          <div
            className="h-full bg-primary rounded-full"
            style={{
              width: countdownStarted ? "0%" : "100%",
              transition: countdownStarted
                ? `width ${AUTO_CLOSE_MS}ms linear`
                : "none",
            }}
          />
        </div>
      </div>
    );
  }

  // ── Form ────────────────────────────────────────────────────────────────────

  return (
    <div className="mt-4">
      <h3 className="font-medium text-lg mb-4">
        {mode === "edit"
          ? `Edit: ${initRecord?.name ?? "Untitled"}`
          : "Add a Recording"}
      </h3>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: File input */}
        <div className="flex flex-col gap-1">
          <label className="text-sm text-muted-foreground">
            {mode === "edit"
              ? "Replace audio file (optional)"
              : "Audio file"}
            {mode === "add" && (
              <span className="text-destructive ml-0.5">*</span>
            )}
          </label>
          <FileInput
            placeholder="Drop or click to upload audio"
            value={audioFile ?? undefined}
            supportedFileTypes={AUDIO_MIME_TYPES}
            maxSizeInMB={100}
            onFileChange={(file) => {
              setAudioFile(file ?? null);
              if (file && mode === "add" && !name.trim()) {
                setName(cleanFilename(file.name));
              }
            }}
            className="min-h-[120px]"
          />
          <span className="text-xs text-muted-foreground">
            WAV, MP3, M4A, AAC, FLAC, OGG, WebM, AIFF (max 100 MB)
          </span>
        </div>

        {/* Right: Fields */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm text-muted-foreground">
              Name <span className="text-destructive">*</span>
            </label>
            <Input
              placeholder="Morning bird calls"
              value={name}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                setName(e.target.value)
              }
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm text-muted-foreground">
              Description (optional)
            </label>
            <Textarea
              placeholder="Recorded at the main observation site"
              value={description}
              onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
                setDescription(e.target.value)
              }
              rows={3}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm text-muted-foreground">Recorded at</label>
            <Input
              type="datetime-local"
              value={recordedAt}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                setRecordedAt(e.target.value)
              }
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm text-muted-foreground">
              Coordinates (optional)
            </label>
            <Input
              placeholder="-3.4653, 142.0723"
              value={coordinates}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                setCoordinates(e.target.value)
              }
            />
            <span className="text-xs text-muted-foreground">
              Format: latitude, longitude
            </span>
          </div>
        </div>
      </div>

      {error && (
        <p className="text-sm text-destructive mt-4">{error}</p>
      )}

      <div className="flex justify-end gap-2 mt-6">
        <Button variant="outline" onClick={onClose} disabled={isPending}>
          Cancel
        </Button>
        <Button
          onClick={() => void handleSubmit()}
          disabled={disableSubmission || isPending}
        >
          {isPending ? (
            <Loader2Icon className="animate-spin mr-2" />
          ) : null}
          {mode === "edit"
            ? isPending
              ? "Saving…"
              : "Save"
            : isPending
              ? "Uploading…"
              : "Upload"}
        </Button>
      </div>
    </div>
  );
}


