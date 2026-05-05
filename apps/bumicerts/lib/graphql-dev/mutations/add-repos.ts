import { createGraphQLClient } from "@/lib/graphql-dev/client";
import { graphql } from "@/lib/graphql-dev/tada";
import { links } from "@/lib/links";

const addReposDocument = graphql(`
  mutation AddRepos($dids: [String!]!) {
    addRepos(dids: $dids)
  }
`);

export async function addRepos(dids: string[]): Promise<boolean> {
  const client = createGraphQLClient();

  // Fire and forget
  client.request(addReposDocument, {
    dids,
  });

  return true;
}

export async function addReposViaLocalRoute(dids: string[]): Promise<void> {
  const response = await fetch(links.api.indexer.addRepos, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ dids }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Failed to enqueue repos (${response.status}): ${errorText || "No response body"}`,
    );
  }
}
