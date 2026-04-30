import { builder } from "../../builder.ts";
import { GainforestNS } from "../generated.ts";

/**
 * Temporary compatibility bridge for clients that still query `bumicerts { ... }`
 * while the app-side GraphQL schema snapshot is being migrated.
 *
 * This alias should be removed once Bumicerts regenerates its introspection and
 * switches all GraphQL reads to `gainforest { ... }`.
 */
builder.queryFields((t) => ({
  bumicerts: t.field({
    type: GainforestNS,
    deprecationReason:
      "Temporary compatibility alias during the bumicerts → gainforest GraphQL migration. Use gainforest instead.",
    description:
      "Compatibility alias for GainforestNamespace so older Bumicerts clients keep working during the migration.",
    resolve: () => new GainforestNS(),
  }),
}));
