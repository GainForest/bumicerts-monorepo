import {
  leafletToTiptap,
  tiptapToLeaflet
} from "./chunk-AIHHJQSD.js";

// src/editor/editor-toolbar.tsx
import { useRef, useState } from "react";
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Code,
  Heading1,
  Heading2,
  Heading3,
  List,
  Quote,
  Code2,
  Minus,
  Link,
  Image,
  Youtube
} from "lucide-react";
import { jsx, jsxs } from "react/jsx-runtime";
function ToolbarButton({
  onClick,
  isActive,
  title,
  children,
  disabled
}) {
  return /* @__PURE__ */ jsx(
    "button",
    {
      type: "button",
      onClick,
      disabled,
      title,
      className: [
        "leaflet-toolbar-btn",
        isActive ? "leaflet-toolbar-btn--active" : ""
      ].filter(Boolean).join(" "),
      children
    }
  );
}
function Divider() {
  return /* @__PURE__ */ jsx("div", { className: "leaflet-toolbar-divider", "aria-hidden": "true" });
}
function EditorToolbar({
  editor,
  onImageUpload,
  isUploading: isExternalUploading
}) {
  const fileInputRef = useRef(null);
  const [uploadError, setUploadError] = useState(null);
  const [isToolbarUploading, setIsToolbarUploading] = useState(false);
  const isUploading = isToolbarUploading || (isExternalUploading ?? false);
  if (!editor) return null;
  const chain = () => editor.chain().focus();
  const handleLinkClick = () => {
    const previousUrl = editor.getAttributes("link").href;
    const url = window.prompt("Enter URL", previousUrl ?? "https://");
    if (url === null) return;
    if (url === "") {
      chain().extendMarkRange("link").unsetLink().run();
      return;
    }
    chain().extendMarkRange("link").setLink({ href: url }).run();
  };
  const handleYoutubeClick = () => {
    const url = window.prompt("Enter YouTube URL");
    if (!url) return;
    chain().setYoutubeVideo({ src: url }).run();
  };
  const handleImageFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setUploadError(null);
    setIsToolbarUploading(true);
    try {
      const { url, cid } = await onImageUpload(file);
      chain().setImage({ src: url, alt: "" }).updateAttributes("image", { cid }).run();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Image upload failed";
      setUploadError(message);
      console.error("[LeafletEditor] Image upload failed", err);
    } finally {
      setIsToolbarUploading(false);
    }
  };
  const spinnerSvg = /* @__PURE__ */ jsxs(
    "svg",
    {
      className: "leaflet-spinner",
      width: "15",
      height: "15",
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      strokeWidth: "2",
      "aria-hidden": "true",
      children: [
        /* @__PURE__ */ jsx("circle", { cx: "12", cy: "12", r: "10", strokeOpacity: "0.25" }),
        /* @__PURE__ */ jsx("path", { d: "M12 2a10 10 0 0 1 10 10", strokeLinecap: "round" })
      ]
    }
  );
  return /* @__PURE__ */ jsxs("div", { className: "leaflet-toolbar", children: [
    /* @__PURE__ */ jsx(
      ToolbarButton,
      {
        onClick: () => chain().toggleBold().run(),
        isActive: editor.isActive("bold"),
        title: "Bold",
        children: /* @__PURE__ */ jsx(Bold, { size: 15 })
      }
    ),
    /* @__PURE__ */ jsx(
      ToolbarButton,
      {
        onClick: () => chain().toggleItalic().run(),
        isActive: editor.isActive("italic"),
        title: "Italic",
        children: /* @__PURE__ */ jsx(Italic, { size: 15 })
      }
    ),
    /* @__PURE__ */ jsx(
      ToolbarButton,
      {
        onClick: () => chain().toggleMark("underline").run(),
        isActive: editor.isActive("underline"),
        title: "Underline (Ctrl+U)",
        children: /* @__PURE__ */ jsx(Underline, { size: 15 })
      }
    ),
    /* @__PURE__ */ jsx(
      ToolbarButton,
      {
        onClick: () => chain().toggleStrike().run(),
        isActive: editor.isActive("strike"),
        title: "Strikethrough",
        children: /* @__PURE__ */ jsx(Strikethrough, { size: 15 })
      }
    ),
    /* @__PURE__ */ jsx(
      ToolbarButton,
      {
        onClick: () => chain().toggleCode().run(),
        isActive: editor.isActive("code"),
        title: "Inline Code",
        children: /* @__PURE__ */ jsx(Code, { size: 15 })
      }
    ),
    /* @__PURE__ */ jsx(Divider, {}),
    /* @__PURE__ */ jsx(
      ToolbarButton,
      {
        onClick: () => chain().toggleHeading({ level: 1 }).run(),
        isActive: editor.isActive("heading", { level: 1 }),
        title: "Heading 1",
        children: /* @__PURE__ */ jsx(Heading1, { size: 15 })
      }
    ),
    /* @__PURE__ */ jsx(
      ToolbarButton,
      {
        onClick: () => chain().toggleHeading({ level: 2 }).run(),
        isActive: editor.isActive("heading", { level: 2 }),
        title: "Heading 2",
        children: /* @__PURE__ */ jsx(Heading2, { size: 15 })
      }
    ),
    /* @__PURE__ */ jsx(
      ToolbarButton,
      {
        onClick: () => chain().toggleHeading({ level: 3 }).run(),
        isActive: editor.isActive("heading", { level: 3 }),
        title: "Heading 3",
        children: /* @__PURE__ */ jsx(Heading3, { size: 15 })
      }
    ),
    /* @__PURE__ */ jsx(Divider, {}),
    /* @__PURE__ */ jsx(
      ToolbarButton,
      {
        onClick: () => chain().toggleBulletList().run(),
        isActive: editor.isActive("bulletList"),
        title: "Bullet List",
        children: /* @__PURE__ */ jsx(List, { size: 15 })
      }
    ),
    /* @__PURE__ */ jsx(
      ToolbarButton,
      {
        onClick: () => chain().toggleBlockquote().run(),
        isActive: editor.isActive("blockquote"),
        title: "Blockquote",
        children: /* @__PURE__ */ jsx(Quote, { size: 15 })
      }
    ),
    /* @__PURE__ */ jsx(
      ToolbarButton,
      {
        onClick: () => chain().toggleCodeBlock().run(),
        isActive: editor.isActive("codeBlock"),
        title: "Code Block",
        children: /* @__PURE__ */ jsx(Code2, { size: 15 })
      }
    ),
    /* @__PURE__ */ jsx(
      ToolbarButton,
      {
        onClick: () => chain().setHorizontalRule().run(),
        title: "Horizontal Rule",
        children: /* @__PURE__ */ jsx(Minus, { size: 15 })
      }
    ),
    /* @__PURE__ */ jsx(Divider, {}),
    /* @__PURE__ */ jsx(
      ToolbarButton,
      {
        onClick: handleLinkClick,
        isActive: editor.isActive("link"),
        title: "Link",
        children: /* @__PURE__ */ jsx(Link, { size: 15 })
      }
    ),
    /* @__PURE__ */ jsx(
      ToolbarButton,
      {
        onClick: () => fileInputRef.current?.click(),
        title: "Insert Image",
        disabled: isUploading,
        children: isUploading ? spinnerSvg : /* @__PURE__ */ jsx(Image, { size: 15 })
      }
    ),
    /* @__PURE__ */ jsx(ToolbarButton, { onClick: handleYoutubeClick, title: "Embed YouTube Video", children: /* @__PURE__ */ jsx(Youtube, { size: 15 }) }),
    /* @__PURE__ */ jsx(
      "input",
      {
        ref: fileInputRef,
        type: "file",
        accept: "image/jpeg,image/png,image/webp",
        className: "leaflet-hidden",
        onChange: handleImageFileChange
      }
    ),
    isUploading && /* @__PURE__ */ jsxs("div", { className: "leaflet-toolbar-status leaflet-toolbar-status--uploading", children: [
      spinnerSvg,
      "Uploading image\u2026"
    ] }),
    uploadError && /* @__PURE__ */ jsxs("div", { className: "leaflet-toolbar-status leaflet-toolbar-status--error", children: [
      uploadError,
      /* @__PURE__ */ jsx(
        "button",
        {
          type: "button",
          onClick: () => setUploadError(null),
          className: "leaflet-toolbar-status__dismiss",
          children: "dismiss"
        }
      )
    ] })
  ] });
}

