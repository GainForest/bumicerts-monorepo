/**
 * bumicerts local query router
 *
 * All procedures here are public reads (no auth required).
 * This router is merged with the package's appRouter (mutations) in
 * lib/trpc/merged-router.ts to form the full BumicertsRouter.
 *
 * Namespace alignment:
 *   organization.*   — info / list / logo
 *   activities.*     — list (discriminated by input shape)
 *   locations.*      — list (did-only or did+rkey)
 *   audio.*          — list
 *   actor.*          — profile  (Bluesky public API)
 *   funding.*        — receipts  (leaderboard computed client-side)
 *   link.evm.*       — list  (merges with package's create/update/delete)
 *   claim.activity.* — get   (merges with package's create/update/upsert/delete)
 *   context.*        — attachments  (merges with package's attachment CRUD)
 *   dwc.*            — occurrences  (merges with package's occurrence/measurement)
 */

import { queryRouter } from "./init";
import { organizationRouter } from "./organization";
import { activitiesRouter } from "./activities";
import { locationsRouter } from "./locations";
import { audioRouter } from "./audio";
import { actorRouter } from "./actor";
import { fundingQueryRouter } from "./funding";
import { linkEvmQueryRouter } from "./link-evm";
import { claimQueryRouter } from "./claim";
import { contextQueryRouter } from "./context";
import { dwcQueryRouter } from "./dwc";

export const localQueryRouter = queryRouter({
  organization: organizationRouter,
  activities: activitiesRouter,
  locations: locationsRouter,
  audio: audioRouter,
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
