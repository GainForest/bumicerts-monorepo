// @gainforest/atproto-mutations-core/namespace
//
// Nested namespace structure for mutations, providing a tRPC-like DX:
//
//   import { mutations } from "@gainforest/atproto-mutations-core";
//
//   // All operations return Effect<Result, Error, AtprotoAgent>
//   mutations.organization.info.create(input);
//   mutations.organization.info.update(input);
//   mutations.organization.info.upsert(input);
//
//   mutations.claim.activity.create(input);
//   mutations.claim.activity.delete(input);
//
// The mutations object is statically typed and tree-shakeable.

// ---------------------------------------------------------------------------
// organization.info
// ---------------------------------------------------------------------------
import { createOrganizationInfo } from "./mutations/organization.info/create";
import { updateOrganizationInfo } from "./mutations/organization.info/update";
import { upsertOrganizationInfo } from "./mutations/organization.info/upsert";

// ---------------------------------------------------------------------------
// organization.defaultSite
// ---------------------------------------------------------------------------
import { setDefaultSite } from "./mutations/organization.defaultSite/set";

// ---------------------------------------------------------------------------
// organization.layer
// ---------------------------------------------------------------------------
import { createLayer } from "./mutations/organization.layer/create";
import { updateLayer } from "./mutations/organization.layer/update";
import { upsertLayer } from "./mutations/organization.layer/upsert";
import { deleteLayer } from "./mutations/organization.layer/delete";

// ---------------------------------------------------------------------------
// ac.audio
// ---------------------------------------------------------------------------
import { createAudioRecording } from "./mutations/ac.audio/create";
import { updateAudioRecording } from "./mutations/ac.audio/update";
import { upsertAudioRecording } from "./mutations/ac.audio/upsert";
import { deleteAudioRecording } from "./mutations/ac.audio/delete";

// ---------------------------------------------------------------------------
// claim.activity
// ---------------------------------------------------------------------------
import { createClaimActivity } from "./mutations/claim.activity/create";
import { updateClaimActivity } from "./mutations/claim.activity/update";
import { upsertClaimActivity } from "./mutations/claim.activity/upsert";
import { deleteClaimActivity } from "./mutations/claim.activity/delete";

// ---------------------------------------------------------------------------
// claim.rights
// ---------------------------------------------------------------------------
import { createClaimRights } from "./mutations/claim.rights/create";
import { updateClaimRights } from "./mutations/claim.rights/update";
import { upsertClaimRights } from "./mutations/claim.rights/upsert";
import { deleteClaimRights } from "./mutations/claim.rights/delete";

// ---------------------------------------------------------------------------
// certified.location
// ---------------------------------------------------------------------------
import { createCertifiedLocation } from "./mutations/certified.location/create";
import { updateCertifiedLocation } from "./mutations/certified.location/update";
import { upsertCertifiedLocation } from "./mutations/certified.location/upsert";
import { deleteCertifiedLocation } from "./mutations/certified.location/delete";

// ---------------------------------------------------------------------------
// funding.receipt
// ---------------------------------------------------------------------------
import { createFundingReceipt } from "./mutations/funding.receipt/create";

// ---------------------------------------------------------------------------
// funding.config
// ---------------------------------------------------------------------------
import { createFundingConfig } from "./mutations/funding.config/create";
import { updateFundingConfig } from "./mutations/funding.config/update";
import { upsertFundingConfig } from "./mutations/funding.config/upsert";
import { deleteFundingConfig } from "./mutations/funding.config/delete";

// ---------------------------------------------------------------------------
// link.evm
// ---------------------------------------------------------------------------
import { createLinkEvm } from "./mutations/link.evm/create";
import { updateLinkEvm } from "./mutations/link.evm/update";
import { deleteLinkEvm } from "./mutations/link.evm/delete";

// ---------------------------------------------------------------------------
// ac.multimedia
// ---------------------------------------------------------------------------
import { createAcMultimedia } from "./mutations/ac.multimedia/create";
import { updateAcMultimedia } from "./mutations/ac.multimedia/update";
import { deleteAcMultimedia } from "./mutations/ac.multimedia/delete";

