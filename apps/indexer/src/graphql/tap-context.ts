/**
 * Tap context singleton.
 *
 * Provides the GraphQL layer access to the TapSync instance
 * without creating circular imports.  Set once from src/index.ts
 * before the GraphQL schema is used.
 */

import type { TapSync } from "@/tap/index.ts";

let _tap: TapSync | null = null;

export function setTapContext(tap: TapSync): void {
  _tap = tap;
}

export function getTapContext(): TapSync {
  if (!_tap) throw new Error("TapSync not initialised");
  return _tap;
}
