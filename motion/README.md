# Myra: 15-second reel

A brand film for Myra, made entirely in code: the landscapes, typography, petals and score are all generated here. There's no stock footage and no After Effects.

**Watch:** `out/myra-reel.mp4` (1920×1080, 60 fps, H.264 + AAC)

## The story

The value prop in three steps (discover, collect, decide when to go), told through one experience and cut to a single beat map:

| Time | Beat | What happens |
| --- | --- | --- |
| 0.0 – 1.9 | The problem | A sakura petal lands as Myra's dot. "So many dreams. Scattered across screenshots, notes & tabs." |
| 1.9 – 3.75 | The promise | The dot opens like an iris onto Mt. Fuji in bloom. "Give every *someday* a place." |
| 3.75 – 6.35 | One place | The iris becomes a card, then pulls back into a floating gallery. "Your bucket list, all in *one* place." |
| 6.35 – 8.6 | 01 Discover | A whip pan into the product. An intention gets typed and matching experiences land. |
| 8.6 – 10.0 | 02 Collect | The Tokyo card is saved and flies into April, and the year fills with collected ideas. |
| 10.0 – 11.9 | 03 Decide when | *Best time to go* lights up across March and April. The card returns, lived and stamped **Completed**. |
| 11.9 – 15.0 | The mark | "Myra" comes into focus as a petal lands to become the dot. "Every *someday*, in one place." |

## Portfolio loop (silent, ~9.6s)

`out/loop/` has a cut made for embedding on a website. It's the same film with smooth speed ramps, ending as the wordmark lifts away and the dot glides back to center. The last 0.6s crossfades into the first frames, so it loops without a visible seam.

| File | Use |
| --- | --- |
| `myra-loop.webm` | Main source (VP9, 1080p60, 1.6 MB) |
| `myra-loop.mp4` | Universal fallback (H.264, 1080p60, 3.8 MB) |
| `myra-loop-720.mp4` | Lighter version for mobile (1.4 MB) |
| `myra-loop-poster.jpg` | First paint, and the still for reduced-motion users |
| `myra-loop.gif` | Only for places that can't play video, like README files, Notion or email (640px, 15fps, 5 MB) |

Embed it as a muted, looping video rather than a GIF. A video is sharper and many times smaller:

```html
<video
  class="myra-loop"
  autoplay muted loop playsinline
  preload="metadata"
  poster="/media/myra-loop-poster.jpg"
  width="1920" height="1080"
  aria-label="Myra: discover and collect your bucket list in one place, and decide when to go (animated preview)"
>
  <source src="/media/myra-loop.webm" type="video/webm" />
  <source src="/media/myra-loop.mp4" type="video/mp4" />
</video>

<style>
  .myra-loop { width: 100%; height: auto; aspect-ratio: 16 / 9; border-radius: 16px; display: block; background: #f7f5f0; }
</style>
<script>
  // Respect reduced-motion: show the poster instead of playing.
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
    document.querySelectorAll("video.myra-loop").forEach((v) => { v.removeAttribute("autoplay"); v.pause(); });
  }
</script>
```

All four attributes `autoplay muted loop playsinline` are required. Without `muted` and `playsinline`, iOS Safari won't autoplay the video. In React or Next.js, write them as `autoPlay muted loop playsInline`.

To preview the loop live, open `myra-reel.html?loop` through a static server.

## Files

- `myra-reel.html` + `reel.js`: the film. `renderFrame(t)` is a pure function of time, so every frame is reproducible. Open the HTML through any static server to watch it loop live (press space to pause).
- `score.cjs`: synthesizes the soundtrack to the same beat map (a pad, bells on key moments, air whooshes on transitions, typing ticks, reverb).
- `render.cjs`: steps headless Chromium through every frame and encodes the result with ffmpeg.
- `fonts/`: Newsreader and Inter, the app's typefaces (SIL Open Font License).

## Re-render

```bash
node motion/score.cjs                          # → motion/out/myra-reel-score.wav
node motion/render.cjs                         # → motion/out/myra-reel.mp4 (1080p60)
node motion/render.cjs --stills 2.5,8.2,13.6   # quick PNG checks → motion/out/stills/
node motion/render.cjs --loop                  # silent web loop → motion/out/loop/
```

You need Playwright (global or local) and `ffmpeg` on your PATH.
