import postgres from "postgres";

// Validate required environment variable
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL environment variable is required");
}

/**
 * PostgreSQL connection pool using the `postgres` library (porsager).
 * This is the fastest PostgreSQL client available for Bun/Node.js.
 *
 * The `sql` tagged template literal is the primary interface:
 *   const rows = await sql`SELECT * FROM records WHERE did = ${did}`
 */
export const sql = postgres(connectionString, {
  // Connection pool
  max: 20,              // Maximum pool connections
  idle_timeout: 30,     // Close idle connections after 30s
  connect_timeout: 10,  // Fail after 10s if can't connect

  // Performance
  prepare: true,        // Use prepared statements for repeated queries

  // Logging (only in debug mode)
  debug: process.env.LOG_LEVEL === "debug"
    ? (_connection, query, params) => {
        console.debug("[db]", query, params);
      }
    : false,
});

/**
 * Gracefully close the connection pool.
 * Call this during application shutdown.
 */
export async function closeDb(): Promise<void> {
  await sql.end({ timeout: 5 });
}
