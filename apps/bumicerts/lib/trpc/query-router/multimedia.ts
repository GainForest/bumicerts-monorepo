/**
 * multimedia query procedure
 *
 * trpc.multimedia.list({ did }) → MultimediaItem[]
 */

import { z } from "zod";
import { queryRouter, publicQueryProcedure } from "./init";
import * as multimediaModule from "@/lib/graphql-dev/queries/multimedia";

export const multimediaRouter = queryRouter({
  list: publicQueryProcedure
    .input(z.object({ did: z.string().min(1) }))
    .query(({ input }) => multimediaModule.fetch({ did: input.did })),
});