// src/editor/leaflet-editor.tsx
import { useEffect, useCallback, useState as useState2, useRef as useRef2 } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import ImageExtension from "@tiptap/extension-image";
import YoutubeExtension from "@tiptap/extension-youtube";
import LinkExtension from "@tiptap/extension-link";
import PlaceholderExtension from "@tiptap/extension-placeholder";
import UnderlineExtension from "@tiptap/extension-underline";
import { jsx as jsx2, jsxs as jsxs2 } from "react/jsx-runtime";
var CustomImage = ImageExtension.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      cid: { default: null },
      mimeType: { default: null },
      size: { default: null }
    };
  }
});
function resolveImageCids(doc, resolveImageUrl) {
  if (!doc.content) return doc;
  return {
    ...doc,
    content: doc.content.map((node) => {
      if (node.type === "image" && node.attrs?.cid) {
        const src = node.attrs.src;
        if (src && (src.startsWith("http") || src.startsWith("blob:"))) {
          return node;
        }
        const cid = node.attrs.cid;
        return {
          ...node,
          attrs: { ...node.attrs, src: resolveImageUrl(cid) }
        };
      }
      return node;
    })
  };
}
function LeafletEditor({
  content,
  onChange,
  onImageUpload,
  resolveImageUrl,
  placeholder = "Start writing\u2026",
  editable = true,
  className = ""
}) {
  const [imageError, setImageError] = useState2(null);
  const [isUploading, setIsUploading] = useState2(false);
  const isInternalChange = useRef2(false);
  const handleImageUpload = useCallback(
    async (file) => {
      setImageError(null);
      setIsUploading(true);
      try {
        return await onImageUpload(file);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Image upload failed";
        setImageError(message);
        throw err;
      } finally {
        setIsUploading(false);
      }
    },
    [onImageUpload]
  );
  const initialContent = content ? resolveImageCids(leafletToTiptap(content, resolveImageUrl), resolveImageUrl) : { type: "doc", content: [{ type: "paragraph" }] };
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        codeBlock: { languageClassPrefix: "language-" }
      }),
      CustomImage.configure({
        inline: false,
        allowBase64: true,
        HTMLAttributes: { draggable: "true" }
      }),
      YoutubeExtension.configure({
        controls: true,
        nocookie: true,
        width: 800,
        height: 480
      }),
      LinkExtension.configure({
        openOnClick: false,
        autolink: true,
        HTMLAttributes: {
          rel: "noopener noreferrer",
          target: "_blank"
        }
      }),
      PlaceholderExtension.configure({ placeholder }),
      // UnderlineExtension is typed as AnyExtension to bypass a TypeScript
      // cross-package @tiptap/core version conflict in the monorepo. At runtime
      // all @tiptap/core instances are the same code.
      UnderlineExtension
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
        if (!moved && event.dataTransfer?.files?.length) {
          const file = event.dataTransfer.files[0];
          if (file?.type.startsWith("image/")) {
            event.preventDefault();
            handleImageUpload(file).then(({ url, cid }) => {
              const { schema } = view.state;
              const node = schema.nodes.image?.create({ src: url, cid });
              if (!node) return;
              const tr = view.state.tr.replaceSelectionWith(node);
              view.dispatch(tr);
            }).catch(() => {
            });
            return true;
          }
        }
        return false;
      },
      // ── Paste image upload ────────────────────────────────────────────
      handlePaste: (view, event) => {
        const items = event.clipboardData?.items;
        if (!items) return false;
        for (const item of Array.from(items)) {
          if (item.type.startsWith("image/")) {
            const file = item.getAsFile();
            if (file) {
              event.preventDefault();
              handleImageUpload(file).then(({ url, cid }) => {
                const { schema } = view.state;
                const node = schema.nodes.image?.create({ src: url, cid });
                if (!node) return;
                const tr = view.state.tr.replaceSelectionWith(node);
                view.dispatch(tr);
              }).catch(() => {
              });
              return true;
            }
          }
        }
        return false;
      }
    }
  });
  useEffect(() => {
    if (editor) editor.setEditable(editable);
  }, [editor, editable]);
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
    if (JSON.stringify(currentJson) !== JSON.stringify(newJson)) {
      editor.commands.setContent(newJson);
    }
  }, [editor, content, resolveImageUrl]);
  return /* @__PURE__ */ jsxs2(
    "div",
    {
      className: `leaflet-editor${className ? ` ${className}` : ""}`,
      children: [
        editable && /* @__PURE__ */ jsx2(
          EditorToolbar,
          {
            editor,
            onImageUpload: handleImageUpload,
            isUploading
          }
        ),
        imageError && /* @__PURE__ */ jsxs2("div", { className: "leaflet-editor-banner leaflet-editor-banner--error", children: [
          imageError,
          /* @__PURE__ */ jsx2(
            "button",
            {
              type: "button",
              onClick: () => setImageError(null),
              className: "leaflet-editor-banner__dismiss",
              children: "dismiss"
            }
          )
        ] }),
        isUploading && /* @__PURE__ */ jsxs2("div", { className: "leaflet-editor-banner leaflet-editor-banner--uploading", children: [
          /* @__PURE__ */ jsxs2(
            "svg",
            {
              className: "leaflet-spinner",
              width: "16",
              height: "16",
              viewBox: "0 0 24 24",
              fill: "none",
              stroke: "currentColor",
              strokeWidth: "2",
              "aria-hidden": "true",
              children: [
                /* @__PURE__ */ jsx2("circle", { cx: "12", cy: "12", r: "10", strokeOpacity: "0.25" }),
                /* @__PURE__ */ jsx2("path", { d: "M12 2a10 10 0 0 1 10 10", strokeLinecap: "round" })
              ]
            }
          ),
          "Uploading image\u2026"
        ] }),
        /* @__PURE__ */ jsx2("div", { className: "leaflet-editor__resizable", children: /* @__PURE__ */ jsx2(EditorContent, { editor, className: "leaflet-editor__content" }) })
      ]
    }
  );
}

export {
  EditorToolbar,
  LeafletEditor
};
//# sourceMappingURL=chunk-WRLZTHPQ.js.map