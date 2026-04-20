"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Camera,
  ChevronLeftIcon,
  CirclePlusIcon,
  DatabaseIcon,
  InfoIcon,
  Loader2,
  MapPin,
  RefreshCcw,
  SearchIcon,
  Trash2,
} from "lucide-react";
import { parseAsString, useQueryState } from "nuqs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import Container from "@/components/ui/container";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useModal } from "@/components/ui/modal/context";
import PhotoAttachModal, {
  type UploadedPhotoPayload,
} from "@/components/global/modals/upload/photo-attachment";
import { MODAL_IDS } from "@/components/global/modals/ids";
import { formatError } from "@/lib/utils/trpc-errors";
import { indexerTrpc } from "@/lib/trpc/indexer/client";
import { trpc } from "@/lib/trpc/client";
import type {
  DatasetItem,
  MeasurementItem,
  MultimediaItem,
  OccurrenceItem,
} from "@/lib/graphql-dev/queries";
import { links } from "@/lib/links";
import useMediaQuery from "@/hooks/use-media-query";
import { cn } from "@/lib/utils";
import { getSelectableEstablishmentMeansOptions } from "@/lib/upload/establishment-means";
import EstablishmentMeansInfoContent from "../../_components/EstablishmentMeansInfoContent";
import GreenGlobeTreePreviewCard from "./GreenGlobeTreePreviewCard";
import { ManageConfirmModal } from "./ManageConfirmModal";
import { TreesManageSkeleton } from "./TreesManageSkeleton";
import {
  buildTreeManagerItems,
  formatEventDate,
  formatTreeSubtitle,
  getPhotoUrl,
  getTreeMeasurementDraft,
  getTreeOccurrenceDraft,
  hasAnyMeasurementValue,
  isDraftEqual,
  toFloraMeasurementPayload,
  validateMeasurementDraft,
  validateOccurrenceDraft,
  type TreeManagerItem,
  type TreeMeasurementDraft,
  type TreeOccurrenceDraft,
} from "./tree-manager-utils";

type TreesManageClientProps = {
  did: string;
};

type OccurrenceField = keyof TreeOccurrenceDraft;
type OptionalOccurrenceField = Exclude<
  OccurrenceField,
  "scientificName" | "eventDate" | "decimalLatitude" | "decimalLongitude"
>;

const OPTIONAL_OCCURRENCE_FIELDS: OptionalOccurrenceField[] = [
  "vernacularName",
  "recordedBy",
  "locality",
  "country",
  "occurrenceRemarks",
  "habitat",
  "establishmentMeans",
];

const EMPTY_OCCURRENCE_DRAFT: TreeOccurrenceDraft = {
  scientificName: "",
  vernacularName: "",
  eventDate: "",
  recordedBy: "",
  locality: "",
  country: "",
  decimalLatitude: "",
  decimalLongitude: "",
  occurrenceRemarks: "",
  habitat: "",
  establishmentMeans: "",
};

const ESTABLISHMENT_MEANS_SENTINEL = "__none__";

const EMPTY_MEASUREMENT_DRAFT: TreeMeasurementDraft = {
  dbh: "",
  totalHeight: "",
  diameter: "",
  canopyCoverPercent: "",
};

function normalizeDraftValue(value: string): string {
  return value.trim();
}

function formatSubjectPart(value: string | null): string {
  if (!value) {
    return "Tree photo";
  }

  return value
    .replace(/([A-Z])/g, " $1")
    .trim()
    .replace(/^./, (char) => char.toUpperCase());
}

function getPhotoAltText(
  speciesName: string | null | undefined,
  subjectPart: string | null,
  caption: string | null,
): string {
  if (caption) {
    return caption;
  }

  const part = subjectPart
    ? formatSubjectPart(subjectPart).toLowerCase()
    : "tree";
  const species = speciesName?.trim();

  return species ? `${part} photo of ${species}` : `${part} photo`;
}

function getSelectedRkey(item: TreeManagerItem | null): string | null {
  const metadata = item?.occurrence.metadata;
  return metadata?.rkey ?? null;
}

function getOccurrenceUri(item: TreeManagerItem | null): string | null {
  const metadata = item?.occurrence.metadata;
  return metadata?.uri ?? null;
}

function revokeBlobUrl(url: string | null | undefined) {
  if (typeof url === "string" && url.startsWith("blob:")) {
    URL.revokeObjectURL(url);
  }
}

function sameJsonValue(left: unknown, right: unknown): boolean {
  return JSON.stringify(left ?? null) === JSON.stringify(right ?? null);
}

function sameOccurrenceRecord(
  left: NonNullable<OccurrenceItem["record"]>,
  right: NonNullable<OccurrenceItem["record"]>,
): boolean {
  return (
    left.scientificName === right.scientificName &&
    left.vernacularName === right.vernacularName &&
    left.eventDate === right.eventDate &&
    left.recordedBy === right.recordedBy &&
    left.locality === right.locality &&
    left.country === right.country &&
    left.decimalLatitude === right.decimalLatitude &&
    left.decimalLongitude === right.decimalLongitude &&
    left.occurrenceRemarks === right.occurrenceRemarks &&
    left.habitat === right.habitat &&
    left.establishmentMeans === right.establishmentMeans
  );
}

function sameMeasurementItem(
  left: MeasurementItem,
  right: MeasurementItem,
): boolean {
  return (
    left.metadata.rkey === right.metadata.rkey &&
    left.record.occurrenceRef === right.record.occurrenceRef &&
    left.record.schemaVersion === right.record.schemaVersion &&
    left.record.measurementMethod === right.record.measurementMethod &&
    left.record.measurementRemarks === right.record.measurementRemarks &&
    sameJsonValue(left.record.result, right.record.result)
  );
}

function sameMeasurementSet(
  left: MeasurementItem[],
  right: MeasurementItem[],
): boolean {
  if (left.length !== right.length) {
    return false;
  }

  return left.every((item, index) => sameMeasurementItem(item, right[index]!));
}

function createOptimisticMeasurementItem(
  did: string,
  occurrenceUri: string,
  result: {
    uri: string;
    cid: string;
    rkey: string;
    record: {
      occurrenceRef: string;
      result: unknown;
      measuredBy?: string;
      measuredByID?: string;
      measurementDate?: string;
      measurementMethod?: string;
      measurementRemarks?: string;
      createdAt?: string;
    };
  },
): MeasurementItem {
  return {
    metadata: {
      did,
      uri: result.uri,
      rkey: result.rkey,
      cid: result.cid,
      createdAt: result.record.createdAt ?? null,
    },
    record: {
      occurrenceRef: result.record.occurrenceRef ?? occurrenceUri,
      result: result.record.result ?? null,
      measuredBy: result.record.measuredBy ?? null,
      measuredByID: result.record.measuredByID ?? null,
      measurementDate: result.record.measurementDate ?? null,
      measurementMethod: result.record.measurementMethod ?? null,
      measurementRemarks: result.record.measurementRemarks ?? null,
      createdAt: result.record.createdAt ?? null,
      legacyMeasurementType: null,
      legacyMeasurementValue: null,
      legacyMeasurementUnit: null,
      schemaVersion: "bundled",
    },
  };
}

