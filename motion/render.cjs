/* Renders myra-reel.html frame-by-frame and encodes it with ffmpeg.
 *
 *   node motion/render.cjs                       # full 1080p60 render → motion/out/myra-reel.mp4
 *   node motion/render.cjs --stills 1.2,3.4      # PNG stills → motion/out/stills/
 *   node motion/render.cjs --fps 30 --workers 2  # lighter render
 *   node motion/render.cjs --loop                # silent seamless web loop → motion/out/loop/
 *   node motion/render.cjs --loop --stills 3,9.3 # stills from the loop cut
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
const LOOP = args.includes("--loop");
const LOOP_OUT = path.join(OUT, "loop");
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
  await page.evaluate(([tt, loop]) => (loop ? window.renderLoop(tt) : window.renderFrame(tt)), [t, LOOP]);
  await page.screenshot({ path: file, type: "png", clip: { x: 0, y: 0, width: 1920, height: 1080 } });
}

function ffmpeg(argv) {
  const r = spawnSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", ...argv], { stdio: "inherit" });
  if (r.status !== 0) throw new Error("ffmpeg failed: " + argv.join(" "));
}

// Seamless loop: the last `xfade` seconds dissolve into the first ones, so the
// clip's final frame flows straight into its first.
function encodeLoop(frames, { length, xfade }) {
  fs.mkdirSync(LOOP_OUT, { recursive: true });
  const L = Math.round(length * FPS);
  const X = Math.round(xfade * FPS);
  const master = path.join(LOOP_OUT, "master.mkv");
  ffmpeg([
    "-framerate", String(FPS), "-i", path.join(frames, "f%05d.png"),
    "-filter_complex",
    `[0]split=3[a][b][c];` +
      `[a]trim=start_frame=${L}:end_frame=${L + X},setpts=PTS-STARTPTS[tail];` +
      `[b]trim=start_frame=0:end_frame=${X},setpts=PTS-STARTPTS[head];` +
      `[c]trim=start_frame=${X}:end_frame=${L},setpts=PTS-STARTPTS[mid];` +
      `[tail][head]xfade=transition=fade:duration=${X / FPS}:offset=0[seam];` +
      `[seam][mid]concat=n=2:v=1[out]`,
    "-map", "[out]", "-c:v", "libx264rgb", "-crf", "0", "-preset", "ultrafast", master,
  ]);
  const color = ["-color_primaries", "bt709", "-color_trc", "bt709", "-colorspace", "bt709"];
  const mp4 = path.join(LOOP_OUT, "myra-loop.mp4");
  ffmpeg(["-i", master, "-an", "-c:v", "libx264", "-preset", "slow", "-crf", "21", "-tune", "film", "-pix_fmt", "yuv420p", ...color, "-movflags", "+faststart", mp4]);
  ffmpeg(["-i", master, "-an", "-vf", "scale=1280:720:flags=lanczos", "-c:v", "libx264", "-preset", "slow", "-crf", "21", "-tune", "film", "-pix_fmt", "yuv420p", ...color, "-movflags", "+faststart", path.join(LOOP_OUT, "myra-loop-720.mp4")]);
  ffmpeg(["-i", master, "-an", "-c:v", "libvpx-vp9", "-crf", "33", "-b:v", "0", "-row-mt", "1", "-deadline", "good", "-cpu-used", "2", "-pix_fmt", "yuv420p", path.join(LOOP_OUT, "myra-loop.webm")]);
  ffmpeg(["-ss", "3.1", "-i", master, "-frames:v", "1", "-q:v", "3", path.join(LOOP_OUT, "myra-loop-poster.jpg")]);
  // GIF fallback: denoise the grain and use an ordered dither, or it balloons past 40 MB.
  ffmpeg([
    "-i", mp4, "-filter_complex",
    "fps=15,scale=640:-1:flags=lanczos,hqdn3d=4:3:6:4,split[x][y];[x]palettegen=max_colors=192:stats_mode=diff[p];[y][p]paletteuse=dither=bayer:bayer_scale=4:diff_mode=rectangle",
    "-loop", "0", path.join(LOOP_OUT, "myra-loop.gif"),
  ]);
  fs.rmSync(master);
  for (const f of fs.readdirSync(LOOP_OUT)) console.log(`  ${f}  ${(fs.statSync(path.join(LOOP_OUT, f)).size / 1e6).toFixed(2)} MB`);
  console.log(`Done → ${LOOP_OUT}`);
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

    const page0 = await openPage(browser, port);
    const loopSpec = await page0.evaluate(() => window.REEL.LOOP);
    await page0.close();
    const duration = LOOP ? loopSpec.total : 15;
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

    if (LOOP) {
      encodeLoop(frames, loopSpec);
      fs.rmSync(frames, { recursive: true, force: true });
      return;
    }

    const ff = ["-y", "-framerate", String(FPS), "-i", path.join(frames, "f%05d.png")];
    if (fs.existsSync(AUDIO)) ff.push("-i", AUDIO);
    ff.push("-c:v", "libx264", "-preset", "slow", "-crf", "20", "-tune", "film", "-pix_fmt", "yuv420p", "-color_primaries", "bt709", "-color_trc", "bt709", "-colorspace", "bt709", "-movflags", "+faststart");
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
