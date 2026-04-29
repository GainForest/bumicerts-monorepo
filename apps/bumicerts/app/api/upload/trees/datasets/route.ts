import { NextResponse } from "next/server";
import { $parse as parseDatasetRecord } from "@gainforest/generated/app/gainforest/dwc/dataset.defs";
import type { UploadTreeDatasetItem } from "@/lib/upload/tree-upload-datasets";
import { auth } from "@/lib/auth";

const DATASET_COLLECTION = "app.gainforest.dwc.dataset";
const PAGE_LIMIT = 100;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function hasDidSession(session: unknown): session is { did: string } {
  return isRecord(session) && typeof session.did === "string";
}

export async function GET() {
  const session = await auth.session.getSession();
  if (!hasDidSession(session)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const agent = await auth.session.getAuthenticatedAgent(session.did);
  if (!agent) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const items: UploadTreeDatasetItem[] = [];
    let cursor: string | undefined;

    do {
      const response = await agent.com.atproto.repo.listRecords({
        repo: session.did,
        collection: DATASET_COLLECTION,
        limit: PAGE_LIMIT,
        cursor,
      });

      for (const record of response.data.records) {
        try {
          const parsed = parseDatasetRecord(record.value);
          items.push({
            uri: record.uri,
            rkey: record.uri.split("/").at(-1) ?? "",
            name: parsed.name,
            description: parsed.description ?? null,
            recordCount: parsed.recordCount ?? null,
            createdAt: parsed.createdAt ?? null,
          });
        } catch {
          continue;
        }
      }

      cursor = response.data.cursor;
    } while (cursor);

    items.sort((left, right) => {
      const leftTime = left.createdAt ? new Date(left.createdAt).getTime() : 0;
      const rightTime = right.createdAt ? new Date(right.createdAt).getTime() : 0;

      if (rightTime !== leftTime) {
        return rightTime - leftTime;
      }

      return left.name.localeCompare(right.name);
    });

    return NextResponse.json(items);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Failed to load datasets: ${message}` },
      { status: 500 },
    );
  }
}
