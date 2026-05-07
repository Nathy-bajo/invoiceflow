import postgres from "postgres";

let _sql: ReturnType<typeof postgres> | null = null;

/**
 * Singleton Postgres client. Lazy so importing this module on the client
 * (which can't have `pg` resolve cleanly) is harmless — the connection
 * only opens on the first server-side query.
 *
 * `max: 1` because Vercel functions tear down on cold start; reusing one
 * connection per invocation avoids leaking pool members.
 */
export function db(): ReturnType<typeof postgres> {
  if (_sql) return _sql;
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL not set — see app/.env.example for setup instructions"
    );
  }
  _sql = postgres(url, {
    max: 1,
    idle_timeout: 20,
    connect_timeout: 10,
    // Force prepared statements off for serverless — they leak across
    // function invocations on shared connections.
    prepare: false,
  });
  return _sql;
}

/** Returns true iff DATABASE_URL is configured. Used by routes to gracefully
 *  degrade to "no DB configured" rather than 500-erroring. */
export function dbConfigured(): boolean {
  return !!process.env.DATABASE_URL;
}
