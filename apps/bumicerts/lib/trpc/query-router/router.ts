/**
 * bumicerts local query router
 *
 * All procedures here are read-only indexer-backed queries.
 * Most are public reads; a small number (such as account.current) can use the
 * optional signed-in session DID from context.
 * This router is merged with the package's appRouter (mutations) in
 * lib/trpc/merged-router.ts to form the full BumicertsRouter.
 *
 * Namespace alignment:
 *   account.*        — current / byDid (Certified actor account state)
 *   organization.*   — info / list / logo
 *   activities.*     — list (discriminated by input shape)
 *   locations.*      — list (did-only or did+rkey)
 *   audio.*          — list
 *   multimedia.*     — list
 *   actor.*          — profile  (Bluesky public API)
 *   funding.*        — receipts  (leaderboard computed client-side)
 *   link.evm.*       — list  (merges with package's create/update/delete)
 *   claim.activity.* — get   (merges with package's create/update/upsert/delete)
 *   context.*        — attachments  (merges with package's attachment CRUD)
 *   dwc.*            — occurrences + measurements  (merges with package's occurrence/measurement)
 */

import { queryRouter } from "./init";
import { accountRouter } from "./account";
import { organizationRouter } from "./organization";
import { activitiesRouter } from "./activities";
import { locationsRouter } from "./locations";
import { audioRouter } from "./audio";
import { multimediaRouter } from "./multimedia";
import { actorRouter } from "./actor";
import { fundingQueryRouter } from "./funding";
import { linkEvmQueryRouter } from "./link-evm";
import { claimQueryRouter } from "./claim";
import { contextQueryRouter } from "./context";
import { dwcQueryRouter } from "./dwc";
import { datasetsRouter } from "./datasets";

export const localQueryRouter = queryRouter({
  account: accountRouter,
  organization: organizationRouter,
  activities: activitiesRouter,
  locations: locationsRouter,
  audio: audioRouter,
  multimedia: multimediaRouter,
  datasets: datasetsRouter,
  actor: actorRouter,
  funding: fundingQueryRouter,
  link: queryRouter({
    evm: linkEvmQueryRouter,
  }),
  claim: claimQueryRouter,
  context: contextQueryRouter,
  dwc: dwcQueryRouter,
});

export type LocalQueryRouter = typeof localQueryRouter;
