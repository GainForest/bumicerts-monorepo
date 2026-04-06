"use client";

/**
 * BskyRichTextEditor wrapper for bumicerts.
 *
 * Wraps the RichTextEditor from @gainforest/leaflet-react/richtext.
 * - Uses platform design tokens for theming (no hardcoded colors)
 * - onChange updates both shortDescription (plain text) and
 *   shortDescriptionFacets simultaneously
 *
 * Usage:
 * ```tsx
 * <BskyRichTextEditor
 *   initialValue={{ text: shortDescription, facets: shortDescriptionFacets }}
 *   onChange={(text, facets) => {
 *     setFormValue("shortDescription", text)
 *     setFormValue("shortDescriptionFacets", facets ?? [])
 *   }}
 *   placeholder="A quick summary..."
 * />
 * ```
 */

import { useCallback } from "react";
import {
  RichTextEditor,
  type RichTextRecord,
  type RichTextEditorRef,
} from "@gainforest/leaflet-react/richtext";
import type { app } from "@gainforest/generated";
import type { Ref } from "react";

export interface BskyRichTextEditorProps {
  initialValue?: { text: string; facets?: app.bsky.richtext.facet.Main[] };
  onChange: (text: string, facets: app.bsky.richtext.facet.Main[] | undefined) => void;
  placeholder?: string;
  className?: string;
  editorRef?: Ref<RichTextEditorRef>;
}

export { type RichTextEditorRef } from "@gainforest/leaflet-react/richtext";

export function BskyRichTextEditor({
  initialValue,
  onChange,
  placeholder,
  className,
  editorRef,
}: BskyRichTextEditorProps) {
  const handleChange = useCallback(
    (record: RichTextRecord) => {
      // Cast via unknown: our RichTextRecord Facet type is structurally identical
      // to app.bsky.richtext.facet.Main at runtime.
      const facets = record.facets as unknown as app.bsky.richtext.facet.Main[] | undefined;
      onChange(record.text, facets);
    },
    [onChange],
  );

  // Build initialValue as RichTextRecord
  const initial: RichTextRecord | undefined = initialValue
    ? {
        text: initialValue.text,
        // Same structural cast — compatible at runtime.
        facets: initialValue.facets as unknown as RichTextRecord["facets"],
      }
    : undefined;

  return (
    <RichTextEditor
      initialValue={initial}
      onChange={handleChange}
      placeholder={placeholder}
      editorRef={editorRef}
      classNames={{
        root: className,
        content: [
          "min-h-[80px] px-3 py-2 text-sm text-[var(--foreground)]",
          "[&_.ProseMirror]:outline-none [&_.ProseMirror]:min-h-[80px]",
          "[&_.ProseMirror_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)]",
          "[&_.ProseMirror_p.is-editor-empty:first-child::before]:text-[var(--muted-foreground)]",
          "[&_.ProseMirror_p.is-editor-empty:first-child::before]:pointer-events-none",
          "[&_.ProseMirror_p.is-editor-empty:first-child::before]:float-left",
          "[&_.ProseMirror_p.is-editor-empty:first-child::before]:h-0",
          "[&_.autolink]:text-[var(--primary)] [&_.autolink]:underline",
          "[&_.bsky-mention]:text-[var(--primary)] [&_.bsky-mention]:font-medium",
          "[&_.bsky-tag]:text-[var(--primary)] [&_.bsky-tag]:font-medium",
        ].join(" "),
        mention: "bsky-mention text-[var(--primary)] font-medium",
        link: "autolink text-[var(--primary)] underline",
        tag: "bsky-tag text-[var(--primary)] font-medium",
        suggestion: {
          root: "flex flex-col max-h-80 overflow-y-auto bg-card rounded-lg shadow-lg border border-border min-w-60",
          item: "flex items-center gap-3 w-full px-3 py-2 text-left cursor-pointer border-none bg-transparent hover:bg-muted select-none text-foreground text-sm",
          itemSelected: "bg-muted",
          avatar: "flex-shrink-0 w-8 h-8 rounded-full overflow-hidden bg-muted flex items-center justify-center",
          avatarImg: "block w-full h-full object-cover",
          avatarPlaceholder: "flex items-center justify-center w-full h-full text-muted-foreground font-medium text-xs",
          text: "flex flex-col flex-1 min-w-0 overflow-hidden",
          name: "block truncate font-medium text-sm",
          handle: "block truncate text-xs text-muted-foreground",
          empty: "block px-3 py-2 text-sm text-muted-foreground",
        },
      }}
    />
  );
}
