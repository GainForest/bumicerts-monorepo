"use server";

/**
 * Server Actions for Bumicert (claim.activity) operations.
 *
 * These actions wrap the mutations package and can be called from client components.
 */

import { mutations } from "@/lib/mutations";
import type { CreateClaimActivityInput } from "@gainforest/atproto-mutations-core";

/**
 * Create a new bumicert (claim.activity record).
 */
export async function createBumicertAction(input: CreateClaimActivityInput) {
  return mutations.claim.activity.create(input);
}
