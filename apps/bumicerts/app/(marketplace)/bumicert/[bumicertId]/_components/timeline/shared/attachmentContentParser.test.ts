import { describe, expect, test } from "bun:test";
import {
  getRenderableAttachmentLinksFromContent,
  parseAttachmentContent,
} from "./attachmentContentParser";

describe("attachmentContentParser", () => {
  test("parses resolved small blobs with names and data urls", () => {
    const parsed = parseAttachmentContent([
      {
        $type: "org.hypercerts.defs#smallBlob",
        blob: {
          uri: "data:image/png;base64,abc123",
          mimeType: "image/png",
          size: 42,
          cid: null,
          name: "Canopy photo",
        },
      },
    ]);

    expect(parsed).toEqual([
      {
        kind: "blob",
        sourceType: "small-blob-definition",
        uri: "data:image/png;base64,abc123",
        uriKind: "http-url",
        name: "Canopy photo",
        mimeType: "image/png",
        size: 42,
        cid: null,
      },
    ]);
  });

  test("returns renderable links for http, data, and deduped blob urls", () => {
    const links = getRenderableAttachmentLinksFromContent([
      { $type: "org.hypercerts.defs#uri", uri: "https://example.com/report.pdf" },
      { $type: "org.hypercerts.defs#uri", uri: "https://example.com/report.pdf" },
      {
        $type: "org.hypercerts.defs#smallBlob",
        blob: {
          uri: "data:image/png;base64,abc123",
          mimeType: "image/png",
          size: 42,
          cid: null,
          name: "Plot image",
        },
      },
      {
        $type: "blob",
        uri: "blob:https://app.test/file-1",
        mimeType: "application/pdf",
        size: 64,
        cid: "cid-1",
      },
    ]);

    expect(links).toEqual([
      {
        href: "https://example.com/report.pdf",
        sourceType: "uri",
        mimeType: null,
        size: null,
        cid: null,
      },
      {
        href: "data:image/png;base64,abc123",
        sourceType: "blob",
        mimeType: "image/png",
        size: 42,
        cid: null,
      },
      {
        href: "blob:https://app.test/file-1",
        sourceType: "blob",
        mimeType: "application/pdf",
        size: 64,
        cid: "cid-1",
      },
    ]);
  });

  test("keeps unknown items as safe fallbacks", () => {
    const parsed = parseAttachmentContent([{ $type: "unexpected", foo: "bar" }]);

    expect(parsed).toEqual([{ kind: "unknown", sourceType: "unknown" }]);
  });
});
