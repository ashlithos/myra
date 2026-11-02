// Myra's widget inside Claude: the item card (myra_add / myra_show /
// myra_update) and the bucket list board (myra_board) with cards, list and
// calendar views. One bundle serves both; the tool result's `kind` picks the
// screen. Designs: the "Agent-ready apps — V0 mockups" (MyraAdd, MyraBoard).
//
// Built into a self-contained HTML string by scripts/build-mcp-widget.mjs.
// User text is always written with textContent, never innerHTML.

import { App } from "@modelcontextprotocol/ext-apps/app-with-deps";
import type { Board, Item, ItemResult, Photo } from "@/lib/mcp/data";

type Result = ItemResult | Board;

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const INITIAL = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];
const TIER_LABEL: Record<string, string> = {
  "take-me-there": "Take me there",
  interested: "Interested",
  open: "Open",
};

const app = new App({ name: "Myra", version: "1.0.0" });
const root = document.getElementById("root")!;

let result: Result | null = null;
let view: Board["view"] = "cards";
let openItem: Item | null = null; // an item opened from the board
let pickerOpen = false;
let photoOptions: Photo[] | null = null;
let whoOpen = false;
let toast: string | null = null;

type Child = Node | string | null | undefined | false;
function el(tag: string, attrs: Record<string, string | ((e: Event) => void)> = {}, ...kids: Child[]): HTMLElement {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (typeof v === "function") n.addEventListener(k, v);
    else n.setAttribute(k, v);
  }
  for (const c of kids) if (c != null && c !== false) n.append(typeof c === "string" ? document.createTextNode(c) : c);
  return n;
}

function bg(node: HTMLElement, url?: string | null) {
  if (url) node.style.backgroundImage = `url(${JSON.stringify(url)})`;
  return node;
}

async function call(name: string, args: Record<string, unknown>) {
  const res = await app.callServerTool({ name, arguments: args });
  if (res.isError) throw new Error("save failed");
  return res.structuredContent as Record<string, unknown> | undefined;
}

function tell(text: string) {
  void app.updateModelContext({ content: [{ type: "text", text }] });
}

function open(url: string) {
  void app.openLink({ url });
}

/** "Sep – Nov" style window from the 12 month ratings. */
function windowText(i: Item) {
  const ideal = i.months.map((r) => r === "ideal");
  if (!ideal.some(Boolean)) return i.planned.length ? `Planned ${i.planned.map((m) => m.slice(0, 3)).join(", ")}` : "No timing yet";
  const first = ideal.indexOf(false);
  if (first < 0) return "All year";
  // Start after a non-ideal month so a run that wraps Dec → Jan stays whole.
  const runs: string[] = [];
  let start = -1;
  for (let k = 1; k <= 12; k++) {
    const m = (first + k) % 12;
    if (ideal[m]) {
      if (start < 0) start = m;
    } else if (start >= 0) {
      const end = (m + 11) % 12;
      const a = MONTHS[start].slice(0, 3);
      runs.push(start === end ? a : `${a} – ${MONTHS[end].slice(0, 3)}`);
      start = -1;
    }
  }
  return runs.join(", ");
}

// ── Item card ─────────────────────────────────────────────────────────────

function replaceItem(next: Item) {
  if (openItem && openItem.id === next.id) openItem = next;
  if (result?.kind === "item" && result.item.id === next.id) result = { ...result, item: next };
  if (result?.kind === "board") {
    result = { ...result, items: result.items.map((x) => (x.id === next.id ? { ...x, ...next } : x)) };
  }
}

async function togglePicker(i: Item) {
  pickerOpen = !pickerOpen;
  render();
  if (pickerOpen && photoOptions === null) {
    try {
      const data = await call("myra_photo_options", { query: [i.name, i.city, i.country].filter(Boolean).join(" ") });
      photoOptions = (data?.photos as Photo[] | undefined) ?? [];
    } catch {
      photoOptions = [];
    }
    render();
  }
}

async function pickPhoto(i: Item, photo: Photo) {
  const before = i.photo;
  replaceItem({ ...i, photo });
  pickerOpen = false;
  render();
  try {
    await call("myra_set_photo", { id: i.id, photo });
    tell(`User changed the cover photo of "${i.name}" in Myra.`);
  } catch {
    replaceItem({ ...i, photo: before });
    toast = "Couldn't save that photo. Try again in a moment.";
    render();
  }
}

async function toggleMonth(i: Item, month: string) {
  const planned = !i.planned.includes(month);
  const next = planned ? MONTHS.filter((m) => m === month || i.planned.includes(m)) : i.planned.filter((m) => m !== month);
  replaceItem({ ...i, planned: next });
  toast = null;
  render();
  try {
    await call("myra_set_planned", { id: i.id, month, planned });
    tell(`User ${planned ? "planned" : "unplanned"} ${month} for "${i.name}" in Myra. Planned months now: ${next.join(", ") || "none"}.`);
  } catch {
    replaceItem(i);
    toast = "Couldn't save that. Try again in a moment.";
    render();
  }
}

