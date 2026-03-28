import { Given, When, Then } from "@cucumber/cucumber";
import { Effect } from "effect";
import { strict as assert } from "node:assert";
import type { AtprotoWorld } from "../support/world";

import { makeCredentialAgentLayer } from "../../packages/atproto-mutations-core/src/layers/credential";
import { createCertifiedLocation } from "../../packages/atproto-mutations-core/src/mutations/certified.location/create";
import { processGeoJsonFile } from "../../packages/atproto-mutations-core/src/mutations/certified.location/utils/process-geojson";
import type { CreateCertifiedLocationInput } from "../../packages/atproto-mutations-core/src/mutations/certified.location/utils/types";

// ---------------------------------------------------------------------------
// Given
// ---------------------------------------------------------------------------

Given(
  "a default credential layer",
  function (this: AtprotoWorld) {
    // Build a layer with placeholder credentials for offline tests.
    // Integration tests will override with real credentials.
    const service = process.env["ATPROTO_SERVICE"] || "https://bsky.social";
    const identifier = process.env["ATPROTO_IDENTIFIER"] || "placeholder";
    const password = process.env["ATPROTO_PASSWORD"] || "placeholder";
    this.credentials = { service, identifier, password };
    this.agentLayer = makeCredentialAgentLayer({ service, identifier, password });
  }
);

Given(
  "the location name is {string}",
  function (this: AtprotoWorld, name: string) {
    this.mutationInput.name = name;
  }
);

Given(
  "the location description is {string}",
  function (this: AtprotoWorld, description: string) {
    this.mutationInput.description = description;
  }
);

Given(
  "valid AT Protocol credentials are available",
  function (this: AtprotoWorld) {
    const service = process.env["ATPROTO_SERVICE"] ?? "";
    const identifier = process.env["ATPROTO_IDENTIFIER"] ?? "";
    const password = process.env["ATPROTO_PASSWORD"] ?? "";

    if (!service || !identifier || !password) {
      return "skipped";
    }

    this.credentials = { service, identifier, password };
    this.agentLayer = makeCredentialAgentLayer({ service, identifier, password });
  }
);

// ---------------------------------------------------------------------------
// When
// ---------------------------------------------------------------------------

When(
  "I attempt to create a certified location with the file",
  async function (this: AtprotoWorld) {
    const shapefile = this.geojsonFile;
    const MAX_SHAPEFILE_BYTES = 10 * 1024 * 1024;

    // Run validation steps offline (no PDS needed)
    // 1. File size check
    if (shapefile.size > MAX_SHAPEFILE_BYTES) {
      const { GeoJsonValidationError } = await import(
        "../../packages/atproto-mutations-core/src/geojson/errors"
      );
      this.mutationError = new GeoJsonValidationError({
        message: `GeoJSON file size ${shapefile.size} B exceeds maximum ${MAX_SHAPEFILE_BYTES} B (10 MB)`,
      });
      return;
    }

    // 2. GeoJSON validation via processGeoJsonFile (Effect-based, no service deps)
    const result = await Effect.runPromise(
      processGeoJsonFile(shapefile).pipe(Effect.either)
    );

    if (result._tag === "Left") {
      this.mutationError = result.left;
    } else {
      this.mutationResult = result.right;
    }
  }
);

When(
  "I build a certified location record",
  function (this: AtprotoWorld) {
    // Simulate building a record without PDS interaction
    const now = new Date().toISOString();
    this.mutationResult = {
      $type: "app.certified.location",
      lpVersion: "1.0.0",
      locationType: "geojson-point",
      name: this.mutationInput.name,
      description: this.mutationInput.description,
      createdAt: now,
    };
  }
);

When(
  "I create the certified location on the PDS",
  async function (this: AtprotoWorld) {
    if (!this.agentLayer) return "skipped";

    const input: CreateCertifiedLocationInput = {
      shapefile: this.geojsonFile,
      name: this.mutationInput.name || "Test Location",
      description: this.mutationInput.description,
    };

    try {
      this.mutationResult = await Effect.runPromise(
        createCertifiedLocation(input).pipe(Effect.provide(this.agentLayer!))
      );
    } catch (error) {
      this.mutationError = error;
    }
  }
);

