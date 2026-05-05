import { z } from "zod";
import type { AccountSummary } from "@/lib/account";
import { readAccountStateByDid } from "@/lib/account/read";
import { queryRouter, publicQueryProcedure } from "./init";

const unauthenticatedAccount: AccountSummary = {
  kind: "unauthenticated",
  did: null,
  profile: null,
  organization: null,
};

export const accountRouter = queryRouter({
  current: publicQueryProcedure.query(async ({ ctx }) => {
    if (!ctx.sessionDid) {
      return unauthenticatedAccount;
    }

    return readAccountStateByDid(ctx.sessionDid);
  }),
  byDid: publicQueryProcedure
    .input(z.object({ did: z.string().startsWith("did:") }))
    .query(({ input }) => readAccountStateByDid(input.did)),
});
