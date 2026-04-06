/**
 * Build a GainForest geo-viewer URL for a shapefile/GeoJSON.
 *
 * The indexer resolves all blob references to absolute URIs before returning
 * them via GraphQL, so callers always have a fetchable string URL to pass here.
 *
 * @param uri - A fully-resolved URL to a GeoJSON / shapefile blob.
 */
export function getShapefilePreviewUrl(uri: string): string {
  const base = "https://gainforest.app/geo/view?source-value=";
  return `${base}${encodeURIComponent(uri)}`;
}
