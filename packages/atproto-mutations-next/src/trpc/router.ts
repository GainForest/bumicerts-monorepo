import { mutations } from "@gainforest/atproto-mutations-core";
import { router } from "./init";
import { entityRouter } from "./entity-router";
import { effectMutation } from "./effect-adapter";

export const appRouter = router({
  organization: router({
    info: entityRouter(mutations.organization.info),
    defaultSite: router({
      set: effectMutation(mutations.organization.defaultSite.set),
    }),
    layer: entityRouter(mutations.organization.layer),
    recordings: router({
      audio: entityRouter(mutations.organization.recordings.audio),
    }),
  }),
  claim: router({
    activity: entityRouter(mutations.claim.activity),
  }),
  certified: router({
    location: entityRouter(mutations.certified.location),
  }),
  funding: router({
    config: entityRouter(mutations.funding.config),
    receipt: router({
      create: effectMutation(mutations.funding.receipt.create),
    }),
  }),
  link: router({
    evm: router({
      create: effectMutation(mutations.link.evm.create),
      update: effectMutation(mutations.link.evm.update),
      delete: effectMutation(mutations.link.evm.delete),
    }),
  }),
  blob: router({
    upload: effectMutation(mutations.blob.upload),
  }),
});

export type AppRouter = typeof appRouter;
