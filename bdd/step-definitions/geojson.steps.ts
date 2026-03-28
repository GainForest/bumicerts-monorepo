import { Given, When, Then } from "@cucumber/cucumber";
import { Effect } from "effect";
import { strict as assert } from "node:assert";
import type { AtprotoWorld } from "../support/world";

// ---------------------------------------------------------------------------
// Imports from the mutations-core package
// ---------------------------------------------------------------------------
import { validateGeojsonOrThrow } from "../../packages/atproto-mutations-core/src/geojson/validate";
import * as computations from "../../packages/atproto-mutations-core/src/geojson/computations";

// ---------------------------------------------------------------------------
// Shared GeoJSON fixtures
// ---------------------------------------------------------------------------
const VALID_POLYGON_GEOJSON = JSON.stringify({
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [-73.935242, 40.73061],
            [-73.935242, 40.74061],
            [-73.925242, 40.74061],
            [-73.925242, 40.73061],
            [-73.935242, 40.73061],
          ],
        ],
      },
      properties: {},
    },
  ],
});

function makeSerializableFile(
  content: string,
  opts?: { type?: string; size?: number }
) {
  return {
    $file: true as const,
    name: "test.geojson",
    type: opts?.type ?? "application/geo+json",
    size: opts?.size ?? content.length,
    data: btoa(content),
  };
}

// ---------------------------------------------------------------------------
// Given
// ---------------------------------------------------------------------------

Given(
  "a GeoJSON file with MIME type {string}",
  function (this: AtprotoWorld, mimeType: string) {
    this.geojsonContent = VALID_POLYGON_GEOJSON;
    this.geojsonFile = makeSerializableFile(VALID_POLYGON_GEOJSON, {
      type: mimeType,
    });
  }
);

Given(
  "a valid polygon GeoJSON file",
  function (this: AtprotoWorld) {
    this.geojsonContent = VALID_POLYGON_GEOJSON;
    this.geojsonFile = makeSerializableFile(VALID_POLYGON_GEOJSON);
  }
);

Given(
  "a GeoJSON file that is {int} bytes",
  function (this: AtprotoWorld, size: number) {
    this.geojsonContent = VALID_POLYGON_GEOJSON;
    this.geojsonFile = makeSerializableFile(VALID_POLYGON_GEOJSON, { size });
  }
);

Given(
  "a GeoJSON file with content {string}",
  function (this: AtprotoWorld, content: string) {
    // Handle single-quoted JSON passed from Gherkin
    this.geojsonContent = content;
    this.geojsonFile = makeSerializableFile(content);
  }
);

Given(
  "a GeoJSON file containing only a point geometry at coordinates [{float}, {float}]",
  function (this: AtprotoWorld, lng: number, lat: number) {
    const pointGeoJson = JSON.stringify({
      type: "Feature",
      geometry: { type: "Point", coordinates: [lng, lat] },
      properties: {},
    });
    this.geojsonContent = pointGeoJson;
    this.geojsonFile = makeSerializableFile(pointGeoJson);
  }
);

Given(
  "a GeoJSON file containing a valid polygon",
  function (this: AtprotoWorld) {
    this.geojsonContent = VALID_POLYGON_GEOJSON;
    this.geojsonFile = makeSerializableFile(VALID_POLYGON_GEOJSON);
  }
);

// ---------------------------------------------------------------------------
// When
// ---------------------------------------------------------------------------

When(
  "I validate the GeoJSON file",
  function (this: AtprotoWorld) {
    try {
      const parsed = JSON.parse(this.geojsonContent);
      validateGeojsonOrThrow(parsed);
      this.storedValues.set("validationPassed", true);
    } catch (error) {
      this.mutationError = error;
      this.storedValues.set("validationPassed", false);
    }
  }
);

When(
  "I validate the file size against the 10 MB limit",
  function (this: AtprotoWorld) {
    const MAX = 10 * 1024 * 1024;
    const accepted = this.geojsonFile.size <= MAX;
    this.storedValues.set("fileSizeAccepted", accepted);
  }
);

When(
  "I validate the GeoJSON structure",
  function (this: AtprotoWorld) {
    try {
      const parsed = JSON.parse(this.geojsonContent);
      validateGeojsonOrThrow(parsed);
      const fc = computations.toFeatureCollection(parsed);
      const polygons = computations.extractPolygonFeatures(fc);
      if (polygons.length > 0) {
        const metrics = computations.computePolygonMetrics(polygons[0]!);
        this.storedValues.set("polygonMetrics", metrics);
      }
      this.storedValues.set("validationPassed", true);
    } catch (error) {
      this.mutationError = error;
      this.storedValues.set("validationPassed", false);
    }
  }
);

// ---------------------------------------------------------------------------
// Then
// ---------------------------------------------------------------------------

Then(
  "the validation should pass",
  function (this: AtprotoWorld) {
    assert.strictEqual(
      this.storedValues.get("validationPassed"),
      true,
      `Expected validation to pass but it failed: ${this.mutationError?.message ?? "unknown"}`
    );
  }
);

Then(
  "the file size should be accepted",
  function (this: AtprotoWorld) {
    assert.strictEqual(
      this.storedValues.get("fileSizeAccepted"),
      true,
      "Expected file size to be accepted"
    );
  }
);

Then(
  "the polygon metrics should be computed",
  function (this: AtprotoWorld) {
    const metrics = this.storedValues.get("polygonMetrics");
    assert.ok(metrics, "Expected polygon metrics to be computed");
    assert.ok(
      typeof metrics.areaSqMeters === "number",
      "Expected areaSqMeters to be a number"
    );
  }
);
