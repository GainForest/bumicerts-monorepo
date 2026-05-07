import { useMemo } from "react";
import type { AudioRecordingItem, CertifiedLocation, OccurrenceItem } from "@/lib/graphql-dev/queries";
import { indexerTrpc } from "@/lib/trpc/indexer/client";
import { parseAttachmentContent } from "../../../shared/attachmentContentParser";
import { parseAtUri } from "./atUri";
import {
  buildResolvedReference,
  type ResolvedAttachmentReference,
} from "./referenceViewModel";

export function useResolvedAttachmentReferences(content: unknown): {
  references: ResolvedAttachmentReference[];
  isLoading: boolean;
} {
  const atUris = useMemo(() => {
    const parsedItems = parseAttachmentContent(content);
    const uris = parsedItems.flatMap((item) =>
      item.kind === "uri" && item.uriKind === "at-uri" ? [item.uri] : [],
    );
    return Array.from(new Set(uris));
  }, [content]);

  const parsedUris = useMemo(
    () => atUris.map((uri) => ({ uri, parsed: parseAtUri(uri) })),
    [atUris],
  );

  const audioDids = useMemo(
    () =>
      Array.from(
        new Set(
          parsedUris.flatMap(({ parsed }) =>
            parsed?.collection === "app.gainforest.ac.audio" ? [parsed.did] : [],
          ),
        ),
      ),
    [parsedUris],
  );

  const occurrenceDids = useMemo(
    () =>
      Array.from(
        new Set(
          parsedUris.flatMap(({ parsed }) =>
            parsed?.collection === "app.gainforest.dwc.occurrence"
              ? [parsed.did]
              : [],
          ),
        ),
      ),
    [parsedUris],
  );

  const locationRefs = useMemo(
    () =>
      parsedUris.flatMap(({ uri, parsed }) =>
        parsed?.collection === "app.certified.location"
          ? [{ uri, did: parsed.did, rkey: parsed.rkey }]
          : [],
      ),
    [parsedUris],
  );

  const audioQueries = indexerTrpc.useQueries((t) =>
    audioDids.map((did) => t.audio.list({ did })),
  );
  const occurrenceQueries = indexerTrpc.useQueries((t) =>
    occurrenceDids.map((did) => t.dwc.occurrences({ did })),
  );
  const locationQueries = indexerTrpc.useQueries((t) =>
    locationRefs.map((ref) => t.locations.list({ did: ref.did, rkey: ref.rkey })),
  );

  const audioByUri = useMemo(() => {
    const map = new Map<string, AudioRecordingItem>();
    for (const query of audioQueries) {
      for (const item of query.data ?? []) {
        const uri = item.metadata?.uri;
        if (uri) {
          map.set(uri, item);
        }
      }
    }
    return map;
  }, [audioQueries]);

  const occurrenceByUri = useMemo(() => {
    const map = new Map<string, OccurrenceItem>();
    for (const query of occurrenceQueries) {
      for (const item of query.data ?? []) {
        const uri = item.metadata?.uri;
        if (uri) {
          map.set(uri, item);
        }
      }
    }
    return map;
  }, [occurrenceQueries]);

  const locationByUri = useMemo(() => {
    const map = new Map<string, CertifiedLocation>();
    locationRefs.forEach((ref, index) => {
      const first = locationQueries[index]?.data?.[0];
      if (first) {
        map.set(ref.uri, first);
      }
    });
    return map;
  }, [locationQueries, locationRefs]);

  const references = useMemo<ResolvedAttachmentReference[]>(() => {
    return parsedUris.map(({ uri, parsed }) => {
      return buildResolvedReference({
        uri,
        parsed,
        audio: audioByUri.get(uri),
        occurrence: occurrenceByUri.get(uri),
        location: locationByUri.get(uri),
      });
    });
  }, [audioByUri, locationByUri, occurrenceByUri, parsedUris]);

  const isLoading =
    audioQueries.some((query) => query.isLoading) ||
    occurrenceQueries.some((query) => query.isLoading) ||
    locationQueries.some((query) => query.isLoading);

  return { references, isLoading };
}
