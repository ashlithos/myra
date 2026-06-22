import { db } from "@/db";
import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getUser, unauthorized } from "@/lib/get-user";

// One-time endpoint: creates buddies + affinities tables on Turso if they don't exist.
// Safe to call multiple times (IF NOT EXISTS). Remove after first successful run.
export async function GET() {
  const user = await getUser();
  if (!user) return unauthorized();

  await db.run(sql`
    CREATE TABLE IF NOT EXISTS \`buddies\` (
      \`id\` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
      \`user_id\` text NOT NULL,
      \`name\` text NOT NULL,
      \`created_at\` text NOT NULL
    )
  `);

  await db.run(sql`
    CREATE TABLE IF NOT EXISTS \`affinities\` (
      \`id\` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
      \`buddy_id\` integer NOT NULL,
      \`experience_id\` integer NOT NULL,
      \`tier\` text NOT NULL,
      \`updated_at\` text NOT NULL,
      FOREIGN KEY (\`buddy_id\`) REFERENCES \`buddies\`(\`id\`) ON DELETE CASCADE,
      FOREIGN KEY (\`experience_id\`) REFERENCES \`experiences\`(\`id\`) ON DELETE CASCADE
    )
  `);

  return NextResponse.json({ ok: true, message: "Tables created (or already existed)" });
}
