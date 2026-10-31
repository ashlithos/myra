import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { and, eq, like, or } from "drizzle-orm";
import { db } from "@/db";
import { experiences } from "@/db/schema";
import { DO_BY_AGES, LOCALITIES, PARTNER_TYPES, SEASONS } from "@/lib/types";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
] as const;

type Experience = typeof experiences.$inferSelect;

function list(value: string | null | undefined) {
  return value ? value.split(",").map((s) => s.trim()).filter(Boolean) : [];
}

/** Compact, readable shape for Claude (arrays instead of comma strings, no empty fields). */
function present(e: Experience) {
  const out: Record<string, unknown> = {
    id: e.id,
    name: e.name,
    status: e.status,
  };
  if (e.city) out.city = e.city;
  if (e.country) out.country = e.country;
  if (e.description) out.description = e.description;
  if (e.idealSeasons) out.idealSeasons = list(e.idealSeasons);
  if (e.idealPartnerTypes) out.idealPartnerTypes = list(e.idealPartnerTypes);
  if (e.plannedMonths) out.plannedMonths = list(e.plannedMonths);
  if (e.bestMonths) out.bestMonths = e.bestMonths;
  if (e.locality) out.locality = e.locality;
  if (e.estimatedDays) out.estimatedDays = e.estimatedDays;
  if (e.estimatedBudget) out.estimatedBudget = e.estimatedBudget;
  if (e.doByAge) out.doByAge = e.doByAge;
  out.addedAt = e.createdAt;
  return out;
}

function json(data: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
}

function error(message: string) {
  return { content: [{ type: "text" as const, text: message }], isError: true };
}

// Fields shared by "add" and "update".
const detailFields = {
  description: z.string().max(2000).optional().describe("Why it's on the list, what to do there, notes."),
  city: z.string().max(200).optional().describe("City or area, e.g. 'Kyoto'."),
  country: z.string().max(200).optional().describe("Country, e.g. 'Japan'."),
  idealSeasons: z.array(z.enum(SEASONS as [string, ...string[]])).optional()
    .describe("Best seasons to go."),
  idealPartnerTypes: z.array(z.enum(PARTNER_TYPES as [string, ...string[]])).optional()
    .describe("Who it's best with."),
  plannedMonths: z.array(z.enum(MONTHS)).optional()
    .describe("Months the user plans or hopes to go (shows on the Calendar view)."),
  bestMonths: z.string().max(200).optional().describe("Free text, e.g. 'late March to early April'."),
  locality: z.enum(LOCALITIES as [string, ...string[]]).optional()
    .describe("'local' = near home (day trip), 'travel' = needs a trip."),
  estimatedDays: z.number().int().min(1).max(365).optional().describe("Days needed."),
  estimatedBudget: z.string().max(200).optional().describe("Free text, e.g. '$2,000' or 'mid-range'."),
  doByAge: z.enum(DO_BY_AGES as [string, ...string[]]).optional().describe("Do-by-age goal."),
};

export function createMyraMcpServer(userId: string) {
  const server = new McpServer({ name: "myra", version: "1.0.0" });

  server.registerTool(
    "list_bucket_list",
    {
      title: "List bucket list",
      description:
        "List places and experiences in the user's Myra bucket list. " +
        "Use status 'wishlist' for places they want to go, 'visited' for places they've been.",
      inputSchema: {
        status: z.enum(["wishlist", "visited", "all"]).default("all"),
        search: z.string().optional().describe("Optional text to match against name, city or country."),
      },
      annotations: { readOnlyHint: true },
    },
    async ({ status, search }) => {
      const conditions = [eq(experiences.userId, userId)];
      if (status !== "all") conditions.push(eq(experiences.status, status));
      if (search) {
        const q = `%${search}%`;
        conditions.push(
          or(like(experiences.name, q), like(experiences.city, q), like(experiences.country, q))!
        );
      }
      const rows: Experience[] = await db.select().from(experiences).where(and(...conditions));
      return json({ count: rows.length, items: rows.map(present) });
    }
  );

  server.registerTool(
    "add_to_wishlist",
    {
      title: "Add to wishlist",
      description:
        "Add a place or experience to the user's Myra wishlist. Fill in as many details as you " +
        "reasonably know (country, best seasons, days needed) so the item is useful in the app. " +
        "Set status to 'visited' only if the user says they've already done it.",
      inputSchema: {
        name: z.string().min(1).max(200).describe("Short name, e.g. 'Cherry blossoms in Kyoto'."),
        ...detailFields,
        status: z.enum(["wishlist", "visited"]).default("wishlist"),
      },
    },
    async (args) => {
      const existing: Experience[] = await db
        .select()
        .from(experiences)
        .where(and(eq(experiences.userId, userId), like(experiences.name, args.name)));

      const [row]: Experience[] = await db
        .insert(experiences)
        .values({
          userId,
          name: args.name,
          description: args.description ?? null,
          city: args.city ?? null,
          country: args.country ?? "",
          idealSeasons: (args.idealSeasons ?? []).join(","),
          idealPartnerTypes: (args.idealPartnerTypes ?? []).join(","),
          plannedMonths: (args.plannedMonths ?? []).join(","),
          bestMonths: args.bestMonths ?? null,
          locality: args.locality ?? "",
          estimatedDays: args.estimatedDays ?? null,
          estimatedBudget: args.estimatedBudget ?? null,
          doByAge: args.doByAge ?? null,
          status: args.status,
        })
        .returning();

      return json({
        added: present(row),
        ...(existing.length > 0 && {
          note: `An item with the same name already existed (id ${existing.map((e) => e.id).join(", ")}). ` +
            "Tell the user in case it's a duplicate.",
        }),
      });
    }
  );

  server.registerTool(
    "update_bucket_list_item",
    {
      title: "Update bucket list item",
      description:
        "Change details of an existing bucket list item. Only the fields you pass are changed. " +
        "Use list_bucket_list first to find the id.",
      inputSchema: {
        id: z.number().int().describe("Item id from list_bucket_list."),
        name: z.string().min(1).max(200).optional(),
        ...detailFields,
        status: z.enum(["wishlist", "visited"]).optional(),
      },
      annotations: { idempotentHint: true },
    },
    async ({ id, ...fields }) => {
      const set: Partial<typeof experiences.$inferInsert> = {};
      for (const [key, value] of Object.entries(fields)) {
        if (value === undefined) continue;
        // Array fields are stored as comma-separated strings.
        (set as Record<string, unknown>)[key] = Array.isArray(value) ? value.join(",") : value;
      }
      if (Object.keys(set).length === 0) return error("Nothing to update: pass at least one field.");

      const rows: Experience[] = await db
        .update(experiences)
        .set(set)
        .where(and(eq(experiences.id, id), eq(experiences.userId, userId)))
        .returning();
      if (rows.length === 0) return error(`No bucket list item with id ${id}.`);
      return json({ updated: present(rows[0]) });
    }
  );

  server.registerTool(
    "mark_as_visited",
    {
      title: "Mark as visited",
      description: "Move a wishlist item to 'visited' once the user has been there.",
      inputSchema: { id: z.number().int().describe("Item id from list_bucket_list.") },
      annotations: { idempotentHint: true },
    },
    async ({ id }) => {
      const rows: Experience[] = await db
        .update(experiences)
        .set({ status: "visited" })
        .where(and(eq(experiences.id, id), eq(experiences.userId, userId)))
        .returning();
      if (rows.length === 0) return error(`No bucket list item with id ${id}.`);
      return json({ updated: present(rows[0]) });
    }
  );

  return server;
}
