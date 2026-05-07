import { describe, expect, test } from "bun:test";
import JSZip from "jszip";
import {
  buildKoboMediaZipIndex,
  loadKoboMediaZipArchive,
  readKoboMediaZipEntryAsSerializableFile,
  resolveKoboMediaZipEntry,
} from "./kobo-media-zip";

async function makeMediaZipFile(): Promise<File> {
  const zip = new JSZip();
  zip.file(
    "gainforest/attachments/form-hash/5986026a-1315-42d7-854a-88e1a7d98ee9/leaf.jpeg",
    new Uint8Array([1, 2, 3]),
  );
  zip.file(
    "field-team/attachments/form-hash/bd20be4b-bb56-4efc-94be-c551aa249fe6/bark.PNG",
    new Uint8Array([4, 5, 6]),
  );
  zip.file(
    "field-team/attachments/ABCDEFAB-1234-4567-89AB-ABCDEFABCDEF/case.jpeg",
    new Uint8Array([7, 8, 9]),
  );
  zip.file(
    "other/media/form-hash/5986026a-1315-42d7-854a-88e1a7d98ee9/ignored.jpeg",
    new Uint8Array([10, 11, 12]),
  );
  zip.file(
    "gainforest/attachments/form-hash/5986026a-1315-42d7-854a-88e1a7d98ee9/ignored.gif",
    new Uint8Array([13, 14, 15]),
  );
  zip.file(
    "gainforest/attachments/form-hash/bd20be4b-bb56-4efc-94be-c551aa249fe6/readme.txt",
    "not an image",
  );

  const bytes = await zip.generateAsync({ type: "uint8array" });
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  return new File([buffer], "media.zip", { type: "application/zip" });
}

describe("Kobo media ZIP index", () => {
  test("indexes supported image entries by submission UUID and filename", async () => {
    const file = await makeMediaZipFile();
    const index = await buildKoboMediaZipIndex(file);

    expect(index.fileName).toBe("media.zip");
    expect(index.entries).toHaveLength(3);
    expect(index.submissionCount).toBe(3);
    expect(
      index.entries.some((entry) => entry.fileName === "ignored.jpeg"),
    ).toBe(false);

    const match = resolveKoboMediaZipEntry(
      index,
      { _uuid: "5986026a-1315-42d7-854a-88e1a7d98ee9" },
      "leaf.jpeg",
    );

    expect(match?.entryPath).toBe(
      "gainforest/attachments/form-hash/5986026a-1315-42d7-854a-88e1a7d98ee9/leaf.jpeg",
    );
    expect(match?.mimeType).toBe("image/jpeg");
  });

  test("resolves rootUuid values with Kobo's uuid: prefix", async () => {
    const file = await makeMediaZipFile();
    const index = await buildKoboMediaZipIndex(file);

    const match = resolveKoboMediaZipEntry(
      index,
      { "meta/rootUuid": "uuid:bd20be4b-bb56-4efc-94be-c551aa249fe6" },
      "bark.png",
    );

    expect(match?.fileName).toBe("bark.PNG");
    expect(match?.entryPath).toBe(
      "field-team/attachments/form-hash/bd20be4b-bb56-4efc-94be-c551aa249fe6/bark.PNG",
    );
    expect(match?.mimeType).toBe("image/png");
  });

  test("normalizes submission UUID casing", async () => {
    const file = await makeMediaZipFile();
    const index = await buildKoboMediaZipIndex(file);

    const match = resolveKoboMediaZipEntry(
      index,
      { _uuid: "abcdefab-1234-4567-89ab-abcdefabcdef" },
      "case.jpeg",
    );

    expect(match?.fileName).toBe("case.jpeg");
    expect(match?.entryPath).toBe(
      "field-team/attachments/ABCDEFAB-1234-4567-89AB-ABCDEFABCDEF/case.jpeg",
    );
  });

  test("reads a ZIP entry as a SerializableFile", async () => {
    const file = await makeMediaZipFile();
    const archive = await loadKoboMediaZipArchive(file);
    const serializableFile = await readKoboMediaZipEntryAsSerializableFile({
      archive,
      entryPath:
        "gainforest/attachments/form-hash/5986026a-1315-42d7-854a-88e1a7d98ee9/leaf.jpeg",
      fileName: "leaf.jpeg",
      mimeType: "image/jpeg",
    });

    expect(serializableFile.name).toBe("leaf.jpeg");
    expect(serializableFile.type).toBe("image/jpeg");
    expect(serializableFile.size).toBe(3);
    expect(serializableFile.data).toBe("AQID");
  });
});
