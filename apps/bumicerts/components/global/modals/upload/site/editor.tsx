import { useModal } from "@/components/ui/modal/context";
import {
  ModalContent,
  ModalDescription,
  ModalFooter,
  ModalHeader,
  ModalTitle,
} from "@/components/ui/modal/modal";
import { useState, type ChangeEvent } from "react";
import { allowedPDSDomains } from "@/lib/config/gainforest-sdk";
import { toBlobRefGenerator, toFileGenerator } from "gainforest-sdk/zod";
import { Button } from "@/components/ui/button";
import { trpcApi } from "@/components/providers/TrpcProvider";
import {
  AppGainforestOrganizationDefaultSite,
  AppCertifiedLocation,
} from "gainforest-sdk/lex-api";
import { getBlobUrl, parseAtUri } from "gainforest-sdk/utilities/atproto";
import FileInput from "@/components/ui/FileInput";
import { Input } from "@/components/ui/input";
import { ArrowLeft, CheckIcon, Loader2, Pencil } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { getShapefilePreviewUrl } from "../../../../../lib/shapefile";
import DrawPolygonModal, {
  DrawPolygonModalId,
} from "@/components/global/modals/draw-polygon";
import { GetRecordResponse } from "gainforest-sdk/types";
import { useAtprotoStore } from "@/components/stores/atproto";
import { $Typed } from "gainforest-sdk/lex-api/utils";
import { OrgHypercertsDefs as Defs } from "gainforest-sdk/lex-api";

export const SiteEditorModalId = "site/editor";

type AllSitesData = {
  locations: GetRecordResponse<AppCertifiedLocation.Record>[];
  defaultLocation: GetRecordResponse<AppGainforestOrganizationDefaultSite.Record> | null;
};
type SiteData = AllSitesData["locations"][number];

type SiteEditorModalProps = {
  initialData: SiteData | null;
};

export const SiteEditorModal = ({ initialData }: SiteEditorModalProps) => {
  const initialSite = initialData?.value;
  const initialName = initialSite?.name;

  const initialLocationBlobUrl =
    initialData?.value?.location?.$type === "org.hypercerts.defs#smallBlob"
      ? getBlobUrl(
          parseAtUri(initialData.uri).did,
          (initialData.value.location as $Typed<Defs.SmallBlob>).blob,
          allowedPDSDomains[0]
        )
      : null;
  const initialLocationURI =
    initialSite?.location.$type === "org.hypercerts.defs#uri"
      ? (initialSite.location as $Typed<Defs.Uri>).uri
      : initialLocationBlobUrl;

  const auth = useAtprotoStore((state) => state.auth);
  const did = auth.user?.did;

  const { rkey } = initialData?.uri
    ? parseAtUri(initialData.uri)
    : { rkey: undefined };
  const mode = rkey ? "edit" : "add";

  const previewUrl = initialLocationURI
    ? getShapefilePreviewUrl(initialLocationURI)
    : null;

  const [name, setName] = useState(initialName ?? "");
  const [shapefile, setShapefile] = useState<File | null>(null);
  const [showEditor, setShowEditor] = useState(mode === "add" || !previewUrl);

  // For edit mode, shapefile is optional if we're keeping the existing one
  const hasShapefileInput = shapefile !== null;
  const disableSubmission =
    !name.trim() || (mode === "add" && !hasShapefileInput);

  const [isCompleted, setIsCompleted] = useState(false);

  const { stack, popModal, hide, pushModal, show } = useModal();
  const utils = trpcApi.useUtils();

  const {
    mutate: handleAdd,
    isPending: isAdding,
    error: addError,
  } = trpcApi.hypercerts.location.create.useMutation({
    onSuccess: () => {
      utils.hypercerts.location.getAll.invalidate({
        did,
        pdsDomain: allowedPDSDomains[0],
      });
      setIsCompleted(true);
    },
  });

  const {
    mutate: handleUpdate,
    isPending: isUpdating,
    error: updateError,
  } = trpcApi.hypercerts.location.update.useMutation({
    onSuccess: () => {
      utils.hypercerts.location.getAll.invalidate({
        did,
        pdsDomain: allowedPDSDomains[0],
      });
      setIsCompleted(true);
    },
  });

  const executeAddOrEdit = async () => {
    if (mode === "add") {
      const shapefileInput =
        shapefile === null ? null : await toFileGenerator(shapefile);

      if (!shapefileInput) {
        throw new Error("Shapefile is required");
      }

      await handleAdd({
        did: did!,
        site: {
          name: name.trim(),
        },
        uploads: {
          shapefile: shapefileInput,
        },
        pdsDomain: allowedPDSDomains[0],
      });
    } else {
      // Edit mode
      if (!rkey) {
        throw new Error("Record key is required for editing");
      }

      // If no new shapefile is provided, keep the existing one
      if (!hasShapefileInput && initialLocationURI) {
        const initialLocationUri =
          initialSite?.location.$type === "org.hypercerts.defs#uri"
            ? (initialSite.location as $Typed<Defs.Uri>).uri
            : null;
        const initialLocationBlob =
          initialSite?.location.$type === "org.hypercerts.defs#smallBlob"
            ? (initialSite.location as $Typed<Defs.SmallBlob>).blob
            : null;
        const sitePayload = {
          name: name.trim(),
          shapefile: initialLocationBlob
            ? {
                $type: "org.hypercerts.defs#smallBlob" as const,
                blob: toBlobRefGenerator(initialLocationBlob),
              }
            : undefined,
        };

        await handleUpdate({
          did: did!,
          rkey,
          site: sitePayload,
          pdsDomain: allowedPDSDomains[0],
        });
      } else {
        const shapefileInput =
          shapefile === null ? null : await toFileGenerator(shapefile);

        if (!shapefileInput) {
          throw new Error("Shapefile is required");
        }

        await handleUpdate({
          did: did!,
          rkey,
          site: {
            name: name.trim(),
          },
          uploads: {
            shapefile: shapefileInput,
          },
          pdsDomain: allowedPDSDomains[0],
        });
      }
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
                      <ArrowLeft />
                    </Button>
                  )}
                </div>
                <div className="mt-2 flex flex-col gap-3">
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <FileInput
                        placeholder="Upload a GeoJSON file"
                        value={shapefile ?? undefined}
                        supportedFileTypes={["application/geo+json"]}
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
                    <Pencil className="size-4 mr-2" />
                    Draw a site
                  </Button>
                </div>
              </>
            )}
            {error && (
              <div className="text-sm text-destructive mt-2">
                {error.message.startsWith("[") ? "Bad Request" : error.message}
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
            {isPending && <Loader2 className="animate-spin mr-2" />}
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
