/**
 * Public URL resolution utilities.
 *
 * The public URL must be provided explicitly at initialization time by the
 * consuming app — this package does not read process.env directly.
 *
 * Note: Loopback detection is URL-based. This correctly handles ngrok/tunnel
 * URLs in development where NODE_ENV is 'development' but the URL is publicly
 * accessible.
 */

/** Sentinel value used during `next build` when no publicUrl is provided. */
export const PLACEHOLDER_URL = "https://placeholder.invalid";

/**
 * Normalize the public URL provided at setup time.
 *
 * Returns the PLACEHOLDER_URL sentinel when no URL is provided. This is
 * intentional: `next build` runs setup code at module-evaluation time before
 * any real URL is known. The sentinel is recognised by createAuthSetup() and
 * turned into a clear runtime error if the app is actually served without a
 * valid publicUrl.
 *
 * @param explicitUrl - The URL resolved by the consuming app (e.g. from VERCEL_URL).
 */
export function resolvePublicUrl(explicitUrl?: string): string {
  if (explicitUrl) {
    return explicitUrl.replace(/\/$/, "");
  }
  return PLACEHOLDER_URL;
}

/**
 * Returns true if the given URL is a loopback address (127.0.0.1 or localhost).
 *
 * Used to select between the loopback OAuth client (RFC 8252 native app)
 * and the production web OAuth client.
 */
export function isLoopback(url: string): boolean {
  return url.includes("127.0.0.1") || url.includes("localhost");
}

/**
 * Derives the public base URL from an incoming NextRequest.
 *
 * Uses the request's own URL (which Vercel sets correctly per-deployment),
 * falling back to the configured publicUrl. This ensures that OAuth
 * redirect_uris and client_ids always match the deployment the user is
 * actually on, not a hardcoded URL baked in at build time.
 *
 * Loopback normalisation: Next.js dev server always binds to `localhost`
 * internally, so `req.url` may contain `localhost` even when the browser
 * navigated to `127.0.0.1`. RFC 8252 (and ePDS) require loopback
 * redirect_uris to use `127.0.0.1`, so we replace `localhost` with
 * `127.0.0.1` for any loopback origin.
 */
export function resolveRequestPublicUrl(
  req: { url: string },
  fallbackPublicUrl: string,
): string {
  try {
    const parsed = new URL(req.url);
    // Use the origin (protocol + host) of the actual incoming request,
    // normalising localhost → 127.0.0.1 so ePDS redirect_uri validation passes.
    const origin = parsed.origin.replace("localhost", "127.0.0.1");
    return origin;
  } catch {
    return fallbackPublicUrl;
  }
}
