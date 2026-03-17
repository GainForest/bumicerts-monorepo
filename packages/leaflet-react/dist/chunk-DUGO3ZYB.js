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

export {
  extractCid,
  buildBlobUrl,
  extractBlobImageUrl
};
//# sourceMappingURL=chunk-DUGO3ZYB.js.map