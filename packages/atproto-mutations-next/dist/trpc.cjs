"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/trpc/index.ts
var trpc_exports = {};
__export(trpc_exports, {
  appRouter: () => appRouter,
  createContextFactory: () => createContextFactory,
  createServerCaller: () => createServerCaller,
  effectMutation: () => effectMutation,
  entityRouter: () => entityRouter,
  mapEffectErrorToTRPC: () => mapEffectErrorToTRPC,
  middleware: () => middleware,
  publicProcedure: () => publicProcedure,
  router: () => router,
  t: () => t
});
module.exports = __toCommonJS(trpc_exports);

// src/trpc/router.ts
var import_atproto_mutations_core = require("@gainforest/atproto-mutations-core");

// src/trpc/init.ts
var import_server = require("@trpc/server");
var import_superjson = __toESM(require("superjson"), 1);
var t = import_server.initTRPC.context().create({
  transformer: import_superjson.default,
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
var import_effect2 = require("effect");

// src/trpc/error-mapper.ts
var import_server2 = require("@trpc/server");
var import_effect = require("effect");
var FiberFailureCauseSymbol = /* @__PURE__ */ Symbol.for("effect/Runtime/FiberFailure/Cause");
function extractEffectError(error) {
  if (error && typeof error === "object" && FiberFailureCauseSymbol in error) {
    const cause = error[FiberFailureCauseSymbol];
    if (cause && import_effect.Cause.isCause(cause)) {
      return import_effect.Cause.squash(cause);
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
      return new import_server2.TRPCError({ code: "NOT_FOUND", message, cause: actualError });
    }
    if (tag.includes("Validation") || tag.includes("Invalid") || tag.includes("Constraint")) {
      return new import_server2.TRPCError({ code: "BAD_REQUEST", message, cause: actualError });
    }
    if (tag.includes("AlreadyExists")) {
      return new import_server2.TRPCError({ code: "CONFLICT", message, cause: actualError });
    }
    if (tag.includes("Unauthorized") || tag.includes("SessionExpired")) {
      return new import_server2.TRPCError({ code: "UNAUTHORIZED", message, cause: actualError });
    }
    if (tag.includes("IsDefault")) {
      return new import_server2.TRPCError({ code: "PRECONDITION_FAILED", message, cause: actualError });
    }
    if (tag.includes("PdsError") || tag.includes("BlobUpload")) {
      return new import_server2.TRPCError({ code: "INTERNAL_SERVER_ERROR", message, cause: actualError });
    }
    if (tag.includes("GeoJson")) {
      return new import_server2.TRPCError({ code: "BAD_REQUEST", message, cause: actualError });
    }
  }
  const fallbackMessage = actualError instanceof Error ? actualError.message : String(actualError);
  return new import_server2.TRPCError({ code: "INTERNAL_SERVER_ERROR", message: fallbackMessage, cause: actualError });
}

// src/trpc/effect-adapter.ts
function effectMutation(mutation) {
  return t.procedure.input((input) => input).mutation(async ({ input, ctx }) => {
    const agentLayer = ctx.agentLayer;
    try {
      return await import_effect2.Effect.runPromise(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        mutation(input).pipe(
          import_effect2.Effect.provide(agentLayer)
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
    info: entityRouter(import_atproto_mutations_core.mutations.organization.info),
    defaultSite: router({
      set: effectMutation(import_atproto_mutations_core.mutations.organization.defaultSite.set)
    }),
    layer: entityRouter(import_atproto_mutations_core.mutations.organization.layer),
    recordings: router({
      audio: entityRouter(import_atproto_mutations_core.mutations.organization.recordings.audio)
    })
  }),
  claim: router({
    activity: entityRouter(import_atproto_mutations_core.mutations.claim.activity)
  }),
  context: router({
    attachment: entityRouter(import_atproto_mutations_core.mutations.context.attachment)
  }),
  certified: router({
    location: entityRouter(import_atproto_mutations_core.mutations.certified.location)
  }),
  funding: router({
    config: entityRouter(import_atproto_mutations_core.mutations.funding.config),
    receipt: router({
      create: effectMutation(import_atproto_mutations_core.mutations.funding.receipt.create)
    })
  }),
  link: router({
    evm: router({
      create: effectMutation(import_atproto_mutations_core.mutations.link.evm.create),
      update: effectMutation(import_atproto_mutations_core.mutations.link.evm.update),
      delete: effectMutation(import_atproto_mutations_core.mutations.link.evm.delete)
    })
  }),
  ac: router({
    multimedia: router({
      create: effectMutation(import_atproto_mutations_core.mutations.ac.multimedia.create)
    })
  }),
  dwc: router({
    occurrence: router({
      create: effectMutation(import_atproto_mutations_core.mutations.dwc.occurrence.create)
    }),
    measurement: router({
      create: effectMutation(import_atproto_mutations_core.mutations.dwc.measurement.create)
    })
  }),
  blob: router({
    upload: effectMutation(import_atproto_mutations_core.mutations.blob.upload)
  })
});

// src/server/index.ts
var import_effect3 = require("effect");
var import_api = require("@atproto/api");
var import_atproto_mutations_core2 = require("@gainforest/atproto-mutations-core");
var import_server3 = require("@gainforest/atproto-auth-next/server");
var UnauthorizedError = class extends import_effect3.Data.TaggedError("UnauthorizedError") {
};
var SessionExpiredError = class extends import_effect3.Data.TaggedError("SessionExpiredError") {
};
function makeUserAgentLayer(config) {
  const { oauthClient, sessionConfig } = config;
  return import_effect3.Layer.effect(
    import_atproto_mutations_core2.AtprotoAgent,
    import_effect3.Effect.gen(function* () {
      const session = yield* import_effect3.Effect.promise(() => (0, import_server3.getSession)(sessionConfig));
      if (!session.isLoggedIn) {
        return yield* import_effect3.Effect.fail(
          new UnauthorizedError({ message: "No active session \u2014 user is not logged in" })
        );
      }
      const oauthSession = yield* import_effect3.Effect.tryPromise({
        try: () => oauthClient.restore(session.did),
        catch: (cause) => new SessionExpiredError({
          message: `Failed to restore OAuth session for ${session.did}: ${String(cause)}`
        })
      });
      if (!oauthSession) {
        return yield* import_effect3.Effect.fail(
          new SessionExpiredError({ message: "OAuth session not found \u2014 please log in again" })
        );
      }
      return new import_api.Agent(oauthSession);
    })
  );
}

// src/trpc/context.ts
function createContextFactory(auth) {
  return async () => {
    return {
      agentLayer: makeUserAgentLayer(auth)
    };
  };
}

// src/trpc/next-helpers.ts
var import_react = require("react");
function createServerCaller(auth) {
  const createContext = createContextFactory(auth);
  return (0, import_react.cache)(async () => {
    const ctx = await createContext();
    return appRouter.createCaller(ctx);
  });
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
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
});
//# sourceMappingURL=trpc.cjs.map