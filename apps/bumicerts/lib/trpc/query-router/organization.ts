/**
 * organization query procedures
 *
 * trpc.organization.defaultSite({ did })   → string | null
 */

import { z } from "zod";
import { queryRouter, publicQueryProcedure } from "./init";
import * as defaultSiteModule from "@/lib/graphql-dev/queries/organization/default-site";

export const organizationRouter = queryRouter({
  /** Default site AT-URI for a DID */
  defaultSite: publicQueryProcedure
    .input(z.object({ did: z.string().min(1) }))
    .query(({ input }) => defaultSiteModule.fetch({ did: input.did })),
});
