import { describe, expect, test } from "bun:test";
import {
  buildOptimisticAttachmentItem,
  type OptimisticAttachmentContent,
} from "./optimisticAttachmentItem";

const subjectInfo = {
  uri: "at://did:plc:test/org.hypercerts.claim.activity/abc123",
  cid: "bafyreitestcid",
};

describe("buildOptimisticAttachmentItem", () => {
  test("keeps remote uri content unchanged", () => {
    const item = buildOptimisticAttachmentItem({
      did: "did:plc:org",
      uri: "at://did:plc:org/org.hypercerts.context.attachment/att-1",
      rkey: "att-1",
      cid: "bafy-att-1",
      title: "Attachment",
      contentType: "evidence",
      subjectInfo,
      contents: ["https://example.com/report.pdf"],
    });

    expect(item.record?.content).toEqual([
      { $type: "org.hypercerts.defs#uri", uri: "https://example.com/report.pdf" },
    ]);
  });

  test("stores optimistic file previews as data urls with mime fallback", () => {
    const contents: OptimisticAttachmentContent[] = [
      {
        name: "Canopy photo.png",
        type: "",
        size: 128,
        dataUrl: "data:image/png;base64,abc123",
      },
    ];

    const item = buildOptimisticAttachmentItem({
      did: "did:plc:org",
      uri: "at://did:plc:org/org.hypercerts.context.attachment/att-2",
      rkey: "att-2",
      cid: "bafy-att-2",
      title: "Attachment",
      contentType: "photo",
      subjectInfo,
      contents,
    });

    expect(item.record?.content).toEqual([
      {
        $type: "org.hypercerts.defs#smallBlob",
        blob: {
          uri: "data:image/png;base64,abc123",
          cid: null,
          mimeType: "application/octet-stream",
          size: 128,
          name: "Canopy photo.png",
        },
      },
    ]);
  });
});
