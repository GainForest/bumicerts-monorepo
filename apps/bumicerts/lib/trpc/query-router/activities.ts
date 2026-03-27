/**
 * activities query procedure
 *
 * trpc.activities.list(input) — discriminated by input shape:
 *   { did, orgDid }  → { activities, org }        (bumicert detail page)
 *   { did }          → Activity[]                 (my bumicerts)
 *   { limit?, cursor?, labelTier?, hasImage?,
 *     hasOrganizationInfoRecord? }                → { data, pageInfo }  (explore feed)
 */

import { z } from "zod";
import { queryRouter, publicQueryProcedure } from "./init";
import * as activitiesModule from "@/lib/graphql-dev/queries/activities";

export const activitiesRouter = queryRouter({
  list: publicQueryProcedure
    .input(
      z.union([
        // byDidAndOrg — checked first (also has `did`)
        z.object({
          did: z.string().min(1),
          orgDid: z.string().min(1),
        }),
        // byDid
        z.object({
          did: z.string().min(1),
        }),
        // explore list
        z.object({
          limit: z.number().optional(),
          cursor: z.string().optional(),
          labelTier: z.string().optional(),
          hasImage: z.boolean().optional(),
          hasOrganizationInfoRecord: z.boolean().optional(),
        }),
      ])
    )
    .query(({ input }) => activitiesModule.fetch(input)),
});
