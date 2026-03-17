"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/editor/index.ts
var editor_exports = {};
__export(editor_exports, {
  EditorToolbar: () => EditorToolbar,
  LeafletEditor: () => LeafletEditor
});
module.exports = __toCommonJS(editor_exports);

// src/editor/leaflet-editor.tsx
var import_react2 = require("react");
var import_react3 = require("@tiptap/react");
var import_starter_kit = __toESM(require("@tiptap/starter-kit"), 1);
var import_extension_image = __toESM(require("@tiptap/extension-image"), 1);
var import_extension_youtube = __toESM(require("@tiptap/extension-youtube"), 1);
var import_extension_link = __toESM(require("@tiptap/extension-link"), 1);
var import_extension_placeholder = __toESM(require("@tiptap/extension-placeholder"), 1);
var import_extension_underline = __toESM(require("@tiptap/extension-underline"), 1);

// src/serializer/byte-utils.ts
var encoder = new TextEncoder();
var decoder = new TextDecoder();

// src/utils/youtube-utils.ts
function extractYouTubeVideoId(url) {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtube.com") && u.searchParams.has("v")) {
      return u.searchParams.get("v");
    }
    if (u.hostname === "youtu.be") {
      return u.pathname.slice(1).split("/")[0] ?? null;
    }
    const embedMatch = u.pathname.match(/\/embed\/([^/?]+)/);
    if (embedMatch) return embedMatch[1] ?? null;
    const shortsMatch = u.pathname.match(/\/shorts\/([^/?]+)/);
    if (shortsMatch) return shortsMatch[1] ?? null;
    return null;
  } catch {
    return null;
  }
}

