/**
 * Health Check Endpoint
 *
 * Used by E2E tests to verify the application is ready before running tests.
 * Can be extended with additional checks (database, external services, etc.)
 *
 * @example
 * ```ts
 * const res = await fetch('http://localhost:3001/api/health');
 * const data = await res.json();
 * // { status: "ok", timestamp: "2024-01-01T00:00:00.000Z" }
 * ```
 */

export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json({
    status: "ok",
    timestamp: new Date().toISOString(),
  });
}
