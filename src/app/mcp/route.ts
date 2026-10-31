import { createMcpHandler, withMcpAuth } from "mcp-handler";
import {
  registerAppResource,
  registerAppTool,
  RESOURCE_MIME_TYPE,
} from "@modelcontextprotocol/ext-apps/server";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { experiences } from "@/db/schema";
import { verifyBearer, type MyraAuthExtra } from "@/lib/mcp/auth";
import {
  board,
  boardText,
  itemText,
  loadItem,
  loadItems,
  searchPhotos,
  setCover,
  type ItemResult,
} from "@/lib/mcp/data";
import { WIDGET_HTML } from "@/lib/mcp/widget-html.generated";
import { MONTHS } from "@/lib/best-time";
import { DO_BY_AGES, LOCALITIES, PARTNER_TYPES, SEASONS } from "@/lib/types";

// Myra's door for Claude (and any MCP Apps host). Additive: it reads and
// writes the same experiences table as the web app, scoped to the signed-in
// Google account (src/lib/mcp/auth.ts). See MCP.md.

export const dynamic = "force-dynamic";

const WIDGET_URI = "ui://myra/app.html";

const text = (t: string) => ({ content: [{ type: "text" as const, text: t }] });
const failed = (e: unknown) => ({
  isError: true,
  ...text(e instanceof Error ? e.message : "Something went wrong reading Myra."),
});

type Ctx = { http?: { authInfo?: { extra?: Record<string, unknown> } } };
function userOf(ctx: Ctx) {
  const id = (ctx.http?.authInfo?.extra as MyraAuthExtra | undefined)?.userId;
  if (!id) throw new Error("Not signed in to Myra.");
  return id;
}

const season = z.enum(SEASONS as [string, ...string[]]);
const partner = z.enum(PARTNER_TYPES as [string, ...string[]]);
const month = z.enum(MONTHS as [string, ...string[]]);
const locality = z.enum(LOCALITIES as [string, ...string[]]);

// Fields shared by add and update.
const details = {
  description: z.string().max(2000).optional().describe("Why it's on the list, what to do there, a practical tip."),
  city: z.string().max(200).optional().describe("City, town or area, e.g. 'Cotswolds'."),
  country: z.string().max(200).optional().describe("Country, e.g. 'United Kingdom'."),
  idealSeasons: z.array(season).optional().describe("Best seasons to go."),
  bestMonths: z
    .string()
    .max(200)
    .optional()
    .describe("Best months as text, e.g. 'September to November'. Drives the month strip, so fill it in when you know it."),
  idealPartnerTypes: z.array(partner).optional().describe("Who it's best with."),
  plannedMonths: z.array(month).optional().describe("Months the user plans or hopes to go."),
  locality: locality.optional().describe("'local' = near home (day trip), 'travel' = needs a trip."),
  estimatedDays: z.number().int().min(1).max(365).optional().describe("Days needed."),
  estimatedBudget: z.string().max(200).optional().describe("Free text, e.g. '$2,000' or 'mid-range'."),
  doByAge: z.enum(DO_BY_AGES as [string, ...string[]]).optional().describe("Do-by-age goal."),
};

function toRow(f: Record<string, unknown>) {
  const row: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(f)) {
    if (v === undefined) continue;
    row[k] = Array.isArray(v) ? v.join(",") : v;
  }
  return row;
}

async function itemResult(userId: string, id: number, note?: string) {
  const item = await loadItem(userId, id);
  if (!item) return failed(new Error(`No bucket list item with id ${id}.`));
  const result: ItemResult = { kind: "item", item, photoOptions: [], ...(note && { note }) };
  return { ...text(itemText(item) + (note ? `\n${note}` : "")), structuredContent: result };
}