// src/serializer/tiptap-to-leaflet.ts
function flattenInlineContent(nodes) {
  if (!nodes) return [];
  const segments = [];
  for (const node of nodes) {
    if (node.type === "text") {
      segments.push({
        text: node.text ?? "",
        marks: node.marks ?? []
      });
    } else if (node.type === "hardBreak") {
      segments.push({ text: "\n", marks: [] });
    }
  }
  return segments;
}
function extractTextAndFacets(nodes) {
  const segments = flattenInlineContent(nodes);
  let plaintext = "";
  const facets = [];
  for (const seg of segments) {
    if (!seg.text) continue;
    if (seg.marks.length > 0) {
      const byteStart = encoder.encode(plaintext).length;
      plaintext += seg.text;
      const byteEnd = encoder.encode(plaintext).length;
      const features = [];
      for (const mark of seg.marks) {
        switch (mark.type) {
          case "bold":
            features.push({ $type: "pub.leaflet.richtext.facet#bold" });
            break;
          case "italic":
            features.push({ $type: "pub.leaflet.richtext.facet#italic" });
            break;
          case "code":
            features.push({ $type: "pub.leaflet.richtext.facet#code" });
            break;
          case "strike":
            features.push({ $type: "pub.leaflet.richtext.facet#strikethrough" });
            break;
          case "underline":
            features.push({ $type: "pub.leaflet.richtext.facet#underline" });
            break;
          case "highlight":
            features.push({ $type: "pub.leaflet.richtext.facet#highlight" });
            break;
          case "link": {
            const href = mark.attrs?.href ?? mark.attrs?.url ?? "";
            features.push({ $type: "pub.leaflet.richtext.facet#link", uri: href });
            break;
          }
        }
      }
      if (features.length > 0) {
        facets.push({ index: { byteStart, byteEnd }, features });
      }
    } else {
      plaintext += seg.text;
    }
  }
  return { text: plaintext, facets };
}
function listItemToLeaflet(item) {
  const nodeChildren = item.content ?? [];
  let text = "";
  let facets = [];
  const nestedChildren = [];
  for (const child of nodeChildren) {
    if (child.type === "paragraph") {
      const extracted = extractTextAndFacets(child.content);
      text = extracted.text;
      facets = extracted.facets;
    } else if (child.type === "bulletList") {
      for (const nested of child.content ?? []) {
        nestedChildren.push(listItemToLeaflet(nested));
      }
    }
  }
  const contentBlock = {
    $type: "pub.leaflet.blocks.text",
    plaintext: text,
    ...facets.length > 0 ? { facets } : {}
  };
  const result = {
    $type: "pub.leaflet.blocks.unorderedList#listItem",
    content: contentBlock
  };
  if (nestedChildren.length > 0) result.children = nestedChildren;
  return result;
}
function inferMimeType(url) {
  const lower = url.toLowerCase().split("?")[0] ?? "";
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".gif")) return "image/gif";
  if (lower.endsWith(".svg")) return "image/svg+xml";
  return "image/jpeg";
}
function tiptapToLeaflet(doc) {
  const blocks = [];
  const topLevel = doc.content ?? [];
  for (const node of topLevel) {
    let block = null;
    switch (node.type) {
      case "paragraph": {
        const { text, facets } = extractTextAndFacets(node.content);
        block = {
          $type: "pub.leaflet.blocks.text",
          plaintext: text,
          ...facets.length > 0 ? { facets } : {}
        };
        break;
      }
      case "heading": {
        const level = node.attrs?.level ?? 1;
        const { text, facets } = extractTextAndFacets(node.content);
        block = {
          $type: "pub.leaflet.blocks.header",
          plaintext: text,
          level,
          ...facets.length > 0 ? { facets } : {}
        };
        break;
      }
      case "image": {
        const src = node.attrs?.src ?? "";
        const alt = node.attrs?.alt ?? "";
        const cid = node.attrs?.cid ?? "";
        const attrMimeType = node.attrs?.mimeType;
        const attrSize = node.attrs?.size;
        const mimeType = attrMimeType ?? inferMimeType(src);
        const size = attrSize ?? 0;
        block = {
          $type: "pub.leaflet.blocks.image",
          image: {
            $type: "blob",
            ref: { $link: cid || src },
            mimeType,
            size
          },
          alt,
          aspectRatio: { width: 800, height: 600 }
        };
        break;
      }
      case "blockquote": {
        const paragraphs = (node.content ?? []).filter((n) => n.type === "paragraph");
        const parts = [];
        const allFacets = [];
        let byteOffset = 0;
        for (let i = 0; i < paragraphs.length; i++) {
          const para = paragraphs[i];
          if (!para) continue;
          const { text, facets } = extractTextAndFacets(para.content);
          for (const facet of facets) {
            allFacets.push({
              ...facet,
              index: {
                byteStart: facet.index.byteStart + byteOffset,
                byteEnd: facet.index.byteEnd + byteOffset
              }
            });
          }
          parts.push(text);
          byteOffset += encoder.encode(text).length;
          if (i < paragraphs.length - 1) byteOffset += 1;
        }
        block = {
          $type: "pub.leaflet.blocks.blockquote",
          plaintext: parts.join("\n"),
          ...allFacets.length > 0 ? { facets: allFacets } : {}
        };
        break;
      }
      case "bulletList": {
        const children = (node.content ?? []).map(listItemToLeaflet);
        block = {
          $type: "pub.leaflet.blocks.unorderedList",
          children
        };
        break;
      }
      case "codeBlock": {
        const lang = node.attrs?.language ?? void 0;
        const codeText = (node.content ?? []).filter((n) => n.type === "text").map((n) => n.text ?? "").join("");
        block = {
          $type: "pub.leaflet.blocks.code",
          plaintext: codeText,
          ...lang ? { language: lang } : {}
        };
        break;
      }
      case "horizontalRule": {
        block = { $type: "pub.leaflet.blocks.horizontalRule" };
        break;
      }
      case "youtube": {
        const src = node.attrs?.src ?? "";
        const videoId = extractYouTubeVideoId(src);
        const canonicalUrl = videoId ? `https://www.youtube.com/watch?v=${videoId}` : src;
        block = { $type: "pub.leaflet.blocks.iframe", url: canonicalUrl };
        break;
      }
      default:
        break;
    }
    if (block) {
      blocks.push({
        $type: "pub.leaflet.pages.linearDocument#block",
        block
      });
    }
  }
  return {
    $type: "pub.leaflet.pages.linearDocument",
    blocks
  };
}

