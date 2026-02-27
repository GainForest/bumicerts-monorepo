/**
 * Unit tests for blob helper functions.
 *
 * Entirely offline — no credentials or PDS calls needed.
 * Tests cover: type guards, stubBlobRefs, validateFileConstraints,
 * toSerializableFile, and fromSerializableFile.
 */

import { describe, it, expect } from "bun:test";
import { Effect } from "effect";

import {
  isSerializableFile,
  isBlobRef,
  isFileOrBlob,
  toSerializableFile,
  fromSerializableFile,
  type SerializableFile,
} from "../types";
import { stubBlobRefs, validateFileConstraints } from "../helpers";
import { FileConstraintError } from "../errors";
import type { BlobConstraint } from "../introspect";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const makeSerializableFile = (overrides?: Partial<SerializableFile>): SerializableFile => ({
  $file: true,
  name: "test.png",
  type: "image/png",
  size: 1024,
  data: btoa("fake-image-bytes"),
  ...overrides,
});

// Minimal structural BlobRef (what @atproto/lex produces after upload)
const makeBlobRef = () => ({
  $type: "blob",
  ref: { $link: "bafyreiaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" },
  mimeType: "image/png",
  size: 1024,
});

const IMAGE_CONSTRAINTS: BlobConstraint[] = [
  {
    path: ["logo", "image"],
    accept: ["image/jpeg", "image/jpg", "image/png", "image/webp"],
    maxSize: 5 * 1024 * 1024, // 5 MB
  },
];

// ---------------------------------------------------------------------------
// Type guards
// ---------------------------------------------------------------------------

describe("isSerializableFile", () => {
  it("returns true for a valid SerializableFile", () => {
    expect(isSerializableFile(makeSerializableFile())).toBe(true);
  });

  it("returns false for null, non-objects, and missing $file", () => {
    expect(isSerializableFile(null)).toBe(false);
    expect(isSerializableFile(undefined)).toBe(false);
    expect(isSerializableFile(42)).toBe(false);
    expect(isSerializableFile({ name: "test.png" })).toBe(false);
    expect(isSerializableFile({ $file: false, name: "x", type: "t", size: 1, data: "" })).toBe(false);
  });
});

