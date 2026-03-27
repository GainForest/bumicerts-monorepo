/**
 * funding query procedures
 *
 * trpc.funding.receipts({ did }) → FundingReceiptItem[]
 *
 * Note: leaderboard aggregation is done client-side from the receipts data.
 * The `funding` namespace already has config and receipt mutations in the
 * package router — this adds the receipts read procedure.
 */

import { z } from "zod";
import { queryRouter, publicQueryProcedure } from "./init";
import * as fundingReceiptsModule from "@/lib/graphql-dev/queries/fundingReceipts";

export const fundingQueryRouter = queryRouter({
  receipts: publicQueryProcedure
    .input(z.object({ did: z.string().min(1) }))
    .query(({ input }) => fundingReceiptsModule.fetch({ did: input.did })),
});
