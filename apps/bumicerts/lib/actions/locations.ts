"use server";

/**
 * Server Actions for Certified Location operations.
 *
 * These actions wrap the mutations package and can be called from client components.
 */

import { mutations } from "@/lib/mutations";
import type { SerializableFile } from "@gainforest/atproto-mutations-core";

/**
 * Create a new certified location.
 */
export async function createLocationAction(input: {
  name?: string;
  description?: string;
  shapefile: SerializableFile;
  rkey?: string;
}) {
  return mutations.certified.location.create(input);
}

/**
 * Update an existing certified location.
 */
export async function updateLocationAction(input: {
  rkey: string;
  data: {
    name?: string;
    description?: string;
  };
  newShapefile?: SerializableFile;
}) {
  return mutations.certified.location.update(input);
}

/**
 * Upsert a certified location (create or update).
 */
export async function upsertLocationAction(input: {
  name?: string;
  description?: string;
  shapefile: SerializableFile;
  rkey?: string;
}) {
  return mutations.certified.location.upsert(input);
}

/**
 * Delete a certified location.
 */
export async function deleteLocationAction(input: { rkey: string }) {
  return mutations.certified.location.delete(input);
}
