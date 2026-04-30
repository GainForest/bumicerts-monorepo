import { createGraphQLClient } from "@/lib/graphql-dev/client";
import { graphql } from "@/lib/graphql-dev/tada";

const addReposDocument = graphql(`
  mutation AddRepos($dids: [String!]!) {
    addRepos(dids: $dids)
  }
`);

export async function addRepos(dids: string[]): Promise<boolean> {
  const client = createGraphQLClient();
  const response = await client.request(addReposDocument, {
    dids,
  });

  return response.addRepos === true;
}

export async function addReposViaLocalRoute(dids: string[]): Promise<void> {
  await fetch("/api/indexer/add-repos", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ dids }),
  });
}
