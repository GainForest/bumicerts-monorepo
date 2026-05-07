/**
 * link.evm read procedure
 *
 * trpc.link.evm.list({ did }) → EvmLink[]
 *
 * Slots into the existing `link.evm` namespace alongside the
 * create/update/delete mutations from the package router.
 */

import { z } from "zod";
import { queryRouter, publicQueryProcedure } from "./init";
import * as linkEvmModule from "@/lib/graphql-dev/queries/linkEvm";

export const linkEvmQueryRouter = queryRouter({
  list: publicQueryProcedure
    .input(z.object({ did: z.string().min(1) }))
    .query(({ input }) => linkEvmModule.fetch({ did: input.did })),
});
