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

// src/renderer/index.ts
var renderer_exports = {};
__export(renderer_exports, {
  LeafletRenderer: () => leaflet_renderer_default,
  renderFacetedText: () => renderFacetedText
});
module.exports = __toCommonJS(renderer_exports);

// src/utils/blob-utils.ts
function extractCid(image) {
  if (!image || typeof image !== "object") return null;
  const obj = image;
  if (obj.ref && typeof obj.ref === "object" && obj.ref.$link) {
    return obj.ref.$link;
  }
  if (obj.ref && typeof obj.ref.toString === "function") {
    const str = String(obj.ref);
    if (str && !str.startsWith("[object")) return str;
  }
  if (typeof obj.cid === "string") return obj.cid;
  return null;
}
function extractBlobImageUrl(image, resolveImageUrl) {
  if (!image || typeof image !== "object") return null;
  const obj = image;
  if (typeof obj.uri === "string" && obj.uri && !obj.uri.includes("unknown.invalid")) {
    return obj.uri;
  }
  const cid = extractCid(image);
  if (cid) return resolveImageUrl(cid);
  return null;
}

// src/utils/youtube-utils.ts
function toYouTubeEmbedUrl(url) {
  try {
    const u = new URL(url);
    let videoId = null;
    if (u.hostname.includes("youtu.be")) {
      videoId = u.pathname.slice(1).split("/")[0] ?? null;
    } else if (u.hostname.includes("youtube.com") || u.hostname.includes("youtube-nocookie.com")) {
      if (u.pathname.startsWith("/embed/")) {
        videoId = u.pathname.split("/embed/")[1]?.split("/")[0] ?? null;
      } else if (u.pathname.startsWith("/shorts/")) {
        videoId = u.pathname.split("/shorts/")[1]?.split("/")[0] ?? null;
      } else {
        videoId = u.searchParams.get("v");
      }
    }
    if (!videoId) return null;
    const start = u.searchParams.get("t") ?? u.searchParams.get("start");
    const params = start ? `?start=${start}` : "";
    return `https://www.youtube-nocookie.com/embed/${videoId}${params}`;
  } catch {
    return null;
  }
}

// src/renderer/facet-renderer.tsx
var import_react = __toESM(require("react"), 1);

// src/serializer/byte-utils.ts
var encoder = new TextEncoder();
var decoder = new TextDecoder();
function clampToCharBoundary(bytes, offset) {
  let o = Math.max(0, Math.min(offset, bytes.length));
  while (o > 0 && ((bytes[o] ?? 0) & 192) === 128) {
    o--;
  }
  return o;
}

// src/renderer/facet-renderer.tsx
var import_jsx_runtime = require("react/jsx-runtime");
function renderFacetedText(plaintext, facets) {
  if (!plaintext) return [];
  if (!facets || facets.length === 0) return [plaintext];
  const bytes = encoder.encode(plaintext);
  const totalBytes = bytes.length;
  const sorted = [...facets].sort((a, b) => a.index.byteStart - b.index.byteStart);
  const nodes = [];
  let cursor = 0;
  let nodeIndex = 0;
  for (let i = 0; i < sorted.length; i++) {
    const facet = sorted[i];
    if (!facet) continue;
    const byteStart = clampToCharBoundary(bytes, facet.index.byteStart);
    const byteEnd = clampToCharBoundary(bytes, facet.index.byteEnd);
    if (cursor < byteStart) {
      const gapBytes = bytes.slice(
        clampToCharBoundary(bytes, cursor),
        clampToCharBoundary(bytes, byteStart)
      );
      const gapText = decoder.decode(gapBytes);
      if (gapText) {
        nodes.push(
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_react.default.Fragment, { children: gapText }, `gap-${nodeIndex++}`)
        );
      }
    }
    const start = clampToCharBoundary(bytes, Math.max(cursor, byteStart));
    const end = clampToCharBoundary(bytes, Math.min(byteEnd, totalBytes));
    if (start < end) {
      const facetText = decoder.decode(bytes.slice(start, end));
      if (facetText) {
        const facetKey = nodeIndex++;
        let node = facetText;
        const reversedFeatures = [...facet.features].reverse();
        for (let fi = 0; fi < reversedFeatures.length; fi++) {
          const feature = reversedFeatures[fi];
          if (!feature) continue;
          const featureKey = `f${facetKey}-${fi}`;
          switch (feature.$type) {
            case "pub.leaflet.richtext.facet#bold":
              node = /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: node }, featureKey);
              break;
            case "pub.leaflet.richtext.facet#italic":
              node = /* @__PURE__ */ (0, import_jsx_runtime.jsx)("em", { children: node }, featureKey);
              break;
            case "pub.leaflet.richtext.facet#code":
              node = /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                "code",
                {
                  className: "leaflet-inline-code",
                  children: node
                },
                featureKey
              );
              break;
            case "pub.leaflet.richtext.facet#strikethrough":
              node = /* @__PURE__ */ (0, import_jsx_runtime.jsx)("del", { children: node }, featureKey);
              break;
            case "pub.leaflet.richtext.facet#underline":
              node = /* @__PURE__ */ (0, import_jsx_runtime.jsx)("u", { children: node }, featureKey);
              break;
            case "pub.leaflet.richtext.facet#highlight":
              node = /* @__PURE__ */ (0, import_jsx_runtime.jsx)("mark", { className: "leaflet-highlight", children: node }, featureKey);
              break;
            case "pub.leaflet.richtext.facet#link":
              node = /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                "a",
                {
                  href: feature.uri,
                  target: "_blank",
                  rel: "noopener noreferrer",
                  className: "leaflet-link",
                  children: node
                },
                featureKey
              );
              break;
            default:
              break;
          }
        }
        nodes.push(
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_react.default.Fragment, { children: node }, `seg-${facetKey}`)
        );
      }
    }
    cursor = Math.max(cursor, byteEnd);
  }
  if (cursor < totalBytes) {
    const remainingBytes = bytes.slice(clampToCharBoundary(bytes, cursor));
    const remainingText = decoder.decode(remainingBytes);
    if (remainingText) {
      nodes.push(
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_react.default.Fragment, { children: remainingText }, `tail-${nodeIndex++}`)
      );
    }
  }
  return nodes;
}

