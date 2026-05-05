"use client";

import { Download, InfoIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { links } from "@/lib/links";
import { cn } from "@/lib/utils";

// ─────────────────────────────────────────────────────────────────────────────
// Field reference data
// ─────────────────────────────────────────────────────────────────────────────

type FieldDoc = {
  field: string;
  description: string;
  format: string;
  required?: boolean;
  helperText?: string;
  helperTone?: "default" | "destructive";
};

const TEMPLATE_DOWNLOADS = [
  {
    href: links.assets.treeDataBasicTemplate,
    download: "tree-data-basic-xlsform.xlsx",
    label: "Download basic XLSForm",
  },
  {
    href: links.assets.treeDataDetailedTemplate,
    download: "tree-data-detailed-xlsform.xlsx",
    label: "Download detailed XLSForm",
  },
] as const;

/**
 * Fields shown in the documentation table. Names match the XLSForm question
 * names and exported CSV/TSV column headers (e.g. `height`, not the internal
 * `totalHeight`).
 */
const FIELD_DOCS: FieldDoc[] = [
  {
    field: "scientificName",
    description: "Scientific name of the species",
    format: "Text",
    required: true,
  },
  {
    field: "eventDate",
    description: "Date the tree was recorded",
    format: "YYYY-MM-DD",
    required: true,
  },
  {
    field: "decimalLatitude",
    description: "GPS latitude",
    format: "Decimal",
    required: true,
  },
  {
    field: "decimalLongitude",
    description: "GPS longitude",
    format: "Decimal",
    required: true,
  },
  {
    field: "vernacularName",
    description: "Common or local name",
    format: "Text",
  },
  {
    field: "recordedBy",
    description: "Name of recorder",
    format: "Text",
  },
  {
    field: "locality",
    description: "Site or location name",
    format: "Text",
  },
  {
    field: "country",
    description: "Country where the tree was recorded",
    format: "Text",
  },
  {
    field: "occurrenceRemarks",
    description: "Notes or comments about the occurrence",
    format: "Text",
  },
  {
    field: "habitat",
    description: "Habitat or vegetation type",
    format: "Text",
  },
  {
    field: "height",
    description: "Tree height in meters",
    format: "Number",
  },
  {
    field: "dbh",
    description: "Diameter at breast height (cm)",
    format: "Number",
  },
  {
    field: "diameter",
    description: "Basal or stem diameter in centimeters",
    format: "Number",
  },
  {
    field: "canopyCoverPercent",
    description: "Canopy cover percentage",
    format: "0-100",
  },
  {
    field: "photo_tree",
    description: "URL to a photo of the whole tree (Google Drive, etc.)",
    format: "URL",
    helperText: "Must be publicly accessible — no sign-in required",
    helperTone: "destructive",
  },
  {
    field: "photo_leaf",
    description: "URL to a photo of the leaf. Subject part auto-detected.",
    format: "URL",
    helperText: "Must be publicly accessible — no sign-in required",
    helperTone: "destructive",
  },
  {
    field: "photo_bark",
    description: "URL to a photo of the bark. Subject part auto-detected.",
    format: "URL",
    helperText: "Must be publicly accessible — no sign-in required",
    helperTone: "destructive",
  },
  {
    field: "photo_url",
    description: "Generic photo URL column. Multiple URLs may be separated with commas or semicolons.",
    format: "URL(s)",
    helperText: "Subject part is inferred from the column name; generic photos default to whole tree",
    helperTone: "destructive",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export default function TreeDataGuide() {
  return (
    <Accordion type="single" collapsible className="rounded-lg border">
      <AccordionItem value="guide" className="border-b-0">
        <AccordionTrigger className="px-4 hover:no-underline">
          New to tree data? See accepted fields and download XLSForms
        </AccordionTrigger>

        <AccordionContent className="px-4">
          {/* Intro */}
          <p className="text-sm text-muted-foreground leading-relaxed mb-4">
            Tree data follows{" "}
            <span className="font-semibold text-foreground">
              GBIF Darwin Core standards
            </span>
            . Use the XLSForm templates below to create a KoboToolBox project
            for field data collection. The question names match the fields this
            uploader expects, so Kobo CSV/TSV exports can be uploaded here with
            minimal mapping. You may add extra fields for your own use&nbsp;&mdash;
            leave them unmapped before uploading.
          </p>

          {/* Download templates */}
          <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            {TEMPLATE_DOWNLOADS.map((template) => (
              <Button key={template.download} variant="outline" size="sm" asChild>
                <a href={template.href} download={template.download}>
                  <Download />
                  {template.label}
                </a>
              </Button>
            ))}
          </div>

          {/* Field reference table */}
          <div className="rounded-lg border overflow-hidden">
            {/* Header */}
            <div className="grid grid-cols-[1fr_1.5fr_0.6fr] gap-0 bg-muted/50 px-4 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
              <span>Field</span>
              <span>Description</span>
              <span>Format</span>
            </div>

            {/* Rows */}
            <div className="divide-y divide-border">
              {FIELD_DOCS.map((doc) => (
                <div
                  key={doc.field}
                  className="grid grid-cols-[1fr_1.5fr_0.6fr] gap-0 px-4 py-2.5 items-start"
                >
                  <span className="text-sm font-mono text-foreground">
                    {doc.field}
                    {doc.required && (
                      <span className="text-destructive ml-1">*</span>
                    )}
                  </span>
                  <div className="flex flex-col gap-1 text-sm text-muted-foreground">
                    <span>{doc.description}</span>
                    {doc.helperText ? (
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 text-xs font-medium",
                          doc.helperTone === "destructive"
                            ? "text-destructive"
                            : "text-primary"
                        )}
                      >
                        <InfoIcon className="size-3.5 shrink-0" />
                        {doc.helperText}
                      </span>
                    ) : null}
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {doc.format}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Required field legend */}
          <p className="text-xs text-muted-foreground mt-2">
            <span className="text-destructive font-medium">*</span> Required
            field
          </p>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
