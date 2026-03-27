/**
 * context read procedures
 *
 * trpc.context.attachments({ did }) → AttachmentItem[]
 *
 * Slots into the existing `context` namespace alongside the
 * attachment CRUD mutations from the package router.
 * Uses `attachments` (plural) to distinguish from the `attachment` entity router.
 */

import { z } from "zod";
import { queryRouter, publicQueryProcedure } from "./init";
import * as attachmentsModule from "@/lib/graphql-dev/queries/attachments";

export const contextQueryRouter = queryRouter({
  attachments: publicQueryProcedure
    .input(z.object({ did: z.string().min(1) }))
    .query(({ input }) => attachmentsModule.fetch({ did: input.did })),
});
