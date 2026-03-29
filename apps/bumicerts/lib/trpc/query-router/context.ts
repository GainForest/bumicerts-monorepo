/**
 * hypercertsContext read procedures
 *
 * trpc.hypercertsContext.attachments({ did }) → AttachmentItem[]
 *
 * Renamed from `context` to `hypercertsContext` to avoid collision with
 * tRPC's built-in `useContext` method in createTRPCReact.
 * Maps to the org.hypercerts.context.* lexicon namespace.
 *
 * Slots into the existing `hypercertsContext` namespace alongside the
 * attachment CRUD mutations from the package router.
 * Uses `attachments` (plural) to distinguish from the `attachment` entity router.
 */

import { z } from "zod";
import { queryRouter, publicQueryProcedure } from "./init";
import * as attachmentsModule from "@/lib/graphql-dev/queries/attachments";

export const hypercertsContextQueryRouter = queryRouter({
  attachments: publicQueryProcedure
    .input(z.object({ did: z.string().min(1) }))
    .query(({ input }) => attachmentsModule.fetch({ did: input.did })),
});
