# Myra: 15-second reel

A brand film for Myra, made entirely in code: the landscapes, typography, petals and score are all generated here. There's no stock footage and no After Effects.

**Watch:** `out/myra-reel.mp4` (1920×1080, 60 fps, H.264 + AAC)

## The story

One experience, followed from vision to memory, cut to a single beat map:

| Time | Beat | What happens |
| --- | --- | --- |
| 0.0 – 1.9 | *mira* | A sakura petal drifts down and lands as Myra's terracotta dot. "mira: to look, to see." |
| 1.9 – 3.75 | Vision | The dot opens like an iris onto Mt. Fuji in bloom. "The best journeys begin with a vision." |
| 3.75 – 6.35 | Gallery | The iris becomes a card, then pulls back into a floating 3D gallery. "Where Intention & Journey Meet." |
| 6.35 – 8.6 | 01 Discover | A whip pan into the product. An intention gets typed, the skeletons shimmer, and three matches land. |
| 8.6 – 10.4 | 02 Save | The Tokyo card is saved, flies into April on "Your year", and *Best time to go* lights up. |
| 10.4 – 11.9 | 03 Complete | The card returns, gets stamped **Completed**, and petals burst out. |
| 11.9 – 15.0 | The mark | Everything dissolves. "Myra" comes into focus, and a petal lands to become the dot, echoing the opening. |

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
```

You need Playwright (global or local) and `ffmpeg` on your PATH.
