import { useModal } from "@/components/ui/modal/context";
import {
  ModalContent,
  ModalDescription,
  ModalFooter,
  ModalHeader,
  ModalTitle,
} from "@/components/ui/modal/modal";
import { useState, type ChangeEvent } from "react";
import { Button } from "@/components/ui/button";
import { parseAtUri, toSerializableFile } from "@/lib/mutations-utils";
import { formatError } from "@/lib/utils/trpc-errors";
import { queries } from "@/lib/graphql/queries/index";
import FileInput from "@/components/ui/FileInput";
import { Input } from "@/components/ui/input";
import { ArrowLeftIcon, CheckIcon, Loader2Icon, PencilIcon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { getShapefilePreviewUrl } from "../../../../../lib/shapefile";
import DrawPolygonModal, {
  DrawPolygonModalId,
} from "@/components/global/modals/draw-polygon";
import { useAtprotoStore } from "@/components/stores/atproto";
import { useQueryClient } from "@tanstack/react-query";
import { trpc } from "@/lib/trpc/client";
import type { CertifiedLocation } from "@/lib/graphql/queries/index";

export const SiteEditorModalId = "site/editor";

/**
 * Site data type - represents a certified location record from the API.
 * This is a simplified type since we're now using GraphQL/mutations rather than tRPC.
 */
type SiteData = {
  uri: string;
  cid: string;
  value: {
    name?: string;
    description?: string;
    location?: {
      $type?: string;
      /** URI variant — the location is already a fetchable URL. */
      uri?: string;
      /**
       * Blob variant — the indexer always injects a `uri` field into blob
       * objects, so we read `uri` from here too instead of constructing it.
       */
      blob?: { uri?: string; [key: string]: unknown };
    };
  };
};

type SiteEditorModalProps = {
  initialData: SiteData | null;
};

export const SiteEditorModal = ({ initialData }: SiteEditorModalProps) => {
  const initialSite = initialData?.value;
  const initialName = initialSite?.name;

  // Extract location URL from the initial data.
  // The indexer always injects a `uri` field into blob objects, so we can read
  // it directly regardless of whether the location is a URI or blob variant.
  const initialLocationURI =
    initialSite?.location?.$type === "org.hypercerts.defs#uri"
      ? initialSite.location.uri
      : initialSite?.location?.$type === "org.hypercerts.defs#smallBlob"
      ? initialSite.location.blob?.uri
      : undefined;

  const auth = useAtprotoStore((state) => state.auth);
  const did = auth.user?.did;

  const { rkey } = initialData?.uri
    ? parseAtUri(initialData.uri)
    : { rkey: undefined };
  const mode = rkey ? "edit" : "add";

  const previewUrl = initialLocationURI
    ? getShapefilePreviewUrl(initialLocationURI)
    : undefined;

  const [name, setName] = useState(initialName ?? "");
  const [shapefile, setShapefile] = useState<File | null>(null);
  const [showEditor, setShowEditor] = useState(mode === "add" || !previewUrl);

  // For edit mode, shapefile is optional if we're keeping the existing one
  const hasShapefileInput = shapefile !== null;
  const disableSubmission =
    !name.trim() || (mode === "add" && !hasShapefileInput);

  const [isCompleted, setIsCompleted] = useState(false);

  const { stack, popModal, hide, pushModal, show } = useModal();
  const queryClient = useQueryClient();

  // Create mutation
  const {
    mutate: _addMutation,
    isPending: isAdding,
    error: addError,
  } = trpc.certified.location.create.useMutation({
    onSuccess: (data: { uri: string; cid: string; rkey: string; record: Record<string, unknown> }) => {
      // Optimistically prepend the newly created location to the cache so it
      // appears immediately in the site-selection list (Step 3) without waiting
      // for the GraphQL indexer to catch up.
      if (did && data) {
        const queryKey = ["locations", { did }] as const;
        queryClient.setQueryData<CertifiedLocation[]>(queryKey, (old) => {
          const newLocation = {
            metadata: {
              did,
              uri: data.uri,
              rkey: data.rkey,
              cid: data.cid,
            },
            record: {
              name: (data.record?.name as string) ?? null,
              description: (data.record?.description as string) ?? null,
              location: data.record?.location ?? null,
              locationType: (data.record?.locationType as string) ?? null,
            },
          } as CertifiedLocation;
          return old ? [newLocation, ...old] : [newLocation];
        });
      }
      // Still invalidate so the cache is eventually replaced by the fully
      // indexed data (with resolved blob URLs, etc.).
      queryClient.invalidateQueries({ queryKey: queries.locations.key() });
      setIsCompleted(true);
    },
  });

  // Wrapper to handle async file serialization before calling the tRPC mutation
  const handleAdd = async ({ name, shapefile }: { name: string; shapefile: File }) => {
    const shapefileData = await toSerializableFile(shapefile);
    _addMutation({ name, shapefile: shapefileData });
  };

  // Update mutation
  const {
    mutate: _updateMutation,
    isPending: isUpdating,
    error: updateError,
  } = trpc.certified.location.update.useMutation({
    onSuccess: (data: { uri: string; cid: string; rkey: string; record: Record<string, unknown> }) => {
      // Optimistically update the cached location so changes appear immediately.
      if (did && data) {
        const queryKey = ["locations", { did }] as const;
        queryClient.setQueryData<CertifiedLocation[]>(queryKey, (old) => {
          if (!old) return old;
          return old.map((loc) => {
            if (loc.metadata?.uri === data.uri) {
              return {
                ...loc,
                metadata: {
                  ...loc.metadata,
                  cid: data.cid,
                },
                record: {
                  ...loc.record,
                  name: (data.record?.name as string) ?? loc.record?.name,
                  description: (data.record?.description as string) ?? loc.record?.description,
                  location: data.record?.location ?? loc.record?.location,
                  locationType: (data.record?.locationType as string) ?? loc.record?.locationType,
                },
              } as CertifiedLocation;
            }
            return loc;
          });
        });
      }
      queryClient.invalidateQueries({ queryKey: queries.locations.key() });
      setIsCompleted(true);
    },
  });

  // Wrapper to handle async file serialization before calling the tRPC mutation
  const handleUpdate = async ({
    rkey,
    name,
    shapefile,
  }: {
    rkey: string;
    name: string;
    shapefile?: File | null;
  }) => {
    const newShapefile = shapefile ? await toSerializableFile(shapefile) : undefined;
    _updateMutation({ rkey, data: { name }, newShapefile });
  };

  const executeAddOrEdit = async () => {
    if (mode === "add") {
      if (!shapefile) {
        throw new Error("Shapefile is required");
      }

      await handleAdd({
        name: name.trim(),
        shapefile,
      });
    } else {
      // Edit mode
      if (!rkey) {
        throw new Error("Record key is required for editing");
      }

      await handleUpdate({
        rkey,
        name: name.trim(),
        shapefile: hasShapefileInput ? shapefile : null,
      });
    }
  };

  const isPending = isAdding || isUpdating;
  const error = addError || updateError;

  return (
    <ModalContent>
      <ModalHeader
        backAction={stack.length === 1 ? undefined : () => popModal()}
      >
        <ModalTitle>{mode === "edit" ? "Edit" : "Add"} Site</ModalTitle>
        <ModalDescription>
          {mode === "edit"
            ? "Edit the site information."
            : "Add a new site to the organization."}
        </ModalDescription>
      </ModalHeader>
      <AnimatePresence mode="wait">
        {!isCompleted && (
          <motion.section
            key={"form"}
            className="w-full"
            exit={{
              opacity: 0,
              filter: "blur(10px)",
              scale: 0.5,
            }}
          >
            <div className="flex flex-col w-full mt-4">
              <div className="flex flex-col gap-0.5">
                <label
                  htmlFor="name-for-site"
                  className="text-sm text-muted-foreground"
                >
                  Enter a name for the site
                </label>
                <Input
                  placeholder="Grassroots Farm"
                  id="name-for-site"
                  value={name}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    setName(e.target.value)
                  }
                />
              </div>
            </div>
            <hr className="my-4 opacity-50" />
            {!showEditor && previewUrl && (
              <div className="mt-4 relative">
                <iframe
                  src={previewUrl}
                  className="w-full h-64 rounded-lg border border-border"
                  title="Site shapefile preview"
                />
                <Button
                  size="sm"
                  className="absolute top-3 right-3"
                  variant={"outline"}
                  onClick={() => setShowEditor(true)}
                >
                  Edit
                </Button>
              </div>
            )}
            {showEditor && (
              <>
                <div className="flex items-center gap-1 w-full">
                  {mode === "edit" && (
                    <Button
                      variant={"ghost"}
                      onClick={() => setShowEditor(false)}
                    >
                      <ArrowLeftIcon />
                    </Button>
                  )}
                </div>
                <div className="mt-2 flex flex-col gap-3">
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <FileInput
                        placeholder="Upload a GeoJSON file"
                        value={shapefile ?? undefined}
                        supportedFileTypes={[".geojson", ".json"]}
                        maxSizeInMB={10}
                        onFileChange={(file) => setShapefile(file)}
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-px bg-border flex-1" />
                    <span className="text-xs text-muted-foreground">or</span>
                    <div className="h-px bg-border flex-1" />
                  </div>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      pushModal({
                        id: DrawPolygonModalId,
                        dialogWidth: "max-w-2xl",
                        content: (
                          <DrawPolygonModal
                            onSubmit={(polygonJSONString: string) => {
                              // Convert JSON string to File
                              const blob = new Blob([polygonJSONString], {
                                type: "application/geo+json",
                              });
                              const file = new File(
                                [blob],
                                "drawn-polygon.geojson",
                                {
                                  type: "application/geo+json",
                                }
                              );
                              setShapefile(file);
                            }}
                          />
                        ),
                      });
                      show();
                    }}
                  >
                    <PencilIcon className="size-4 mr-2" />
                    Draw a site
                  </Button>
                </div>
              </>
            )}
            {error && (
              <div className="text-sm text-destructive mt-2">
                {formatError(error)}
              </div>
            )}
          </motion.section>
        )}
        {isCompleted && (
          <motion.section
            key={"completed"}
            className="w-full h-40 border border-border rounded-lg p-4 flex flex-col items-center justify-center"
            initial={{
              opacity: 0,
              filter: "blur(10px)",
              scale: 0.5,
            }}
            animate={{
              opacity: 1,
              filter: "blur(0px)",
              scale: 1,
            }}
          >
            <div className="h-10 w-10 bg-primary rounded-full flex items-center justify-center">
              <CheckIcon className="size-6 text-white" />
            </div>
            <span className="text-lg font-medium mt-2">
              Site {mode === "edit" ? "updated" : "added"} successfully
            </span>
          </motion.section>
        )}
      </AnimatePresence>

      <ModalFooter>
        {!isCompleted && (
          <Button
            onClick={() => executeAddOrEdit()}
            disabled={disableSubmission || isPending}
          >
            {isPending && <Loader2Icon className="animate-spin mr-2" />}
            {mode === "edit"
              ? isPending
                ? "Saving..."
                : "Save"
              : isPending
              ? "Adding..."
              : "Add"}
          </Button>
        )}
        {isCompleted && (
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
            Close
          </Button>
        )}
      </ModalFooter>
    </ModalContent>
  );
};
