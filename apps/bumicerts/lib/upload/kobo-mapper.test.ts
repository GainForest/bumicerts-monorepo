import { describe, expect, test } from "bun:test";
import {
  getKoboColumnMappings,
  isExpectedSkippedKoboColumn,
} from "./kobo-mapper";

const DETAILED_LABEL_EXPORT_HEADERS = [
  "Scientific Name",
  "Event Date",
  "Tree Location (GPS)",
  "_Tree Location (GPS)_latitude",
  "_Tree Location (GPS)_longitude",
  "_Tree Location (GPS)_altitude",
  "_Tree Location (GPS)_precision",
  "Common / Vernacular Name",
  "Recorded By",
  "Locality",
  "Country",
  "Occurrence Remarks",
  "Habitat",
  "Tree Height (m)",
  "DBH (cm)",
  "Diameter (cm)",
  "Canopy Cover (%)",
  "Photo – Whole Tree",
  "Photo – Whole Tree_URL",
  "Photo – Leaf",
  "Photo – Leaf_URL",
  "Photo – Bark",
  "Photo – Bark_URL",
  "_id",
  "_uuid",
  "_submission_time",
  "_validation_status",
  "_notes",
  "_status",
  "_submitted_by",
  "__version__",
  "_tags",
  "meta/rootUuid",
  "_index",
];

function getTargetBySource(headers: string[]): Map<string, string> {
  return new Map(
    getKoboColumnMappings(headers).map((mapping) => [
      mapping.sourceColumn,
      mapping.targetField,
    ]),
  );
}

describe("getKoboColumnMappings", () => {
  test("maps Kobo Whole Tree, Leaf, and Bark filename columns as separate photo mappings", () => {
    const mappings = getKoboColumnMappings([
      "Scientific Name",
      "Event Date",
      "Tree Location (GPS)",
      "Photo – Whole Tree",
      "Photo – Whole Tree_URL",
      "Photo – Leaf",
      "Photo – Leaf_URL",
      "Photo – Bark",
      "Photo – Bark_URL",
      "_uuid",
      "_submission_time",
    ]);

    expect(
      mappings.some(
        (mapping) =>
          mapping.sourceColumn === "Scientific Name" &&
          mapping.targetField === "scientificName",
      ),
    ).toBe(true);

    const photoColumns = mappings
      .filter((mapping) => mapping.targetField === "photoUrl")
      .map((mapping) => mapping.sourceColumn);

    expect(photoColumns).toEqual([
      "Photo – Whole Tree",
      "Photo – Leaf",
      "Photo – Bark",
    ]);
  });

  test("keeps URL photo columns when no filename companion exists", () => {
    const mappings = getKoboColumnMappings([
      "Tree Location (GPS)",
      "Photo – Leaf_URL",
      "_submission_time",
    ]);

    expect(
      mappings.some(
        (mapping) =>
          mapping.sourceColumn === "Photo – Leaf_URL" &&
          mapping.targetField === "photoUrl",
      ),
    ).toBe(true);
  });

  test("maps detailed Kobo label export headers without treating combined GPS as locality", () => {
    const targetBySource = getTargetBySource(DETAILED_LABEL_EXPORT_HEADERS);

    expect(targetBySource.get("Scientific Name")).toBe("scientificName");
    expect(targetBySource.get("Event Date")).toBe("eventDate");
    expect(targetBySource.get("Tree Location (GPS)")).toBeUndefined();
    expect(targetBySource.get("_Tree Location (GPS)_latitude")).toBe(
      "decimalLatitude",
    );
    expect(targetBySource.get("_Tree Location (GPS)_longitude")).toBe(
      "decimalLongitude",
    );
    expect(targetBySource.get("Locality")).toBe("locality");
    expect(targetBySource.get("Common / Vernacular Name")).toBe(
      "vernacularName",
    );
    expect(targetBySource.get("Photo – Whole Tree_URL")).toBeUndefined();
    expect(targetBySource.get("Photo – Leaf_URL")).toBeUndefined();
    expect(targetBySource.get("Photo – Bark_URL")).toBeUndefined();
  });

  test("marks known Kobo metadata skips as expected", () => {
    expect(
      isExpectedSkippedKoboColumn(
        "Tree Location (GPS)",
        DETAILED_LABEL_EXPORT_HEADERS,
      ),
    ).toBe(true);
    expect(
      isExpectedSkippedKoboColumn(
        "_Tree Location (GPS)_altitude",
        DETAILED_LABEL_EXPORT_HEADERS,
      ),
    ).toBe(true);
    expect(
      isExpectedSkippedKoboColumn(
        "Photo – Whole Tree_URL",
        DETAILED_LABEL_EXPORT_HEADERS,
      ),
    ).toBe(true);
    expect(
      isExpectedSkippedKoboColumn("_uuid", DETAILED_LABEL_EXPORT_HEADERS),
    ).toBe(true);
    expect(
      isExpectedSkippedKoboColumn("Locality", DETAILED_LABEL_EXPORT_HEADERS),
    ).toBe(false);
  });
});
