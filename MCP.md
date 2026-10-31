# Myra in Claude (MCP door)

Myra has a second door at `/mcp`, so Claude (or any MCP Apps host) can add to your bucket list and show it, with Myra's own cards inside the chat. It's additive: the web app and its `/api/*` routes are unchanged.

Live address: `https://myra-lac.vercel.app/mcp` (also shown on the **Connect Claude** page, account menu → Connect Claude).

## Tools

| Tool | Who can call it | What it does |
|---|---|---|
| `myra_board` | Claude + widget | The bucket list filtered by month, partner, local/travel, status or text. With a month, ideal first, then shoulder; skip months are left out. Widget: **cards · list · calendar** |
| `myra_show` | Claude + widget | One item as a card, by id or name |
| `myra_add` | Claude + widget | Adds an item (wishlist by default) and picks an Unsplash cover. Warns about a same-name item |
| `myra_update` | Claude + widget | Changes only the fields passed, including `status: "visited"` |
| `myra_photo_options` | **Widget only** | Unsplash choices for **Change photo** |
| `myra_set_photo` | **Widget only** | Saves the chosen cover (the newest photo is the cover, as in the web app) |
| `myra_set_planned` | **Widget only** | Plans or unplans a month from the month strip |

Month ratings come from `src/lib/best-time.ts`, the same rules as the web app's "Best time to go". There are no deletes. The cards follow the "Agent-ready apps — V0 mockups" (MyraAdd, MyraBoard). The map view from the mockup isn't built yet.

## Sign-in

Same shared login as Lineup: Claude signs in through **Slowcart's Supabase project** (its OAuth 2.1 server and `/oauth/consent` screen). `src/lib/mcp/auth.ts` reads the Google identity from the Auth server and uses its Google account ID as the Myra user ID, the same ID Myra's own Google sign-in uses. So each Google account sees only its own bucket list, and an account without a Google identity is refused.

### Settings

Nothing new to set in Vercel. Optional overrides (Vercel → myra → Environment Variables):

| Name | Default |
|---|---|
| `MCP_ALLOWED_EMAILS` | unset: any Google account, each seeing only its own items |
| `MCP_AUTH_SUPABASE_URL` / `MCP_AUTH_SUPABASE_ANON_KEY` | Slowcart's project |
| `NEXT_PUBLIC_SITE_URL` | the Vercel production URL (used for "Open in Myra" links) |

Cover photos need `UNSPLASH_ACCESS_KEY`, which the web app already uses.

The Supabase OAuth server must be on (Slowcart's `MCP.md` has the steps). Until then, Claude stops at the sign-in step for every app.

## Develop

```bash
npm run build:widget   # after editing mcp/widget/* (also runs on prebuild)
npx tsc --noEmit
```

## Known limits

- The widget bundle is ~600 KB, because the App SDK carries zod.
- Calendar chips use the city name when there is one.
