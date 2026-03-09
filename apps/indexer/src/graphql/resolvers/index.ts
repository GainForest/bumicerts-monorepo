/**
 * Resolver registration entry-point.
 *
 * Import this file (for its side-effects) from schema.ts.
 * Order matters:
 *   1. generated.ts  — registers all standard collection types and query fields
 *   2. custom/       — registers custom overrides that extend generated NS classes
 *   3. stats.ts / tap.ts — independent resolver modules kept as-is
 */

// Auto-generated resolvers (36 standard collections)
import "./generated.ts";

// Custom overrides for the 5 excluded collections
import "./custom/index.ts";

// Independent resolver modules (unchanged)
import "./stats.ts";
import "./tap.ts";
