/* Renders myra-reel.html frame-by-frame and encodes it with ffmpeg.
 *
 *   node motion/render.cjs                       # full 1080p60 render → motion/out/myra-reel.mp4
 *   node motion/render.cjs --stills 1.2,3.4      # PNG stills → motion/out/stills/
 *   node motion/render.cjs --fps 30 --workers 2  # lighter render
 *
 * Needs Playwright (global or local) and ffmpeg on PATH.
 */
const http = require("http");
const fs = require("fs");
const path = require("path");
const os = require("os");
const { execFileSync, spawnSync } = require("child_process");

function loadPlaywright() {
  try {
    return require("playwright");
  } catch {
    const root = execFileSync("npm", ["root", "-g"]).toString().trim();
    return require(path.join(root, "playwright"));
  }
}

const args = process.argv.slice(2);
const opt = (name, def) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : def;
};

const ROOT = __dirname;
const OUT = path.join(ROOT, "out");
const FPS = Number(opt("fps", 60));
const WORKERS = Number(opt("workers", Math.max(1, Math.min(4, os.cpus().length - 1))));
const STILLS = opt("stills", null);
const AUDIO = opt("audio", path.join(OUT, "myra-reel-score.wav"));
const MP4 = opt("out", path.join(OUT, "myra-reel.mp4"));

const MIME = { ".html": "text/html", ".js": "text/javascript", ".woff2": "font/woff2", ".css": "text/css" };

function serve() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const p = path.join(ROOT, decodeURIComponent(req.url.split("?")[0]));
      if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) {
        res.writeHead(404);
        return res.end();
      }
      res.writeHead(200, { "Content-Type": MIME[path.extname(p)] || "application/octet-stream" });
      fs.createReadStream(p).pipe(res);
    });
    server.listen(0, "127.0.0.1", () => resolve(server));
  });
}

async function openPage(browser, port) {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  page.on("pageerror", (e) => console.error("page error:", e.message));
  await page.goto(`http://127.0.0.1:${port}/myra-reel.html?capture`);
  await page.evaluate(() => window.__ready);
  return page;
}

async function shoot(page, t, file) {
  await page.evaluate((tt) => window.renderFrame(tt), t);
  await page.screenshot({ path: file, type: "png", clip: { x: 0, y: 0, width: 1920, height: 1080 } });
}

(async () => {
  const { chromium } = loadPlaywright();
  fs.mkdirSync(OUT, { recursive: true });
  const server = await serve();
  const port = server.address().port;
  const browser = await chromium.launch({ args: ["--force-color-profile=srgb", "--disable-lcd-text", "--font-render-hinting=none"] });

  try {
    if (STILLS) {
      const dir = path.join(OUT, "stills");
      fs.mkdirSync(dir, { recursive: true });
      const page = await openPage(browser, port);
      for (const s of STILLS.split(",")) {
        const t = Number(s);
        const file = path.join(dir, `t${t.toFixed(2).padStart(5, "0")}.png`);
        await shoot(page, t, file);
        console.log(file);
      }
      return;
    }

    const duration = 15;
    const total = Math.round(duration * FPS);
    const frames = fs.mkdtempSync(path.join(os.tmpdir(), "myra-frames-"));
    console.log(`Rendering ${total} frames @ ${FPS}fps with ${WORKERS} workers → ${frames}`);
    const started = Date.now();
    let done = 0;
    await Promise.all(
      Array.from({ length: WORKERS }, async (_, w) => {
        const page = await openPage(browser, port);
        for (let f = w; f < total; f += WORKERS) {
          await shoot(page, f / FPS, path.join(frames, `f${String(f).padStart(5, "0")}.png`));
          if (++done % 60 === 0) console.log(`  ${done}/${total}  (${((Date.now() - started) / 1000).toFixed(0)}s)`);
        }
      })
    );

    const ff = ["-y", "-framerate", String(FPS), "-i", path.join(frames, "f%05d.png")];
    if (fs.existsSync(AUDIO)) ff.push("-i", AUDIO);
    ff.push("-c:v", "libx264", "-preset", "slow", "-crf", "14", "-tune", "film", "-pix_fmt", "yuv420p", "-color_primaries", "bt709", "-color_trc", "bt709", "-colorspace", "bt709", "-movflags", "+faststart");
    if (fs.existsSync(AUDIO)) ff.push("-c:a", "aac", "-b:a", "256k", "-shortest");
    ff.push(MP4);
    const r = spawnSync("ffmpeg", ff, { stdio: "inherit" });
    if (r.status !== 0) throw new Error("ffmpeg failed");
    fs.rmSync(frames, { recursive: true, force: true });
    console.log(`Done → ${MP4}`);
  } finally {
    await browser.close();
    server.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
