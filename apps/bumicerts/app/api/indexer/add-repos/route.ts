import { addRepos } from "@/lib/graphql-dev/mutations/add-repos";

type AddReposRequestBody = {
  dids?: unknown;
};

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

export async function POST(request: Request) {
  let body: AddReposRequestBody;

  try {
    body = (await request.json()) as AddReposRequestBody;
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!isStringArray(body.dids) || body.dids.length === 0) {
    return Response.json({ error: "dids must be a non-empty string array" }, { status: 400 });
  }

  try {
    const enqueued = await addRepos(body.dids);

    return Response.json({ ok: enqueued }, { status: enqueued ? 200 : 502 });
  } catch (error) {
    console.error("[indexer/add-repos] Failed to enqueue repos:", error);
    return Response.json({ error: "Failed to enqueue repos" }, { status: 500 });
  }
}
