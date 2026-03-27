/**
 * locations query procedure
 *
 * trpc.locations.list({ did })          → CertifiedLocation[]  (all for DID)
 * trpc.locations.list({ did, rkey })    → CertifiedLocation[]  (single by did+rkey)
 */

import { z } from "zod";
import { queryRouter, publicQueryProcedure } from "./init";
import * as locationsModule from "@/lib/graphql-dev/queries/locations";

export const locationsRouter = queryRouter({
  list: publicQueryProcedure
    .input(
      z.object({
        did: z.string().min(1),
        rkey: z.string().optional(),
      })
    )
    .query(({ input }) => {
      if (input.rkey) {
        return locationsModule.fetch({ did: input.did, rkey: input.rkey });
      }
      return locationsModule.fetch({ did: input.did });
    }),
});