function createOptimisticPhotoItem(
  did: string,
  occurrenceUri: string,
  uploadedPhoto: UploadedPhotoPayload,
): MultimediaItem {
  return {
    metadata: {
      did,
      uri: uploadedPhoto.uri,
      rkey: uploadedPhoto.rkey,
      cid: uploadedPhoto.cid,
      createdAt: uploadedPhoto.record.createdAt ?? null,
    },
    record: {
      occurrenceRef: occurrenceUri,
      siteRef: uploadedPhoto.record.siteRef ?? null,
      subjectPart: uploadedPhoto.record.subjectPart ?? null,
      subjectPartUri: uploadedPhoto.record.subjectPartUri ?? null,
      subjectOrientation: uploadedPhoto.record.subjectOrientation ?? null,
      file: uploadedPhoto.record.file ?? null,
      format: uploadedPhoto.record.format ?? null,
      accessUri:
        uploadedPhoto.previewUrl ?? uploadedPhoto.record.accessUri ?? null,
      variantLiteral: uploadedPhoto.record.variantLiteral ?? null,
      caption: uploadedPhoto.record.caption ?? null,
      creator: uploadedPhoto.record.creator ?? null,
      createDate: uploadedPhoto.record.createDate ?? null,
      createdAt: uploadedPhoto.record.createdAt ?? null,
    },
  };
}

function SectionCard({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-2xl border border-border bg-background p-4 md:p-5 space-y-4",
        className,
      )}
    >
      <div className="space-y-1">
        <h3
          className="text-lg font-semibold"
          style={{ fontFamily: "var(--font-garamond-var)" }}
        >
          {title}
        </h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      {children}
    </section>
  );
}

function Field({
  label,
  children,
  required = false,
  labelInfo,
}: {
  label: string;
  children: React.ReactNode;
  required?: boolean;
  labelInfo?: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5 text-sm text-muted-foreground">
      <span className="flex items-center gap-1.5">
        <span>
          {label}
          {required ? <span className="text-destructive ml-0.5">*</span> : null}
        </span>
        {labelInfo}
      </span>
      {children}
    </label>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-64 gap-4 rounded-2xl border border-dashed border-border text-center px-6">
      <p
        className="text-2xl text-muted-foreground"
        style={{ fontFamily: "var(--font-garamond-var)" }}
      >
        No trees uploaded yet
      </p>
      <p className="text-sm text-muted-foreground max-w-md">
        Upload your first tree CSV or Kobo export to start managing occurrences,
        measurements, and photos in one place.
      </p>
      <Button asChild>
        <Link href={links.manage.trees}>
          <CirclePlusIcon />
          Upload tree data
        </Link>
      </Button>
    </div>
  );
}

