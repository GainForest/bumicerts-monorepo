export type { Main as ActorProfileRecord } from "@gainforest/generated/app/certified/actor/profile.defs";

export type { LargeImage, SmallImage, Uri } from "@gainforest/generated/org/hypercerts/defs.defs";

export type { SerializableFile, FileOrBlobRef } from "../../../blob/types";

import type { Main as ActorProfileRecord } from "@gainforest/generated/app/certified/actor/profile.defs";
import type {
  SingletonCreateInput,
  SingletonMutationResult,
  SingletonUpdateInput,
} from "../../../utils/shared/types";

export type CreateActorProfileInput = SingletonCreateInput<ActorProfileRecord>;

export type UpdateActorProfileInput = SingletonUpdateInput<ActorProfileRecord>;

export type UpsertActorProfileInput = CreateActorProfileInput;

export type ActorProfileMutationResult =
  SingletonMutationResult<ActorProfileRecord>;
