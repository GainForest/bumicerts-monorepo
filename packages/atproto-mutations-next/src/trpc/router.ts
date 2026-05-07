import { mutations } from "@gainforest/atproto-mutations-core";
import { router } from "./init";
import { entityRouter } from "./entity-router";
import { effectMutation } from "./effect-adapter";
import { combinedActorSave } from "./combined-actor-save";

export const appRouter = router({
  organization: router({
    info: entityRouter(mutations.organization.info),
    defaultSite: router({
      set: effectMutation(mutations.organization.defaultSite.set),
    }),
    layer: entityRouter(mutations.organization.layer),
  }),
  claim: router({
    activity: entityRouter(mutations.claim.activity),
  }),
  context: router({
    attachment: entityRouter(mutations.context.attachment),
  }),
  certified: router({
    actor: router({
      profile: entityRouter(mutations.certified.actor.profile),
      organization: entityRouter(mutations.certified.actor.organization),
      profileAndOrganizationSave: combinedActorSave,
    }),
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
  ac: router({
    audio: entityRouter(mutations.ac.audio),
    multimedia: router({
      create: effectMutation(mutations.ac.multimedia.create),
      update: effectMutation(mutations.ac.multimedia.update),
      delete: effectMutation(mutations.ac.multimedia.delete),
    }),
  }),
  dwc: router({
    dataset: router({
      create: effectMutation(mutations.dwc.dataset.create),
      update: effectMutation(mutations.dwc.dataset.update),
      appendExisting: effectMutation(mutations.dwc.dataset.appendExisting),
      attachExistingOccurrences: effectMutation(
        mutations.dwc.dataset.attachExistingOccurrences
      ),
      delete: effectMutation(mutations.dwc.dataset.delete),
    }),
    occurrence: router({
      create: effectMutation(mutations.dwc.occurrence.create),
      update: effectMutation(mutations.dwc.occurrence.update),
      delete: effectMutation(mutations.dwc.occurrence.delete),
    }),
    measurement: router({
      create: effectMutation(mutations.dwc.measurement.create),
      update: effectMutation(mutations.dwc.measurement.update),
      delete: effectMutation(mutations.dwc.measurement.delete),
    }),
  }),
  blob: router({
    upload: effectMutation(mutations.blob.upload),
  }),
});

export type AppRouter = typeof appRouter;
