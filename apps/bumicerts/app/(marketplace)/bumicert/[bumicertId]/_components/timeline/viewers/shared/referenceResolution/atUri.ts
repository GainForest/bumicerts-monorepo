export interface ParsedAtUri {
  did: string;
  collection: string;
  rkey: string;
}

export function parseAtUri(uri: string): ParsedAtUri | null {
  const match = uri.match(/^at:\/\/([^/]+)\/([^/]+)\/([^/]+)$/);
  if (!match) {
    return null;
  }

  return {
    did: match[1],
    collection: match[2],
    rkey: match[3],
  };
}

export function isCertifiedLocationRecordUri(
  uri: string,
): uri is `at://did:plc:${string}/app.certified.location/${string}` {
  const parsed = parseAtUri(uri);
  return (
    parsed?.did.startsWith("did:plc:") === true &&
    parsed.collection === "app.certified.location" &&
    parsed.rkey.length > 0
  );
}
