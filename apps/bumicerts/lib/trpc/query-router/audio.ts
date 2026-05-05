/**
 * audio query procedure
 *
 * trpc.audio.list({ did }) → AudioRecordingItem[]
 */

import { z } from "zod";
import { queryRouter, publicQueryProcedure } from "./init";
import * as audioModule from "@/graphql/indexer/queries/audio";

export const audioRouter = queryRouter({
  list: publicQueryProcedure
    .input(z.object({ did: z.string().min(1) }))
    .query(({ input }) => audioModule.fetch({ did: input.did })),
});
