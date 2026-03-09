/**
 * Assembles the complete GraphQL schema.
 *
 * Import order matters: types must be defined on the builder before
 * the schema is built.  We import the resolver files for their
 * side-effects (they call builder.queryFields internally).
 */

import { builder } from "./builder.ts";

// Register all types and resolvers on the builder
import "./types.ts";
import "./resolvers/index.ts";

// Root Query type (required by Pothos)
builder.queryType({
  description: "GainForest AT Protocol record index.",
});

// Build and export the executable schema
export const schema = builder.toSchema();
