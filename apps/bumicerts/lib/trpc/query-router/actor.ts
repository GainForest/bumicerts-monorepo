/**
 * actor query procedure
 *
 * trpc.actor.profile({ handleOrDid }) → ActorProfile | null
 *
 * Calls the Bluesky public API — not the indexer.
 */

import { z } from "zod";
import { queryRouter, publicQueryProcedure } from "./init";
import * as actorModule from "@/graphql/indexer/queries/actor";

export const actorRouter = queryRouter({
  profile: publicQueryProcedure
    .input(z.object({ handleOrDid: z.string().min(1) }))
    .query(({ input }) => actorModule.fetch({ handleOrDid: input.handleOrDid })),
});
