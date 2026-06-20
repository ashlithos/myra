export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs" && process.env.TURSO_DATABASE_URL) {
    try {
      const { createClient } = await import("@libsql/client");
      const client = createClient({
        url: process.env.TURSO_DATABASE_URL,
        authToken: process.env.TURSO_AUTH_TOKEN,
      });
      await client.execute(`
        CREATE TABLE IF NOT EXISTS buddies (
          id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
          user_id text NOT NULL,
          name text NOT NULL,
          emoji text NOT NULL DEFAULT '🌍',
          created_at text NOT NULL
        )
      `);
      // Add emoji column to existing tables that predate this field
      try {
        await client.execute(`ALTER TABLE buddies ADD COLUMN emoji text NOT NULL DEFAULT '🌍'`);
      } catch {
        // Column already exists — safe to ignore
      }
      await client.execute(`
        CREATE TABLE IF NOT EXISTS affinities (
          id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
          buddy_id integer NOT NULL REFERENCES buddies(id) ON DELETE CASCADE,
          experience_id integer NOT NULL REFERENCES experiences(id) ON DELETE CASCADE,
          tier text NOT NULL,
          updated_at text NOT NULL
        )
      `);
      client.close();
    } catch (e) {
      console.error("[instrumentation] migration error:", e);
    }
  }
}