// src/renderer/leaflet-renderer.tsx
var import_jsx_runtime2 = require("react/jsx-runtime");
function renderListItem(item, resolveImageUrl, index) {
  const content = item.content;
  let itemContent = null;
  if (content.$type === "pub.leaflet.blocks.text" || content.$type === "pub.leaflet.blocks.header") {
    itemContent = renderFacetedText(content.plaintext, content.facets);
  } else if (content.$type === "pub.leaflet.blocks.image") {
    const src = extractBlobImageUrl(content.image, resolveImageUrl);
    if (src) {
      itemContent = /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
        "img",
        {
          src,
          alt: content.alt ?? "",
          className: "leaflet-list-image"
        }
      );
    }
  }
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("li", { children: [
    itemContent,
    item.children && item.children.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("ul", { className: "leaflet-list", children: item.children.map(
      (child, ci) => renderListItem(child, resolveImageUrl, ci)
    ) })
  ] }, index);
}
function renderBlock(block, resolveImageUrl, index) {
  switch (block.$type) {
    case "pub.leaflet.blocks.text": {
      return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("p", { className: "leaflet-text", children: renderFacetedText(block.plaintext, block.facets) }, index);
    }
    case "pub.leaflet.blocks.header": {
      const level = block.level ?? 1;
      const content = renderFacetedText(block.plaintext, block.facets);
      const cls = `leaflet-heading leaflet-h${level}`;
      switch (level) {
        case 1:
          return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("h1", { className: cls, children: content }, index);
        case 2:
          return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("h2", { className: cls, children: content }, index);
        case 3:
          return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("h3", { className: cls, children: content }, index);
        case 4:
          return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("h4", { className: cls, children: content }, index);
        case 5:
          return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("h5", { className: cls, children: content }, index);
        default:
          return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("h6", { className: cls, children: content }, index);
      }
    }
    case "pub.leaflet.blocks.image": {
      const src = extractBlobImageUrl(block.image, resolveImageUrl);
      if (!src) return null;
      return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "leaflet-image-wrapper", children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
        "img",
        {
          src,
          alt: block.alt ?? "",
          className: "leaflet-image"
        }
      ) }, index);
    }
    case "pub.leaflet.blocks.blockquote": {
      return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("blockquote", { className: "leaflet-blockquote", children: renderFacetedText(block.plaintext, block.facets) }, index);
    }
    case "pub.leaflet.blocks.unorderedList": {
      if (!block.children || block.children.length === 0) return null;
      return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("ul", { className: "leaflet-list", children: block.children.map(
        (item, ci) => renderListItem(item, resolveImageUrl, ci)
      ) }, index);
    }
    case "pub.leaflet.blocks.code": {
      const lang = block.language;
      return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
        "pre",
        {
          className: `leaflet-code-block${lang ? ` language-${lang}` : ""}`,
          children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("code", { children: block.plaintext })
        },
        index
      );
    }
    case "pub.leaflet.blocks.horizontalRule": {
      return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("hr", { className: "leaflet-hr" }, index);
    }
    case "pub.leaflet.blocks.iframe": {
      const embedUrl = toYouTubeEmbedUrl(block.url) ?? block.url;
      if (block.height) {
        return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "leaflet-iframe-wrapper", style: { height: block.height }, children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
          "iframe",
          {
            src: embedUrl,
            className: "leaflet-iframe",
            sandbox: "allow-scripts allow-same-origin allow-presentation allow-popups",
            allowFullScreen: true,
            title: "Embedded content"
          }
        ) }, index);
      }
      return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
        "div",
        {
          className: "leaflet-iframe-wrapper leaflet-iframe-responsive",
          children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
            "iframe",
            {
              src: embedUrl,
              className: "leaflet-iframe",
              sandbox: "allow-scripts allow-same-origin allow-presentation allow-popups",
              allowFullScreen: true,
              title: "Embedded content"
            }
          )
        },
        index
      );
    }
    case "pub.leaflet.blocks.website": {
      return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "leaflet-website-card", children: /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
        "a",
        {
          href: block.src,
          target: "_blank",
          rel: "noopener noreferrer",
          className: "leaflet-website-card__link",
          children: [
            block.title && /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("p", { className: "leaflet-website-card__title", children: block.title }),
            block.description && /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("p", { className: "leaflet-website-card__description", children: block.description }),
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("p", { className: "leaflet-website-card__url", children: block.src })
          ]
        }
      ) }, index);
    }
    default:
      return null;
  }
}
var LeafletRenderer = ({
  document,
  resolveImageUrl,
  className = ""
}) => {
  if (!document?.blocks?.length) return null;
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: `leaflet-renderer${className ? ` ${className}` : ""}`, children: document.blocks.map(
    (wrapper, index) => renderBlock(wrapper.block, resolveImageUrl, index)
  ) });
};
var leaflet_renderer_default = LeafletRenderer;
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  LeafletRenderer,
  renderFacetedText
});
//# sourceMappingURL=index.cjs.map