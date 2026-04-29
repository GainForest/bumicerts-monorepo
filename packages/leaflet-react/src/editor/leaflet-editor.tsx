/**
 * LeafletEditor — TipTap-based WYSIWYG editor for pub.leaflet.pages.linearDocument.
 *
 * Usage:
 * ```tsx
 * import { LeafletEditor } from "@gainforest/leaflet-react/editor";
 * import "@gainforest/leaflet-react/editor.css";
 *
 * <LeafletEditor
 *   content={leafletDoc}
 *   onChange={(doc) => setDoc(doc)}
 *   onImageUpload={async (file) => {
 *     const blobRef = await uploadBlob(agent, file);
 *     return { cid: blobRef.ref.$link, url: URL.createObjectURL(file) };
 *   }}
 *   resolveImageUrl={(cid) => buildBlobUrl(pdsUrl, did, cid)}
 *   initialHeight={280}
 *   minHeight={180}
 *   maxHeight="70vh"
 * />
 * ```
 */

"use client";

import React, { useEffect, useCallback, useState, useRef } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import type { JSONContent } from "@tiptap/react";
// tiptap-react.d.ts in this directory contains a module augmentation that
// redeclares EditorContent as React.FC so it works with @types/react@19.
import StarterKit from "@tiptap/starter-kit";
import ImageExtension from "@tiptap/extension-image";
import YoutubeExtension from "@tiptap/extension-youtube";
import LinkExtension from "@tiptap/extension-link";
import PlaceholderExtension from "@tiptap/extension-placeholder";
import UnderlineExtension from "@tiptap/extension-underline";
import type { LeafletLinearDocument, ImageUploadResult } from "../types/index.js";
import { tiptapToLeaflet, leafletToTiptap } from "../serializer/index.js";
import { EditorToolbar } from "./editor-toolbar.js";

// ─────────────────────────────────────────────────────────────────────────────
// Extended Image extension — persists custom attrs (cid, mimeType, size) in
// the document JSON. TipTap silently drops unknown attrs unless they are declared.
// ─────────────────────────────────────────────────────────────────────────────

const CustomImage = ImageExtension.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      cid: { default: null },
      mimeType: { default: null },
      size: { default: null },
    };
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Post-process a TipTap JSONContent tree to replace bare CID strings in image
 * `src` attributes with real blob URLs using `resolveImageUrl`.
 */
function resolveImageCids(
  doc: JSONContent,
  resolveImageUrl: (cid: string) => string
): JSONContent {
  if (!doc.content) return doc;
  return {
    ...doc,
    content: doc.content.map((node) => {
      if (node.type === "image" && node.attrs?.cid) {
        const src = node.attrs.src as string | undefined;
        // Skip if already a real URL
        if (src && (src.startsWith("http") || src.startsWith("blob:"))) {
          return node;
        }
        const cid = node.attrs.cid as string;
        return {
          ...node,
          attrs: { ...node.attrs, src: resolveImageUrl(cid) },
        };
      }
      return node;
    }),
  };
}

