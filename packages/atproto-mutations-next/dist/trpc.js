import {
  makeUserAgentLayer
} from "./chunk-CEVG4PNT.js";

// src/trpc/router.ts
import { mutations } from "@gainforest/atproto-mutations-core";

// src/trpc/init.ts
import { initTRPC } from "@trpc/server";
import superjson from "superjson";
var t = initTRPC.context().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    const effectError = error.cause;
    const rawCause = effectError && typeof effectError === "object" && "cause" in effectError ? effectError.cause : void 0;
    return {
      ...shape,
      data: {
        ...shape.data,
        // Include the original Effect error tag if available for debugging
        effectTag: effectError && typeof effectError === "object" && "_tag" in effectError ? String(effectError._tag) : void 0,
        // Include the raw PDS / upstream error message for debugging
        causeMessage: rawCause instanceof Error ? rawCause.message : void 0
      }
    };
  }
});
var router = t.router;
var publicProcedure = t.procedure;
var middleware = t.middleware;

// src/trpc/effect-adapter.ts
import { Effect } from "effect";

// src/trpc/error-mapper.ts
import { TRPCError } from "@trpc/server";
import { Cause } from "effect";
var FiberFailureCauseSymbol = /* @__PURE__ */ Symbol.for("effect/Runtime/FiberFailure/Cause");
function extractEffectError(error) {
  if (error && typeof error === "object" && FiberFailureCauseSymbol in error) {
    const cause = error[FiberFailureCauseSymbol];
    if (cause && Cause.isCause(cause)) {
      return Cause.squash(cause);
    }
  }
  return error;
}
function mapEffectErrorToTRPC(error) {
  const actualError = extractEffectError(error);
  if (actualError && typeof actualError === "object" && "_tag" in actualError) {
    const tag = actualError._tag;
    const message = "message" in actualError ? String(actualError.message) : tag;
    if (tag.includes("NotFound")) {
      return new TRPCError({ code: "NOT_FOUND", message, cause: actualError });
    }
    if (tag.includes("Validation") || tag.includes("Invalid") || tag.includes("Constraint")) {
      return new TRPCError({ code: "BAD_REQUEST", message, cause: actualError });
    }
    if (tag.includes("AlreadyExists")) {
      return new TRPCError({ code: "CONFLICT", message, cause: actualError });
    }
    if (tag.includes("Unauthorized") || tag.includes("SessionExpired")) {
      return new TRPCError({ code: "UNAUTHORIZED", message, cause: actualError });
    }
    if (tag.includes("IsDefault")) {
      return new TRPCError({ code: "PRECONDITION_FAILED", message, cause: actualError });
    }
    if (tag.includes("PdsError") || tag.includes("BlobUpload")) {
      return new TRPCError({ code: "INTERNAL_SERVER_ERROR", message, cause: actualError });
    }
    if (tag.includes("GeoJson")) {
      return new TRPCError({ code: "BAD_REQUEST", message, cause: actualError });
    }
  }
  const fallbackMessage = actualError instanceof Error ? actualError.message : String(actualError);
  return new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: fallbackMessage, cause: actualError });
}

// src/trpc/effect-adapter.ts
function effectMutation(mutation) {
  return t.procedure.input((input) => input).mutation(async ({ input, ctx }) => {
    const agentLayer = ctx.agentLayer;
    try {
      return await Effect.runPromise(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        mutation(input).pipe(
          Effect.provide(agentLayer)
        )
      );
    } catch (error) {
      throw mapEffectErrorToTRPC(error);
    }
  });
}

// src/trpc/entity-router.ts
function entityRouter(entity) {
  const procedures = {};
  if (entity.create) procedures.create = effectMutation(entity.create);
  if (entity.update) procedures.update = effectMutation(entity.update);
  if (entity.upsert) procedures.upsert = effectMutation(entity.upsert);
  if (entity.delete) procedures.delete = effectMutation(entity.delete);
  return router(procedures);
}

// src/trpc/router.ts
var appRouter = router({
  organization: router({
    info: entityRouter(mutations.organization.info),
    defaultSite: router({
      set: effectMutation(mutations.organization.defaultSite.set)
    }),
    layer: entityRouter(mutations.organization.layer),
    recordings: router({
      audio: entityRouter(mutations.organization.recordings.audio)
    })
  }),
  claim: router({
    activity: entityRouter(mutations.claim.activity)
  }),
  certified: router({
    location: entityRouter(mutations.certified.location)
  }),
  funding: router({
    config: entityRouter(mutations.funding.config),
    receipt: router({
      create: effectMutation(mutations.funding.receipt.create)
    })
  }),
  link: router({
    evm: router({
      create: effectMutation(mutations.link.evm.create),
      update: effectMutation(mutations.link.evm.update),
      delete: effectMutation(mutations.link.evm.delete)
    })
  }),
  dwc: router({
    occurrence: router({
      create: effectMutation(mutations.dwc.occurrence.create)
    }),
    measurement: router({
      create: effectMutation(mutations.dwc.measurement.create)
    })
  }),
  blob: router({
    upload: effectMutation(mutations.blob.upload)
  })
});

// src/trpc/context.ts
function createContextFactory(auth) {
  return async () => {
    return {
      agentLayer: makeUserAgentLayer(auth)
    };
  };
}

// src/trpc/next-helpers.ts
import { cache } from "react";
function createServerCaller(auth) {
  const createContext = createContextFactory(auth);
  return cache(async () => {
    const ctx = await createContext();
    return appRouter.createCaller(ctx);
  });
}
export {
  appRouter,
  createContextFactory,
  createServerCaller,
  effectMutation,
  entityRouter,
  mapEffectErrorToTRPC,
  middleware,
  publicProcedure,
  router,
  t
};
//# sourceMappingURL=trpc.js.map