const handler = createMcpHandler(
  (server) => {
    registerAppTool(
      server,
      "myra_board",
      {
        title: "Show my bucket list",
        description:
          "The user's Myra bucket list as a board, filtered by month, who they're going with, local vs travel, or text. " +
          'Use for "what\'s ideal for March with my partner?", "show my wishlist", "what have I done in Japan?". ' +
          "With a month, items are ranked ideal first, then shoulder; skip months are left out. " +
          "The widget switches cards, list and calendar. Then add your own judgment in a sentence or two (what's timely, what pairs well).",
        inputSchema: z.object({
          month: month.optional(),
          partner: partner.optional(),
          locality: locality.optional(),
          status: z.enum(["wishlist", "visited", "all"]).optional().describe("Default wishlist."),
          search: z.string().max(100).optional().describe("Text in the name, city or country."),
          view: z.enum(["cards", "list", "calendar"]).optional(),
        }),
        annotations: { readOnlyHint: true, openWorldHint: false },
        _meta: { ui: { resourceUri: WIDGET_URI } },
      },
      async ({ view, ...filters }, ctx) => {
        try {
          const b = board(await loadItems(userOf(ctx as Ctx)), filters, view);
          return { ...text(boardText(b)), structuredContent: b };
        } catch (e) {
          return failed(e);
        }
      },
    );

    registerAppTool(
      server,
      "myra_show",
      {
        title: "Show a bucket list item",
        description:
          "One bucket list item as a card: photo, best months, planned months, and which friends want to go. " +
          "Pass the id from myra_board, or a name to search for.",
        inputSchema: z.object({
          id: z.number().int().optional(),
          name: z.string().max(200).optional(),
        }),
        annotations: { readOnlyHint: true, openWorldHint: false },
        _meta: { ui: { resourceUri: WIDGET_URI } },
      },
      async ({ id, name }, ctx) => {
        try {
          const userId = userOf(ctx as Ctx);
          let target = id;
          if (!target && name) {
            const q = name.toLowerCase();
            target = (await loadItems(userId)).find((i) => `${i.name} ${i.place}`.toLowerCase().includes(q))?.id;
          }
          if (!target) return failed(new Error("Pass an id or a name that's on the list."));
          return await itemResult(userId, target);
        } catch (e) {
          return failed(e);
        }
      },
    );

    registerAppTool(
      server,
      "myra_add",
      {
        title: "Add to my bucket list",
        description:
          "Add a place or experience to the user's Myra wishlist. Fill in what you reasonably know, especially country, " +
          "bestMonths, seasons, days and who it's best with, so the card's month strip is useful. Myra picks a cover photo " +
          "from Unsplash (photoQuery overrides the search). Set status 'visited' only if the user says they've done it. " +
          "After adding, say what you filled in so the user can check it.",
        inputSchema: z.object({
          name: z.string().min(1).max(200).describe("Short name, e.g. 'Autumn in the Cotswolds'."),
          ...details,
          status: z.enum(["wishlist", "visited"]).optional(),
          photoQuery: z.string().max(100).optional().describe("Unsplash search for the cover, e.g. 'Cotswolds autumn village'."),
        }),
        annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
        _meta: { ui: { resourceUri: WIDGET_URI } },
      },
      async ({ name, status, photoQuery, ...fields }, ctx) => {
        try {
          const userId = userOf(ctx as Ctx);
          const same = (await loadItems(userId)).filter((i) => i.name.toLowerCase() === name.toLowerCase());
          const [row] = await db
            .insert(experiences)
            .values({ userId, name, status: status ?? "wishlist", ...toRow(fields) } as typeof experiences.$inferInsert)
            .returning({ id: experiences.id });

          const [photo] = await searchPhotos(photoQuery || [name, fields.city, fields.country].filter(Boolean).join(" "), 1);
          if (photo) await setCover(userId, row.id, photo);

          const note = same.length
            ? `An item with the same name was already on the list (id ${same.map((i) => i.id).join(", ")}). Ask the user if it's a duplicate.`
            : undefined;
          return await itemResult(userId, row.id, note);
        } catch (e) {
          return failed(e);
        }
      },
    );

    registerAppTool(
      server,
      "myra_update",
      {
        title: "Update a bucket list item",
        description:
          "Change details of an existing item; only the fields you pass change. Use status 'visited' when the user has been. " +
          "Find the id with myra_board or myra_show first.",
        inputSchema: z.object({
          id: z.number().int(),
          name: z.string().min(1).max(200).optional(),
          ...details,
          status: z.enum(["wishlist", "visited"]).optional(),
        }),
        annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
        _meta: { ui: { resourceUri: WIDGET_URI } },
      },
      async ({ id, ...fields }, ctx) => {
        try {
          const userId = userOf(ctx as Ctx);
          const set = toRow(fields);
          if (Object.keys(set).length === 0) return failed(new Error("Nothing to update: pass at least one field."));
          const rows = await db
            .update(experiences)
            .set(set)
            .where(and(eq(experiences.id, id), eq(experiences.userId, userId)))
            .returning({ id: experiences.id });
          if (rows.length === 0) return failed(new Error(`No bucket list item with id ${id}.`));
          return await itemResult(userId, id);
        } catch (e) {
          return failed(e);
        }
      },
    );

    // ── Widget-only. The model can't call these; they fire after a tap. ──

    registerAppTool(
      server,
      "myra_photo_options",
      {
        description: "Unsplash photo choices for an item's cover. Called by the card's Change photo button.",
        inputSchema: z.object({ query: z.string().min(1).max(100) }),
        annotations: { readOnlyHint: true, openWorldHint: true },
        _meta: { ui: { resourceUri: WIDGET_URI, visibility: ["app"] } },
      },
      async ({ query }) => {
        const photos = await searchPhotos(query, 6);
        return { ...text(`${photos.length} photos.`), structuredContent: { photos } };
      },
    );

    registerAppTool(
      server,
      "myra_set_photo",
      {
        description: "Make a photo the item's cover. Called when the user picks one.",
        inputSchema: z.object({
          id: z.number().int(),
          photo: z.object({
            unsplashId: z.string().max(100),
            url: z.string().url().max(1000),
            thumbUrl: z.string().url().max(1000),
            altDescription: z.string().max(500).nullable(),
            photographerName: z.string().max(200),
            photographerUrl: z.string().url().max(1000),
          }),
        }),
        annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
        _meta: { ui: { resourceUri: WIDGET_URI, visibility: ["app"] } },
      },
      async ({ id, photo }, ctx) => {
        try {
          const ok = await setCover(userOf(ctx as Ctx), id, photo);
          if (!ok) return failed(new Error("No such item."));
          return { ...text("Cover photo saved."), structuredContent: { id, saved: "photo" } };
        } catch (e) {
          return failed(e);
        }
      },
    );

    registerAppTool(
      server,
      "myra_set_planned",
      {
        description: "Plan or unplan a month for an item. Called when the user taps a month on the strip.",
        inputSchema: z.object({ id: z.number().int(), month, planned: z.boolean() }),
        annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
        _meta: { ui: { resourceUri: WIDGET_URI, visibility: ["app"] } },
      },
      async ({ id, month: m, planned }, ctx) => {
        try {
          const userId = userOf(ctx as Ctx);
          const item = await loadItem(userId, id);
          if (!item) return failed(new Error("No such item."));
          const next = new Set(item.planned);
          if (planned) next.add(m);
          else next.delete(m);
          const ordered = MONTHS.filter((x) => next.has(x));
          await db
            .update(experiences)
            .set({ plannedMonths: ordered.join(",") })
            .where(and(eq(experiences.id, id), eq(experiences.userId, userId)));
          return { ...text(`Planned: ${ordered.join(", ") || "none"}.`), structuredContent: { id, planned: ordered } };
        } catch (e) {
          return failed(e);
        }
      },
    );

    registerAppResource(server, "Myra", WIDGET_URI, {}, async () => ({
      contents: [
        {
          uri: WIDGET_URI,
          mimeType: RESOURCE_MIME_TYPE,
          text: WIDGET_HTML,
          _meta: {
            ui: {
              // Newsreader + Inter (Myra's type) and Unsplash covers.
              csp: {
                resourceDomains: [
                  "https://fonts.googleapis.com",
                  "https://fonts.gstatic.com",
                  "https://images.unsplash.com",
                ],
              },
              prefersBorder: false,
            },
          },
        },
      ],
    }));
  },
  { serverInfo: { name: "myra", version: "1.0.0" } },
);

// The 401 challenge points at this route's own metadata, whose `resource` is
// the /mcp URL Claude asks the auth server for a token to.
const authed = withMcpAuth(handler, verifyBearer, {
  required: true,
  resourceMetadataPath: "/.well-known/oauth-protected-resource/mcp",
});

export { authed as GET, authed as POST, authed as DELETE };