// src/serializer/leaflet-to-tiptap.ts
function featureToMark(feature) {
  switch (feature.$type) {
    case "pub.leaflet.richtext.facet#bold":
      return { type: "bold" };
    case "pub.leaflet.richtext.facet#italic":
      return { type: "italic" };
    case "pub.leaflet.richtext.facet#code":
      return { type: "code" };
    case "pub.leaflet.richtext.facet#strikethrough":
      return { type: "strike" };
    case "pub.leaflet.richtext.facet#underline":
      return { type: "underline" };
    case "pub.leaflet.richtext.facet#highlight":
      return { type: "highlight" };
    case "pub.leaflet.richtext.facet#link":
      return { type: "link", attrs: { href: feature.uri, target: "_blank" } };
    default:
      return null;
  }
}
function facetsToInlineContent(plaintext, facets) {
  if (!plaintext) return [];
  if (!facets || facets.length === 0) {
    return [{ type: "text", text: plaintext }];
  }
  const bytes = encoder.encode(plaintext);
  const totalBytes = bytes.length;
  const boundarySet = /* @__PURE__ */ new Set([0, totalBytes]);
  for (const facet of facets) {
    boundarySet.add(Math.max(0, Math.min(facet.index.byteStart, totalBytes)));
    boundarySet.add(Math.max(0, Math.min(facet.index.byteEnd, totalBytes)));
  }
  const boundaries = Array.from(boundarySet).sort((a, b) => a - b);
  const segments = [];
  for (let i = 0; i < boundaries.length - 1; i++) {
    const segStart = boundaries[i] ?? 0;
    const segEnd = boundaries[i + 1] ?? totalBytes;
    if (segStart >= segEnd) continue;
    const segText = decoder.decode(bytes.slice(segStart, segEnd));
    if (!segText) continue;
    const marks = [];
    const seenKeys = /* @__PURE__ */ new Set();
    for (const facet of facets) {
      const fs = Math.max(0, Math.min(facet.index.byteStart, totalBytes));
      const fe = Math.max(0, Math.min(facet.index.byteEnd, totalBytes));
      if (fs <= segStart && fe >= segEnd) {
        for (const feature of facet.features) {
          const mark = featureToMark(feature);
          if (mark === null) continue;
          const key = mark.type === "link" ? `link:${mark.attrs?.href ?? ""}` : mark.type;
          if (!seenKeys.has(key)) {
            seenKeys.add(key);
            marks.push(mark);
          }
        }
      }
    }
    segments.push({ text: segText, marks });
  }
  return segments.map((seg) => ({
    type: "text",
    text: seg.text,
    ...seg.marks.length > 0 ? { marks: seg.marks } : {}
  }));
}
function leafletListItemToTiptap(item) {
  const content = item.content;
  const text = content.$type === "pub.leaflet.blocks.text" || content.$type === "pub.leaflet.blocks.header" ? content.plaintext : "";
  const facets = content.$type === "pub.leaflet.blocks.text" || content.$type === "pub.leaflet.blocks.header" ? content.facets : void 0;
  const tiptapChildren = [
    {
      type: "paragraph",
      content: facetsToInlineContent(text, facets)
    }
  ];
  if (item.children && item.children.length > 0) {
    tiptapChildren.push({
      type: "bulletList",
      content: item.children.map(leafletListItemToTiptap)
    });
  }
  return { type: "listItem", content: tiptapChildren };
}
function leafletToTiptap(doc, resolveImageCid) {
  const content = [];
  for (const wrapper of doc.blocks) {
    const block = wrapper.block;
    switch (block.$type) {
      case "pub.leaflet.blocks.text": {
        content.push({
          type: "paragraph",
          content: facetsToInlineContent(block.plaintext, block.facets)
        });
        break;
      }
      case "pub.leaflet.blocks.header": {
        content.push({
          type: "heading",
          attrs: { level: block.level ?? 1 },
          content: facetsToInlineContent(block.plaintext, block.facets)
        });
        break;
      }
      case "pub.leaflet.blocks.image": {
        const cid = block.image.ref.$link;
        const src = resolveImageCid ? resolveImageCid(cid) : cid;
        content.push({
          type: "image",
          attrs: {
            src,
            alt: block.alt ?? "",
            cid,
            mimeType: block.image.mimeType,
            size: block.image.size
          }
        });
        break;
      }
      case "pub.leaflet.blocks.blockquote": {
        const lines = block.plaintext.split("\n");
        const bytes = encoder.encode(block.plaintext);
        const paragraphs = [];
        let byteOffset = 0;
        for (const lineText of lines) {
          const lineByteLen = encoder.encode(lineText).length;
          const lineByteEnd = byteOffset + lineByteLen;
          const lineFacets = [];
          for (const facet of block.facets ?? []) {
            const fs = facet.index.byteStart;
            const fe = facet.index.byteEnd;
            if (fs < lineByteEnd && fe > byteOffset) {
              const clippedStart = Math.max(fs, byteOffset) - byteOffset;
              const clippedEnd = Math.min(fe, lineByteEnd) - byteOffset;
              if (clippedStart < clippedEnd) {
                lineFacets.push({
                  ...facet,
                  index: { byteStart: clippedStart, byteEnd: clippedEnd }
                });
              }
            }
          }
          paragraphs.push({
            type: "paragraph",
            content: facetsToInlineContent(lineText, lineFacets)
          });
          byteOffset = lineByteEnd + 1;
        }
        content.push({ type: "blockquote", content: paragraphs });
        void bytes;
        break;
      }
      case "pub.leaflet.blocks.unorderedList": {
        if (block.children && block.children.length > 0) {
          content.push({
            type: "bulletList",
            content: block.children.map(leafletListItemToTiptap)
          });
        }
        break;
      }
      case "pub.leaflet.blocks.code": {
        content.push({
          type: "codeBlock",
          attrs: { language: block.language ?? null },
          content: [{ type: "text", text: block.plaintext }]
        });
        break;
      }
      case "pub.leaflet.blocks.horizontalRule": {
        content.push({ type: "horizontalRule" });
        break;
      }
      case "pub.leaflet.blocks.iframe": {
        const url = block.url;
        const isYoutube = url.includes("youtube.com") || url.includes("youtu.be");
        if (isYoutube) {
          content.push({ type: "youtube", attrs: { src: url } });
        } else {
          content.push({
            type: "paragraph",
            content: [
              {
                type: "text",
                text: url,
                marks: [{ type: "link", attrs: { href: url, target: "_blank" } }]
              }
            ]
          });
        }
        break;
      }
      case "pub.leaflet.blocks.website": {
        content.push({
          type: "paragraph",
          content: [
            {
              type: "text",
              text: block.title ?? block.src,
              marks: [{ type: "link", attrs: { href: block.src, target: "_blank" } }]
            }
          ]
        });
        break;
      }
      default:
        break;
    }
  }
  if (content.length === 0) {
    content.push({ type: "paragraph" });
  }
  return { type: "doc", content };
}

