import postgres from "postgres";

let _sql: ReturnType<typeof postgres> | null = null;

/** Lazy singleton Postgres client. `max: 1` for serverless safety. */
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

/** True iff DATABASE_URL is set — routes use this to fall back gracefully. */
export function dbConfigured(): boolean {
  return !!process.env.DATABASE_URL;
}
