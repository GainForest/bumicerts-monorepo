import { describe, expect, test } from "bun:test";
import { parseAndValidateRows } from "./schemas";
import type { ColumnMapping } from "./types";
import type { KoboMediaZipIndex } from "./kobo-media-zip";

const VALID_MAPPED_ROW = {
  scientificName: "Donald",
  eventDate: "2026-05-05",
  decimalLatitude: "9.75237",
  decimalLongitude: "-4.635099",
};

const PHOTO_MAPPINGS: ColumnMapping[] = [
  { sourceColumn: "Scientific Name", targetField: "scientificName" },
  { sourceColumn: "Event Date", targetField: "eventDate" },
  { sourceColumn: "_Tree Location (GPS)_latitude", targetField: "decimalLatitude" },
  { sourceColumn: "_Tree Location (GPS)_longitude", targetField: "decimalLongitude" },
  { sourceColumn: "Photo – Whole Tree", targetField: "photoUrl" },
  { sourceColumn: "Photo – Leaf", targetField: "photoUrl" },
  { sourceColumn: "Photo – Bark", targetField: "photoUrl" },
];

const KOBO_MEDIA_ZIP_INDEX: KoboMediaZipIndex = {
  fileName: "media.zip",
  submissionCount: 1,
  entries: [
    {
      entryPath: "gainforest/attachments/form/row-uuid/whole.jpeg",
      fileName: "whole.jpeg",
      normalizedFileName: "whole.jpeg",
      submissionUuid: "row-uuid",
      mimeType: "image/jpeg",
    },
    {
      entryPath: "gainforest/attachments/form/row-uuid/leaf.jpeg",
      fileName: "leaf.jpeg",
      normalizedFileName: "leaf.jpeg",
      submissionUuid: "row-uuid",
      mimeType: "image/jpeg",
    },
    {
      entryPath: "gainforest/attachments/form/row-uuid/bark.jpeg",
      fileName: "bark.jpeg",
      normalizedFileName: "bark.jpeg",
      submissionUuid: "row-uuid",
      mimeType: "image/jpeg",
    },
  ],
};

describe("parseAndValidateRows photo extraction", () => {
  test("extracts Kobo ZIP-backed Whole Tree, Leaf, and Bark photos", () => {
    const result = parseAndValidateRows(
      [VALID_MAPPED_ROW],
      [
        {
          _uuid: "row-uuid",
          "Photo – Whole Tree": "whole.jpeg",
          "Photo – Leaf": "leaf.jpeg",
          "Photo – Bark": "bark.jpeg",
        },
      ],
      PHOTO_MAPPINGS,
      { koboMediaZipIndex: KOBO_MEDIA_ZIP_INDEX },
    );

    expect(result.errors).toHaveLength(0);
    expect(result.valid).toHaveLength(1);
    expect(result.valid[0]?.photos).toEqual([
      {
        source: "koboZip",
        entryPath: "gainforest/attachments/form/row-uuid/whole.jpeg",
        fileName: "whole.jpeg",
        mimeType: "image/jpeg",
        subjectPart: "entireOrganism",
      },
      {
        source: "koboZip",
        entryPath: "gainforest/attachments/form/row-uuid/leaf.jpeg",
        fileName: "leaf.jpeg",
        mimeType: "image/jpeg",
        subjectPart: "leaf",
      },
      {
        source: "koboZip",
        entryPath: "gainforest/attachments/form/row-uuid/bark.jpeg",
        fileName: "bark.jpeg",
        mimeType: "image/jpeg",
        subjectPart: "bark",
      },
    ]);
  });

  test("does not treat bare Kobo filenames as fetchable URLs without a ZIP match", () => {
    const result = parseAndValidateRows(
      [VALID_MAPPED_ROW],
      [
        {
          _uuid: "row-uuid",
          "Photo – Leaf": "leaf.jpeg",
        },
      ],
      [{ sourceColumn: "Photo – Leaf", targetField: "photoUrl" }],
    );

    expect(result.valid[0]?.photos).toBeUndefined();
  });

  test("uses Kobo URL companion columns as fallback when no ZIP entry is available", () => {
    const result = parseAndValidateRows(
      [VALID_MAPPED_ROW],
      [
        {
          _uuid: "row-uuid",
          "Photo – Leaf": "leaf.jpeg",
          "Photo – Leaf_URL": "https://example.com/leaf.jpeg",
        },
      ],
      [{ sourceColumn: "Photo – Leaf", targetField: "photoUrl" }],
    );

    expect(result.valid[0]?.photos).toEqual([
      {
        source: "url",
        url: "https://example.com/leaf.jpeg",
        subjectPart: "leaf",
      },
    ]);
  });

  test("uses lowercase Kobo URL companion columns as fallback", () => {
    const result = parseAndValidateRows(
      [VALID_MAPPED_ROW],
      [
        {
          _uuid: "row-uuid",
          "Photo – Leaf": "leaf.jpeg",
          "Photo – Leaf_url": "https://example.com/lowercase-leaf.jpeg",
        },
      ],
      [{ sourceColumn: "Photo – Leaf", targetField: "photoUrl" }],
    );

    expect(result.valid[0]?.photos).toEqual([
      {
        source: "url",
        url: "https://example.com/lowercase-leaf.jpeg",
        subjectPart: "leaf",
      },
    ]);
  });

  test("uses a Kobo URL companion fallback only once for multi-value filename cells", () => {
    const result = parseAndValidateRows(
      [VALID_MAPPED_ROW],
      [
        {
          _uuid: "row-uuid",
          "Photo – Leaf": "missing-one.jpeg, missing-two.jpeg",
          "Photo – Leaf_URL": "https://example.com/leaf.jpeg",
        },
      ],
      [{ sourceColumn: "Photo – Leaf", targetField: "photoUrl" }],
    );

    expect(result.valid[0]?.photos).toEqual([
      {
        source: "url",
        url: "https://example.com/leaf.jpeg",
        subjectPart: "leaf",
      },
    ]);
  });
});
