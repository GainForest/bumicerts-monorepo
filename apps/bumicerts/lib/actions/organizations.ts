"use server";

/**
 * Server Actions for Organization Info operations.
 *
 * These actions wrap the mutations package and can be called from client components.
 */

import { mutations } from "@/lib/mutations";

/**
 * Upsert organization info.
 * Creates if absent, fully replaces if present.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function upsertOrganizationInfoAction(input: any) {
  return mutations.organization.info.upsert(input);
}

/**
 * Create organization info.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function createOrganizationInfoAction(input: any) {
  return mutations.organization.info.create(input);
}

/**
 * Update organization info.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function updateOrganizationInfoAction(input: any) {
  return mutations.organization.info.update(input);
}