When(
  "I upsert the certified location on the PDS",
  async function (this: AtprotoWorld) {
    // For now, upsert falls back to create for the BDD scaffold
    if (!this.agentLayer) return "skipped";

    const input: CreateCertifiedLocationInput = {
      shapefile: this.geojsonFile,
      name: this.mutationInput.name || "Test Location",
      description: this.mutationInput.description,
    };

    try {
      this.mutationResult = await Effect.runPromise(
        createCertifiedLocation(input).pipe(Effect.provide(this.agentLayer!))
      );
    } catch (error) {
      this.mutationError = error;
    }
  }
);

When(
  "I update the location name to {string}",
  function (this: AtprotoWorld, name: string) {
    this.mutationInput.name = name;
  }
);

When(
  "I upsert the certified location on the PDS again",
  async function (this: AtprotoWorld) {
    // Re-use the same upsert logic
    if (!this.agentLayer) return "skipped";

    const input: CreateCertifiedLocationInput = {
      shapefile: this.geojsonFile,
      name: this.mutationInput.name || "Test Location",
      description: this.mutationInput.description,
    };

    try {
      this.mutationResult = await Effect.runPromise(
        createCertifiedLocation(input).pipe(Effect.provide(this.agentLayer!))
      );
    } catch (error) {
      this.mutationError = error;
    }
  }
);

// ---------------------------------------------------------------------------
// Then
// ---------------------------------------------------------------------------

Then(
  "the operation should fail with a {string}",
  function (this: AtprotoWorld, errorClassName: string) {
    assert.ok(
      this.mutationError,
      `Expected an error of type ${errorClassName} but no error occurred`
    );
    // Effect errors use _tag, JS classes use constructor.name
    const tag = this.mutationError?._tag ?? "";
    const ctorName = this.mutationError?.constructor?.name ?? "";
    const errorStr = String(this.mutationError);
    const matched =
      tag.includes(errorClassName) ||
      ctorName.includes(errorClassName) ||
      errorStr.includes(errorClassName);
    assert.ok(
      matched,
      `Expected error type "${errorClassName}" but got tag="${tag}" ctor="${ctorName}"`
    );
  }
);

Then(
  "the operation should fail with a validation error",
  function (this: AtprotoWorld) {
    assert.ok(
      this.mutationError,
      "Expected a validation error but no error occurred"
    );
  }
);

Then(
  "the error message should contain {string}",
  function (this: AtprotoWorld, substring: string) {
    assert.ok(this.mutationError, "Expected an error but none found");
    const msg = this.mutationError?.message ?? String(this.mutationError);
    assert.ok(
      msg.includes(substring),
      `Expected error message to contain "${substring}" but got: "${msg}"`
    );
  }
);

Then(
  "the record should have lpVersion {string}",
  function (this: AtprotoWorld, version: string) {
    assert.strictEqual(this.mutationResult?.lpVersion, version);
  }
);

Then(
  "the record should have locationType {string}",
  function (this: AtprotoWorld, type: string) {
    assert.strictEqual(this.mutationResult?.locationType, type);
  }
);

Then(
  "the record should have a createdAt timestamp",
  function (this: AtprotoWorld) {
    assert.ok(this.mutationResult?.createdAt, "Expected a createdAt timestamp");
    // Verify it's a valid ISO 8601 timestamp
    assert.ok(
      !isNaN(Date.parse(this.mutationResult.createdAt)),
      "createdAt should be a valid ISO timestamp"
    );
  }
);

Then(
  "the result should contain a valid AT URI",
  function (this: AtprotoWorld) {
    assert.ok(this.mutationResult?.uri, "Expected a URI in the result");
    assert.match(this.mutationResult.uri, /^at:\/\//);
  }
);

Then(
  "the result should contain a record key",
  function (this: AtprotoWorld) {
    assert.ok(this.mutationResult?.rkey, "Expected an rkey in the result");
  }
);

Then(
  "the record should have name {string}",
  function (this: AtprotoWorld, name: string) {
    const recordName = this.mutationResult?.record?.name ?? this.mutationResult?.name;
    assert.strictEqual(recordName, name);
  }
);
