/**
 * Unit tests for extractBlobConstraints and mimeMatches.
 *
 * These tests are entirely offline — no credentials or PDS calls needed.
 * They verify that our schema-walking logic correctly discovers blob fields
 * from the real generated @atproto/lex validator objects.
 */

import { describe, it, expect } from "bun:test";
import { extractBlobConstraints, mimeMatches } from "../introspect";

// ---------------------------------------------------------------------------
// Real schemas from the generated package
// ---------------------------------------------------------------------------

// organization.info's record schema — contains optional coverImage and logo
// fields, each of type SmallImage which wraps a blob.
import { main as orgInfoMain } from "@gainforest/generated/app/gainforest/organization/info.defs";

// SmallImage schema directly — single blob field named "image"
import { smallImage } from "@gainforest/generated/org/hypercerts/defs.defs";

// ---------------------------------------------------------------------------
// extractBlobConstraints — from SmallImage
// ---------------------------------------------------------------------------

describe("extractBlobConstraints — smallImage schema", () => {
  it("finds the 'image' blob field with correct constraints", () => {
    const constraints = extractBlobConstraints(smallImage);

    // SmallImage has exactly one blob field: image
    const imageConstraint = constraints.find((c) => c.path.at(-1) === "image");
    expect(imageConstraint).toBeDefined();
    expect(imageConstraint!.accept).toEqual(
      expect.arrayContaining(["image/jpeg", "image/jpg", "image/png", "image/webp"])
    );
    expect(imageConstraint!.maxSize).toBe(5 * 1024 * 1024); // 5 MB
  });

  it("returns exactly one constraint for SmallImage", () => {
    const constraints = extractBlobConstraints(smallImage);
    expect(constraints).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// extractBlobConstraints — from organization.info record schema
// ---------------------------------------------------------------------------

describe("extractBlobConstraints — organization.info record schema", () => {
  it("finds both coverImage.image and logo.image blob fields", () => {
    const constraints = extractBlobConstraints(orgInfoMain);

    // We expect at least two blob constraints — one for each SmallImage field
    expect(constraints.length).toBeGreaterThanOrEqual(2);

    const paths = constraints.map((c) => c.path.join("."));
    // Both optional SmallImage fields should be discovered
    expect(paths.some((p) => p.includes("coverImage") && p.includes("image"))).toBe(true);
    expect(paths.some((p) => p.includes("logo") && p.includes("image"))).toBe(true);
  });

  it("each blob constraint has expected image MIME types", () => {
    const constraints = extractBlobConstraints(orgInfoMain);
    for (const c of constraints) {
      // All blob fields in organization.info are SmallImage — image types only
      expect(c.accept).toBeDefined();
      expect(c.accept).toEqual(
        expect.arrayContaining(["image/jpeg", "image/png"])
      );
    }
  });

  it("each blob constraint has a maxSize of 5MB", () => {
    const constraints = extractBlobConstraints(orgInfoMain);
    for (const c of constraints) {
      expect(c.maxSize).toBe(5 * 1024 * 1024);
    }
  });

  it("path arrays are non-empty and string-typed", () => {
    const constraints = extractBlobConstraints(orgInfoMain);
    for (const c of constraints) {
      expect(c.path).toBeArray();
      expect(c.path.length).toBeGreaterThan(0);
      for (const segment of c.path) {
        expect(typeof segment).toBe("string");
      }
    }
  });
});

// ---------------------------------------------------------------------------
// extractBlobConstraints — edge cases
// ---------------------------------------------------------------------------

import { l } from "@atproto/lex";

describe("extractBlobConstraints — edge cases", () => {
  it("returns empty array for a non-blob primitive schema", () => {
    // l.string() — no blob fields
    const strSchema = l.string();
    const constraints = extractBlobConstraints(strSchema as any);
    expect(constraints).toEqual([]);
  });

  it("does not infinite-loop on circular ref graphs", () => {
    // The organization.info schema contains refs that eventually resolve
    // to typed objects — if our seen-set guard is broken this would hang.
    expect(() => extractBlobConstraints(orgInfoMain)).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// mimeMatches
// ---------------------------------------------------------------------------

describe("mimeMatches", () => {
  it("*/* accepts any MIME type", () => {
    expect(mimeMatches("image/jpeg", "*/*")).toBe(true);
    expect(mimeMatches("application/json", "*/*")).toBe(true);
    expect(mimeMatches("video/mp4", "*/*")).toBe(true);
  });

  it("image/* accepts all image subtypes", () => {
    expect(mimeMatches("image/jpeg", "image/*")).toBe(true);
    expect(mimeMatches("image/png", "image/*")).toBe(true);
    expect(mimeMatches("image/webp", "image/*")).toBe(true);
    expect(mimeMatches("video/mp4", "image/*")).toBe(false);
    expect(mimeMatches("application/octet-stream", "image/*")).toBe(false);
  });

  it("exact match works correctly", () => {
    expect(mimeMatches("image/jpeg", "image/jpeg")).toBe(true);
    expect(mimeMatches("image/png", "image/jpeg")).toBe(false);
    expect(mimeMatches("image/JPEG", "image/jpeg")).toBe(false); // case-sensitive
  });

  it("video/* does not match audio types", () => {
    expect(mimeMatches("audio/mpeg", "video/*")).toBe(false);
    expect(mimeMatches("video/mp4", "video/*")).toBe(true);
  });
});
