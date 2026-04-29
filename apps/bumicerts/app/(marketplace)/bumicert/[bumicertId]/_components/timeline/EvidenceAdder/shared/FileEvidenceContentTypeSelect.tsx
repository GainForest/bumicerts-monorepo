import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getFilePickerEvidenceContentTypeOptions,
  type KnownEvidenceContentType,
} from "../../shared/evidenceContentTypeRegistry";

export type { KnownEvidenceContentType } from "../../shared/evidenceContentTypeRegistry";

const FILE_CONTENT_TYPE_OPTIONS = getFilePickerEvidenceContentTypeOptions();

export function getDefaultFileContentType(): KnownEvidenceContentType {
  const evidenceOption = FILE_CONTENT_TYPE_OPTIONS.find(
    (option) => option.value === "evidence",
  );

  return evidenceOption?.value ?? FILE_CONTENT_TYPE_OPTIONS[0]?.value ?? "evidence";
}

export function toKnownFileContentType(value: string): KnownEvidenceContentType {
  const option = FILE_CONTENT_TYPE_OPTIONS.find((entry) => entry.value === value);
  return option?.value ?? getDefaultFileContentType();
}

export function getFileContentTypeLabel(value: KnownEvidenceContentType): string {
  const option = FILE_CONTENT_TYPE_OPTIONS.find((entry) => entry.value === value);
  return option?.label ?? "Evidence";
}

export function FileEvidenceContentTypeSelect({
  value,
  onValueChange,
  disabled,
}: {
  value: KnownEvidenceContentType;
  onValueChange: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium">Content type</label>
      <Select value={value} onValueChange={onValueChange} disabled={disabled}>
        <SelectTrigger>
          <SelectValue placeholder="Select content type" />
        </SelectTrigger>
        <SelectContent>
          {FILE_CONTENT_TYPE_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
