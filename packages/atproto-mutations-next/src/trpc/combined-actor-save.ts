import { Effect } from "effect";
import { publicProcedure } from "./init";
import { mapEffectErrorToTRPC } from "./error-mapper";
import {
  AtprotoAgent,
  ActorOrganizationNotFoundError,
  ActorOrganizationPdsError,
  ActorOrganizationValidationError,
  ActorProfileNotFoundError,
  ActorProfilePdsError,
  ActorProfileValidationError,
  BlobUploadError,
  FileConstraintError,
  type ActorOrganizationRecord,
  type ActorProfileRecord,
  type ValidationIssue,
  applyPatch,
  extractBlobConstraints,
  fetchRecord,
  finalValidate,
  resolveFileInputs,
  stubValidate,
  validateFileConstraints,
} from "@gainforest/atproto-mutations-core";
import {
  $parse as parseActorOrganization,
  main as actorOrganizationSchema,
} from "@gainforest/generated/app/certified/actor/organization.defs";
import {
  $parse as parseActorProfile,
  main as actorProfileSchema,
} from "@gainforest/generated/app/certified/actor/profile.defs";

const PROFILE_COLLECTION = "app.certified.actor.profile";
const ORGANIZATION_COLLECTION = "app.certified.actor.organization";
const RKEY = "self";

const PROFILE_BLOB_CONSTRAINTS = extractBlobConstraints(actorProfileSchema);
const ORGANIZATION_BLOB_CONSTRAINTS = extractBlobConstraints(actorOrganizationSchema);
const REQUIRED_FIELDS: ReadonlySet<string> = new Set();

type RecordPatchInput = {
  data: Record<string, unknown>;
  unset?: string[];
};

type CombinedActorSaveInput = {
  profile: RecordPatchInput;
  organization:
    | {
        operation: "update";
        data: Record<string, unknown>;
        unset?: string[];
      }
    | {
        operation: "upsert";
        record: Record<string, unknown>;
      };
};

type CombinedActorSaveResult = {
  profile: ActorProfileRecord;
  organization: ActorOrganizationRecord;
  organizationCreated: boolean;
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseUnset(value: unknown, fieldName: string): string[] | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (!Array.isArray(value) || value.some((entry) => typeof entry !== "string")) {
    throw new Error(`${fieldName} must be an array of strings.`);
  }

  return value;
}

function parseRecordPatchInput(value: unknown, fieldName: string): RecordPatchInput {
  if (!isPlainObject(value) || !isPlainObject(value.data)) {
    throw new Error(`${fieldName}.data must be an object.`);
  }

  return {
    data: value.data,
    unset: parseUnset(value.unset, `${fieldName}.unset`),
  };
}

function parseCombinedActorSaveInput(value: unknown): CombinedActorSaveInput {
  if (!isPlainObject(value)) {
    throw new Error("Combined actor save input must be an object.");
  }

  const profile = parseRecordPatchInput(value.profile, "profile");
  const rawOrganization = value.organization;

  if (!isPlainObject(rawOrganization) || typeof rawOrganization.operation !== "string") {
    throw new Error("organization.operation is required.");
  }

  if (rawOrganization.operation === "update") {
    if (!isPlainObject(rawOrganization.data)) {
      throw new Error("organization.data must be an object.");
    }

    return {
      profile,
      organization: {
        operation: "update",
        data: rawOrganization.data,
        unset: parseUnset(rawOrganization.unset, "organization.unset"),
      },
    };
  }

  if (rawOrganization.operation === "upsert") {
    if (!isPlainObject(rawOrganization.record)) {
      throw new Error("organization.record must be an object.");
    }

    return {
      profile,
      organization: {
        operation: "upsert",
        record: rawOrganization.record,
      },
    };
  }

  throw new Error("organization.operation must be \"update\" or \"upsert\".");
}

const makeProfilePdsError = (message: string, cause: unknown) =>
  new ActorProfilePdsError({ message, cause });

const makeOrganizationPdsError = (message: string, cause: unknown) =>
  new ActorOrganizationPdsError({ message, cause });

const makeProfileValidationError = (
  message: string,
  cause: unknown,
  issues?: ValidationIssue[],
) => new ActorProfileValidationError({ message, cause, issues });

const makeOrganizationValidationError = (
  message: string,
  cause: unknown,
  issues?: ValidationIssue[],
) => new ActorOrganizationValidationError({ message, cause, issues });

const combinedActorSaveEffect = (
  input: CombinedActorSaveInput,
): Effect.Effect<
  CombinedActorSaveResult,
  | ActorProfileValidationError
  | ActorProfileNotFoundError
  | ActorProfilePdsError
  | ActorOrganizationValidationError
  | ActorOrganizationNotFoundError
  | ActorOrganizationPdsError
  | FileConstraintError
  | BlobUploadError,
  AtprotoAgent
