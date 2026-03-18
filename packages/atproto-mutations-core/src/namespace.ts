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
// organization.recordings.audio
// ---------------------------------------------------------------------------
import { createAudioRecording } from "./mutations/organization.recordings.audio/create";
import { updateAudioRecording } from "./mutations/organization.recordings.audio/update";
import { upsertAudioRecording } from "./mutations/organization.recordings.audio/upsert";
import { deleteAudioRecording } from "./mutations/organization.recordings.audio/delete";

// ---------------------------------------------------------------------------
// claim.activity
// ---------------------------------------------------------------------------
import { createClaimActivity } from "./mutations/claim.activity/create";
import { updateClaimActivity } from "./mutations/claim.activity/update";
import { upsertClaimActivity } from "./mutations/claim.activity/upsert";
import { deleteClaimActivity } from "./mutations/claim.activity/delete";

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
// dwc.occurrence
// ---------------------------------------------------------------------------
import { createDwcOccurrence } from "./mutations/dwc.occurrence/create";

// ---------------------------------------------------------------------------
// dwc.measurement
// ---------------------------------------------------------------------------
import { createDwcMeasurement } from "./mutations/dwc.measurement/create";

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
    recordings: {
      audio: {
        create: createAudioRecording,
        update: updateAudioRecording,
        upsert: upsertAudioRecording,
        delete: deleteAudioRecording,
      },
    },
  },
  claim: {
    activity: {
      create: createClaimActivity,
      update: updateClaimActivity,
      upsert: upsertClaimActivity,
      delete: deleteClaimActivity,
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
  dwc: {
    occurrence: {
      create: createDwcOccurrence,
    },
    measurement: {
      create: createDwcMeasurement,
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
