export type { Main as ActorOrganizationRecord, UrlItem } from "@gainforest/generated/app/certified/actor/organization.defs";

export type { Main as StrongRef } from "@gainforest/generated/com/atproto/repo/strongRef.defs";
export type { DescriptionString, Uri } from "@gainforest/generated/org/hypercerts/defs.defs";
export type { Main as LinearDocument } from "@gainforest/generated/pub/leaflet/pages/linearDocument.defs";

export type { SerializableFile, FileOrBlobRef } from "../../../blob/types";

import type { Main as ActorOrganizationRecord } from "@gainforest/generated/app/certified/actor/organization.defs";
import type {
  SingletonCreateInput,
  SingletonMutationResult,
  SingletonUpdateInput,
} from "../../../utils/shared/types";

export type CreateActorOrganizationInput =
  SingletonCreateInput<ActorOrganizationRecord>;

export type UpdateActorOrganizationInput =
  SingletonUpdateInput<ActorOrganizationRecord>;

export type UpsertActorOrganizationInput = CreateActorOrganizationInput;

export type ActorOrganizationMutationResult =
  SingletonMutationResult<ActorOrganizationRecord>;