> =>
  Effect.gen(function* () {
    const agent = yield* AtprotoAgent;

    yield* validateFileConstraints(input.profile.data, PROFILE_BLOB_CONSTRAINTS);

    const existingProfile = yield* fetchRecord(
      PROFILE_COLLECTION,
      RKEY,
      parseActorProfile,
      makeProfilePdsError,
    );

    if (existingProfile === null) {
      return yield* Effect.fail(
        new ActorProfileNotFoundError({ repo: agent.assertDid }),
      );
    }

    const patchedProfile = applyPatch(
      existingProfile,
      input.profile.data as Partial<ActorProfileRecord>,
      input.profile.unset,
      REQUIRED_FIELDS,
    ) as ActorProfileRecord;
    patchedProfile.$type = PROFILE_COLLECTION;
    patchedProfile.createdAt = existingProfile.createdAt;

    yield* stubValidate(
      patchedProfile,
      parseActorProfile,
      makeProfileValidationError,
    );

    const resolvedProfile = yield* resolveFileInputs(patchedProfile);
    const profileRecord = yield* finalValidate(
      resolvedProfile,
      parseActorProfile,
      makeProfileValidationError,
    );

    let organizationRecord: ActorOrganizationRecord;
    let organizationCreated = false;

    if (input.organization.operation === "update") {
      yield* validateFileConstraints(
        input.organization.data,
        ORGANIZATION_BLOB_CONSTRAINTS,
      );

      const existingOrganization = yield* fetchRecord(
        ORGANIZATION_COLLECTION,
        RKEY,
        parseActorOrganization,
        makeOrganizationPdsError,
      );

      if (existingOrganization === null) {
        return yield* Effect.fail(
          new ActorOrganizationNotFoundError({ repo: agent.assertDid }),
        );
      }

      const patchedOrganization = applyPatch(
        existingOrganization,
        input.organization.data as Partial<ActorOrganizationRecord>,
        input.organization.unset,
        REQUIRED_FIELDS,
      ) as ActorOrganizationRecord;
      patchedOrganization.$type = ORGANIZATION_COLLECTION;
      patchedOrganization.createdAt = existingOrganization.createdAt;

      yield* stubValidate(
        patchedOrganization,
        parseActorOrganization,
        makeOrganizationValidationError,
      );

      const resolvedOrganization = yield* resolveFileInputs(patchedOrganization);
      organizationRecord = yield* finalValidate(
        resolvedOrganization,
        parseActorOrganization,
        makeOrganizationValidationError,
      );
    } else {
      yield* validateFileConstraints(
        input.organization.record,
        ORGANIZATION_BLOB_CONSTRAINTS,
      );

      const existingOrganization = yield* fetchRecord(
        ORGANIZATION_COLLECTION,
        RKEY,
        parseActorOrganization,
        makeOrganizationPdsError,
      );

      const organizationCandidate = {
        $type: ORGANIZATION_COLLECTION,
        ...input.organization.record,
        createdAt: existingOrganization?.createdAt ?? new Date().toISOString(),
      };

      yield* stubValidate(
        organizationCandidate,
        parseActorOrganization,
        makeOrganizationValidationError,
      );

      const resolvedOrganization = yield* resolveFileInputs(organizationCandidate);
      organizationRecord = yield* finalValidate(
        resolvedOrganization,
        parseActorOrganization,
        makeOrganizationValidationError,
      );
      organizationCreated = existingOrganization === null;
    }

    const organizationWrite =
      input.organization.operation === "update"
        ? {
            $type: "com.atproto.repo.applyWrites#update" as const,
            collection: ORGANIZATION_COLLECTION,
            rkey: RKEY,
            value: organizationRecord,
          }
        : {
            $type: organizationCreated
              ? ("com.atproto.repo.applyWrites#create" as const)
              : ("com.atproto.repo.applyWrites#update" as const),
            collection: ORGANIZATION_COLLECTION,
            rkey: RKEY,
            value: organizationRecord,
          };

    yield* Effect.tryPromise({
      try: () =>
        agent.com.atproto.repo.applyWrites({
          repo: agent.assertDid,
          writes: [
            {
              $type: "com.atproto.repo.applyWrites#update",
              collection: PROFILE_COLLECTION,
              rkey: RKEY,
              value: profileRecord,
            },
            organizationWrite,
          ],
        }),
      catch: (cause) =>
        new ActorOrganizationPdsError({
          message: "PDS rejected combined actor save.",
          cause,
        }),
    });

    return {
      profile: profileRecord,
      organization: organizationRecord,
      organizationCreated,
    };
  });

export const combinedActorSave = publicProcedure
  .input(parseCombinedActorSaveInput)
  .mutation(async ({ input, ctx }) => {
    try {
      return await Effect.runPromise(
        combinedActorSaveEffect(input).pipe(Effect.provide(ctx.agentLayer)),
      );
    } catch (error) {
      throw mapEffectErrorToTRPC(error);
    }
  });
