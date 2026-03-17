"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
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
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/utils/index.ts
var utils_exports = {};
__export(utils_exports, {
  buildBlobUrl: () => buildBlobUrl,
  extractBlobImageUrl: () => extractBlobImageUrl,
  extractCid: () => extractCid,
  extractYouTubeVideoId: () => extractYouTubeVideoId,
  toYouTubeEmbedUrl: () => toYouTubeEmbedUrl
});
module.exports = __toCommonJS(utils_exports);

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
function buildBlobUrl(pdsUrl, did, cid) {
  return `${pdsUrl}/xrpc/com.atproto.sync.getBlob?did=${did}&cid=${cid}`;
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
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  buildBlobUrl,
  extractBlobImageUrl,
  extractCid,
  extractYouTubeVideoId,
  toYouTubeEmbedUrl
});
//# sourceMappingURL=index.cjs.map