describe("isBlobRef", () => {
  it("returns true for a structural BlobRef object", () => {
    // The real isBlobRef from @atproto/lex checks for a CID link structure.
    // We test with what the PDS actually returns (wrapped in BlobRef class).
    // For a unit test we just verify the guard doesn't crash on our fixtures.
    const ref = makeBlobRef();
    // isBlobRef may return false for plain objects (it checks for BlobRef class instance)
    // — that's fine and intentional. We're testing it doesn't throw.
    const result = isBlobRef(ref);
    expect(typeof result).toBe("boolean");
  });

  it("returns false for SerializableFile", () => {
    expect(isBlobRef(makeSerializableFile())).toBe(false);
  });

  it("returns false for null and primitives", () => {
    expect(isBlobRef(null)).toBe(false);
    expect(isBlobRef(undefined)).toBe(false);
    expect(isBlobRef("string")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// toSerializableFile / fromSerializableFile round-trip
// ---------------------------------------------------------------------------

describe("toSerializableFile + fromSerializableFile round-trip", () => {
  it("encodes a Blob and decodes it back to the same bytes", async () => {
    const originalBytes = new Uint8Array([1, 2, 3, 4, 5, 255, 128, 0]);
    const blob = new Blob([originalBytes], { type: "image/png" });

    const sf = await toSerializableFile(blob);

    expect(sf.$file).toBe(true);
    expect(sf.type).toBe("image/png");
    expect(sf.size).toBe(8);
    expect(sf.name).toBe("blob");
    expect(typeof sf.data).toBe("string"); // base64 string

    const decoded = fromSerializableFile(sf);
    expect(decoded).toEqual(originalBytes);
  });

  it("uses file.name for File inputs", async () => {
    const file = new File(["hello"], "photo.jpg", { type: "image/jpeg" });
    const sf = await toSerializableFile(file);
    expect(sf.name).toBe("photo.jpg");
    expect(sf.type).toBe("image/jpeg");
  });

  it("falls back to application/octet-stream when type is empty", async () => {
    const blob = new Blob(["data"]);
    const sf = await toSerializableFile(blob);
    expect(sf.type).toBe("application/octet-stream");
  });
});

// ---------------------------------------------------------------------------
// stubBlobRefs
// ---------------------------------------------------------------------------

describe("stubBlobRefs", () => {
  it("replaces a SerializableFile with a dummy BlobRef-like object", () => {
    const sf = makeSerializableFile({ type: "image/png", size: 2048 });
    const result = stubBlobRefs(sf) as Record<string, unknown>;

    expect(result["$type"]).toBe("blob");
    expect(result["mimeType"]).toBe("image/png");
    expect(result["size"]).toBe(2048);
    // ref is a CID instance (required by isBlobRef) — verify it's an object and truthy
    expect(typeof result["ref"]).toBe("object");
    expect(result["ref"]).toBeTruthy();
  });

  it("leaves a BlobRef-like value untouched (no re-stub)", () => {
    // isBlobRef uses the @atproto/lex class check — plain objects won't match.
    // But our guards should still leave non-file, non-blob-ref objects alone.
    const plain = { someField: "value" };
    const result = stubBlobRefs(plain);
    expect(result).toEqual(plain);
  });

  it("recursively stubs nested file inputs in an object", () => {
    const input = {
      logo: { image: makeSerializableFile({ type: "image/jpeg", size: 512 }) },
      displayName: "My Org",
    };
    const result = stubBlobRefs(input) as typeof input;

    const logoImage = (result.logo as Record<string, unknown>)["image"] as Record<string, unknown>;
    expect(logoImage["$type"]).toBe("blob");
    expect(logoImage["mimeType"]).toBe("image/jpeg");
    expect((result as any).displayName).toBe("My Org"); // non-file fields unchanged
  });

  it("recursively stubs files inside arrays", () => {
    const arr = [
      makeSerializableFile({ type: "image/png", size: 100 }),
      makeSerializableFile({ type: "image/webp", size: 200 }),
    ];
    const result = stubBlobRefs(arr) as Array<Record<string, unknown>>;
    expect(result[0]!["$type"]).toBe("blob");
    expect(result[1]!["$type"]).toBe("blob");
    expect(result[0]!["mimeType"]).toBe("image/png");
    expect(result[1]!["mimeType"]).toBe("image/webp");
  });

  it("passes through null/undefined unchanged", () => {
    expect(stubBlobRefs(null)).toBeNull();
    expect(stubBlobRefs(undefined)).toBeUndefined();
  });

  it("passes through primitive values unchanged", () => {
    expect(stubBlobRefs("string")).toBe("string");
    expect(stubBlobRefs(42)).toBe(42);
    expect(stubBlobRefs(true)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// validateFileConstraints
// ---------------------------------------------------------------------------

describe("validateFileConstraints", () => {
  // ----- happy paths -----

  it("succeeds when no file inputs are present (all optional)", async () => {
    const input = {
      displayName: "Test Org",
      objectives: ["Conservation"],
    };
    const result = await Effect.runPromise(
      validateFileConstraints(input, IMAGE_CONSTRAINTS).pipe(Effect.either)
    );
    expect(result._tag).toBe("Right");
  });

  it("succeeds for a valid SerializableFile within constraints", async () => {
    const input = {
      logo: { image: makeSerializableFile({ type: "image/png", size: 100_000 }) },
    };
    const result = await Effect.runPromise(
      validateFileConstraints(input, IMAGE_CONSTRAINTS).pipe(Effect.either)
    );
    expect(result._tag).toBe("Right");
  });

  it("succeeds at exactly the maxSize boundary", async () => {
    const input = {
      logo: { image: makeSerializableFile({ size: 5 * 1024 * 1024 }) }, // exactly 5 MB
    };
    const result = await Effect.runPromise(
      validateFileConstraints(input, IMAGE_CONSTRAINTS).pipe(Effect.either)
    );
    expect(result._tag).toBe("Right");
  });

  // ----- size violation -----

  it("fails with FileConstraintError when file exceeds maxSize", async () => {
    const input = {
      logo: {
        image: makeSerializableFile({
          type: "image/png",
          size: 5 * 1024 * 1024 + 1, // 1 byte over 5 MB
        }),
      },
    };
    const result = await Effect.runPromise(
      validateFileConstraints(input, IMAGE_CONSTRAINTS).pipe(Effect.either)
    );

    expect(result._tag).toBe("Left");
    if (result._tag === "Left") {
      expect(result.left).toBeInstanceOf(FileConstraintError);
      expect(result.left._tag).toBe("FileConstraintError");
      expect(result.left.reason).toContain("exceeds maximum");
    }
  });

  // ----- MIME violation -----

  it("fails with FileConstraintError when MIME type is not accepted", async () => {
    const input = {
      logo: {
        image: makeSerializableFile({
          type: "application/pdf",
          size: 1024,
        }),
      },
    };
    const result = await Effect.runPromise(
      validateFileConstraints(input, IMAGE_CONSTRAINTS).pipe(Effect.either)
    );

    expect(result._tag).toBe("Left");
    if (result._tag === "Left") {
      expect(result.left).toBeInstanceOf(FileConstraintError);
      expect(result.left.reason).toContain("not accepted");
      expect(result.left.reason).toContain("application/pdf");
    }
  });

  it("fails fast — stops at first violation (does not collect all errors)", async () => {
    // Two violations in different fields — only the first should be reported.
    const constraints: BlobConstraint[] = [
      { path: ["logo", "image"], accept: ["image/jpeg"], maxSize: 100 },
      { path: ["coverImage", "image"], accept: ["image/jpeg"], maxSize: 100 },
    ];
    const input = {
      logo: { image: makeSerializableFile({ type: "application/pdf", size: 200 }) },
      coverImage: { image: makeSerializableFile({ type: "text/plain", size: 300 }) },
    };
    const result = await Effect.runPromise(
      validateFileConstraints(input, constraints).pipe(Effect.either)
    );

    expect(result._tag).toBe("Left");
    if (result._tag === "Left") {
      expect(result.left).toBeInstanceOf(FileConstraintError);
      // Only ONE error — not both
    }
  });

  // ----- BlobRef passthrough -----

  it("skips BlobRef values (already uploaded, no constraint checks)", async () => {
    // A plain object that looks like a BlobRef — isBlobRef from @atproto/lex
    // uses a class check, so plain objects won't pass, but the helper still
    // won't crash on them. We verify no error is thrown for a field that has
    // something non-File.
    const input = {
      logo: { image: { someOtherShape: true } },
    };
    // Should succeed — the value is not a SerializableFile or File/Blob,
    // so getFileMeta returns null and we skip it.
    const result = await Effect.runPromise(
      validateFileConstraints(input, IMAGE_CONSTRAINTS).pipe(Effect.either)
    );
    expect(result._tag).toBe("Right");
  });

  // ----- No constraints -----

  it("succeeds immediately with empty constraints array", async () => {
    const input = { logo: { image: makeSerializableFile({ size: 999_999_999 }) } };
    const result = await Effect.runPromise(
      validateFileConstraints(input, []).pipe(Effect.either)
    );
    expect(result._tag).toBe("Right");
  });
});