function renderItem(i: Item, fromBoard: boolean): HTMLElement {
  const cover = bg(
    el(
      "div",
      { class: "cover", role: "img", "aria-label": i.photo?.altDescription || i.name },
      el("span", { class: "tag caps" }, i.photo ? "Unsplash photo" : "No photo yet"),
      el("button", { class: "btn", click: () => void togglePicker(i), "aria-expanded": String(pickerOpen) }, "Change photo"),
    ),
    i.photo?.url,
  );

  const picker = pickerOpen
    ? photoOptions === null
      ? el("div", { class: "empty" }, "Finding photos…")
      : photoOptions.length === 0
        ? el("div", { class: "empty" }, "No photos found. You can add one in Myra.")
        : el(
            "div",
            { class: "picker" },
            ...photoOptions.map((p) =>
              bg(
                el("button", {
                  "aria-label": `Use photo: ${p.altDescription || "photo"} by ${p.photographerName}`,
                  "aria-pressed": String(i.photo?.unsplashId === p.unsplashId),
                  click: () => void pickPhoto(i, p),
                }),
                p.thumbUrl,
              ),
            ),
          )
    : null;

  const credit = i.photo
    ? el(
        "div",
        { class: "credit" },
        "Photo by ",
        el("a", { href: "#", click: (e) => (e.preventDefault(), open(i.photo!.photographerUrl)) }, i.photo.photographerName),
        " on Unsplash",
      )
    : null;

  const meta = [
    i.place,
    i.locality === "local" ? "Local" : i.locality === "travel" ? "Travel" : null,
    i.estimatedDays ? `~${i.estimatedDays} day${i.estimatedDays === 1 ? "" : "s"}` : null,
    i.estimatedBudget,
  ].filter(Boolean) as string[];

  const tags = [
    ...i.partners.map((p) => p.charAt(0).toUpperCase() + p.slice(1)),
    ...i.seasons.map((s) => s.charAt(0).toUpperCase() + s.slice(1)),
    i.doByAge ? `Do by ${i.doByAge}` : null,
  ].filter(Boolean) as string[];

  const strip = el(
    "div",
    { class: "strip" },
    ...MONTHS.map((m, k) => {
      const planned = i.planned.includes(m);
      return el(
        "button",
        {
          class: `r-${i.months[k]}`,
          "aria-pressed": String(planned),
          "aria-label": `${m}, ${i.hasTiming ? i.months[k] : "no timing"}${planned ? ", planned" : ""}`,
          click: () => void toggleMonth(i, m),
        },
        el("span", {}, INITIAL[k]),
        el("span", { class: "pip" }),
      );
    }),
  );

  const who = whoOpen
    ? el(
        "div",
        { class: "who" },
        ...(i.who.length
          ? i.who.map((w) =>
              el(
                "div",
                { class: "who-row" },
                el("span", {}, `${w.emoji} ${w.name}`),
                el("span", { class: `tier t-${w.tier}` }, TIER_LABEL[w.tier] ?? w.tier),
              ),
            )
          : [el("span", { class: "soft" }, "No friends have marked this yet. Share your list from Myra's Travel page.")]),
      )
    : null;

  return el(
    "div",
    { class: "card" },
    fromBoard ? el("button", { class: "back caps", click: () => ((openItem = null), resetItemState(), render()) }, "← Back to list") : null,
    cover,
    picker,
    credit,
    el(
      "div",
      { class: "body" },
      el(
        "div",
        { class: "title-row" },
        el("h2", { class: "serif" }, i.name),
        el("span", { class: "badge" }, i.status === "visited" ? "Visited" : "Wishlist"),
      ),
      meta.length ? el("div", { class: "meta" }, meta.join(" · ")) : null,
      tags.length ? el("div", { class: "tags caps" }, ...tags.map((t) => el("span", {}, t))) : null,
      el("div", { class: "caps soft", style: "margin-top: 16px" }, "Best time to go · tap a month to plan it"),
      strip,
      i.hasTiming
        ? el(
            "div",
            { class: "legend" },
            el("span", {}, el("span", { class: "sw r-ideal" }), "Ideal"),
            el("span", {}, el("span", { class: "sw r-shoulder" }), "Shoulder"),
            el("span", {}, el("span", { class: "sw" }), "Skip"),
            el("span", {}, el("span", { class: "pip", style: "background: var(--ink); width: 6px; height: 6px" }), "Planned"),
          )
        : el("div", { class: "legend" }, "No best-time info yet. Ask Claude to fill in the best months."),
      i.description ? el("p", { class: "desc" }, i.description) : null,
    ),
    el(
      "div",
      { class: "foot" },
      el("button", { click: () => open(i.url) }, "Open in Myra"),
      el(
        "button",
        { class: "dark", "aria-expanded": String(whoOpen), click: () => ((whoOpen = !whoOpen), render()) },
        i.who.length ? `Who wants to go? (${i.who.length})` : "Who wants to go?",
      ),
    ),
    who,
  );
}

