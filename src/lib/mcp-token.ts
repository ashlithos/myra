import { createHash, randomBytes } from "crypto";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { mcpTokens } from "@/db/schema";

// The table is created on demand so it works on both local SQLite and Turso
// without a separate migration step (same approach as src/instrumentation.ts).
let tableReady: Promise<void> | null = null;

function ensureTable() {
  if (!tableReady) {
    tableReady = (async () => {
      await db.run(sql`
        CREATE TABLE IF NOT EXISTS mcp_tokens (
          id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
          user_id text NOT NULL UNIQUE,
          token_hash text NOT NULL UNIQUE,
          created_at text NOT NULL,
          last_used_at text
        )
      `);
    })().catch((e) => {
      tableReady = null;
      throw e;
    });
  }
  return tableReady;
}

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

/** Status of the user's Claude key, without revealing it. */
export async function getTokenStatus(userId: string) {
  await ensureTable();
  const rows = await db
    .select({ createdAt: mcpTokens.createdAt, lastUsedAt: mcpTokens.lastUsedAt })
    .from(mcpTokens)
    .where(eq(mcpTokens.userId, userId));
  return rows[0] ?? null;
}

/**
 * Creates a new key for the user, replacing any existing one (so an old,
 * leaked link stops working). Returns the plain key — it is never stored.
 */
export async function createToken(userId: string) {
  await ensureTable();
  const token = "myra_" + randomBytes(32).toString("base64url");
  await db.delete(mcpTokens).where(eq(mcpTokens.userId, userId));
  await db.insert(mcpTokens).values({ userId, tokenHash: hashToken(token) });
  return token;
}

export async function revokeToken(userId: string) {
  await ensureTable();
  await db.delete(mcpTokens).where(eq(mcpTokens.userId, userId));
}

/** Returns the user ID that owns this key, or null if the key is unknown. */
export async function resolveToken(token: string | null | undefined) {
  if (!token || !token.startsWith("myra_")) return null;
  await ensureTable();
  const tokenHash = hashToken(token);
  const rows = await db
    .select({ userId: mcpTokens.userId })
    .from(mcpTokens)
    .where(eq(mcpTokens.tokenHash, tokenHash));
  const userId = rows[0]?.userId ?? null;
  if (userId) {
    // Best effort: record usage so the settings page can show "last used".
    db.update(mcpTokens)
      .set({ lastUsedAt: new Date().toISOString() })
      .where(eq(mcpTokens.tokenHash, tokenHash))
      .catch(() => {});
  }
  return userId;
}
