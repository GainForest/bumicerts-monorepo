import {
  clampToCharBoundary,
  decoder,
  encoder
} from "./chunk-JN27TCH6.js";
import {
  extractBlobImageUrl
} from "./chunk-DUGO3ZYB.js";
import {
  toYouTubeEmbedUrl
} from "./chunk-ZLUSXBG2.js";

// src/renderer/facet-renderer.tsx
import React from "react";
import { jsx } from "react/jsx-runtime";
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
          /* @__PURE__ */ jsx(React.Fragment, { children: gapText }, `gap-${nodeIndex++}`)
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
              node = /* @__PURE__ */ jsx("strong", { children: node }, featureKey);
              break;
            case "pub.leaflet.richtext.facet#italic":
              node = /* @__PURE__ */ jsx("em", { children: node }, featureKey);
              break;
            case "pub.leaflet.richtext.facet#code":
              node = /* @__PURE__ */ jsx(
                "code",
                {
                  className: "leaflet-inline-code",
                  children: node
                },
                featureKey
              );
              break;
            case "pub.leaflet.richtext.facet#strikethrough":
              node = /* @__PURE__ */ jsx("del", { children: node }, featureKey);
              break;
            case "pub.leaflet.richtext.facet#underline":
              node = /* @__PURE__ */ jsx("u", { children: node }, featureKey);
              break;
            case "pub.leaflet.richtext.facet#highlight":
              node = /* @__PURE__ */ jsx("mark", { className: "leaflet-highlight", children: node }, featureKey);
              break;
            case "pub.leaflet.richtext.facet#link":
              node = /* @__PURE__ */ jsx(
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
          /* @__PURE__ */ jsx(React.Fragment, { children: node }, `seg-${facetKey}`)
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
        /* @__PURE__ */ jsx(React.Fragment, { children: remainingText }, `tail-${nodeIndex++}`)
      );
    }
  }
  return nodes;
}

// src/renderer/leaflet-renderer.tsx
import { jsx as jsx2, jsxs } from "react/jsx-runtime";
function renderListItem(item, resolveImageUrl, index) {
  const content = item.content;
  let itemContent = null;
  if (content.$type === "pub.leaflet.blocks.text" || content.$type === "pub.leaflet.blocks.header") {
    itemContent = renderFacetedText(content.plaintext, content.facets);
  } else if (content.$type === "pub.leaflet.blocks.image") {
    const src = extractBlobImageUrl(content.image, resolveImageUrl);
    if (src) {
      itemContent = /* @__PURE__ */ jsx2(
        "img",
        {
          src,
          alt: content.alt ?? "",
          className: "leaflet-list-image"
        }
      );
    }
  }
  return /* @__PURE__ */ jsxs("li", { children: [
    itemContent,
    item.children && item.children.length > 0 && /* @__PURE__ */ jsx2("ul", { className: "leaflet-list", children: item.children.map(
      (child, ci) => renderListItem(child, resolveImageUrl, ci)
    ) })
  ] }, index);
}
function renderBlock(block, resolveImageUrl, index) {
  switch (block.$type) {
    case "pub.leaflet.blocks.text": {
      return /* @__PURE__ */ jsx2("p", { className: "leaflet-text", children: renderFacetedText(block.plaintext, block.facets) }, index);
    }
    case "pub.leaflet.blocks.header": {
      const level = block.level ?? 1;
      const content = renderFacetedText(block.plaintext, block.facets);
      const cls = `leaflet-heading leaflet-h${level}`;
      switch (level) {
        case 1:
          return /* @__PURE__ */ jsx2("h1", { className: cls, children: content }, index);
        case 2:
          return /* @__PURE__ */ jsx2("h2", { className: cls, children: content }, index);
        case 3:
          return /* @__PURE__ */ jsx2("h3", { className: cls, children: content }, index);
        case 4:
          return /* @__PURE__ */ jsx2("h4", { className: cls, children: content }, index);
        case 5:
          return /* @__PURE__ */ jsx2("h5", { className: cls, children: content }, index);
        default:
          return /* @__PURE__ */ jsx2("h6", { className: cls, children: content }, index);
      }
    }
    case "pub.leaflet.blocks.image": {
      const src = extractBlobImageUrl(block.image, resolveImageUrl);
      if (!src) return null;
      return /* @__PURE__ */ jsx2("div", { className: "leaflet-image-wrapper", children: /* @__PURE__ */ jsx2(
        "img",
        {
          src,
          alt: block.alt ?? "",
          className: "leaflet-image"
        }
      ) }, index);
    }
    case "pub.leaflet.blocks.blockquote": {
      return /* @__PURE__ */ jsx2("blockquote", { className: "leaflet-blockquote", children: renderFacetedText(block.plaintext, block.facets) }, index);
    }
    case "pub.leaflet.blocks.unorderedList": {
      if (!block.children || block.children.length === 0) return null;
      return /* @__PURE__ */ jsx2("ul", { className: "leaflet-list", children: block.children.map(
        (item, ci) => renderListItem(item, resolveImageUrl, ci)
      ) }, index);
    }
    case "pub.leaflet.blocks.code": {
      const lang = block.language;
      return /* @__PURE__ */ jsx2(
        "pre",
        {
          className: `leaflet-code-block${lang ? ` language-${lang}` : ""}`,
          children: /* @__PURE__ */ jsx2("code", { children: block.plaintext })
        },
        index
      );
    }
    case "pub.leaflet.blocks.horizontalRule": {
      return /* @__PURE__ */ jsx2("hr", { className: "leaflet-hr" }, index);
    }
    case "pub.leaflet.blocks.iframe": {
      const embedUrl = toYouTubeEmbedUrl(block.url) ?? block.url;
      if (block.height) {
        return /* @__PURE__ */ jsx2("div", { className: "leaflet-iframe-wrapper", style: { height: block.height }, children: /* @__PURE__ */ jsx2(
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
      return /* @__PURE__ */ jsx2(
        "div",
        {
          className: "leaflet-iframe-wrapper leaflet-iframe-responsive",
          children: /* @__PURE__ */ jsx2(
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
      return /* @__PURE__ */ jsx2("div", { className: "leaflet-website-card", children: /* @__PURE__ */ jsxs(
        "a",
        {
          href: block.src,
          target: "_blank",
          rel: "noopener noreferrer",
          className: "leaflet-website-card__link",
          children: [
            block.title && /* @__PURE__ */ jsx2("p", { className: "leaflet-website-card__title", children: block.title }),
            block.description && /* @__PURE__ */ jsx2("p", { className: "leaflet-website-card__description", children: block.description }),
            /* @__PURE__ */ jsx2("p", { className: "leaflet-website-card__url", children: block.src })
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
  return /* @__PURE__ */ jsx2("div", { className: `leaflet-renderer${className ? ` ${className}` : ""}`, children: document.blocks.map(
    (wrapper, index) => renderBlock(wrapper.block, resolveImageUrl, index)
  ) });
};
var leaflet_renderer_default = LeafletRenderer;

export {
  renderFacetedText,
  leaflet_renderer_default
};
//# sourceMappingURL=chunk-FFRJO4GF.js.map