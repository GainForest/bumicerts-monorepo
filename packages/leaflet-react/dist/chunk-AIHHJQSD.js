import {
  decoder,
  encoder
} from "./chunk-JN27TCH6.js";
import {
  extractYouTubeVideoId
} from "./chunk-ZLUSXBG2.js";

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

export {
  tiptapToLeaflet,
  leafletToTiptap
};
//# sourceMappingURL=chunk-AIHHJQSD.js.map