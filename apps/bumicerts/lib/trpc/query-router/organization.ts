/**
 * organization query procedures
 *
 * trpc.organization.info({ did })          → { org, activities }
 * trpc.organization.list({ limit?, cursor? }) → { data, pageInfo }
 * trpc.organization.logo({ did })          → string | null
 */

import { z } from "zod";
import { queryRouter, publicQueryProcedure } from "./init";
import * as orgModule from "@/lib/graphql-dev/queries/organization";
import * as logoModule from "@/lib/graphql-dev/queries/organization/logo";

export const organizationRouter = queryRouter({
  /** Fetch a single org by DID — returns { org, activities } */
  byDid: publicQueryProcedure
    .input(z.object({ did: z.string().min(1) }))
    .query(({ input }) => orgModule.fetch({ did: input.did })),

  /** Paginated list of all orgs */
  list: publicQueryProcedure
    .input(
      z.object({
        limit: z.number().optional(),
        cursor: z.string().optional(),
      })
    )
    .query(({ input }) => orgModule.fetch({ limit: input.limit, cursor: input.cursor })),

  /** Logo URI only (lightweight) */
  logo: publicQueryProcedure
    .input(z.object({ did: z.string().min(1) }))
    .query(({ input }) => logoModule.fetch({ did: input.did })),
});