// src/editor/editor-toolbar.tsx
var import_react = require("react");
var import_lucide_react = require("lucide-react");
var import_jsx_runtime = require("react/jsx-runtime");
function ToolbarButton({
  onClick,
  isActive,
  title,
  children,
  disabled
}) {
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
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
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "leaflet-toolbar-divider", "aria-hidden": "true" });
}
function EditorToolbar({
  editor,
  onImageUpload,
  isUploading: isExternalUploading
}) {
  const fileInputRef = (0, import_react.useRef)(null);
  const [uploadError, setUploadError] = (0, import_react.useState)(null);
  const [isToolbarUploading, setIsToolbarUploading] = (0, import_react.useState)(false);
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
  const spinnerSvg = /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
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
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", { cx: "12", cy: "12", r: "10", strokeOpacity: "0.25" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M12 2a10 10 0 0 1 10 10", strokeLinecap: "round" })
      ]
    }
  );
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "leaflet-toolbar", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      ToolbarButton,
      {
        onClick: () => chain().toggleBold().run(),
        isActive: editor.isActive("bold"),
        title: "Bold",
        children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_lucide_react.Bold, { size: 15 })
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      ToolbarButton,
      {
        onClick: () => chain().toggleItalic().run(),
        isActive: editor.isActive("italic"),
        title: "Italic",
        children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_lucide_react.Italic, { size: 15 })
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      ToolbarButton,
      {
        onClick: () => chain().toggleMark("underline").run(),
        isActive: editor.isActive("underline"),
        title: "Underline (Ctrl+U)",
        children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_lucide_react.Underline, { size: 15 })
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      ToolbarButton,
      {
        onClick: () => chain().toggleStrike().run(),
        isActive: editor.isActive("strike"),
        title: "Strikethrough",
        children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_lucide_react.Strikethrough, { size: 15 })
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      ToolbarButton,
      {
        onClick: () => chain().toggleCode().run(),
        isActive: editor.isActive("code"),
        title: "Inline Code",
        children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_lucide_react.Code, { size: 15 })
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Divider, {}),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      ToolbarButton,
      {
        onClick: () => chain().toggleHeading({ level: 1 }).run(),
        isActive: editor.isActive("heading", { level: 1 }),
        title: "Heading 1",
        children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_lucide_react.Heading1, { size: 15 })
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      ToolbarButton,
      {
        onClick: () => chain().toggleHeading({ level: 2 }).run(),
        isActive: editor.isActive("heading", { level: 2 }),
        title: "Heading 2",
        children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_lucide_react.Heading2, { size: 15 })
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      ToolbarButton,
      {
        onClick: () => chain().toggleHeading({ level: 3 }).run(),
        isActive: editor.isActive("heading", { level: 3 }),
        title: "Heading 3",
        children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_lucide_react.Heading3, { size: 15 })
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Divider, {}),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      ToolbarButton,
      {
        onClick: () => chain().toggleBulletList().run(),
        isActive: editor.isActive("bulletList"),
        title: "Bullet List",
        children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_lucide_react.List, { size: 15 })
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      ToolbarButton,
      {
        onClick: () => chain().toggleBlockquote().run(),
        isActive: editor.isActive("blockquote"),
        title: "Blockquote",
        children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_lucide_react.Quote, { size: 15 })
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      ToolbarButton,
      {
        onClick: () => chain().toggleCodeBlock().run(),
        isActive: editor.isActive("codeBlock"),
        title: "Code Block",
        children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_lucide_react.Code2, { size: 15 })
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      ToolbarButton,
      {
        onClick: () => chain().setHorizontalRule().run(),
        title: "Horizontal Rule",
        children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_lucide_react.Minus, { size: 15 })
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Divider, {}),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      ToolbarButton,
      {
        onClick: handleLinkClick,
        isActive: editor.isActive("link"),
        title: "Link",
        children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_lucide_react.Link, { size: 15 })
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      ToolbarButton,
      {
        onClick: () => fileInputRef.current?.click(),
        title: "Insert Image",
        disabled: isUploading,
        children: isUploading ? spinnerSvg : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_lucide_react.Image, { size: 15 })
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ToolbarButton, { onClick: handleYoutubeClick, title: "Embed YouTube Video", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_lucide_react.Youtube, { size: 15 }) }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      "input",
      {
        ref: fileInputRef,
        type: "file",
        accept: "image/jpeg,image/png,image/webp",
        className: "leaflet-hidden",
        onChange: handleImageFileChange
      }
    ),
    isUploading && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "leaflet-toolbar-status leaflet-toolbar-status--uploading", children: [
      spinnerSvg,
      "Uploading image\u2026"
    ] }),
    uploadError && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "leaflet-toolbar-status leaflet-toolbar-status--error", children: [
      uploadError,
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
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
var import_jsx_runtime2 = require("react/jsx-runtime");
var CustomImage = import_extension_image.default.extend({
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
  const [imageError, setImageError] = (0, import_react2.useState)(null);
  const [isUploading, setIsUploading] = (0, import_react2.useState)(false);
  const isInternalChange = (0, import_react2.useRef)(false);
  const handleImageUpload = (0, import_react2.useCallback)(
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
  const editor = (0, import_react3.useEditor)({
    immediatelyRender: false,
    extensions: [
      import_starter_kit.default.configure({
        heading: { levels: [1, 2, 3] },
        codeBlock: { languageClassPrefix: "language-" }
      }),
      CustomImage.configure({
        inline: false,
        allowBase64: true,
        HTMLAttributes: { draggable: "true" }
      }),
      import_extension_youtube.default.configure({
        controls: true,
        nocookie: true,
        width: 800,
        height: 480
      }),
      import_extension_link.default.configure({
        openOnClick: false,
        autolink: true,
        HTMLAttributes: {
          rel: "noopener noreferrer",
          target: "_blank"
        }
      }),
      import_extension_placeholder.default.configure({ placeholder }),
      // UnderlineExtension is typed as AnyExtension to bypass a TypeScript
      // cross-package @tiptap/core version conflict in the monorepo. At runtime
      // all @tiptap/core instances are the same code.
      import_extension_underline.default
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
  (0, import_react2.useEffect)(() => {
    if (editor) editor.setEditable(editable);
  }, [editor, editable]);
  (0, import_react2.useEffect)(() => {
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
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
    "div",
    {
      className: `leaflet-editor${className ? ` ${className}` : ""}`,
      children: [
        editable && /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
          EditorToolbar,
          {
            editor,
            onImageUpload: handleImageUpload,
            isUploading
          }
        ),
        imageError && /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "leaflet-editor-banner leaflet-editor-banner--error", children: [
          imageError,
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
            "button",
            {
              type: "button",
              onClick: () => setImageError(null),
              className: "leaflet-editor-banner__dismiss",
              children: "dismiss"
            }
          )
        ] }),
        isUploading && /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "leaflet-editor-banner leaflet-editor-banner--uploading", children: [
          /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
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
                /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("circle", { cx: "12", cy: "12", r: "10", strokeOpacity: "0.25" }),
                /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("path", { d: "M12 2a10 10 0 0 1 10 10", strokeLinecap: "round" })
              ]
            }
          ),
          "Uploading image\u2026"
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "leaflet-editor__resizable", children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(import_react3.EditorContent, { editor, className: "leaflet-editor__content" }) })
      ]
    }
  );
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  EditorToolbar,
  LeafletEditor
});
//# sourceMappingURL=index.cjs.map