export function TreesManageClient({ did }: TreesManageClientProps) {
  const isDesktop = useMediaQuery("(min-width: 64rem)");
  const { pushModal, show } = useModal();
  const indexerUtils = indexerTrpc.useUtils();

  const [searchQuery, setSearchQuery] = useQueryState(
    "q",
    parseAsString.withDefault(""),
  );
  const [selectedTreeRkey, setSelectedTreeRkey] = useQueryState(
    "tree",
    parseAsString.withDefault(""),
  );
  const [datasetFilter, setDatasetFilter] = useQueryState(
    "dataset",
    parseAsString,
  );

  const occurrencesQuery = indexerTrpc.dwc.occurrences.useQuery({ did });
  const measurementsQuery = indexerTrpc.dwc.measurements.useQuery({ did });
  const multimediaQuery = indexerTrpc.multimedia.list.useQuery({ did });
  const datasetsQuery = indexerTrpc.datasets.list.useQuery({ did });

  const updateOccurrence = trpc.dwc.occurrence.update.useMutation();
  const deleteOccurrence = trpc.dwc.occurrence.delete.useMutation();
  const createMeasurement = trpc.dwc.measurement.create.useMutation();
  const updateMeasurement = trpc.dwc.measurement.update.useMutation();
  const deleteMeasurement = trpc.dwc.measurement.delete.useMutation();
  const deleteMultimedia = trpc.ac.multimedia.delete.useMutation();

  const [occurrenceDraft, setOccurrenceDraft] = useState<TreeOccurrenceDraft>(
    EMPTY_OCCURRENCE_DRAFT,
  );
  const [initialOccurrenceDraft, setInitialOccurrenceDraft] =
    useState<TreeOccurrenceDraft>(EMPTY_OCCURRENCE_DRAFT);
  const [measurementDraft, setMeasurementDraft] =
    useState<TreeMeasurementDraft>(EMPTY_MEASUREMENT_DRAFT);
  const [initialMeasurementDraft, setInitialMeasurementDraft] =
    useState<TreeMeasurementDraft>(EMPTY_MEASUREMENT_DRAFT);
  const [occurrenceFeedback, setOccurrenceFeedback] = useState<string | null>(
    null,
  );
  const [measurementFeedback, setMeasurementFeedback] = useState<string | null>(
    null,
  );

  const selectableEstablishmentMeansOptions = useMemo(
    () =>
      getSelectableEstablishmentMeansOptions(
        occurrenceDraft.establishmentMeans,
      ),
    [occurrenceDraft.establishmentMeans],
  );
  const selectedEstablishmentMeansOption = useMemo(
    () =>
      selectableEstablishmentMeansOptions.find(
        (option) => option.value === occurrenceDraft.establishmentMeans,
      ) ?? null,
    [occurrenceDraft.establishmentMeans, selectableEstablishmentMeansOptions],
  );
  const [occurrenceError, setOccurrenceError] = useState<string | null>(null);
  const [measurementError, setMeasurementError] = useState<string | null>(null);
  const [optimisticOccurrenceRecords, setOptimisticOccurrenceRecords] =
    useState<Record<string, NonNullable<OccurrenceItem["record"]>>>({});
  const [optimisticMeasurementRecords, setOptimisticMeasurementRecords] =
    useState<Record<string, MeasurementItem[]>>({});
  const [optimisticAddedPhotos, setOptimisticAddedPhotos] = useState<
    Record<string, MultimediaItem[]>
  >({});
  const [optimisticDeletedPhotoRkeys, setOptimisticDeletedPhotoRkeys] =
    useState<Record<string, true>>({});
  const [
    optimisticDeletedOccurrenceRkeys,
    setOptimisticDeletedOccurrenceRkeys,
  ] = useState<Record<string, true>>({});
  const optimisticAddedPhotosRef = useRef(optimisticAddedPhotos);
  const lastDraftResetKeyRef = useRef<string | null>(null);

  const isLoading =
    occurrencesQuery.isLoading ||
    measurementsQuery.isLoading ||
    multimediaQuery.isLoading;
  const queryError =
    occurrencesQuery.error ?? measurementsQuery.error ?? multimediaQuery.error;

  const mergedOccurrences = useMemo(() => {
    return (occurrencesQuery.data ?? []).flatMap((item) => {
      const metadata = item.metadata;
      const record = item.record;
      const rkey = metadata?.rkey;

      if (
        !metadata ||
        !record ||
        !rkey ||
        optimisticDeletedOccurrenceRkeys[rkey]
      ) {
        return [];
      }

      const optimisticRecord = optimisticOccurrenceRecords[rkey];
      return [
        {
          ...item,
          record:
            optimisticRecord && !sameOccurrenceRecord(record, optimisticRecord)
              ? optimisticRecord
              : record,
        },
      ];
    });
  }, [
    occurrencesQuery.data,
    optimisticDeletedOccurrenceRkeys,
    optimisticOccurrenceRecords,
  ]);

  const mergedMeasurements = useMemo(() => {
    const overriddenOccurrenceUris = new Set(
      Object.keys(optimisticMeasurementRecords),
    );

    const baseMeasurements = measurementsQuery.data ?? [];
    const measurementsByOccurrence = new Map<string, MeasurementItem[]>();

    for (const item of baseMeasurements) {
      const occurrenceRef = item.record.occurrenceRef;
      if (!occurrenceRef) {
        continue;
      }

      const existing = measurementsByOccurrence.get(occurrenceRef) ?? [];
      existing.push(item);
      measurementsByOccurrence.set(occurrenceRef, existing);
    }

    const mergedForOverrides = Object.entries(
      optimisticMeasurementRecords,
    ).flatMap(([occurrenceUri, optimisticItems]) => {
      const serverItems = measurementsByOccurrence.get(occurrenceUri) ?? [];

      return sameMeasurementSet(serverItems, optimisticItems)
        ? serverItems
        : optimisticItems;
    });

    const untouchedMeasurements = baseMeasurements.filter((item) => {
      const occurrenceRef = item.record.occurrenceRef;
      return !occurrenceRef || !overriddenOccurrenceUris.has(occurrenceRef);
    });

    return [...mergedForOverrides, ...untouchedMeasurements];
  }, [measurementsQuery.data, optimisticMeasurementRecords]);

  const mergedMultimedia = useMemo(() => {
    const basePhotos = (multimediaQuery.data ?? []).filter((item) => {
      const rkey = item.metadata?.rkey;
      return !rkey || optimisticDeletedPhotoRkeys[rkey] !== true;
    });

    const basePhotoRkeys = new Set(
      basePhotos
        .map((item) => item.metadata?.rkey)
        .filter((value): value is string => typeof value === "string"),
    );

    const optimisticPhotos = Object.values(optimisticAddedPhotos)
      .flat()
      .filter((item) => {
        const rkey = item.metadata?.rkey;
        return (
          typeof rkey === "string" &&
          optimisticDeletedPhotoRkeys[rkey] !== true &&
          !basePhotoRkeys.has(rkey)
        );
      });

    return [...optimisticPhotos, ...basePhotos];
  }, [
    multimediaQuery.data,
    optimisticAddedPhotos,
    optimisticDeletedPhotoRkeys,
  ]);

  const treeItems = useMemo(
    () =>
      buildTreeManagerItems(
        mergedOccurrences,
        mergedMeasurements,
        mergedMultimedia,
      ),
    [mergedOccurrences, mergedMeasurements, mergedMultimedia],
  );

  // Dataset lookup: URI → DatasetItem for display + filtering
  const datasetItems = useMemo(
    () => datasetsQuery.data ?? [],
    [datasetsQuery.data],
  );
  const datasetLookup = useMemo(() => {
    const map = new Map<string, DatasetItem>();
    for (const ds of datasetItems) {
      const uri = ds.metadata?.uri;
      if (uri) {
        map.set(uri, ds);
      }
    }
    return map;
  }, [datasetItems]);

  const filteredTrees = useMemo(() => {
    // Apply dataset filter first
    let trees = treeItems;
    if (datasetFilter) {
      trees = trees.filter((item) => {
        const ref = item.occurrence.record?.datasetRef;
        return typeof ref === "string" && ref === datasetFilter;
      });
    }

    // Then apply search query
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      return trees;
    }

    return trees.filter((item) => {
      const record = item.occurrence.record;
      if (!record) {
        return false;
      }

      // Resolve dataset name for search
      const datasetRef = record.datasetRef;
      const datasetName =
        typeof datasetRef === "string"
          ? datasetLookup.get(datasetRef)?.record?.name
          : null;

      const haystack = [
        record.scientificName,
        record.vernacularName,
        record.locality,
        record.country,
        record.recordedBy,
        record.eventDate,
        datasetName,
      ]
        .filter(
          (value): value is string =>
            typeof value === "string" && value.length > 0,
        )
        .join(" ")
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [searchQuery, treeItems, datasetFilter, datasetLookup]);

  const selectedTree = useMemo(() => {
    if (!selectedTreeRkey) {
      return null;
    }

    return (
      treeItems.find(
        (item) => item.occurrence.metadata?.rkey === selectedTreeRkey,
      ) ?? null
    );
  }, [selectedTreeRkey, treeItems]);

  const activeTree = isDesktop
    ? (selectedTree ?? filteredTrees[0] ?? null)
    : selectedTree;

  useEffect(() => {
    const firstVisibleRkey = getSelectedRkey(filteredTrees[0] ?? null);
    const isSelectionVisible = Boolean(
      selectedTreeRkey &&
      filteredTrees.some(
        (item) => item.occurrence.metadata?.rkey === selectedTreeRkey,
      ),
    );

    if (isDesktop) {
      if (!selectedTreeRkey && firstVisibleRkey) {
        void setSelectedTreeRkey(firstVisibleRkey);
        return;
      }

      if (selectedTreeRkey && !isSelectionVisible) {
        void setSelectedTreeRkey(firstVisibleRkey);
      }
      return;
    }

    if (selectedTreeRkey && !isSelectionVisible) {
      void setSelectedTreeRkey(null);
    }
  }, [filteredTrees, isDesktop, selectedTreeRkey, setSelectedTreeRkey]);

  const activeTreeResetKey = activeTree?.occurrence.metadata?.rkey ?? null;

  useEffect(() => {
    if (lastDraftResetKeyRef.current === activeTreeResetKey) {
      return;
    }

    lastDraftResetKeyRef.current = activeTreeResetKey;

    const nextOccurrenceDraft = activeTree?.occurrence.record
      ? getTreeOccurrenceDraft(activeTree.occurrence.record)
      : EMPTY_OCCURRENCE_DRAFT;
    const nextMeasurementDraft = getTreeMeasurementDraft(
      activeTree?.floraMeasurement ?? null,
    );

    const resetHandle = window.setTimeout(() => {
      setOccurrenceDraft(nextOccurrenceDraft);
      setInitialOccurrenceDraft(nextOccurrenceDraft);
      setMeasurementDraft(nextMeasurementDraft);
      setInitialMeasurementDraft(nextMeasurementDraft);
      setOccurrenceFeedback(null);
      setMeasurementFeedback(null);
      setOccurrenceError(null);
      setMeasurementError(null);
    }, 0);

    return () => window.clearTimeout(resetHandle);
  }, [activeTree, activeTreeResetKey]);

  useEffect(() => {
    optimisticAddedPhotosRef.current = optimisticAddedPhotos;
  }, [optimisticAddedPhotos]);

  useEffect(() => {
    return () => {
      Object.values(optimisticAddedPhotosRef.current)
        .flat()
        .forEach((item) => revokeBlobUrl(item.record.accessUri));
    };
  }, []);

  useEffect(() => {
    const resetHandle = window.setTimeout(() => {
      setOptimisticOccurrenceRecords((current) => {
        let changed = false;
        const serverByRkey = new Map(
          (occurrencesQuery.data ?? []).flatMap((item) => {
            const rkey = item.metadata?.rkey;
            const record = item.record;
            return rkey && record ? [[rkey, record] as const] : [];
          }),
        );

        const remainingEntries = Object.entries(current).filter(
          ([rkey, optimisticRecord]) => {
            const serverRecord = serverByRkey.get(rkey);
            const keep =
              !serverRecord ||
              !sameOccurrenceRecord(serverRecord, optimisticRecord);
            if (!keep) {
              changed = true;
            }
            return keep;
          },
        );

        return changed
          ? (Object.fromEntries(remainingEntries) as typeof current)
          : current;
      });

      setOptimisticMeasurementRecords((current) => {
        let changed = false;
        const serverByOccurrence = new Map<string, MeasurementItem[]>();

        for (const item of measurementsQuery.data ?? []) {
          const occurrenceRef = item.record.occurrenceRef;
          if (!occurrenceRef) {
            continue;
          }

          const existing = serverByOccurrence.get(occurrenceRef) ?? [];
          existing.push(item);
          serverByOccurrence.set(occurrenceRef, existing);
        }

        const remainingEntries = Object.entries(current).filter(
          ([occurrenceUri, optimisticItems]) => {
            const serverItems = serverByOccurrence.get(occurrenceUri) ?? [];
            const keep = !sameMeasurementSet(serverItems, optimisticItems);
            if (!keep) {
              changed = true;
            }
            return keep;
          },
        );

        return changed
          ? (Object.fromEntries(remainingEntries) as typeof current)
          : current;
      });
    }, 0);

    return () => window.clearTimeout(resetHandle);
  }, [measurementsQuery.data, occurrencesQuery.data]);

  const occurrenceHasChanges = !isDraftEqual(
    occurrenceDraft,
    initialOccurrenceDraft,
  );
  const measurementHasChanges = !isDraftEqual(
    measurementDraft,
    initialMeasurementDraft,
  );

  const occurrenceValidationError = occurrenceHasChanges
    ? validateOccurrenceDraft(occurrenceDraft)
    : null;
  const measurementValidationError = measurementHasChanges
    ? validateMeasurementDraft(measurementDraft)
    : null;

  const invalidateTreeQueries = useCallback(async () => {
    await Promise.all([
      indexerUtils.dwc.occurrences.invalidate(),
      indexerUtils.dwc.measurements.invalidate(),
      indexerUtils.multimedia.list.invalidate(),
    ]);
  }, [indexerUtils]);

  const handleRetry = async () => {
    await Promise.all([
      occurrencesQuery.refetch(),
      measurementsQuery.refetch(),
      multimediaQuery.refetch(),
    ]);
  };

  const handleOccurrenceFieldChange = (
    field: OccurrenceField,
    value: string,
  ) => {
    setOccurrenceDraft((current) => ({ ...current, [field]: value }));
    setOccurrenceFeedback(null);
    setOccurrenceError(null);
  };

  const handleMeasurementFieldChange = (
    field: keyof TreeMeasurementDraft,
    value: string,
  ) => {
    setMeasurementDraft((current) => ({ ...current, [field]: value }));
    setMeasurementFeedback(null);
    setMeasurementError(null);
  };

  const handleSaveOccurrence = async () => {
    const metadata = activeTree?.occurrence.metadata;
    if (!metadata?.rkey) {
      return;
    }
    const occurrenceRkey = metadata.rkey;

    const validationError = validateOccurrenceDraft(occurrenceDraft);
    if (validationError) {
      setOccurrenceError(validationError);
      return;
    }

    const normalizedCurrent = Object.fromEntries(
      Object.entries(occurrenceDraft).map(([key, value]) => [
        key,
        normalizeDraftValue(value),
      ]),
    ) as TreeOccurrenceDraft;
    const normalizedInitial = Object.fromEntries(
      Object.entries(initialOccurrenceDraft).map(([key, value]) => [
        key,
        normalizeDraftValue(value),
      ]),
    ) as TreeOccurrenceDraft;

    const data: Partial<Record<OccurrenceField, string>> = {};
    const unset: OptionalOccurrenceField[] = [];

    (Object.keys(normalizedCurrent) as OccurrenceField[]).forEach((field) => {
      if (normalizedCurrent[field] === normalizedInitial[field]) {
        return;
      }

      if (
        OPTIONAL_OCCURRENCE_FIELDS.includes(field as OptionalOccurrenceField) &&
        normalizedCurrent[field] === ""
      ) {
        unset.push(field as OptionalOccurrenceField);
        return;
      }

      data[field] = normalizedCurrent[field];
    });

    if (Object.keys(data).length === 0 && unset.length === 0) {
      setOccurrenceFeedback("No changes to save.");
      return;
    }

    try {
      await updateOccurrence.mutateAsync({
        rkey: occurrenceRkey,
        data,
        ...(unset.length > 0 ? { unset } : {}),
      });

      setOptimisticOccurrenceRecords((current) => {
        const existing = activeTree?.occurrence.record;
        if (!existing) {
          return current;
        }

        return {
          ...current,
          [occurrenceRkey]: {
            ...existing,
            ...Object.fromEntries(
              Object.entries(normalizedCurrent).map(([key, value]) => [
                key,
                value === "" &&
                OPTIONAL_OCCURRENCE_FIELDS.includes(
                  key as OptionalOccurrenceField,
                )
                  ? null
                  : value,
              ]),
            ),
          },
        };
      });

      setInitialOccurrenceDraft(normalizedCurrent);
      setOccurrenceDraft(normalizedCurrent);
      setOccurrenceFeedback("Tree details saved.");
      setOccurrenceError(null);
      await invalidateTreeQueries();
    } catch (error) {
      setOccurrenceError(formatError(error));
    }
  };

  const handleSaveMeasurement = async () => {
    const occurrenceUri = getOccurrenceUri(activeTree);
    const measurementRkey =
      activeTree?.preferredMeasurement?.metadata?.rkey ?? null;

    if (!occurrenceUri) {
      return;
    }

    if (
      activeTree?.hasLegacyMeasurements ||
      activeTree?.hasUnsupportedMeasurements ||
      activeTree?.hasDuplicateBundledMeasurements
    ) {
      setMeasurementError(
        "This tree has measurement records that need manual review before editing here.",
      );
      return;
    }

    const validationError = validateMeasurementDraft(measurementDraft);
    if (validationError) {
      setMeasurementError(validationError);
      return;
    }

    const normalizedCurrent = Object.fromEntries(
      Object.entries(measurementDraft).map(([key, value]) => [
        key,
        normalizeDraftValue(value),
      ]),
    ) as TreeMeasurementDraft;

    if (isDraftEqual(normalizedCurrent, initialMeasurementDraft)) {
      setMeasurementFeedback("No changes to save.");
      return;
    }

    const floraPayload = toFloraMeasurementPayload(normalizedCurrent);

    try {
      if (measurementRkey) {
        if (!floraPayload) {
          await deleteMeasurement.mutateAsync({ rkey: measurementRkey });
          setOptimisticMeasurementRecords((current) => ({
            ...current,
            [occurrenceUri]: [],
          }));
          setMeasurementFeedback("Measurements removed.");
        } else {
          const result = await updateMeasurement.mutateAsync({
            rkey: measurementRkey,
            data: { result: floraPayload },
          });
          setOptimisticMeasurementRecords((current) => ({
            ...current,
            [occurrenceUri]: [
              createOptimisticMeasurementItem(did, occurrenceUri, result),
            ],
          }));
          setMeasurementFeedback("Measurements saved.");
        }
      } else {
        if (!floraPayload) {
          setMeasurementError("Add at least one measurement value to save.");
          return;
        }

        const result = await createMeasurement.mutateAsync({
          occurrenceRef: occurrenceUri,
          flora: {
            dbh: floraPayload.dbh,
            totalHeight: floraPayload.totalHeight,
            basalDiameter: floraPayload.basalDiameter,
            canopyCoverPercent: floraPayload.canopyCoverPercent,
          },
        });
        setOptimisticMeasurementRecords((current) => ({
          ...current,
          [occurrenceUri]: [
            createOptimisticMeasurementItem(did, occurrenceUri, result),
          ],
        }));
        setMeasurementFeedback("Measurements added.");
      }

      setInitialMeasurementDraft(normalizedCurrent);
      setMeasurementDraft(normalizedCurrent);
      setMeasurementError(null);
      await invalidateTreeQueries();
    } catch (error) {
      setMeasurementError(formatError(error));
    }
  };

  const openAddPhotoModal = () => {
    const occurrenceUri = getOccurrenceUri(activeTree);
    const speciesName = activeTree?.occurrence.record?.scientificName ?? "tree";

    if (!occurrenceUri) {
      return;
    }

    pushModal(
      {
        id: MODAL_IDS.MANAGE_PHOTO_ATTACH,
        content: (
          <PhotoAttachModal
            occurrenceUri={occurrenceUri}
            speciesName={speciesName}
            onPhotoUploaded={(uploadedPhoto) => {
              setOptimisticAddedPhotos((current) => {
                const existing = current[occurrenceUri] ?? [];
                const optimisticItem = createOptimisticPhotoItem(
                  did,
                  occurrenceUri,
                  uploadedPhoto,
                );

                return {
                  ...current,
                  [occurrenceUri]: [...existing, optimisticItem],
                };
              });
              void indexerUtils.multimedia.list.invalidate();
            }}
          />
        ),
      },
      true,
    );
    void show();
  };

  const openDeletePhotoModal = (photoRkey: string) => {
    pushModal(
      {
        id: `upload/trees/manage/delete-photo/${photoRkey}`,
        content: (
          <ManageConfirmModal
            title="Delete photo?"
            description="This removes the selected tree photo from the GainForest network. This action cannot be undone."
            confirmLabel="Delete photo"
            onConfirm={async () => {
              await deleteMultimedia.mutateAsync({ rkey: photoRkey });
              setOptimisticAddedPhotos((current) => {
                let changed = false;
                const nextEntries = Object.entries(current)
                  .map(([occurrenceUri, items]) => {
                    const remaining = items.filter((item) => {
                      const keep = item.metadata?.rkey !== photoRkey;
                      if (!keep) {
                        changed = true;
                        revokeBlobUrl(item.record.accessUri);
                      }
                      return keep;
                    });

                    return [occurrenceUri, remaining] as const;
                  })
                  .filter(([, items]) => items.length > 0);

                if (!changed) {
                  return current;
                }

                return Object.fromEntries(nextEntries);
              });
              setOptimisticDeletedPhotoRkeys((current) => ({
                ...current,
                [photoRkey]: true,
              }));
              await indexerUtils.multimedia.list.invalidate();
            }}
          />
        ),
      },
      true,
    );
    void show();
  };

  const openDeleteTreeModal = (item: TreeManagerItem) => {
    const occurrenceRkey = item.occurrence.metadata?.rkey;
    if (!occurrenceRkey) {
      return;
    }

    const hasLinkedChildren =
      item.photos.length > 0 || item.measurements.length > 0;
    if (hasLinkedChildren) {
      return;
    }

    pushModal(
      {
        id: `upload/trees/manage/delete-tree/${occurrenceRkey}`,
        content: (
          <ManageConfirmModal
            title="Delete tree record?"
            description="This will permanently remove the tree occurrence record. This action cannot be undone."
            confirmLabel="Delete tree"
            onConfirm={async () => {
              await deleteOccurrence.mutateAsync({ rkey: occurrenceRkey });
              setOptimisticDeletedOccurrenceRkeys((current) => ({
                ...current,
                [occurrenceRkey]: true,
              }));
              void setSelectedTreeRkey(null);
              await invalidateTreeQueries();
            }}
          />
        ),
        dialogWidth: "max-w-md",
      },
      true,
    );
    void show();
  };

  const measurementEditingBlocked =
    activeTree?.hasLegacyMeasurements ||
    activeTree?.hasUnsupportedMeasurements ||
    activeTree?.hasDuplicateBundledMeasurements;
  const canDeleteTree =
    Boolean(activeTree?.occurrence.metadata?.rkey) &&
    (activeTree?.photos.length ?? 0) === 0 &&
    (activeTree?.measurements.length ?? 0) === 0;

  if (isLoading) {
    return <TreesManageSkeleton />;
  }

  if (queryError) {
    return (
      <Container className="pt-4 pb-8">
        <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-6 text-center space-y-4">
          <div className="mx-auto flex size-12 items-center justify-center rounded-full border border-destructive/20 bg-background">
            <AlertTriangle className="size-5 text-destructive" />
          </div>
          <div className="space-y-1">
            <h1
              className="text-2xl"
              style={{ fontFamily: "var(--font-garamond-var)" }}
            >
              Couldn&apos;t load tree records
            </h1>
            <p className="text-sm text-muted-foreground">
              We had trouble loading your trees, measurements, or linked photos.
            </p>
          </div>
          <Button variant="outline" onClick={() => void handleRetry()}>
            <RefreshCcw />
            Try again
          </Button>
        </div>
      </Container>
    );
  }

  return (
    <Container className="pt-4 pb-8 space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-1">
          <h1
            className="text-2xl font-bold"
            style={{ fontFamily: "var(--font-garamond-var)" }}
          >
            Tree Manager
          </h1>
          <p className="text-sm text-muted-foreground max-w-2xl">
            Review uploaded tree occurrences, update migrated measurements, and
            manage linked photos over time.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href={links.manage.home}>Back to upload</Link>
          </Button>
          <Button asChild>
            <Link href={links.manage.trees}>
              <CirclePlusIcon />
              Upload more trees
            </Link>
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-2 w-full lg:flex-row lg:items-center lg:max-w-2xl">
          <div className="relative w-full lg:max-w-sm">
            <SearchIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(event) =>
                void setSearchQuery(event.target.value || null)
              }
              placeholder="Search by species, locality, recorder, or date"
              className="pl-9"
            />
          </div>
          {datasetItems.length > 0 && (
            <Select
              value={datasetFilter ?? "__all__"}
              onValueChange={(value) =>
                void setDatasetFilter(value === "__all__" ? null : value)
              }
            >
              <SelectTrigger className="w-full lg:w-56 shrink-0">
                <div className="flex items-center gap-1.5 truncate">
                  <DatabaseIcon className="size-3.5 shrink-0 text-muted-foreground" />
                  <SelectValue placeholder="All datasets" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All datasets</SelectItem>
                {datasetItems.map((ds) => {
                  const uri = ds.metadata?.uri;
                  if (!uri) return null;
                  const count = ds.record?.recordCount;
                  return (
                    <SelectItem key={uri} value={uri}>
                      {ds.record?.name ?? "Unnamed"}
                      {count != null ? ` (${count})` : ""}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          )}
        </div>
        <p className="text-sm text-muted-foreground shrink-0">
          {filteredTrees.length} of {treeItems.length} tree record
          {treeItems.length === 1 ? "" : "s"}
        </p>
      </div>

      {treeItems.length === 0 ? (
        <EmptyState />
      ) : filteredTrees.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-56 gap-3 rounded-2xl border border-dashed border-border text-center px-6">
          <p
            className="text-2xl text-muted-foreground"
            style={{ fontFamily: "var(--font-garamond-var)" }}
          >
            No trees match your search
          </p>
          <p className="text-sm text-muted-foreground">
            Try a different species name, locality, or recorder.
          </p>
          <Button variant="outline" onClick={() => void setSearchQuery(null)}>
            Clear search
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
          {(isDesktop || !activeTree) && (
            <section className="rounded-2xl border border-border bg-background overflow-hidden">
              <div className="border-b border-border px-4 py-3">
                <p className="text-sm font-medium text-foreground">
                  Uploaded trees
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Select a record to review its details, measurements, and
                  photos.
                </p>
              </div>

              <div className="divide-y divide-border">
                {filteredTrees.map((item) => {
                  const record = item.occurrence.record;
                  const metadata = item.occurrence.metadata;
                  if (!record || !metadata?.rkey) {
                    return null;
                  }

                  const isSelected =
                    activeTree?.occurrence.metadata?.rkey === metadata.rkey;

                  return (
                    <button
                      key={metadata.uri ?? metadata.rkey}
                      type="button"
                      onClick={() => void setSelectedTreeRkey(metadata.rkey)}
                      className={cn(
                        "w-full px-4 py-3 text-left transition-colors",
                        isSelected ? "bg-primary/5" : "hover:bg-muted/35",
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 space-y-1">
                          <p
                            className="text-lg leading-none truncate"
                            style={{ fontFamily: "var(--font-garamond-var)" }}
                          >
                            {record.scientificName ?? "Untitled tree"}
                          </p>
                          {record.vernacularName ? (
                            <p className="text-xs italic text-muted-foreground truncate">
                              {record.vernacularName}
                            </p>
                          ) : null}
                          <p className="flex items-center gap-1 text-xs text-muted-foreground truncate">
                            <MapPin className="size-3" />
                            {formatTreeSubtitle(item)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatEventDate(record.eventDate)}
                          </p>
                        </div>

                        <div className="flex flex-col items-end gap-1 shrink-0">
                          {(() => {
                            const dsRef = record.datasetRef;
                            const dsName =
                              typeof dsRef === "string"
                                ? datasetLookup.get(dsRef)?.record?.name
                                : null;
                            return dsName ? (
                              <Badge
                                variant="outline"
                                className="max-w-[10rem] truncate text-[10px]"
                              >
                                <DatabaseIcon className="size-2.5 shrink-0 mr-0.5" />
                                {dsName}
                              </Badge>
                            ) : null;
                          })()}
                          {item.photos.length > 0 ? (
                            <Badge variant="outline">
                              {item.photos.length} photos
                            </Badge>
                          ) : null}
                          {item.hasDuplicateBundledMeasurements ? (
                            <Badge variant="secondary">Needs cleanup</Badge>
                          ) : item.floraMeasurement ? (
                            <Badge variant="success">Measurements</Badge>
                          ) : item.hasLegacyMeasurements ||
                            item.hasUnsupportedMeasurements ? (
                            <Badge variant="secondary">Migration needed</Badge>
                          ) : null}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {activeTree ? (
            <div className="space-y-4">
              {!isDesktop ? (
                <Button
                  variant="ghost"
                  className="-ml-2"
                  onClick={() => void setSelectedTreeRkey(null)}
                >
                  <ChevronLeftIcon />
                  Back to tree list
                </Button>
              ) : null}

              <section className="rounded-2xl border border-border bg-background p-4 md:p-5 space-y-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-2 min-w-0">
                    <div className="space-y-1">
                      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                        Selected tree
                      </p>
                      <h2
                        className="text-3xl leading-none text-foreground truncate"
                        style={{ fontFamily: "var(--font-garamond-var)" }}
                      >
                        {activeTree.occurrence.record?.scientificName ??
                          "Untitled tree"}
                      </h2>
                      {activeTree.occurrence.record?.vernacularName ? (
                        <p className="text-sm italic text-muted-foreground">
                          {activeTree.occurrence.record.vernacularName}
                        </p>
                      ) : null}
                    </div>

                    <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1">
                        <MapPin className="size-3" />
                        {formatTreeSubtitle(activeTree)}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1">
                        {formatEventDate(
                          activeTree.occurrence.record?.eventDate,
                        )}
                      </span>
                      {(() => {
                        const dsRef = activeTree.occurrence.record?.datasetRef;
                        const dsName =
                          typeof dsRef === "string"
                            ? datasetLookup.get(dsRef)?.record?.name
                            : null;
                        return dsName ? (
                          <span className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1">
                            <DatabaseIcon className="size-3" />
                            {dsName}
                          </span>
                        ) : null;
                      })()}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 shrink-0">
                    <Badge variant="outline">
                      {activeTree.photos.length} photos
                    </Badge>
                    {activeTree.hasDuplicateBundledMeasurements ? (
                      <Badge variant="secondary">Needs cleanup</Badge>
                    ) : activeTree.floraMeasurement ? (
                      <Badge variant="success">Measurements ready</Badge>
                    ) : activeTree.hasLegacyMeasurements ||
                      activeTree.hasUnsupportedMeasurements ? (
                      <Badge variant="secondary">Migration needed</Badge>
                    ) : (
                      <Badge variant="outline">No measurements yet</Badge>
                    )}
                  </div>
                </div>

                {measurementEditingBlocked ? (
                  <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-700 dark:text-yellow-300">
                    {activeTree.hasDuplicateBundledMeasurements
                      ? "This tree has multiple bundled measurement records. Clean them up manually before editing measurements here."
                      : "Measurements for this tree are still using a legacy or unsupported shape. Run the measurement migration before editing them here."}
                  </div>
                ) : null}
              </section>

              {activeTree.occurrence.metadata?.uri ? (
                <GreenGlobeTreePreviewCard
                  did={did}
                  treeUri={activeTree.occurrence.metadata.uri}
                  datasetRef={typeof activeTree.occurrence.record?.datasetRef === "string"
                    ? activeTree.occurrence.record.datasetRef
                    : null}
                  treeName={activeTree.occurrence.record?.scientificName ?? null}
                />
              ) : null}

              <SectionCard
                title="Tree details"
                description="Update the core Darwin Core occurrence fields for this tree."
              >
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <Field label="Scientific name" required>
                    <Input
                      value={occurrenceDraft.scientificName}
                      onChange={(event) =>
                        handleOccurrenceFieldChange(
                          "scientificName",
                          event.target.value,
                        )
                      }
                    />
                  </Field>
                  <Field label="Common or local name">
                    <Input
                      value={occurrenceDraft.vernacularName}
                      onChange={(event) =>
                        handleOccurrenceFieldChange(
                          "vernacularName",
                          event.target.value,
                        )
                      }
                    />
                  </Field>
                  <Field label="Event date" required>
                    <Input
                      value={occurrenceDraft.eventDate}
                      onChange={(event) =>
                        handleOccurrenceFieldChange(
                          "eventDate",
                          event.target.value,
                        )
                      }
                      placeholder="YYYY-MM-DD"
                    />
                  </Field>
                  <Field label="Recorded by">
                    <Input
                      value={occurrenceDraft.recordedBy}
                      onChange={(event) =>
                        handleOccurrenceFieldChange(
                          "recordedBy",
                          event.target.value,
                        )
                      }
                    />
                  </Field>
                  <Field label="Latitude" required>
                    <Input
                      value={occurrenceDraft.decimalLatitude}
                      onChange={(event) =>
                        handleOccurrenceFieldChange(
                          "decimalLatitude",
                          event.target.value,
                        )
                      }
                    />
                  </Field>
                  <Field label="Longitude" required>
                    <Input
                      value={occurrenceDraft.decimalLongitude}
                      onChange={(event) =>
                        handleOccurrenceFieldChange(
                          "decimalLongitude",
                          event.target.value,
                        )
                      }
                    />
                  </Field>
                  <Field label="Country">
                    <Input
                      value={occurrenceDraft.country}
                      onChange={(event) =>
                        handleOccurrenceFieldChange(
                          "country",
                          event.target.value,
                        )
                      }
                    />
                  </Field>
                  <Field label="Locality">
                    <Input
                      value={occurrenceDraft.locality}
                      onChange={(event) =>
                        handleOccurrenceFieldChange(
                          "locality",
                          event.target.value,
                        )
                      }
                    />
                  </Field>
                  <Field label="Habitat">
                    <Textarea
                      value={occurrenceDraft.habitat}
                      onChange={(event) =>
                        handleOccurrenceFieldChange(
                          "habitat",
                          event.target.value,
                        )
                      }
                      rows={3}
                    />
                  </Field>
                  <Field
                    label="Establishment means"
                    labelInfo={
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            className="h-5 w-5 rounded-full bg-transparent p-0 text-muted-foreground hover:bg-transparent hover:text-foreground"
                            aria-label="Show establishment means guidance"
                          >
                            <InfoIcon />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent align="start" className="w-72 p-3">
                          <EstablishmentMeansInfoContent
                            currentValue={occurrenceDraft.establishmentMeans}
                          />
                        </PopoverContent>
                      </Popover>
                    }
                  >
                    <Select
                      value={
                        occurrenceDraft.establishmentMeans ||
                        ESTABLISHMENT_MEANS_SENTINEL
                      }
                      onValueChange={(value) =>
                        handleOccurrenceFieldChange(
                          "establishmentMeans",
                          value === ESTABLISHMENT_MEANS_SENTINEL ? "" : value,
                        )
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Not specified">
                          {selectedEstablishmentMeansOption?.label ??
                            "Not specified"}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={ESTABLISHMENT_MEANS_SENTINEL}>
                          <span className="text-muted-foreground">
                            Not specified
                          </span>
                        </SelectItem>
                        {selectableEstablishmentMeansOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            <div className="flex flex-col items-start gap-0.5">
                              <span>{option.label}</span>
                              <span className="text-xs text-muted-foreground">
                                {option.description}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Occurrence remarks">
                    <Textarea
                      value={occurrenceDraft.occurrenceRemarks}
                      onChange={(event) =>
                        handleOccurrenceFieldChange(
                          "occurrenceRemarks",
                          event.target.value,
                        )
                      }
                      rows={3}
                    />
                  </Field>
                </div>

                <div className="flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="text-sm min-h-5">
                    {occurrenceError || occurrenceValidationError ? (
                      <span className="text-destructive">
                        {occurrenceError ?? occurrenceValidationError}
                      </span>
                    ) : occurrenceFeedback ? (
                      <span className="text-muted-foreground">
                        {occurrenceFeedback}
                      </span>
                    ) : null}
                  </div>
                  <Button
                    onClick={() => void handleSaveOccurrence()}
                    disabled={
                      !occurrenceHasChanges ||
                      Boolean(occurrenceValidationError) ||
                      updateOccurrence.isPending
                    }
                  >
                    {updateOccurrence.isPending ? (
                      <Loader2 className="animate-spin" />
                    ) : null}
                    Save details
                  </Button>
                </div>
              </SectionCard>

              <SectionCard
                title="Tree measurements"
                description="Manage the migrated bundled flora measurements linked to this occurrence."
              >
                {measurementEditingBlocked ? (
                  <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-700 dark:text-yellow-300">
                    {activeTree.hasDuplicateBundledMeasurements
                      ? "Multiple bundled measurement records were found for this tree, so measurement editing is disabled here to avoid overwriting the wrong record."
                      : "Measurements are read-only until migration is complete for this tree."}
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <Field label="DBH (cm)">
                        <Input
                          value={measurementDraft.dbh}
                          onChange={(event) =>
                            handleMeasurementFieldChange(
                              "dbh",
                              event.target.value,
                            )
                          }
                        />
                      </Field>
                      <Field label="Height (m)">
                        <Input
                          value={measurementDraft.totalHeight}
                          onChange={(event) =>
                            handleMeasurementFieldChange(
                              "totalHeight",
                              event.target.value,
                            )
                          }
                        />
                      </Field>
                      <Field label="Basal diameter (cm)">
                        <Input
                          value={measurementDraft.diameter}
                          onChange={(event) =>
                            handleMeasurementFieldChange(
                              "diameter",
                              event.target.value,
                            )
                          }
                        />
                      </Field>
                      <Field label="Canopy cover (%)">
                        <Input
                          value={measurementDraft.canopyCoverPercent}
                          onChange={(event) =>
                            handleMeasurementFieldChange(
                              "canopyCoverPercent",
                              event.target.value,
                            )
                          }
                        />
                      </Field>
                    </div>

                    <div className="flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="text-sm min-h-5">
                        {measurementError || measurementValidationError ? (
                          <span className="text-destructive">
                            {measurementError ?? measurementValidationError}
                          </span>
                        ) : measurementFeedback ? (
                          <span className="text-muted-foreground">
                            {measurementFeedback}
                          </span>
                        ) : !activeTree.preferredMeasurement ? (
                          <span className="text-muted-foreground">
                            Add one or more values to create a bundled flora
                            measurement.
                          </span>
                        ) : null}
                      </div>

                      <Button
                        onClick={() => void handleSaveMeasurement()}
                        disabled={
                          !measurementHasChanges ||
                          Boolean(measurementValidationError) ||
                          updateMeasurement.isPending ||
                          createMeasurement.isPending ||
                          deleteMeasurement.isPending ||
                          (!activeTree.preferredMeasurement &&
                            !hasAnyMeasurementValue(measurementDraft))
                        }
                      >
                        {updateMeasurement.isPending ||
                        createMeasurement.isPending ||
                        deleteMeasurement.isPending ? (
                          <Loader2 className="animate-spin" />
                        ) : null}
                        {activeTree.preferredMeasurement &&
                        !hasAnyMeasurementValue(measurementDraft)
                          ? "Remove measurements"
                          : activeTree.preferredMeasurement
                            ? "Save measurements"
                            : "Add measurements"}
                      </Button>
                    </div>
                  </>
                )}
              </SectionCard>

              <SectionCard
                title="Photos"
                description="View evidence already linked to this tree and attach more photos over time."
              >
                <div className="flex justify-end">
                  <Button onClick={openAddPhotoModal}>
                    <Camera />
                    Add photo
                  </Button>
                </div>

                {activeTree.photos.length === 0 ? (
                  <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border px-6 py-10 text-center">
                    <p className="text-muted-foreground">
                      No photos linked to this tree yet.
                    </p>
                    <Button variant="outline" onClick={openAddPhotoModal}>
                      <Camera />
                      Attach first photo
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {activeTree.photos.map((photo) => {
                      const metadata = photo.metadata;
                      if (!metadata?.rkey) {
                        return null;
                      }

                      const photoUrl = getPhotoUrl(photo);
                      const photoAlt = getPhotoAltText(
                        activeTree.occurrence.record?.scientificName,
                        photo.record.subjectPart,
                        photo.record.caption,
                      );

                      return (
                        <article
                          key={metadata.uri ?? metadata.rkey}
                          className="overflow-hidden rounded-xl border border-border"
                        >
                          <div className="relative h-48 w-full overflow-hidden bg-muted">
                            {photoUrl ? (
                              <Image
                                src={photoUrl}
                                alt={photoAlt}
                                fill
                                unoptimized
                                sizes="(min-width: 1280px) 24rem, (min-width: 768px) 50vw, 100vw"
                                className="object-cover"
                              />
                            ) : null}
                            {!photoUrl ? (
                              <div className="flex h-full items-center justify-center text-muted-foreground">
                                <Camera className="size-8" />
                              </div>
                            ) : null}
                          </div>

                          <div className="space-y-3 p-3">
                            <div className="flex items-start justify-between gap-3">
                              <div className="space-y-1 min-w-0">
                                <Badge variant="outline">
                                  {formatSubjectPart(photo.record.subjectPart)}
                                </Badge>
                                {photo.record.caption ? (
                                  <p className="text-sm text-foreground break-words">
                                    {photo.record.caption}
                                  </p>
                                ) : (
                                  <p className="text-sm text-muted-foreground">
                                    No caption added.
                                  </p>
                                )}
                              </div>

                              <Button
                                variant="ghost"
                                size="icon-sm"
                                className="text-muted-foreground hover:text-destructive"
                                onClick={() =>
                                  openDeletePhotoModal(metadata.rkey)
                                }
                              >
                                <Trash2 className="size-4" />
                              </Button>
                            </div>

                            <p className="text-xs text-muted-foreground">
                              Added {formatEventDate(metadata.createdAt)}
                            </p>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )}
              </SectionCard>

              <SectionCard
                title="Danger zone"
                description="Delete this tree record after linked measurements and photos have been removed."
                className="border-destructive/20"
              >
                <div className="flex flex-col gap-3 rounded-xl border border-destructive/20 bg-destructive/5 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-foreground">
                      Delete this tree permanently
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {canDeleteTree
                        ? "This tree no longer has linked photos or measurements, so it can be deleted safely."
                        : `Delete linked photos and measurement records first. This tree still has ${activeTree.photos.length} photo${activeTree.photos.length === 1 ? "" : "s"} and ${activeTree.measurements.length} measurement record${activeTree.measurements.length === 1 ? "" : "s"}.`}
                    </p>
                  </div>
                  <Button
                    variant="destructive"
                    disabled={!canDeleteTree || deleteOccurrence.isPending}
                    onClick={() => openDeleteTreeModal(activeTree)}
                  >
                    {deleteOccurrence.isPending ? (
                      <Loader2 className="animate-spin" />
                    ) : null}
                    <Trash2 />
                    Delete tree
                  </Button>
                </div>
              </SectionCard>
            </div>
          ) : null}
        </div>
      )}
    </Container>
  );
}
