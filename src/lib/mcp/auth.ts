import { createClient } from "@supabase/supabase-js";
import type { AuthInfo } from "@modelcontextprotocol/server";

// Who may use Myra's /mcp door. Same shared sign-in as Lineup: Claude logs in
// through the Supabase Auth OAuth 2.1 server of Ashley's identity project (the
// one Slowcart uses). One login covers every app's door.
//
// Myra's own accounts are keyed by the Google account ID (see src/lib/auth.ts),
// so the token's Google identity picks whose bucket list Claude sees. The ID
// comes from the Auth server's identity record, not from user_metadata, which
// a signed-in user could edit.
//
//   MCP_AUTH_SUPABASE_URL       identity project URL (default: Slowcart's)
//   MCP_AUTH_SUPABASE_ANON_KEY  its publishable key (default: Slowcart's)
//   MCP_ALLOWED_EMAILS          optional, comma-separated: only these emails
//                               get in. Unset = any Google account, each one
//                               seeing only its own Myra items.
//
// The defaults are public values (the same URL and key Slowcart ships to
// every browser), so the door works without new Vercel settings.

const SLOWCART_URL = "https://iivgfzbliuaobcvvneqw.supabase.co";
const SLOWCART_PUBLISHABLE_KEY = "sb_publishable_HS1W-NrAreZbdnJ7A5I_Cw_l7xzmdy-";

const AUTH_URL = process.env.MCP_AUTH_SUPABASE_URL || SLOWCART_URL;
const AUTH_ANON_KEY = process.env.MCP_AUTH_SUPABASE_ANON_KEY || SLOWCART_PUBLISHABLE_KEY;

/** The issuer Claude is sent to for a token (RFC 8414 metadata lives under it). */
export const AUTH_SERVER_URL = `${AUTH_URL}/auth/v1`;

const allowed = () =>
  (process.env.MCP_ALLOWED_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

export type MyraAuthExtra = { userId: string; email: string };

export async function verifyBearer(_req: Request, token?: string): Promise<AuthInfo | undefined> {
  if (!token || !AUTH_URL || !AUTH_ANON_KEY) return undefined;
  const supabase = createClient(AUTH_URL, AUTH_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // The Auth server checks the token and returns the user with their linked
  // identities (server-managed, unlike user_metadata).
  const { data, error } = await supabase.auth.getUser(token);
  const user = data?.user;
  if (error || !user) return undefined;

  const email = (user.email || "").toLowerCase();
  const list = allowed();
  if (list.length > 0 && !list.includes(email)) return undefined;

  const google = user.identities?.find((i) => i.provider === "google");
  const googleId =
    (google?.identity_data?.provider_id as string | undefined) ||
    (google?.identity_data?.sub as string | undefined) ||
    google?.id;
  // No Google identity means no Myra account to map to: closed, not open.
  if (!googleId) return undefined;

  const { data: claims } = await supabase.auth.getClaims(token);
  const c = (claims?.claims ?? {}) as Record<string, unknown>;
  return {
    token,
    clientId: typeof c.client_id === "string" ? c.client_id : "supabase",
    scopes: typeof c.scope === "string" ? c.scope.split(" ") : [],
    expiresAt: typeof c.exp === "number" ? c.exp : undefined,
    extra: { userId: googleId, email } satisfies MyraAuthExtra,
  };
}
