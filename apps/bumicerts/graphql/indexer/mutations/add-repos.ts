import { links } from "@/lib/links";

export async function addRepos(dids: string[]): Promise<boolean> {
  void dids;

  // Temporary no-op until the indexer exposes a supported repo-enqueue mutation.
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
