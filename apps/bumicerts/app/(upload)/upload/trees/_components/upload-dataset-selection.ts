export type ExistingUploadDatasetSelection = {
  uri: string;
  rkey: string;
  name: string;
  description: string | null;
  recordCount: number | null;
};

export type UploadDatasetSelection =
  | { mode: "none" }
  | {
      mode: "new";
      name: string;
      description: string;
    }
  | {
      mode: "existing";
      dataset: ExistingUploadDatasetSelection;
    };

export const NO_UPLOAD_DATASET_SELECTION: UploadDatasetSelection = {
  mode: "none",
};

function isExistingUploadDatasetSelection(
  value: unknown,
): value is ExistingUploadDatasetSelection {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.uri === "string" &&
    typeof candidate.rkey === "string" &&
    typeof candidate.name === "string" &&
    (typeof candidate.description === "string" || candidate.description === null) &&
    (typeof candidate.recordCount === "number" || candidate.recordCount === null)
  );
}

export function isUploadDatasetSelection(
  value: unknown,
): value is UploadDatasetSelection {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  if (candidate.mode === "none") {
    return true;
  }

  if (candidate.mode === "new") {
    return (
      typeof candidate.name === "string" &&
      typeof candidate.description === "string"
    );
  }

  if (candidate.mode === "existing") {
    return isExistingUploadDatasetSelection(candidate.dataset);
  }

  return false;
}
