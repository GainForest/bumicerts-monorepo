/**
 * Pothos SchemaBuilder — central configuration for the GraphQL schema.
 *
 * We use only @pothos/core and @pothos/plugin-simple-objects.
 * simple-objects lets us define plain data-shape types without
 * needing to wire up loaders, which is perfect for our thin
 * pass-through API over the DB query layer.
 */

import SchemaBuilder from "@pothos/core";
import SimpleObjectsPlugin from "@pothos/plugin-simple-objects";

export const builder = new SchemaBuilder<{
  Scalars: {
    /** ISO-8601 date-time string */
    DateTime: { Input: string; Output: string };
    /** Arbitrary JSON value (record JSONB content) */
    JSON: { Input: unknown; Output: unknown };
  };
}>({
  plugins: [SimpleObjectsPlugin],
});

// ---------------------------------------------------------------
// Custom scalars
// ---------------------------------------------------------------

builder.scalarType("DateTime", {
  description: "ISO-8601 date-time string (e.g. 2024-01-15T12:00:00.000Z)",
  serialize: (value) => {
    const v = value as unknown;
    if (v instanceof Date) return v.toISOString();
    if (typeof v === "string") return v;
    throw new Error(`DateTime cannot serialize value: ${String(v)}`);
  },
  parseValue: (value) => {
    if (typeof value !== "string") throw new Error("DateTime must be a string");
    return value;
  },
});

builder.scalarType("JSON", {
  description: "Arbitrary JSON value",
  serialize: (value) => value,
  parseValue: (value) => value,
});

// ---------------------------------------------------------------
// Enums
// ---------------------------------------------------------------

/**
 * Sort direction for paginated collection queries.
 */
export const SortOrderEnum = builder.enumType("SortOrder", {
  description: "Sort direction for paginated queries.",
  values: {
    DESC: { value: "desc", description: "Newest / largest first (default)" },
    ASC:  { value: "asc",  description: "Oldest / smallest first" },
  } as const,
});

/**
 * Field to sort by.
 */
export const SortFieldEnum = builder.enumType("SortField", {
  description: "Which timestamp field to sort and paginate on.",
  values: {
    CREATED_AT: { value: "createdAt",  description: "Sort by record creation timestamp (default)" },
    INDEXED_AT: { value: "indexedAt",  description: "Sort by when the indexer stored the record" },
  } as const,
});