function toCssSize(value: number | string | undefined): string | undefined {
  if (value === undefined) return undefined;
  return typeof value === "number" ? `${value}px` : value;
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export interface LeafletEditorProps {
  /** Initial / controlled content. When changed externally the editor updates. */
  content?: LeafletLinearDocument;
  /** Called on every content change with the updated Leaflet document. */
  onChange: (content: LeafletLinearDocument) => void;
  /**
   * Upload a file to the ATProto PDS and return the resulting CID + a
   * temporary display URL (usually `URL.createObjectURL(file)`).
   */
  onImageUpload: (file: File) => Promise<ImageUploadResult>;
  /**
   * Resolve a blob CID to a displayable URL.
   *
   * @example
   * ```ts
   * resolveImageUrl={(cid) => buildBlobUrl(pdsUrl, did, cid)}
   * ```
   */
  resolveImageUrl: (cid: string) => string;
  /** Placeholder text shown when the editor is empty. */
  placeholder?: string;
  /** Whether the editor is editable. Defaults to `true`. */
  editable?: boolean;
  /** Additional CSS class added to the wrapper `<div>`. */
  className?: string;
  /** Enable image insertion/upload interactions. Defaults to true. */
  enableImageUpload?: boolean;
  /** Initial height for the resizable editor area (e.g. `320` or `"20rem"`). */
  initialHeight?: number | string;
  /** Minimum height for the resizable editor area (e.g. `160` or `"12rem"`). */
  minHeight?: number | string;
  /** Maximum height for the resizable editor area (e.g. `"80vh"`). */
  maxHeight?: number | string;
}

export function LeafletEditor({
  content,
  onChange,
  onImageUpload,
  resolveImageUrl,
  placeholder = "Start writing…",
  editable = true,
  className = "",
  enableImageUpload = true,
  initialHeight,
  minHeight,
  maxHeight,
}: LeafletEditorProps) {
  const [imageError, setImageError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Track whether the latest change originated from the editor itself.
  // When true, the sync useEffect must skip calling setContent() to avoid
  // replacing in-memory blob: preview URLs with PDS URLs that may not be
  // accessible yet for newly-uploaded images.
  const isInternalChange = useRef(false);

  // Stable upload wrapper that manages loading + error state
  const handleImageUpload = useCallback(
    async (file: File): Promise<ImageUploadResult> => {
      setImageError(null);
      setIsUploading(true);
      try {
        return await onImageUpload(file);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Image upload failed";
        setImageError(message);
        throw err;
      } finally {
        setIsUploading(false);
      }
    },
    [onImageUpload]
  );

  // ── Compute initial TipTap content ────────────────────────────────────────
  const initialContent: JSONContent = content
    ? resolveImageCids(leafletToTiptap(content, resolveImageUrl), resolveImageUrl)
    : { type: "doc", content: [{ type: "paragraph" }] };

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        codeBlock: { languageClassPrefix: "language-" },
      }),
      CustomImage.configure({
        inline: false,
        allowBase64: true,
        HTMLAttributes: { draggable: "true" },
      }),
      YoutubeExtension.configure({
        controls: true,
        nocookie: true,
        width: 800,
        height: 480,
      }),
      LinkExtension.configure({
        openOnClick: false,
        autolink: true,
        HTMLAttributes: {
          rel: "noopener noreferrer",
          target: "_blank",
        },
      }),
      PlaceholderExtension.configure({ placeholder }),
      // UnderlineExtension is typed as AnyExtension to bypass a TypeScript
      // cross-package @tiptap/core version conflict in the monorepo. At runtime
      // all @tiptap/core instances are the same code.
      UnderlineExtension as Parameters<typeof StarterKit.configure>[0] extends infer _O ? never : never,
    ],
    content: initialContent,
    editable,
    onUpdate: ({ editor: e }) => {
      const leaflet = tiptapToLeaflet(e.getJSON());
      isInternalChange.current = true;
      onChange(leaflet);
    },
    editorProps: {
      // ── Drag-and-drop image upload ────────────────────────────────────
      handleDrop: (view, event, _slice, moved) => {
        if (enableImageUpload && !moved && event.dataTransfer?.files?.length) {
          const file = event.dataTransfer.files[0];
          if (file?.type.startsWith("image/")) {
            event.preventDefault();
            handleImageUpload(file)
              .then(({ url, cid }) => {
                const { schema } = view.state;
                const node = schema.nodes.image?.create({ src: url, cid });
                if (!node) return;
                const tr = view.state.tr.replaceSelectionWith(node);
                view.dispatch(tr);
              })
              .catch(() => {
                /* error already stored in state */
              });
            return true;
          }
        }
        return false;
      },
      // ── Paste image upload ────────────────────────────────────────────
      handlePaste: (view, event) => {
        if (!enableImageUpload) return false;
        const items = event.clipboardData?.items;
        if (!items) return false;
        for (const item of Array.from(items)) {
          if (item.type.startsWith("image/")) {
            const file = item.getAsFile();
            if (file) {
              event.preventDefault();
              handleImageUpload(file)
                .then(({ url, cid }) => {
                  const { schema } = view.state;
                  const node = schema.nodes.image?.create({ src: url, cid });
                  if (!node) return;
                  const tr = view.state.tr.replaceSelectionWith(node);
                  view.dispatch(tr);
                })
                .catch(() => {
                  /* error already stored in state */
                });
              return true;
            }
          }
        }
        return false;
      },
    },
  });

  // ── Sync editable prop ────────────────────────────────────────────────────
  useEffect(() => {
    if (editor) editor.setEditable(editable);
  }, [editor, editable]);

  // ── Sync content from props (external changes only) ───────────────────────
  useEffect(() => {
    if (isInternalChange.current) {
      isInternalChange.current = false;
      return;
    }
    if (!editor || editor.isDestroyed) return;
    if (!content) return;

    const newJson = resolveImageCids(
      leafletToTiptap(content, resolveImageUrl),
      resolveImageUrl
    );
    const currentJson = editor.getJSON();
    // Avoid cursor jumps when content is the same
    if (JSON.stringify(currentJson) !== JSON.stringify(newJson)) {
      editor.commands.setContent(newJson);
    }
  }, [editor, content, resolveImageUrl]);

  return (
    <div
      className={`leaflet-editor${className ? ` ${className}` : ""}`}
    >
      {editable && (
        <EditorToolbar
          editor={editor}
          onImageUpload={handleImageUpload}
          isUploading={isUploading}
          enableImageUpload={enableImageUpload}
        />
      )}

      {imageError && (
        <div className="leaflet-editor-banner leaflet-editor-banner--error">
          {imageError}
          <button
            type="button"
            onClick={() => setImageError(null)}
            className="leaflet-editor-banner__dismiss"
          >
            dismiss
          </button>
        </div>
      )}

      {enableImageUpload && isUploading && (
        <div className="leaflet-editor-banner leaflet-editor-banner--uploading">
          <svg
            className="leaflet-spinner"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
            <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
          </svg>
          Uploading image…
        </div>
      )}

      <div
        className="leaflet-editor__resizable"
        style={{
          height: toCssSize(initialHeight),
          minHeight: toCssSize(minHeight),
          maxHeight: toCssSize(maxHeight),
        }}
      >
        <EditorContent editor={editor} className="leaflet-editor__content" />
      </div>
    </div>
  );
}