function resetItemState() {
  pickerOpen = false;
  photoOptions = null;
  whoOpen = false;
  toast = null;
}

// ── Board ─────────────────────────────────────────────────────────────────

function openFromBoard(id: number) {
  if (result?.kind !== "board") return;
  openItem = result.items.find((x) => x.id === id) ?? null;
  resetItemState();
  render();
}

function renderBoard(b: Board): HTMLElement {
  const tabs = el(
    "div",
    { class: "tabs", role: "tablist", "aria-label": "Board view" },
    ...(["cards", "list", "calendar"] as const).map((v) =>
      el(
        "button",
        { role: "tab", "aria-selected": String(view === v), click: () => ((view = v), render()) },
        v.charAt(0).toUpperCase() + v.slice(1),
      ),
    ),
  );

  const cards = () =>
    el(
      "div",
      { class: "grid" },
      ...b.items.map((i) =>
        el(
          "button",
          { class: "tile", click: () => openFromBoard(i.id), "aria-label": `Open ${i.name}` },
          bg(el("div", { class: "thumb" }, i.fit ? el("span", { class: "tag" }, i.fit) : null), i.photo?.thumbUrl),
          el(
            "div",
            { class: "tile-body" },
            el("div", { class: "tile-name serif" }, i.name),
            i.place ? el("div", { class: "tile-place" }, i.place) : null,
          ),
        ),
      ),
    );

  const list = () =>
    el(
      "div",
      { class: "rows" },
      ...b.items.map((i, k) =>
        el(
          "button",
          { class: "row", click: () => openFromBoard(i.id) },
          el("span", { class: "idx" }, String(k + 1).padStart(2, "0")),
          el(
            "div",
            { class: "row-main" },
            el("div", { class: "row-name serif" }, i.name),
            i.place ? el("div", { class: "tile-place" }, i.place) : null,
            el(
              "div",
              { class: "row-meta caps" },
              el("span", {}, windowText(i)),
              i.locality ? el("span", {}, i.locality === "local" ? "Local" : "Travel") : null,
            ),
          ),
          i.fit ? el("span", { class: "badge" }, i.fit) : null,
        ),
      ),
    );

  const calendar = () =>
    b.calendar.length
      ? el(
          "div",
          { class: "cal" },
          ...b.calendar.map((c) =>
            el(
              "div",
              { class: "cal-row" },
              el("span", { class: "cal-month serif" }, c.month),
              el(
                "div",
                { class: "cal-chips" },
                ...c.chips.map((x) =>
                  el(
                    "button",
                    {
                      class: `r-${x.rating}${x.planned ? " planned" : ""}`,
                      "aria-label": `${x.name}, ${x.rating}${x.planned ? ", planned" : ""}`,
                      click: () => openFromBoard(x.id),
                    },
                    x.name,
                  ),
                ),
              ),
            ),
          ),
          el(
            "div",
            { class: "legend", style: "padding: 6px 0 4px" },
            el("span", {}, el("span", { class: "sw r-ideal" }), "Ideal"),
            el("span", {}, el("span", { class: "sw r-shoulder" }), "Shoulder"),
            el("span", {}, el("span", { class: "sw", style: "border-color: var(--ink)" }), "Planned"),
          ),
        )
      : el("div", { class: "empty" }, "No timing info on these yet, so the calendar is empty.");

  const body = b.items.length
    ? view === "cards"
      ? cards()
      : view === "list"
        ? list()
        : calendar()
    : el("div", { class: "empty" }, "Nothing on the list matches.");

  return el(
    "div",
    { class: "card" },
    el(
      "div",
      { class: "head" },
      el(
        "div",
        { class: "head-row" },
        el("h2", { class: "serif" }, b.label),
        el("span", { class: "soft", style: "font-size: 11px" }, `${b.items.length} of ${b.total}`),
      ),
      el("div", { class: "chips" }, ...b.chips.map((c, k) => el("span", { class: k === b.chips.length - 1 ? "chip out" : "chip" }, c))),
      tabs,
    ),
    body,
    el("button", { class: "link-row", click: () => open(b.url) }, "Open in Myra"),
  );
}

// ── Shell ─────────────────────────────────────────────────────────────────

function render() {
  if (!result) {
    root.replaceChildren(el("div", { class: "card muted-pad soft" }, "Opening Myra…"));
    return;
  }
  const screen =
    openItem
      ? renderItem(openItem, true)
      : result.kind === "item"
        ? renderItem(result.item, false)
        : renderBoard(result);
  if (toast) screen.append(el("div", { class: "toast", role: "status" }, toast));
  root.replaceChildren(screen);
}

app.ontoolresult = (params) => {
  const data = params.structuredContent as Result | undefined;
  // Only an item or board result redraws; a photo/month save must not.
  if (data?.kind !== "item" && data?.kind !== "board") return;
  result = data;
  if (data.kind === "board") view = data.view;
  openItem = null;
  resetItemState();
  render();
};

render();
void app.connect();
