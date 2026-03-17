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

export {
  toYouTubeEmbedUrl,
  extractYouTubeVideoId
};
//# sourceMappingURL=chunk-ZLUSXBG2.js.map