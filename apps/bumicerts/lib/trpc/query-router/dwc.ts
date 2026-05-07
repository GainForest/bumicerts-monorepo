/**
 * dwc read procedures
 *
 * trpc.dwc.occurrences({ did })  → OccurrenceItem[]
 * trpc.dwc.measurements({ did }) → MeasurementItem[]
 *
 * Slots into the existing `dwc` namespace alongside the
 * occurrence.create and measurement.create mutations from the package router.
 * Uses `occurrences` (plural) to distinguish from the `occurrence` entity router.
 */

import { z } from "zod";
import { queryRouter, publicQueryProcedure } from "./init";
import * as occurrencesModule from "@/lib/graphql-dev/queries/occurrences";
import * as measurementsModule from "@/lib/graphql-dev/queries/measurements";

export const dwcQueryRouter = queryRouter({
  occurrences: publicQueryProcedure
    .input(z.object({ did: z.string().min(1) }))
    .query(({ input }) => occurrencesModule.fetch({ did: input.did })),
  measurements: publicQueryProcedure
    .input(z.object({ did: z.string().min(1) }))
    .query(({ input }) => measurementsModule.fetch({ did: input.did })),
});
