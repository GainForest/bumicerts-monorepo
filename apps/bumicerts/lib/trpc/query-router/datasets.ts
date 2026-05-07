/**
 * datasets query procedure
 *
 * trpc.datasets.list({ did }) → DatasetItem[]
 */

import { z } from "zod";
import { queryRouter, publicQueryProcedure } from "./init";
import * as datasetsModule from "@/lib/graphql-dev/queries/datasets";

export const datasetsRouter = queryRouter({
  list: publicQueryProcedure
    .input(z.object({ did: z.string().min(1) }))
    .query(({ input }) => datasetsModule.fetch({ did: input.did })),
});
