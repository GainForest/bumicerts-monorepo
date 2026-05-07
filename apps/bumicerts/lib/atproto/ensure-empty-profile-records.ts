const SELF_RKEY = "self";
const APP_BSKY_ACTOR_PROFILE = "app.bsky.actor.profile";
const APP_CERTIFIED_ACTOR_PROFILE = "app.certified.actor.profile";

const PROFILE_COLLECTIONS = [
  APP_BSKY_ACTOR_PROFILE,
  APP_CERTIFIED_ACTOR_PROFILE,
] as const;

type ProfileCollection = (typeof PROFILE_COLLECTIONS)[number];

type DirectPdsSession = {
  fetchHandler: (pathname: string, init?: RequestInit) => Promise<Response>;
};

type ProfileRecordMutationStatus = "created" | "existing";

type ExistingRecordStatus = {
  collection: ProfileCollection;
  exists: boolean;
};

async function readErrorMessage(response: Response) {
  try {
    return await response.text();
  } catch {
    return `Request failed with status ${response.status}`;
  }
}

function isMissingRecordResponse(response: Response, errorMessage: string) {
  if (response.status === 404) {
    return true;
  }

  const normalizedMessage = errorMessage.toLowerCase();
  return (
    normalizedMessage.includes("recordnotfound") ||
    normalizedMessage.includes("could not locate record") ||
    normalizedMessage.includes("record not found")
  );
}

function buildGetRecordPath(options: {
  did: string;
  collection: ProfileCollection;
}) {
  const searchParams = new URLSearchParams({
    repo: options.did,
    collection: options.collection,
    rkey: SELF_RKEY,
  });

  return `/xrpc/com.atproto.repo.getRecord?${searchParams.toString()}`;
}

async function fetchExistingRecordStatus(options: {
  did: string;
  session: DirectPdsSession;
  collection: ProfileCollection;
}): Promise<ExistingRecordStatus> {
  const response = await options.session.fetchHandler(
    buildGetRecordPath({ did: options.did, collection: options.collection }),
  );

  if (response.status === 404) {
    return { collection: options.collection, exists: false };
  }

  if (!response.ok) {
    const errorMessage = await readErrorMessage(response);

    if (isMissingRecordResponse(response, errorMessage)) {
      return { collection: options.collection, exists: false };
    }

    throw new Error(
      `Failed to read ${options.collection}: ${errorMessage}`,
    );
  }

  return { collection: options.collection, exists: true };
}

function isAlreadyExistingRecordError(response: Response, errorMessage: string) {
  if (response.status === 409) {
    return true;
  }

  return errorMessage.toLowerCase().includes("already exists");
}

async function createEmptyRecord(options: {
  did: string;
  session: DirectPdsSession;
  collection: ProfileCollection;
}): Promise<ProfileRecordMutationStatus> {
  const response = await options.session.fetchHandler(
    "/xrpc/com.atproto.repo.createRecord",
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        repo: options.did,
        collection: options.collection,
        rkey: SELF_RKEY,
        validate: false,
        record: {
          $type: options.collection,
        },
      }),
    },
  );

  if (response.ok) {
    return "created";
  }

  const errorMessage = await readErrorMessage(response);
  if (isAlreadyExistingRecordError(response, errorMessage)) {
    return "existing";
  }

  throw new Error(`Failed to create ${options.collection}: ${errorMessage}`);
}

export async function ensureEmptyProfileRecords(options: {
  did: string;
  session: DirectPdsSession;
}) {
  const existingStatuses = await Promise.all(
    PROFILE_COLLECTIONS.map((collection) =>
      fetchExistingRecordStatus({
        did: options.did,
        session: options.session,
        collection,
      }),
    ),
  );

  const mutationStatuses = await Promise.all(
    existingStatuses.map((status) => {
      if (status.exists) {
        return Promise.resolve<{
          collection: ProfileCollection;
          status: ProfileRecordMutationStatus;
        }>({
          collection: status.collection,
          status: "existing",
        });
      }

      return createEmptyRecord({
        did: options.did,
        session: options.session,
        collection: status.collection,
      }).then((mutationStatus) => ({
        collection: status.collection,
        status: mutationStatus,
      }));
    }),
  );

  const statusByCollection = new Map<ProfileCollection, ProfileRecordMutationStatus>(
    mutationStatuses.map((entry) => [entry.collection, entry.status]),
  );

  return {
    appBskyActorProfile:
      statusByCollection.get(APP_BSKY_ACTOR_PROFILE) ?? "existing",
    appCertifiedActorProfile:
      statusByCollection.get(APP_CERTIFIED_ACTOR_PROFILE) ?? "existing",
  };
}
