/**
 * claim.activity read procedure
 *
 * trpc.claim.activity.get({ id }) → CartBumicertItem | null
 *
 * id format: "{ownerDid}-{rkey}"
 *
 * Slots into the existing `claim.activity` namespace alongside the
 * create/update/upsert/delete mutations from the package router.
 */

import { z } from "zod";
import { queryRouter, publicQueryProcedure } from "./init";
import * as cartBumicertModule from "@/graphql/indexer/queries/cartBumicert";

export const claimQueryRouter = queryRouter({
  activity: queryRouter({
    get: publicQueryProcedure
      .input(z.object({ id: z.string().min(1) }))
      .query(({ input }) => cartBumicertModule.fetch({ id: input.id })),
  }),
});