// ---------------------------------------------------------------------------
// dwc.dataset
// ---------------------------------------------------------------------------
import { createDwcDataset } from "./mutations/dwc.dataset/create";
import { updateDwcDataset } from "./mutations/dwc.dataset/update";
import { deleteDwcDataset } from "./mutations/dwc.dataset/delete";
import { appendExistingDwcDataset } from "./mutations/dwc.dataset/appendExisting";

// ---------------------------------------------------------------------------
// dwc.occurrence
// ---------------------------------------------------------------------------
import { createDwcOccurrence } from "./mutations/dwc.occurrence/create";
import { updateDwcOccurrence } from "./mutations/dwc.occurrence/update";
import { deleteDwcOccurrence } from "./mutations/dwc.occurrence/delete";

// ---------------------------------------------------------------------------
// context.attachment
// ---------------------------------------------------------------------------
import { createContextAttachment } from "./mutations/context.attachment/create";
import { updateContextAttachment } from "./mutations/context.attachment/update";
import { upsertContextAttachment } from "./mutations/context.attachment/upsert";
import { deleteContextAttachment } from "./mutations/context.attachment/delete";

// ---------------------------------------------------------------------------
// dwc.measurement
// ---------------------------------------------------------------------------
import { createDwcMeasurement } from "./mutations/dwc.measurement/create";
import { updateDwcMeasurement } from "./mutations/dwc.measurement/update";
import { deleteDwcMeasurement } from "./mutations/dwc.measurement/delete";

// ---------------------------------------------------------------------------
// blob
// ---------------------------------------------------------------------------
import { uploadBlob } from "./blob/upload";

// ---------------------------------------------------------------------------
// Namespace definition
// ---------------------------------------------------------------------------

export const mutations = {
  organization: {
    info: {
      create: createOrganizationInfo,
      update: updateOrganizationInfo,
      upsert: upsertOrganizationInfo,
    },
    defaultSite: {
      set: setDefaultSite,
    },
    layer: {
      create: createLayer,
      update: updateLayer,
      upsert: upsertLayer,
      delete: deleteLayer,
    },
  },
  claim: {
    activity: {
      create: createClaimActivity,
      update: updateClaimActivity,
      upsert: upsertClaimActivity,
      delete: deleteClaimActivity,
    },
    rights: {
      create: createClaimRights,
      update: updateClaimRights,
      upsert: upsertClaimRights,
      delete: deleteClaimRights,
    },
  },
  certified: {
    location: {
      create: createCertifiedLocation,
      update: updateCertifiedLocation,
      upsert: upsertCertifiedLocation,
      delete: deleteCertifiedLocation,
    },
  },
  funding: {
    receipt: {
      create: createFundingReceipt,
    },
    config: {
      create: createFundingConfig,
      update: updateFundingConfig,
      upsert: upsertFundingConfig,
      delete: deleteFundingConfig,
    },
  },
  link: {
    evm: {
      create: createLinkEvm,
      update: updateLinkEvm,
      delete: deleteLinkEvm,
    },
  },
  ac: {
    audio: {
      create: createAudioRecording,
      update: updateAudioRecording,
      upsert: upsertAudioRecording,
      delete: deleteAudioRecording,
    },
    multimedia: {
      create: createAcMultimedia,
      update: updateAcMultimedia,
      delete: deleteAcMultimedia,
    },
  },
  context: {
    attachment: {
      create: createContextAttachment,
      update: updateContextAttachment,
      upsert: upsertContextAttachment,
      delete: deleteContextAttachment,
    },
  },
  dwc: {
    dataset: {
      create: createDwcDataset,
      update: updateDwcDataset,
      appendExisting: appendExistingDwcDataset,
      delete: deleteDwcDataset,
    },
    occurrence: {
      create: createDwcOccurrence,
      update: updateDwcOccurrence,
      delete: deleteDwcOccurrence,
    },
    measurement: {
      create: createDwcMeasurement,
      update: updateDwcMeasurement,
      delete: deleteDwcMeasurement,
    },
  },
  blob: {
    upload: uploadBlob,
  },
} as const;

// ---------------------------------------------------------------------------
// Type exports for the namespace
// ---------------------------------------------------------------------------

export type Mutations = typeof mutations;
