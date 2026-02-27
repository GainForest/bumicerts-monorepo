import type { Validator } from "@atproto/lex";

// ---------------------------------------------------------------------------
// BlobConstraint — what we extract per blob field in the schema
// ---------------------------------------------------------------------------

export type BlobConstraint = {
  /** Field path from the record root, e.g. ["coverImage", "image"] */
  path: string[];
  /** Accepted MIME types, e.g. ["image/jpeg", "image/png"]. Absent = accept all. */
  accept?: string[];
  /** Maximum file size in bytes. Absent = no limit enforced. */
  maxSize?: number;
};

// ---------------------------------------------------------------------------
// extractBlobConstraints — recursive schema walker
// ---------------------------------------------------------------------------

/**
 * Walk any @atproto/lex Validator tree and collect the constraints for every
 * blob field found anywhere in the schema.
 *
 * The results are used by `validateFileConstraints` to enforce size and MIME
 * rules before a blob is uploaded. Call this once at module load time and
 * cache the result — it is O(schema-size) and allocation-free after that.
 *
 * Supported schema node types:
 *   - blob / typedBlob       — leaf: emit a BlobConstraint
 *   - object / typedObject   — walk shape map
 *   - optional / nullable / withDefault — unwrap and recurse
 *   - ref / typedRef         — follow the lazy getter
 *   - array                  — recurse into elements, adding a "[]" path segment
 *   - record                 — unwrap the inner object schema
 *   - union / intersection / discriminatedUnion — walk all branches
 *
 * The `_ancestors` set tracks nodes currently on the call stack to prevent
 * infinite recursion from circular ref graphs. It is deliberately NOT a global
 * deduplication set — the same schema node (e.g. SmallImage) legitimately
 * appears in multiple positions (logo, coverImage) and must be visited once
 * per unique path.
 */
export function extractBlobConstraints(
  validator: Validator,
  path: string[] = [],
  _ancestors = new Set<unknown>()
): BlobConstraint[] {
  const results: BlobConstraint[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const v = validator as any;

  // Guard against infinite recursion (cycles in the ref graph only)
  if (_ancestors.has(v)) return results;
  _ancestors.add(v);

  switch (v.type) {
    // -----------------------------------------------------------------------
    // Leaf: blob field — emit constraints
    // -----------------------------------------------------------------------
    case "blob":
    case "typedBlob": {
      results.push({
        path,
        accept: v.options?.accept as string[] | undefined,
        maxSize: v.options?.maxSize as number | undefined,
      });
      break;
    }

    // -----------------------------------------------------------------------
    // Object: walk every key in the shape map
    // -----------------------------------------------------------------------
    case "object": {
      if (v.shape && typeof v.shape === "object") {
        for (const [key, child] of Object.entries(v.shape as Record<string, Validator>)) {
          // Each key gets a fresh ancestors clone so sibling keys don't block each other
          results.push(...extractBlobConstraints(child, [...path, key], new Set(_ancestors)));
        }
      }
      break;
    }

    // TypedObject wraps an inner ObjectSchema in `.schema` (not `.shape` directly)
    case "typedObject": {
      if (v.schema) {
        results.push(...extractBlobConstraints(v.schema as Validator, path, new Set(_ancestors)));
      }
      break;
    }

    // -----------------------------------------------------------------------
    // Wrappers: unwrap and recurse at the same path
    // -----------------------------------------------------------------------
    case "optional":
    case "nullable":
    case "withDefault": {
      if (v.validator) {
        results.push(...extractBlobConstraints(v.validator as Validator, path, new Set(_ancestors)));
      }
      break;
    }

    // -----------------------------------------------------------------------
    // Ref: follow the lazy getter (may point to a typedObject / object)
    // -----------------------------------------------------------------------
    case "ref":
    case "typedRef": {
      // The getter may throw if the schema hasn't been linked yet — guard it.
      try {
        const inner = v.validator as Validator | undefined;
        if (inner) {
          results.push(...extractBlobConstraints(inner, path, new Set(_ancestors)));
        }
      } catch {
        // Unlinked ref — skip
      }
      break;
    }

    // -----------------------------------------------------------------------
    // Array: recurse into elements, adding a "[]" path segment
    // -----------------------------------------------------------------------
    case "array": {
      if (v.elementSchema) {
        results.push(
          ...extractBlobConstraints(v.elementSchema as Validator, [...path, "[]"], new Set(_ancestors))
        );
      }
      break;
    }

    // -----------------------------------------------------------------------
    // Record: unwrap the inner object schema
    // -----------------------------------------------------------------------
    case "record": {
      if (v.schema) {
        results.push(...extractBlobConstraints(v.schema as Validator, path, new Set(_ancestors)));
      }
      break;
    }

    // -----------------------------------------------------------------------
    // Multi-branch: walk all members
    // typedUnion stores branches under `.validators`; other union types use
    // `.schemas` or `.members` depending on the lex-schema version.
    // -----------------------------------------------------------------------
    case "typedUnion":
    case "intersection":
    case "union":
    case "discriminatedUnion": {
      const branches: Validator[] = (v.validators ?? v.schemas ?? v.members ?? []) as Validator[];
      for (const branch of branches) {
        results.push(...extractBlobConstraints(branch, path, new Set(_ancestors)));
      }
      break;
    }

    // Unknown / primitive types — nothing to walk
    default:
      break;
  }

  return results;
}

// ---------------------------------------------------------------------------
// mimeMatches — wildcard-aware MIME comparison
// ---------------------------------------------------------------------------

/**
 * Returns true if `mime` satisfies the accept `pattern`.
 *
 * Patterns follow the standard media-type wildcard syntax:
 *   "*\/*"        — accept anything
 *   "image\/*"    — accept any image subtype
 *   "image/jpeg"  — accept exactly image/jpeg
 */
export function mimeMatches(mime: string, pattern: string): boolean {
  if (pattern === "*/*") return true;
  if (pattern.endsWith("/*")) return mime.startsWith(pattern.slice(0, -1));
  return mime === pattern;
}
