import type { BumicertsLeafletEditorProps } from "@/components/ui/leaflet-editor";
import type { AttachmentItem } from "@/lib/graphql-dev/queries/attachments";

export type OptimisticAttachmentContent =
  | string
  | {
      name: string;
      type: string;
      size: number;
      dataUrl: string;
    };

function getOptimisticMimeType(type: string): string {
  return type.length > 0 ? type : "application/octet-stream";
}

function toOptimisticContent(contents: OptimisticAttachmentContent[]): unknown[] {
  return contents.map((content) => {
    if (typeof content === "string") {
      return { $type: "org.hypercerts.defs#uri", uri: content };
    }

    return {
      $type: "org.hypercerts.defs#smallBlob",
      blob: {
        uri: content.dataUrl,
        cid: null,
        mimeType: getOptimisticMimeType(content.type),
        size: content.size,
        name: content.name,
      },
    };
  });
}

export function buildOptimisticAttachmentItem(args: {
  did: string;
  uri: string;
  rkey: string;
  cid: string;
  title: string;
  contentType: string;
  description?: BumicertsLeafletEditorProps["content"];
  subjectInfo: {
    uri: string;
    cid: string;
  };
  contents: OptimisticAttachmentContent[];
}): AttachmentItem {
  const createdAt = new Date().toISOString();

  return {
    metadata: {
      did: args.did,
      uri: args.uri,
      rkey: args.rkey,
      cid: args.cid,
      createdAt,
      indexedAt: createdAt,
    },
    creatorInfo: {
      did: args.did,
      organizationName: null,
      organizationLogo: null,
    },
    record: {
      title: args.title,
      shortDescription: null,
      description: args.description,
      contentType: args.contentType,
      subjects: [args.subjectInfo],
      content: toOptimisticContent(args.contents),
      createdAt,
    },
  };
}
