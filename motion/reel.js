/* Myra — 15s brand reel.
 *
 * Every frame is a pure function of time: renderFrame(t) sets the whole stage
 * for second t. The page plays itself in a browser for preview, and
 * render.cjs steps through it frame-by-frame for a deterministic export.
 */
(() => {
  "use strict";

  const W = 1920;
  const H = 1080;
  const DURATION = 15;

  // Beat map (seconds)
  const T = { B: 1.9, C: 3.75, D: 6.35, E: 8.6, F: 10.4, G: 11.9 };

  const PAL = {
    cream: "#F7F5F0",
    butter: "#F2E6B5",
    terracotta: "#EBCFBE",
    dot: "#E4B49C",
    ink: "#1A1A1A",
    divider: "#D4D0C8",
  };

  /* ------------------------------------------------------------------ math */

  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const seg = (t, a, b) => clamp((t - a) / (b - a));
  const fract = (v) => v - Math.floor(v);
  const mod = (v, m) => ((v % m) + m) % m;

  function bezier(x1, y1, x2, y2) {
    const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
    const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
    const sx = (u) => ((ax * u + bx) * u + cx) * u;
    const sy = (u) => ((ay * u + by) * u + cy) * u;
    return (x) => {
      if (x <= 0) return 0;
      if (x >= 1) return 1;
      let lo = 0, hi = 1, u = x;
      for (let i = 0; i < 24; i++) {
        u = (lo + hi) / 2;
        if (sx(u) < x) lo = u; else hi = u;
      }
      return sy(u);
    };
  }

  const E = {
    outExpo: bezier(0.16, 1, 0.3, 1),
    outQuint: bezier(0.22, 1, 0.36, 1),
    inOutExpo: bezier(0.87, 0, 0.13, 1),
    inOut: bezier(0.65, 0, 0.35, 1),
    inOutSine: bezier(0.37, 0, 0.63, 1),
    inExpo: bezier(0.7, 0, 0.84, 0),
    inQuad: bezier(0.55, 0.085, 0.68, 0.53),
    soft: bezier(0.45, 0, 0.2, 1),
    backOut: (x) => {
      const c1 = 1.5, c3 = c1 + 1;
      return x <= 0 ? 0 : x >= 1 ? 1 : 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
    },
  };

  function rng(seed) {
    let s = seed >>> 0;
    return () => {
      s = (s + 0x6d2b79f5) >>> 0;
      let t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function hexToRgb(hex) {
    const n = parseInt(hex.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  const rgba = (hex, a) => {
    const [r, g, b] = hexToRgb(hex);
    return `rgba(${r},${g},${b},${a})`;
  };

  /* ------------------------------------------------------- landscape painter */

  const PW = 900;
  const PH = 1125;

  function canvas(w, h) {
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    return c;
  }

  function vgrad(g, y0, y1, stops, x0 = 0, x1 = PW) {
    const gr = g.createLinearGradient(0, y0, 0, y1);
    stops.forEach(([o, c]) => gr.addColorStop(o, c));
    g.fillStyle = gr;
    g.fillRect(x0, y0, x1 - x0, y1 - y0);
  }

  function glow(g, x, y, r, inner, outer = "rgba(255,255,255,0)") {
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, inner);
    gr.addColorStop(1, outer);
    g.fillStyle = gr;
    g.fillRect(x - r, y - r, r * 2, r * 2);
  }

  function sun(g, x, y, r, core, halo, haloR) {
    glow(g, x, y, haloR, halo);
    glow(g, x, y, r * 2.2, "rgba(255,250,240,0.55)");
    g.fillStyle = core;
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.fill();
  }

  // 1D fractal ridge line; `ridged` gives sharp alpine peaks.
  function ridgeFn(seed, { oct = 6, rough = 0.5, freq = 1.4, ridged = false }) {
    const R = rng(seed);
    const waves = [];
    for (let i = 0; i < oct; i++) {
      waves.push({ f: (freq * Math.pow(2.03, i) * (0.8 + R() * 0.4) * Math.PI * 2) / PW, p: R() * 6.283, a: Math.pow(rough, i) });
    }
    const norm = waves.reduce((s, w) => s + w.a, 0);
    return (x) => {
      let v = 0;
      for (const w of waves) {
        const s = Math.sin(x * w.f + w.p);
        v += (ridged ? 1 - Math.abs(s) : s * 0.5 + 0.5) * w.a;
      }
      return v / norm;
    };
  }

  function ridge(g, { seed, baseY, amp, top, bottom, oct, rough, freq, ridged, shape, bottomY = PH }) {
    const f = ridgeFn(seed, { oct, rough, freq, ridged });
    g.beginPath();
    g.moveTo(-10, bottomY);
    for (let x = -10; x <= PW + 10; x += 3) {
      let v = f(x);
      if (shape) v = shape(x, v);
      g.lineTo(x, baseY - v * amp);
    }
    g.lineTo(PW + 10, bottomY);
    g.closePath();
    const gr = g.createLinearGradient(0, baseY - amp, 0, bottomY);
    gr.addColorStop(0, top);
    gr.addColorStop(1, bottom);
    g.fillStyle = gr;
    g.fill();
    return f;
  }

  function mist(g, y, h, color, a = 0.7) {
    const gr = g.createLinearGradient(0, y - h / 2, 0, y + h / 2);
    gr.addColorStop(0, rgba(color, 0));
    gr.addColorStop(0.5, rgba(color, a));
    gr.addColorStop(1, rgba(color, 0));
    g.fillStyle = gr;
    g.fillRect(0, y - h / 2, PW, h);
  }

  function reflect(c, horizon, alpha, tintTop, tintBottom) {
    const g = c.getContext("2d");
    const tmp = canvas(PW, Math.ceil(horizon));
    tmp.getContext("2d").drawImage(c, 0, 0);
    g.save();
    g.translate(0, horizon * 2);
    g.scale(1, -1);
    g.globalAlpha = 1;
    g.filter = "blur(2px)";
    g.drawImage(tmp, 0, 0);
    g.restore();
    g.filter = "none";
    vgrad(g, horizon, PH, [[0, rgba(tintTop, 1 - alpha)], [1, rgba(tintBottom, Math.min(1, 1 - alpha + 0.25))]]);
  }

  function ripples(g, horizon, seed, color = "#FFFFFF", n = 140, strength = 0.22) {
    const R = rng(seed);
    for (let i = 0; i < n; i++) {
      const k = Math.pow(R(), 1.7);
      const y = horizon + 3 + k * (PH - horizon);
      const len = 14 + k * 160 * (0.4 + R());
      const x = R() * PW;
      g.strokeStyle = rgba(color, strength * (0.4 + R() * 0.6));
      g.lineWidth = 0.6 + k * 1.8;
      g.beginPath();
      g.moveTo(x - len / 2, y);
      g.lineTo(x + len / 2, y);
      g.stroke();
    }
  }

  function petalPath(g, w, h) {
    g.beginPath();
    g.moveTo(0, h * 0.5);
    g.bezierCurveTo(-w * 0.95, h * 0.12, -w * 0.62, -h * 0.52, -w * 0.14, -h * 0.5);
    g.lineTo(0, -h * 0.34);
    g.lineTo(w * 0.14, -h * 0.5);
    g.bezierCurveTo(w * 0.62, -h * 0.52, w * 0.95, h * 0.12, 0, h * 0.5);
    g.closePath();
  }

  function flower(g, x, y, r, rot, alpha) {
    g.save();
    g.translate(x, y);
    g.rotate(rot);
    g.globalAlpha = alpha;
    for (let i = 0; i < 5; i++) {
      g.save();
      g.rotate((i / 5) * Math.PI * 2);
      g.translate(0, -r * 0.55);
      const gr = g.createLinearGradient(0, r * 0.5, 0, -r * 0.5);
      gr.addColorStop(0, "#F4B6C6");
      gr.addColorStop(1, "#FFF6F7");
      g.fillStyle = gr;
      petalPath(g, r * 0.75, r * 1.0);
      g.scale(1, -1);
      g.fill();
      g.restore();
    }
    g.fillStyle = "#E58FA6";
    g.beginPath();
    g.arc(0, 0, r * 0.14, 0, Math.PI * 2);
    g.fill();
    g.restore();
  }

  function branch(g, R, x, y, ang, len, w, depth, tips) {
    const segs = 6;
    let cx = x, cy = y, a = ang;
    g.strokeStyle = "#6E5763";
    g.lineCap = "round";
    for (let i = 0; i < segs; i++) {
      a += (R() - 0.5) * 0.5;
      const nx = cx + Math.cos(a) * (len / segs);
      const ny = cy + Math.sin(a) * (len / segs);
      g.lineWidth = Math.max(1, w * (1 - i / segs));
      g.beginPath();
      g.moveTo(cx, cy);
      g.lineTo(nx, ny);
      g.stroke();
      if (i > 1) tips.push([nx, ny, w * (1 - i / segs)]);
      if (depth > 0 && i > 1 && R() < 0.45) {
        branch(g, R, nx, ny, a + (R() < 0.5 ? -1 : 1) * (0.5 + R() * 0.5), len * 0.5, w * 0.55, depth - 1, tips);
      }
      cx = nx;
      cy = ny;
    }
    tips.push([cx, cy, 1]);
  }

  function blossomBranch(g, seed, x, y, ang, len, w) {
    const R = rng(seed);
    const tips = [];
    g.save();
    g.globalAlpha = 0.92;
    branch(g, R, x, y, ang, len, w, 2, tips);
    g.restore();
    for (const [tx, ty] of tips) {
      const n = 7 + Math.floor(R() * 8);
      for (let i = 0; i < n; i++) {
        const rr = 6 + R() * 14;
        const px = tx + (R() - 0.5) * 70;
        const py = ty + (R() - 0.5) * 56;
        if (R() < 0.55) {
          glow(g, px, py, rr * 1.3, "rgba(255,246,248,0.95)", "rgba(246,196,210,0)");
        } else {
          flower(g, px, py, rr, R() * 6.28, 0.88 + R() * 0.12);
        }
      }
    }
  }

  function grain(g, seed, amt = 10) {
    const img = g.getImageData(0, 0, PW, PH);
    const R = rng(seed);
    for (let i = 0; i < img.data.length; i += 4) {
      const n = (R() - 0.5) * amt;
      img.data[i] += n;
      img.data[i + 1] += n;
      img.data[i + 2] += n;
    }
    g.putImageData(img, 0, 0);
  }

  /* The seven "experiences" — painted, not photographed. */

  const PAINT = {
    tokyo(c) {
      const g = c.getContext("2d");
      const hz = PH * 0.69;
      vgrad(g, 0, PH, [[0, "#C3C8E4"], [0.32, "#E2D3E7"], [0.55, "#F6D8D9"], [0.69, "#FBE6D6"], [1, "#FBE6D6"]]);
      sun(g, PW * 0.67, PH * 0.42, 40, "#FFF9F2", "rgba(255,236,226,0.9)", 420);
      // Fuji
      g.beginPath();
      g.moveTo(-60, hz);
      g.bezierCurveTo(PW * 0.12, hz - 40, PW * 0.3, PH * 0.42, PW * 0.385, PH * 0.315);
      g.lineTo(PW * 0.47, PH * 0.31);
      g.bezierCurveTo(PW * 0.56, PH * 0.42, PW * 0.78, hz - 50, PW + 60, hz - 10);
      g.closePath();
      let gr = g.createLinearGradient(0, PH * 0.31, 0, hz);
      gr.addColorStop(0, "#DCD6EA");
      gr.addColorStop(1, "#B8B1CF");
      g.fillStyle = gr;
      g.fill();
      g.save();
      g.clip();
      const R = rng(7);
      g.beginPath();
      g.moveTo(0, 0);
      g.lineTo(PW, 0);
      g.lineTo(PW, PH * 0.38);
      for (let x = PW; x >= 0; x -= 14) {
        const finger = Math.pow(R(), 2.2) * 70;
        g.lineTo(x, PH * 0.385 + (x % 28 === 0 ? finger : finger * 0.3));
      }
      g.closePath();
      gr = g.createLinearGradient(0, PH * 0.3, 0, PH * 0.47);
      gr.addColorStop(0, "#FFFDFC");
      gr.addColorStop(1, "#EFE9F3");
      g.fillStyle = gr;
      g.fill();
      g.restore();
      mist(g, hz - 70, 120, "#FBEAE6", 0.8);
      ridge(g, { seed: 21, baseY: hz - 4, amp: 34, top: "#CDBCD2", bottom: "#D9CBDA", freq: 2.2, rough: 0.55 });
      mist(g, hz - 14, 40, "#FCEDE7", 0.6);
      ridge(g, { seed: 22, baseY: hz + 6, amp: 24, top: "#B3A1BD", bottom: "#BBA9C3", freq: 3.4, rough: 0.6 });
      reflect(c, hz + 6, 0.5, "#F2DCE2", "#CBBFD8");
      ripples(g, hz + 6, 31);
      // Blossom framing (soft foreground bokeh first, then branches)
      g.save();
      g.filter = "blur(10px)";
      const B = rng(77);
      for (let i = 0; i < 26; i++) glow(g, B() * PW, PH * (0.84 + B() * 0.2), 30 + B() * 50, "rgba(248,206,218,0.75)", "rgba(248,206,218,0)");
      g.restore();
      blossomBranch(g, 101, -40, 60, 0.35, 520, 18);
      blossomBranch(g, 202, PW + 40, 150, Math.PI - 0.42, 470, 16);
      blossomBranch(g, 303, PW * 0.3, -40, 1.25, 230, 9);
      grain(g, 5, 9);
    },

    iceland(c) {
      const g = c.getContext("2d");
      const hz = PH * 0.66;
      vgrad(g, 0, PH, [[0, "#7682B0"], [0.28, "#A3A7D0"], [0.52, "#D9CDE4"], [0.66, "#F5E0DE"], [1, "#F5E0DE"]]);
      const R = rng(41);
      for (let i = 0; i < 160; i++) {
        g.fillStyle = `rgba(255,255,255,${0.25 + R() * 0.6})`;
        g.beginPath();
        g.arc(R() * PW, Math.pow(R(), 1.6) * PH * 0.45, R() * 1.4 + 0.3, 0, 6.28);
        g.fill();
      }
      g.save();
      g.globalCompositeOperation = "screen";
      const curtains = [
        { y: 0.34, h: 260, c: [176, 244, 214], p: 0.4, f: 0.0055 },
        { y: 0.27, h: 200, c: [246, 196, 226], p: 2.2, f: 0.0042 },
        { y: 0.4, h: 160, c: [196, 236, 240], p: 4.1, f: 0.007 },
      ];
      for (const cu of curtains) {
        for (let x = -20; x < PW + 20; x += 2) {
          const base = PH * cu.y + Math.sin(x * cu.f + cu.p) * 70 + Math.sin(x * cu.f * 2.7 + cu.p) * 22;
          const hh = cu.h * (0.55 + 0.45 * Math.sin(x * 0.021 + cu.p) * Math.sin(x * 0.0071));
          const gr = g.createLinearGradient(0, base, 0, base - hh);
          gr.addColorStop(0, `rgba(${cu.c},0.16)`);
          gr.addColorStop(0.25, `rgba(${cu.c},0.09)`);
          gr.addColorStop(1, `rgba(${cu.c},0)`);
          g.fillStyle = gr;
          g.fillRect(x, base - hh, 2, hh + 6);
        }
      }
      g.restore();
      mist(g, hz - 60, 110, "#F3DCE2", 0.5);
      ridge(g, { seed: 44, baseY: hz - 6, amp: 150, top: "#A9A6CB", bottom: "#C9BFD9", ridged: true, freq: 1.1, rough: 0.48 });
      ridge(g, { seed: 45, baseY: hz + 4, amp: 70, top: "#7F82AA", bottom: "#9C9AC0", ridged: true, freq: 1.8, rough: 0.5 });
      reflect(c, hz + 4, 0.55, "#D7CBE2", "#9FA2C6");
      ripples(g, hz + 4, 46, "#FFFFFF", 110, 0.18);
      grain(g, 6, 9);
    },

    santorini(c) {
      const g = c.getContext("2d");
      const hz = PH * 0.6;
      vgrad(g, 0, hz, [[0, "#E2D2E6"], [0.45, "#F6D3C9"], [0.85, "#FCDFC6"], [1, "#FDEAD6"]]);
      g.save();
      g.beginPath();
      g.rect(0, 0, PW, hz);
      g.clip();
      sun(g, PW * 0.5, hz - 20, 74, "#FFF6E8", "rgba(255,232,212,0.95)", 520);
      g.restore();
      // island with white houses
      ridge(g, { seed: 61, baseY: hz + 2, amp: 46, top: "#D4B6C4", bottom: "#DABCC8", freq: 1.6, rough: 0.5, bottomY: hz + 2, shape: (x, v) => v * clamp((x - PW * 0.62) / 120) });
      const Rh = rng(62);
      const isl = ridgeFn(61, { freq: 1.6, rough: 0.5 });
      for (let i = 0; i < 40; i++) {
        const x = PW * 0.66 + Rh() * PW * 0.34;
        const top = hz + 2 - isl(x) * 46 * clamp((x - PW * 0.62) / 120);
        const y = top + Rh() * (hz - top);
        g.fillStyle = `rgba(255,252,248,${0.7 + Rh() * 0.3})`;
        g.fillRect(x, y - 4, 5 + Rh() * 5, 4 + Rh() * 3);
      }
      vgrad(g, hz, PH, [[0, "#EFCDC6"], [0.45, "#D7BCCB"], [1, "#B9AACA"]]);
      // sun glitter path
      const R = rng(63);
      for (let i = 0; i < 520; i++) {
        const k = Math.pow(R(), 1.5);
        const y = hz + 2 + k * (PH - hz);
        const spread = 40 + k * 260;
        const x = PW * 0.5 + (R() - 0.5) * 2 * spread * Math.pow(R(), 0.8);
        const len = 6 + k * 50 * R();
        g.strokeStyle = `rgba(255,246,232,${(0.25 + R() * 0.55) * (1 - k * 0.5)})`;
        g.lineWidth = 0.8 + k * 1.6;
        g.beginPath();
        g.moveTo(x - len / 2, y);
        g.lineTo(x + len / 2, y);
        g.stroke();
      }
      ripples(g, hz, 64, "#FFFFFF", 90, 0.12);
      // little sail
      g.fillStyle = "rgba(136,118,146,0.85)";
      const sx = PW * 0.3, sy = hz + 26;
      g.beginPath(); g.moveTo(sx, sy - 58); g.lineTo(sx, sy - 4); g.lineTo(sx + 32, sy - 4); g.closePath(); g.fill();
      g.beginPath(); g.moveTo(sx - 3, sy - 50); g.lineTo(sx - 3, sy - 4); g.lineTo(sx - 22, sy - 4); g.closePath(); g.fill();
      g.beginPath(); g.moveTo(sx - 26, sy - 2); g.lineTo(sx + 36, sy - 2); g.lineTo(sx + 28, sy + 5); g.lineTo(sx - 20, sy + 5); g.closePath(); g.fill();
      g.fillStyle = "rgba(136,118,146,0.25)";
      g.fillRect(sx - 20, sy + 7, 50, 2);
      grain(g, 7, 9);
    },

    kenya(c) {
      const g = c.getContext("2d");
      const hz = PH * 0.66;
      vgrad(g, 0, hz, [[0, "#EFC9B4"], [0.45, "#F8DAB8"], [0.85, "#FCE9CF"], [1, "#FEF2E0"]]);
      sun(g, PW * 0.6, hz - 70, 108, "#FFF8EA", "rgba(255,236,206,0.95)", 620);
      ridge(g, { seed: 81, baseY: hz, amp: 22, top: "#E8C6AE", bottom: "#EBCDB4", freq: 1.3, rough: 0.45 });
      vgrad(g, hz, PH, [[0, "#EECBA8"], [0.5, "#E2BA96"], [1, "#D2A787"]]);
      const R = rng(82);
      g.strokeStyle = "rgba(170,128,100,0.22)";
      for (let i = 0; i < 1400; i++) {
        const k = Math.pow(R(), 1.3);
        const y = hz + 6 + k * (PH - hz);
        const x = R() * PW;
        const h = 2 + k * 18;
        g.lineWidth = 0.6 + k;
        g.beginPath();
        g.moveTo(x, y);
        g.lineTo(x + (R() - 0.5) * h * 0.4, y - h);
        g.stroke();
      }
      // acacia
      const ax = PW * 0.27, ay = hz + 64, col = "rgba(150,116,104,0.92)";
      g.strokeStyle = col;
      g.lineCap = "round";
      g.lineWidth = 9;
      g.beginPath(); g.moveTo(ax, ay); g.quadraticCurveTo(ax + 6, ay - 120, ax - 8, ay - 210); g.stroke();
      g.lineWidth = 5;
      g.beginPath(); g.moveTo(ax + 2, ay - 120); g.quadraticCurveTo(ax + 60, ay - 170, ax + 120, ay - 214); g.stroke();
      g.beginPath(); g.moveTo(ax - 2, ay - 150); g.quadraticCurveTo(ax - 60, ay - 190, ax - 110, ay - 206); g.stroke();
      g.fillStyle = col;
      const Rt = rng(83);
      for (let i = 0; i < 70; i++) {
        const t = Rt();
        const x = ax - 190 + t * 380;
        const y = ay - 222 - Math.sin(t * Math.PI) * 26 + (Rt() - 0.5) * 18;
        g.beginPath();
        g.ellipse(x, y, 20 + Rt() * 26, 6 + Rt() * 7, 0, 0, 6.28);
        g.fill();
      }
      // birds
      g.strokeStyle = "rgba(150,116,104,0.55)";
      g.lineWidth = 1.6;
      [[0.68, 0.3, 10], [0.73, 0.27, 8], [0.76, 0.32, 7]].forEach(([x, y, s]) => {
        g.beginPath();
        g.moveTo(PW * x - s, PH * y - s * 0.4);
        g.quadraticCurveTo(PW * x - s * 0.4, PH * y - s * 0.6, PW * x, PH * y);
        g.quadraticCurveTo(PW * x + s * 0.4, PH * y - s * 0.6, PW * x + s, PH * y - s * 0.4);
        g.stroke();
      });
      grain(g, 8, 9);
    },

    patagonia(c) {
      const g = c.getContext("2d");
      const hz = PH * 0.66;
      vgrad(g, 0, PH, [[0, "#C8D8EA"], [0.4, "#E1EAF1"], [0.66, "#F5F1EA"], [1, "#F5F1EA"]]);
      glow(g, PW * 0.2, PH * 0.18, 420, "rgba(255,250,240,0.8)");
      ridge(g, { seed: 91, baseY: hz - 70, amp: 330, top: "#EEF2F7", bottom: "#C4D1E1", ridged: true, freq: 0.9, rough: 0.52 });
      mist(g, hz - 110, 140, "#F2F4F5", 0.85);
      ridge(g, { seed: 92, baseY: hz - 10, amp: 300, top: "#F9FBFC", bottom: "#93A6C0", ridged: true, freq: 1.25, rough: 0.55, shape: (x, v) => v * (0.55 + 0.45 * Math.exp(-Math.pow((x - PW * 0.55) / 260, 2))) });
      mist(g, hz - 30, 80, "#EEF3F4", 0.7);
      ridge(g, { seed: 93, baseY: hz + 6, amp: 40, top: "#8696AC", bottom: "#9AA8BA", freq: 2.5, rough: 0.5 });
      reflect(c, hz + 6, 0.5, "#BFE0E0", "#9CC6CD");
      ripples(g, hz + 6, 94, "#FFFFFF", 120, 0.2);
      grain(g, 9, 9);
    },

    bali(c) {
      const g = c.getContext("2d");
      vgrad(g, 0, PH, [[0, "#DCE9E2"], [0.4, "#EEF0E2"], [0.55, "#F8F0DE"], [1, "#F8F0DE"]]);
      sun(g, PW * 0.72, PH * 0.24, 34, "#FFFCF2", "rgba(255,248,226,0.8)", 300);
      // volcano
      g.beginPath();
      g.moveTo(PW * 0.05, PH * 0.56);
      g.bezierCurveTo(PW * 0.25, PH * 0.5, PW * 0.36, PH * 0.32, PW * 0.42, PH * 0.3);
      g.lineTo(PW * 0.48, PH * 0.3);
      g.bezierCurveTo(PW * 0.56, PH * 0.34, PW * 0.68, PH * 0.5, PW * 0.95, PH * 0.56);
      g.closePath();
      g.fillStyle = "#CFDDD6";
      g.fill();
      mist(g, PH * 0.52, 120, "#F4F3E8", 0.9);
      const layers = [
        { seed: 111, y: 0.6, amp: 70, top: "#BFD6C4", bottom: "#C9DCCB", rows: 0 },
        { seed: 112, y: 0.72, amp: 90, top: "#A5C7AE", bottom: "#B4D0BA", rows: 6 },
        { seed: 113, y: 0.88, amp: 110, top: "#8AB698", bottom: "#9CC2A6", rows: 9 },
      ];
      layers.forEach((L, i) => {
        const f = ridge(g, { seed: L.seed, baseY: PH * L.y, amp: L.amp, top: L.top, bottom: L.bottom, freq: 1.2, rough: 0.4, oct: 4 });
        g.strokeStyle = "rgba(244,250,236,0.35)";
        g.lineWidth = 1.4;
        for (let r = 1; r <= L.rows; r++) {
          g.beginPath();
          for (let x = 0; x <= PW; x += 6) {
            const y = PH * L.y - f(x) * L.amp + r * (16 + i * 4) + Math.sin(x * 0.01 + r) * 4;
            x === 0 ? g.moveTo(x, y) : g.lineTo(x, y);
          }
          g.stroke();
        }
        mist(g, PH * L.y + 30, 90, "#F6F4E8", 0.55);
      });
      // palm
      const px = PW * 0.84, py = PH * 0.96;
      g.strokeStyle = "rgba(96,128,108,0.85)";
      g.lineCap = "round";
      g.lineWidth = 8;
      g.beginPath(); g.moveTo(px, py); g.quadraticCurveTo(px - 30, py - 220, px - 10, py - 380); g.stroke();
      g.lineWidth = 3;
      for (let i = 0; i < 9; i++) {
        const a = -Math.PI / 2 + (i - 4) * 0.42;
        const L = 120 + (i % 3) * 20;
        g.beginPath();
        g.moveTo(px - 10, py - 380);
        g.quadraticCurveTo(px - 10 + Math.cos(a) * L * 0.6, py - 380 + Math.sin(a) * L * 0.6 - 20, px - 10 + Math.cos(a) * L, py - 380 + Math.sin(a) * L + 40);
        g.stroke();
      }
      grain(g, 10, 9);
    },

    cappadocia(c) {
      const g = c.getContext("2d");
      vgrad(g, 0, PH, [[0, "#D7D1EA"], [0.38, "#F2D6D6"], [0.66, "#FBE4D0"], [1, "#FBE4D0"]]);
      sun(g, PW * 0.3, PH * 0.62, 50, "#FFF8EC", "rgba(255,232,214,0.85)", 380);
      ridge(g, { seed: 121, baseY: PH * 0.72, amp: 90, top: "#E9CDBF", bottom: "#E7CBBC", ridged: true, freq: 3.2, rough: 0.35, oct: 3 });
      mist(g, PH * 0.72, 80, "#FBE7DA", 0.7);
      ridge(g, { seed: 122, baseY: PH * 0.86, amp: 140, top: "#DDB6A4", bottom: "#D3A996", ridged: true, freq: 2.4, rough: 0.35, oct: 3 });
      const balloons = [
        [0.64, 0.2, 70, "#EBCFBE", "#E1A99A"], [0.42, 0.33, 46, "#F2E6B5", "#E6C98A"], [0.82, 0.38, 36, "#E9B7B7", "#D99A9F"],
        [0.2, 0.18, 30, "#CBD5E8", "#A9B6D6"], [0.53, 0.5, 24, "#F4C9A0", "#E3A97E"], [0.1, 0.42, 20, "#E9B7B7", "#D99A9F"],
        [0.92, 0.12, 22, "#F2E6B5", "#E6C98A"], [0.33, 0.56, 14, "#CBD5E8", "#A9B6D6"], [0.73, 0.58, 12, "#EBCFBE", "#E1A99A"],
      ];
      for (const [bx, by, r, c1, c2] of balloons) {
        const x = PW * bx, y = PH * by;
        const haze = clamp(1 - r / 80) * 0.45;
        g.save();
        g.globalAlpha = 1 - haze;
        g.beginPath();
        g.moveTo(x, y + r * 1.25);
        g.bezierCurveTo(x - r * 0.5, y + r * 0.95, x - r * 1.08, y + r * 0.2, x - r, y - r * 0.3);
        g.bezierCurveTo(x - r * 0.95, y - r * 1.25, x + r * 0.95, y - r * 1.25, x + r, y - r * 0.3);
        g.bezierCurveTo(x + r * 1.08, y + r * 0.2, x + r * 0.5, y + r * 0.95, x, y + r * 1.25);
        const gr = g.createLinearGradient(x - r, 0, x + r, 0);
        gr.addColorStop(0, c2);
        gr.addColorStop(0.45, c1);
        gr.addColorStop(1, c2);
        g.fillStyle = gr;
        g.fill();
        g.clip();
        g.strokeStyle = "rgba(255,255,255,0.35)";
        g.lineWidth = Math.max(1, r * 0.05);
        for (let k = -2; k <= 2; k++) {
          g.beginPath();
          g.moveTo(x + k * r * 0.38, y - r * 1.3);
          g.quadraticCurveTo(x + k * r * 0.5, y, x + k * r * 0.12, y + r * 1.3);
          g.stroke();
        }
        g.restore();
        g.save();
        g.globalAlpha = 1 - haze;
        g.fillStyle = "#8E7470";
        g.fillRect(x - r * 0.14, y + r * 1.38, r * 0.28, r * 0.2);
        g.restore();
      }
      grain(g, 11, 9);
    },

    lisse(c) {
      const g = c.getContext("2d");
      const hz = PH * 0.5;
      vgrad(g, 0, hz, [[0, "#CFDCEC"], [0.6, "#E8EDF0"], [1, "#F6F1EA"]]);
      glow(g, PW * 0.7, PH * 0.2, 360, "rgba(255,252,244,0.85)");
      const cols = ["#F3B5C3", "#F8E6A8", "#F6C6AB", "#EFA8BA", "#FBF3EE", "#F3B5C3", "#F8E6A8"];
      const vx = PW * 0.46;
      const n = 22;
      for (let i = -n; i < n; i++) {
        const x0 = vx + i * 150, x1 = vx + (i + 1) * 150;
        g.beginPath();
        g.moveTo(vx + i * 4, hz);
        g.lineTo(vx + (i + 1) * 4, hz);
        g.lineTo(vx + (x1 - vx) * 2.6, PH);
        g.lineTo(vx + (x0 - vx) * 2.6, PH);
        g.closePath();
        g.fillStyle = i % 2 === 0 ? cols[mod(i / 2, cols.length)] : "#B8CBAE";
        g.fill();
      }
      g.fillStyle = "rgba(250,244,240,0.38)";
      g.fillRect(0, hz, PW, PH - hz);
      vgrad(g, hz, hz + 220, [[0, "rgba(246,241,234,0.95)"], [1, "rgba(246,241,234,0)"]]);
      // tulip texture near camera
      const R = rng(131);
      for (let i = 0; i < 900; i++) {
        const k = Math.pow(R(), 0.6);
        const y = hz + 40 + k * (PH - hz - 40);
        const x = R() * PW;
        g.fillStyle = `rgba(255,255,255,${0.12 + R() * 0.18})`;
        g.beginPath();
        g.ellipse(x, y, 1 + k * 4, 1.5 + k * 6, 0, 0, 6.28);
        g.fill();
      }
      // windmill
      const mx = PW * 0.74, my = hz + 6;
      g.fillStyle = "rgba(140,128,150,0.8)";
      g.beginPath(); g.moveTo(mx - 20, my); g.lineTo(mx - 11, my - 92); g.lineTo(mx + 11, my - 92); g.lineTo(mx + 20, my); g.closePath(); g.fill();
      g.strokeStyle = "rgba(140,128,150,0.8)";
      g.lineWidth = 3;
      for (let k = 0; k < 4; k++) {
        const a = 0.5 + (k * Math.PI) / 2;
        g.beginPath(); g.moveTo(mx, my - 96); g.lineTo(mx + Math.cos(a) * 74, my - 96 + Math.sin(a) * 74); g.stroke();
      }
      grain(g, 12, 9);
    },
  };

  /* ------------------------------------------------------------------ DOM */

  const stage = document.getElementById("stage");

  function el(tag, parent, css = {}, cls = "") {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    Object.assign(e.style, css);
    parent.appendChild(e);
    return e;
  }

  // Position an element by its center.
  function put(e, x, y, o = {}) {
    const { s = 1, sx = s, sy = s, r = 0, ry = 0, z = 0, op = 1, blur = 0, persp = 0 } = o;
    e.style.transform = `${persp ? `perspective(${persp}px) ` : ""}translate3d(${x}px,${y}px,${z}px) translate(-50%,-50%) rotateY(${ry}deg) rotate(${r}deg) scale(${sx},${sy})`;
    e.style.opacity = op;
    e.style.visibility = op <= 0.001 ? "hidden" : "visible";
    e.style.filter = blur > 0.05 ? `blur(${blur.toFixed(2)}px)` : "none";
  }

  function fade(e, op, blur = 0) {
    e.style.opacity = op;
    e.style.visibility = op <= 0.001 ? "hidden" : "visible";
    e.style.filter = blur > 0.05 ? `blur(${blur.toFixed(2)}px)` : "none";
  }

  // Masked word-by-word headline. Words in *asterisks* are set italic.
  function words(parent, text, css = {}) {
    const root = el("div", parent, css, "abs serif nowrap");
    const items = [];
    text.split(" ").forEach((w, i, arr) => {
      const m = el("span", root, {}, "mask");
      const inner = el("span", m);
      if (w.startsWith("*")) {
        inner.style.fontStyle = "italic";
        w = w.replace(/\*/g, "");
      }
      inner.textContent = w;
      items.push(inner);
      if (i < arr.length - 1) root.appendChild(document.createTextNode(" "));
    });
    return { root, items };
  }

  function revealWords(w, t, start, { stagger = 0.07, dur = 0.9, out = Infinity, outStagger = 0.035, outDur = 0.45 } = {}) {
    w.items.forEach((inner, i) => {
      const p = E.outExpo(seg(t, start + i * stagger, start + i * stagger + dur));
      const q = E.inExpo(seg(t, out + i * outStagger, out + i * outStagger + outDur));
      inner.style.transform = `translate3d(0,${((1 - p) * 105 - q * 105).toFixed(2)}%,0) rotate(${((1 - p) * 4).toFixed(2)}deg)`;
      inner.style.opacity = Math.min(p * 1.4, 1 - q);
    });
  }

  // Letter-by-letter soft focus pull.
  function letters(parent, text, css = {}, cls = "") {
    const root = el("div", parent, css, "abs nowrap " + cls);
    const items = [...text].map((ch) => {
      const s = el("span", root, { display: "inline-block", whiteSpace: "pre" });
      s.textContent = ch;
      return s;
    });
    return { root, items };
  }

  function revealLetters(l, t, start, { stagger = 0.03, dur = 0.8, rise = 14, blur = 10, out = Infinity, outDur = 0.4 } = {}) {
    l.items.forEach((s, i) => {
      const p = E.outQuint(seg(t, start + i * stagger, start + i * stagger + dur));
      const q = E.inOut(seg(t, out + i * 0.012, out + i * 0.012 + outDur));
      s.style.transform = `translate3d(0,${((1 - p) * rise - q * rise).toFixed(2)}px,0)`;
      s.style.opacity = p * (1 - q);
      const b = (1 - p) * blur + q * blur;
      s.style.filter = b > 0.05 ? `blur(${b.toFixed(2)}px)` : "none";
    });
  }

  /* Layers, back to front */

  const bgCanvas = el("canvas", stage, {}, "full");
  bgCanvas.width = 480;
  bgCanvas.height = 270;
  const bg = bgCanvas.getContext("2d");

  const fxBackCanvas = el("canvas", stage, {}, "full");
  fxBackCanvas.width = W;
  fxBackCanvas.height = H;
  const fxBack = fxBackCanvas.getContext("2d");

  const world = el("div", stage, { transformOrigin: "960px 540px" }, "layer");

  // A — opening words
  const aWord = letters(world, "mira", { left: "960px", top: "636px", fontSize: "52px", fontStyle: "italic", fontWeight: 300, transform: "translate(-50%,0)", fontFamily: "Newsreader" });
  const aGloss = letters(world, "to look  ·  to see", { left: "960px", top: "712px", transform: "translate(-50%,0)" }, "caps");
  aGloss.root.style.color = "rgba(26,26,26,0.5)";
  aGloss.root.style.letterSpacing = "0.32em";

  // Row stage: the hero (iris → card) and the gallery share one perspective.
  const rowWrap = el("div", world, { perspective: "1700px", perspectiveOrigin: "960px 600px" }, "layer");

  const GALLERY = [
    { key: "iceland", title: "Chase the Northern Lights", place: "Iceland" },
    { key: "santorini", title: "Sunset Sail in Santorini", place: "Greece" },
    { key: "kenya", title: "Safari at Sunrise", place: "Kenya" },
    { key: "tokyo", title: "Cherry Blossom Season", place: "Tokyo, Japan" },
    { key: "patagonia", title: "Trek the Glaciers", place: "Patagonia" },
    { key: "bali", title: "Yoga Retreat in Ubud", place: "Bali" },
    { key: "cappadocia", title: "Balloons at Dawn", place: "Cappadocia" },
  ];
  const HERO_INDEX = 3;
  const CARD_W = 300, CARD_H = 375, PITCH = 352, ROW_Y = 600;

  const images = {};
  const galleryEls = GALLERY.map((it, i) => {
    if (i === HERO_INDEX) return null;
    const wrap = el("div", rowWrap, { width: CARD_W + "px", height: CARD_H + "px" }, "abs");
    const card = el("div", wrap, { width: "100%", height: "100%" }, "card");
    const img = el("img", card, {}, "cover");
    const cap = el("div", wrap, { position: "absolute", left: "2px", top: CARD_H + 22 + "px", width: CARD_W + 40 + "px" });
    el("div", cap, { fontSize: "22px", fontWeight: 300, lineHeight: 1.2 }, "serif").textContent = it.title;
    el("div", cap, { marginTop: "8px", color: "rgba(26,26,26,0.45)", fontSize: "12px" }, "caps").textContent = it.place;
    return { wrap, img, key: it.key };
  });

  const hero = el("div", rowWrap, { overflow: "hidden", background: PAL.dot }, "abs");
  const heroImg = el("img", hero, {}, "cover");
  const heroCap = el("div", rowWrap, { width: CARD_W + 40 + "px" }, "abs");
  el("div", heroCap, { fontSize: "22px", fontWeight: 300, lineHeight: 1.2 }, "serif").textContent = GALLERY[HERO_INDEX].title;
  el("div", heroCap, { marginTop: "8px", color: "rgba(26,26,26,0.45)", fontSize: "12px" }, "caps").textContent = GALLERY[HERO_INDEX].place;

  // B — lens details around the iris
  const SVGNS = "http://www.w3.org/2000/svg";
  const lensSvg = document.createElementNS(SVGNS, "svg");
  lensSvg.setAttribute("width", W);
  lensSvg.setAttribute("height", H);
  lensSvg.setAttribute("class", "layer");
  world.appendChild(lensSvg);
  const lensArc = document.createElementNS(SVGNS, "circle");
  lensArc.setAttribute("fill", "none");
  lensArc.setAttribute("stroke", "rgba(26,26,26,0.28)");
  lensArc.setAttribute("stroke-width", "1");
  lensSvg.appendChild(lensArc);
  const lensHead = document.createElementNS(SVGNS, "circle");
  lensHead.setAttribute("r", "3.5");
  lensHead.setAttribute("fill", PAL.dot);
  lensSvg.appendChild(lensHead);
  const ripple = document.createElementNS(SVGNS, "circle");
  ripple.setAttribute("fill", "none");
  ripple.setAttribute("stroke", PAL.dot);
  lensSvg.appendChild(ripple);

  const coordA = letters(world, "35°21′ N   138°43′ E", {}, "caps");
  coordA.root.style.color = "rgba(26,26,26,0.5)";
  coordA.root.style.fontSize = "13px";
  const coordB = letters(world, "Spring  ·  first bloom", {}, "caps");
  coordB.root.style.color = "rgba(26,26,26,0.5)";
  coordB.root.style.fontSize = "13px";
  const bLine = words(world, "The best journeys begin with a *vision.*", { left: "960px", top: "842px", fontSize: "46px", fontWeight: 300, transform: "translate(-50%,0)", letterSpacing: "-0.01em" });

  // C — headline over the gallery
  const cEyebrow = letters(world, "A bucket list for living with intention", { left: "960px", top: "132px", transform: "translate(-50%,0)" }, "caps");
  cEyebrow.root.style.color = "rgba(26,26,26,0.5)";
  const cHead = words(world, "Where Intention & *Journey* Meet", { left: "960px", top: "172px", fontSize: "92px", fontWeight: 300, transform: "translate(-50%,0)", letterSpacing: "-0.02em" });

  // D/E/F — the product, step by step
  const prod = el("div", world, {}, "layer");
  const prodText = el("div", prod, { left: "210px", top: "0px", width: "560px", height: "1080px" }, "abs");
  const eyebrow = letters(prodText, "How Myra works", { left: "0px", top: "268px" }, "caps");
  eyebrow.root.style.color = "rgba(26,26,26,0.5)";
  const numSlot = el("div", prodText, { left: "-6px", top: "300px", height: "150px", overflow: "hidden", fontSize: "150px", lineHeight: "150px", fontWeight: 200, color: "#DDAE96" }, "abs serif");
  const numCol = el("div", numSlot, {});
  ["01", "02", "03"].forEach((n) => (el("div", numCol, { height: "150px" }).textContent = n));
  const titles = ["Discover", "Save", "Complete"].map((txt) =>
    words(prodText, txt, { left: "0px", top: "468px", fontSize: "104px", fontWeight: 300, letterSpacing: "-0.025em" })
  );
  const descs = [
    "Say the journey you're dreaming of.\nMyra finds experiences that match.",
    "Keep the ones that speak to you.\nMyra finds the best time to go.",
    "Live it, then mark it complete.\nEvery journey deserves remembering.",
  ].map((txt) => {
    const d = el("div", prodText, { left: "4px", top: "618px", width: "560px", fontSize: "23px", lineHeight: 1.55, fontWeight: 300, color: "rgba(26,26,26,0.6)", whiteSpace: "pre-line" }, "abs");
    d.textContent = txt;
    return d;
  });
  const stepTicks = el("div", prodText, { left: "4px", top: "748px", display: "flex", gap: "10px" }, "abs");
  const ticks = [0, 1, 2].map(() => el("div", stepTicks, { height: "2px", width: "34px", background: "rgba(26,26,26,0.12)", borderRadius: "2px", overflow: "hidden" }));
  const tickFill = ticks.map((tk) => el("div", tk, { height: "100%", width: "100%", background: PAL.ink, transformOrigin: "0 50%" }));

  const PANEL = { x: 860, y: 200, w: 860, h: 680 };
  const panel = el("div", prod, { left: PANEL.x + "px", top: PANEL.y + "px", width: PANEL.w + "px", height: PANEL.h + "px" }, "abs glass");

  const discover = el("div", panel, {}, "layer");
  const intentLbl = el("div", discover, { left: "48px", top: "50px", color: "rgba(26,26,26,0.45)", fontSize: "13px" }, "abs caps");
  intentLbl.textContent = "My intention";
  const inputBox = el("div", discover, { left: "48px", top: "78px", width: "764px", height: "84px", borderBottom: "1px solid rgba(26,26,26,0.14)", overflow: "hidden" }, "abs");
  const inputText = el("div", inputBox, { left: "0px", top: "14px", fontSize: "44px", fontStyle: "italic", fontWeight: 300, whiteSpace: "pre" }, "abs serif");
  const caret = el("div", inputBox, { top: "22px", width: "2px", height: "46px", background: PAL.ink }, "abs");
  const sheen = el("div", inputBox, { top: "0px", width: "260px", height: "84px", background: "linear-gradient(90deg, rgba(255,255,255,0), rgba(255,255,255,0.9), rgba(255,255,255,0))", mixBlendMode: "screen" }, "abs");
  const matchLbl = letters(discover, "✦  Three experiences in bloom", { left: "48px", top: "196px", fontSize: "13px", color: "rgba(26,26,26,0.55)" }, "caps");

  const RESULTS = [
    { key: "tokyo", title: "Cherry Blossom Season in Tokyo", when: "Mar – Apr" },
    { key: "lisse", title: "Tulip Fields of Lisse", when: "Apr" },
    { key: "cappadocia", title: "Balloons at Dawn, Cappadocia", when: "Apr – Jun" },
  ];
  const RW = 232, RH = 290, RGAP = 34, RTOP = 238;
  // Loading skeletons (the app's warm shimmer) hold the space until matches land.
  const SHIMMER = "linear-gradient(90deg, rgba(212,208,200,0) 0%, rgba(255,255,255,0.55) 50%, rgba(212,208,200,0) 100%)";
  const skeletons = [0, 1, 2].map((i) => {
    const wrap = el("div", discover, { left: 48 + i * (RW + RGAP) + "px", top: RTOP + "px", width: RW + "px" }, "abs");
    const css = { backgroundColor: "rgba(212,208,200,0.38)", backgroundImage: SHIMMER, backgroundSize: "200% 100%", backgroundRepeat: "no-repeat" };
    const bars = [
      el("div", wrap, { ...css, width: RW + "px", height: RH + "px", borderRadius: "16px" }),
      el("div", wrap, { ...css, width: RW * 0.8 + "px", height: "14px", borderRadius: "7px", marginTop: "20px" }),
      el("div", wrap, { ...css, width: RW * 0.35 + "px", height: "10px", borderRadius: "5px", marginTop: "12px" }),
    ];
    return { wrap, bars };
  });
  const results = RESULTS.map((r, i) => {
    const wrap = el("div", discover, { left: 48 + i * (RW + RGAP) + "px", top: RTOP + "px", width: RW + "px" }, "abs");
    const card = el("div", wrap, { width: RW + "px", height: RH + "px", borderRadius: "16px" }, "card");
    const img = el("img", card, {}, "cover");
    const t = el("div", wrap, { marginTop: "16px", fontSize: "19px", lineHeight: 1.25, fontWeight: 300, whiteSpace: "nowrap" }, "serif");
    t.textContent = r.title;
    const w = el("div", wrap, { marginTop: "8px", color: "rgba(26,26,26,0.5)", fontSize: "12px" }, "caps");
    w.textContent = r.when;
    return { wrap, card, img, key: r.key };
  });
  const savedChip = el("div", discover, { left: 48 + RW - 14 + "px", top: RTOP + 14 + "px", background: PAL.ink, color: "#fff", padding: "10px 16px 10px 13px", fontSize: "13px" }, "abs chip");
  savedChip.innerHTML = `<svg width="13" height="12" viewBox="0 0 24 22"><path d="M12 21s-8.5-5.3-10.6-10.1C-0.4 6.6 2.4 1.5 7 1.5c2.3 0 3.9 1.2 5 2.9 1.1-1.7 2.7-2.9 5-2.9 4.6 0 7.4 5.1 5.6 9.4C20.5 15.7 12 21 12 21z" fill="${PAL.terracotta}"/></svg>Saved`;

  // Calendar ("Your year")
  const cal = el("div", panel, {}, "layer");
  const calHead = el("div", cal, { left: "48px", top: "46px", fontSize: "44px", fontWeight: 300, letterSpacing: "-0.01em" }, "abs serif");
  calHead.textContent = "Your year";
  const calYear = el("div", cal, { right: "48px", left: "auto", top: "66px", color: "rgba(26,26,26,0.45)", fontSize: "13px" }, "abs caps");
  calYear.textContent = "2027  ·  12 months";
  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const CW = 179, CH = 108, CG = 16, CTOP = 140, CLEFT = 48;
  const cellPos = (i) => ({ x: CLEFT + (i % 4) * (CW + CG), y: CTOP + Math.floor(i / 4) * (CH + CG) });
  const band = el("div", cal, {
    left: CLEFT + 2 * (CW + CG) - 7 + "px", top: CTOP - 7 + "px", width: CW * 2 + CG + 14 + "px", height: CH + 14 + "px",
    borderRadius: "22px", background: "linear-gradient(90deg, #F6E5A9, #F2CDB9)", transformOrigin: "0 50%",
    boxShadow: "0 18px 40px -16px rgba(220,160,120,0.6)",
  }, "abs");
  const DOTS = [[2], [1], [0, 2], [], [1, 1], [0], [2, 0, 1], [], [0], [1, 2], [], [0, 0]];
  const DOT_COL = ["#DFAF97", "#E3CB80", "#AFC7B3"];
  const cells = MONTHS.map((m, i) => {
    const p = cellPos(i);
    const c = el("div", cal, { left: p.x + "px", top: p.y + "px", width: CW + "px", height: CH + "px", borderRadius: "16px", background: "rgba(247,245,240,0.92)", border: "1px solid rgba(26,26,26,0.07)" }, "abs");
    const lbl = el("div", c, { left: "16px", top: "16px", fontSize: "13px", color: "rgba(26,26,26,0.55)" }, "abs caps");
    lbl.textContent = m;
    const dots = DOTS[i].map((col, k) => el("div", c, { left: 16 + k * 20 + "px", top: CH - 32 + "px", width: "13px", height: "13px", borderRadius: "50%", background: DOT_COL[col] }, "abs"));
    return { c, dots };
  });
  const bestLbl = letters(cal, "✦  Best time to go", { left: "48px", top: "548px", fontSize: "13px", color: "rgba(26,26,26,0.55)" }, "caps");
  const bestWhen = words(cal, "late *March* → mid *April*", { left: "48px", top: "574px", fontSize: "36px", fontWeight: 300 });

  // The one experience we follow: result card → April → completed.
  const flyer = el("div", prod, { overflow: "hidden" }, "abs card");
  const flyerImg = el("img", flyer, {}, "cover");
  const flyerCap = el("div", prod, { width: "520px", textAlign: "center" }, "abs");
  el("div", flyerCap, { fontSize: "30px", fontWeight: 300 }, "serif").textContent = "Cherry Blossom Season in Tokyo";
  el("div", flyerCap, { marginTop: "10px", color: "rgba(26,26,26,0.5)", fontSize: "13px" }, "caps").textContent = "Lived  ·  April 2027";
  const badge = el("div", prod, { background: PAL.ink, color: "#fff", padding: "15px 26px 15px 18px", fontSize: "15px", gap: "12px", boxShadow: "0 12px 30px -10px rgba(26,26,26,0.45)" }, "abs chip");
  badge.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24"><circle cx="12" cy="12" r="11" fill="${PAL.terracotta}"/><path id="chk" d="M7 12.5l3.2 3.2L17 9" fill="none" stroke="${PAL.ink}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="16" stroke-dashoffset="16"/></svg>Completed`;
  const chk = badge.querySelector("#chk");
  const badgeRing = el("div", prod, { width: "236px", height: "60px", borderRadius: "999px", border: `1.5px solid ${PAL.dot}` }, "abs");

  // G — the mark
  const logo = el("div", world, { left: "960px", top: "470px", display: "flex", alignItems: "center", fontSize: "250px", fontWeight: 300, lineHeight: 1 }, "abs serif");
  const logoLetters = [..."Myra"].map((ch) => {
    const s = el("span", logo, { display: "inline-block" });
    s.textContent = ch;
    return s;
  });
  const logoDot = el("span", logo, { display: "inline-block", width: "36px", height: "36px", borderRadius: "50%", background: PAL.dot, marginLeft: "14px", alignSelf: "center", marginTop: "40px" });
  const tagline = words(world, "Where intention & *journey* meet.", { left: "960px", top: "636px", fontSize: "42px", fontWeight: 300, transform: "translate(-50%,0)", color: "rgba(26,26,26,0.78)" });
  const rule = el("div", world, { left: "960px", top: "738px", width: "64px", height: "1px", background: "rgba(26,26,26,0.25)", transformOrigin: "50% 50%" }, "abs");
  const endCaps = letters(world, "Your personal travel experience planner", { left: "960px", top: "768px", transform: "translate(-50%,0)", color: "rgba(26,26,26,0.5)" }, "caps");

  const fxFrontCanvas = el("canvas", stage, {}, "full");
  fxFrontCanvas.width = W;
  fxFrontCanvas.height = H;
  const fx = fxFrontCanvas.getContext("2d");

  const leak = el("div", stage, { width: "1600px", height: "1600px", borderRadius: "50%", background: "radial-gradient(circle, rgba(255,240,226,1) 0%, rgba(255,226,206,0.6) 30%, rgba(255,226,206,0) 68%)", mixBlendMode: "screen" }, "abs");

  el("div", stage, { background: "radial-gradient(ellipse 75% 70% at 50% 48%, rgba(0,0,0,0) 55%, rgba(140,100,84,0.13) 100%)" }, "layer");

  const grainCanvas = el("canvas", stage, { mixBlendMode: "overlay", opacity: 0.5, imageRendering: "auto" }, "full");
  grainCanvas.width = 960;
  grainCanvas.height = 540;
  const grainCtx = grainCanvas.getContext("2d");
  const grainFrames = [0, 1, 2, 3, 4, 5].map((k) => {
    const id = grainCtx.createImageData(960, 540);
    const R = rng(900 + k);
    for (let i = 0; i < id.data.length; i += 4) {
      const v = 128 + (R() + R() + R() - 1.5) * 34;
      id.data[i] = id.data[i + 1] = id.data[i + 2] = v;
      id.data[i + 3] = 255;
    }
    return id;
  });

  /* ---------------------------------------------------------- atmosphere */

  // Soft colour fields that breathe behind everything; their mix shifts per beat.
  const BLOBS = [
    { c: "#F2E6B5", x: 0.2, y: 0.25, r: 0.55, ax: 0.08, ay: 0.06, w: 0.21, p: 0.0 },
    { c: "#EBCFBE", x: 0.82, y: 0.72, r: 0.6, ax: 0.07, ay: 0.08, w: 0.17, p: 1.7 },
    { c: "#F4D4DC", x: 0.7, y: 0.2, r: 0.5, ax: 0.09, ay: 0.05, w: 0.23, p: 3.1 },
    { c: "#D9E2EF", x: 0.15, y: 0.85, r: 0.55, ax: 0.06, ay: 0.07, w: 0.19, p: 4.4 },
    { c: "#E5DCF0", x: 0.5, y: 0.5, r: 0.45, ax: 0.12, ay: 0.08, w: 0.15, p: 5.2 },
    { c: "#DFEADB", x: 0.95, y: 0.1, r: 0.4, ax: 0.05, ay: 0.06, w: 0.25, p: 2.4 },
  ];
  const MOODS = [
    [0, [0.45, 0.3, 0.25, 0.15, 0.15, 0.05]],
    [T.B, [0.35, 0.45, 0.65, 0.3, 0.45, 0.0]],
    [T.C, [0.55, 0.5, 0.45, 0.35, 0.3, 0.2]],
    [T.D, [0.25, 0.35, 0.35, 0.75, 0.65, 0.25]],
    [T.E, [0.75, 0.45, 0.25, 0.3, 0.25, 0.35]],
    [T.F, [0.3, 0.6, 0.75, 0.25, 0.45, 0.1]],
    [T.G, [0.6, 0.55, 0.45, 0.3, 0.4, 0.15]],
  ];
  function mood(t) {
    let out = MOODS[0][1];
    for (let i = 1; i < MOODS.length; i++) {
      const k = E.inOutSine(seg(t, MOODS[i][0] - 0.3, MOODS[i][0] + 0.7));
      out = out.map((v, j) => lerp(v, MOODS[i][1][j], k));
    }
    return out;
  }

  function drawBackground(t) {
    const w = bgCanvas.width, h = bgCanvas.height;
    bg.fillStyle = PAL.cream;
    bg.fillRect(0, 0, w, h);
    const m = mood(t);
    BLOBS.forEach((b, i) => {
      const x = (b.x + Math.sin(t * b.w + b.p) * b.ax) * w;
      const y = (b.y + Math.cos(t * b.w * 0.8 + b.p) * b.ay) * h;
      const r = b.r * w * (1 + 0.06 * Math.sin(t * 0.5 + i));
      const gr = bg.createRadialGradient(x, y, 0, x, y, r);
      gr.addColorStop(0, rgba(b.c, m[i]));
      gr.addColorStop(0.5, rgba(b.c, m[i] * 0.45));
      gr.addColorStop(1, rgba(b.c, 0));
      bg.fillStyle = gr;
      bg.fillRect(0, 0, w, h);
    });
  }

  function drawPetal(g, x, y, size, rot, flip, alpha) {
    if (alpha <= 0.002) return;
    const sx = Math.cos(flip);
    g.save();
    g.translate(x, y);
    g.rotate(rot);
    g.scale(Math.max(0.14, Math.abs(sx)), 1);
    const h = size, w = size * 0.82;
    const gr = g.createLinearGradient(0, h * 0.5, 0, -h * 0.5);
    if (sx >= 0) {
      gr.addColorStop(0, "#EFA6B9");
      gr.addColorStop(0.5, "#F8CCD7");
      gr.addColorStop(1, "#FFF2F4");
    } else {
      gr.addColorStop(0, "#F3BFCB");
      gr.addColorStop(0.6, "#FBE0E6");
      gr.addColorStop(1, "#FFF8F8");
    }
    g.globalAlpha = alpha;
    g.fillStyle = gr;
    petalPath(g, w, h);
    g.fill();
    g.restore();
  }

  const AMBIENT = Array.from({ length: 38 }, (_, i) => {
    const R = rng(500 + i * 7);
    return {
      x0: R() * 2200 - 140, y0: R() * 1320, vy: 38 + R() * 52, vx: -(12 + R() * 34),
      sway: 18 + R() * 56, sf: 0.5 + R() * 0.9, sp: R() * 6.28, size: 10 + R() * 15,
      r0: R() * 6.28, rs: (R() - 0.5) * 1.8, f0: R() * 6.28, fs: 1.1 + R() * 2.6, depth: R(),
    };
  });

  const MOTES = Array.from({ length: 70 }, (_, i) => {
    const R = rng(1500 + i * 3);
    return { x0: R() * W, y0: R() * H, vy: -(6 + R() * 18), vx: (R() - 0.5) * 10, r: 0.8 + R() * 2.6, a: 0.25 + R() * 0.5, tw: 0.8 + R() * 2, p: R() * 6.28, depth: R() };
  });

  const BURST_T = 11.02;
  const BURST_O = { x: 1290, y: 500 };
  const BURST = Array.from({ length: 54 }, (_, i) => {
    const R = rng(3000 + i * 11);
    const a = R() * Math.PI * 2;
    return { a, v: 420 + R() * 980, size: 10 + R() * 18, r0: R() * 6.28, rs: (R() - 0.5) * 5, f0: R() * 6.28, fs: 2 + R() * 5, sway: 10 + R() * 40, sp: R() * 6.28, depth: R() };
  });

  function ambientAmount(t) {
    return (
      0.62 * E.inOutSine(seg(t, 3.9, 4.8)) -
      0.25 * E.inOutSine(seg(t, 6.3, 7.0)) +
      0.35 * E.inOutSine(seg(t, 10.6, 11.4)) -
      0.1 * E.inOutSine(seg(t, 12.6, 13.6))
    );
  }

  function drawFx(t, petalA, petalG) {
    fx.clearRect(0, 0, W, H);
    fxBack.clearRect(0, 0, W, H);

    // motes
    MOTES.forEach((m) => {
      const x = mod(m.x0 + m.vx * t, W);
      const y = mod(m.y0 + m.vy * t, H + 40) - 20;
      const a = m.a * (0.55 + 0.45 * Math.sin(t * m.tw + m.p));
      const g = m.depth < 0.6 ? fxBack : fx;
      glow(g, x, y, m.r * 3, `rgba(255,252,246,${a})`);
    });

    // ambient petals
    const amb = ambientAmount(t);
    if (amb > 0.001) {
      AMBIENT.forEach((p) => {
        const y = mod(p.y0 + p.vy * t, 1320) - 120;
        const x = mod(p.x0 + p.vx * t + Math.sin(p.sf * t + p.sp) * p.sway, 2200) - 140;
        const far = p.depth < 0.45;
        const g = far ? fxBack : fx;
        const size = far ? p.size * 0.6 : p.size * (1 + (p.depth - 0.45) * 0.9);
        if (far) g.filter = "blur(1.5px)";
        drawPetal(g, x, y, size, p.r0 + p.rs * t, p.f0 + p.fs * t, amb * (far ? 0.5 : 0.85));
        if (far) g.filter = "none";
      });
    }

    // burst from the completed card
    if (t > BURST_T) {
      const dt = t - BURST_T;
      const k = 2.3;
      BURST.forEach((p) => {
        const disp = (p.v / k) * (1 - Math.exp(-k * dt));
        const x = BURST_O.x + Math.cos(p.a) * disp + Math.sin(dt * 2 + p.sp) * p.sway * dt;
        const y = BURST_O.y + Math.sin(p.a) * disp * 0.75 + 34 * dt * dt;
        const a = E.outQuint(seg(dt, 0, 0.12)) * (1 - E.inOut(seg(dt, 2.2, 3.6)));
        const g = p.depth < 0.35 ? fxBack : fx;
        drawPetal(g, x, y, p.size * (0.6 + 0.4 * E.outExpo(seg(dt, 0, 0.5))), p.r0 + p.rs * dt, p.f0 + p.fs * dt, a);
      });
    }

    if (petalA) drawPetal(fx, petalA.x, petalA.y, petalA.size, petalA.rot, petalA.flip, petalA.a);
    if (petalG) drawPetal(fx, petalG.x, petalG.y, petalG.size, petalG.rot, petalG.flip, petalG.a);
  }

  // A falling petal that lands at (tx, ty) at time t1 and dissolves into the dot.
  function landingPetal(t, t0, t1, from, to, seed) {
    if (t < t0 || t > t1 + 0.25) return null;
    const R = rng(seed);
    const ph = R() * 6;
    const u = seg(t, t0, t1);
    const e = E.soft(u);
    const sway = Math.sin(u * Math.PI * 2.3 + ph) * 90 * (1 - e);
    const x = lerp(from.x, to.x, E.inOutSine(u)) + sway;
    const y = lerp(from.y, to.y, e);
    return {
      x, y,
      size: lerp(64, 22, E.inOut(u)),
      rot: lerp(-1.2, 0.2, u) + Math.sin(u * 7 + ph) * 0.4 * (1 - u),
      flip: u * 9.5 * (1 - u * 0.5),
      a: E.outQuint(seg(t, t0, t0 + 0.4)) * (1 - E.inOut(seg(t, t1 - 0.12, t1 + 0.12))),
    };
  }

  /* ---------------------------------------------------------------- frame */

  function heroGeometry(t, rowX) {
    // dot → iris → card → gallery tile
    const open = E.outExpo(seg(t, 1.92, 2.95));
    const drift = E.outQuint(seg(t, 2.6, 3.8));
    const morph = E.inOutExpo(seg(t, 3.62, 4.42));
    const settle = E.inOut(seg(t, 4.3, 5.25));
    let size = lerp(18, 560, open) + 44 * drift;
    let w = size, h = size, r = size / 2;
    let cx = 960, cy = lerp(540, 492, open);
    w = lerp(w, 430, morph);
    h = lerp(h, 538, morph);
    r = lerp(r, 22, morph);
    cy = lerp(cy, 530, morph);
    w = lerp(w, CARD_W, settle);
    h = lerp(h, CARD_H, settle);
    r = lerp(r, 18, settle);
    cx = lerp(cx, rowX + HERO_INDEX * PITCH, settle);
    cy = lerp(cy, ROW_Y, settle);
    return { cx, cy, w, h, r, settle };
  }

  function rowOffset(t) {
    const drift = -42 * Math.max(0, t - 4.3);
    const whip = -2900 * E.inExpo(seg(t, 5.95, 6.6));
    return 960 - HERO_INDEX * PITCH + drift + whip;
  }

  function cardTilt(x) {
    const d = (x - 960) / 960;
    return { ry: -d * 16, z: -Math.abs(d) * 160, dy: d * d * 34 };
  }

  let lastFrame = -1;

  function renderFrame(t, { frame = Math.round(clamp(t, 0, DURATION) * 60), loop = false } = {}) {
    t = clamp(t, 0, DURATION);

    drawBackground(t);

    /* --- A: petal, dot, "mira" ------------------------------------- */
    const petalA = landingPetal(t, 0.05, 1.42, { x: 690, y: -60 }, { x: 960, y: 540 }, 3);
    revealLetters(aWord, t, 0.45, { stagger: 0.07, dur: 1.0, rise: 18, blur: 7, out: 1.8, outDur: 0.35 });
    revealLetters(aGloss, t, 0.75, { stagger: 0.022, dur: 0.9, rise: 10, blur: 8, out: 1.8, outDur: 0.35 });
    // The loop cut opens on the resting dot, so the "mira" gloss stays out of it.
    fade(aWord.root, loop ? 0 : 1);
    fade(aGloss.root, loop ? 0 : 1);

    /* --- hero (dot → iris → card) ---------------------------------- */
    const rowX = rowOffset(t);
    const hg = heroGeometry(t, rowX);
    const dotIn = E.outQuint(seg(t, 1.3, 1.5));
    const heroTilt = cardTilt(hg.cx);
    hero.style.width = hg.w + "px";
    hero.style.height = hg.h + "px";
    hero.style.borderRadius = hg.r + "px";
    hero.style.boxShadow = `0 ${30 * seg(t, 2, 3)}px ${80 * seg(t, 2, 3)}px -20px rgba(110,70,60,${0.28 * seg(t, 2, 3)})`;
    const landBounce = t < 1.9 ? 1 + 0.18 * Math.sin(seg(t, 1.42, 1.85) * Math.PI) * (1 - seg(t, 1.42, 1.85)) : 1;
    put(hero, hg.cx, hg.cy + heroTilt.dy * hg.settle, { s: landBounce, ry: heroTilt.ry * hg.settle, z: heroTilt.z * hg.settle, op: dotIn });
    const imgIn = E.inOut(seg(t, 1.95, 2.35));
    heroImg.style.opacity = imgIn;
    const kb = lerp(1.42, 1.04, E.soft(seg(t, 1.92, 6.2)));
    heroImg.style.transform = `translate3d(${(-(hg.cx - 960) * 0.05 * hg.settle).toFixed(2)}px, ${lerp(30, 0, E.outQuint(seg(t, 1.92, 4.5))).toFixed(2)}px, 0) scale(${kb})`;
    put(heroCap, hg.cx + 20, hg.cy + heroTilt.dy + CARD_H / 2 + 52, { ry: heroTilt.ry, z: heroTilt.z, op: E.outQuint(seg(t, 5.0, 5.7)), blur: (1 - seg(t, 5.0, 5.6)) * 6 });

    // landing ripple + lens bezel
    const rp = seg(t, 1.42, 2.4);
    ripple.setAttribute("cx", 960);
    ripple.setAttribute("cy", 540);
    ripple.setAttribute("r", 9 + E.outExpo(rp) * 190);
    ripple.setAttribute("stroke-width", lerp(2, 0.5, rp));
    ripple.setAttribute("opacity", !loop && rp > 0 && rp < 1 ? (1 - rp) * 0.9 : 0);

    const lensR = hg.w / 2 + 26;
    const arcP = E.inOut(seg(t, 2.15, 3.5));
    const lensOp = E.outQuint(seg(t, 2.1, 2.5)) * (1 - E.inOut(seg(t, 3.55, 3.85)));
    const circ = 2 * Math.PI * lensR;
    lensArc.setAttribute("cx", hg.cx);
    lensArc.setAttribute("cy", hg.cy);
    lensArc.setAttribute("r", lensR);
    lensArc.setAttribute("stroke-dasharray", `${circ * arcP} ${circ}`);
    lensArc.setAttribute("transform", `rotate(-90 ${hg.cx} ${hg.cy})`);
    lensArc.setAttribute("opacity", lensOp);
    const ha = -Math.PI / 2 + arcP * Math.PI * 2;
    lensHead.setAttribute("cx", hg.cx + Math.cos(ha) * lensR);
    lensHead.setAttribute("cy", hg.cy + Math.sin(ha) * lensR);
    lensHead.setAttribute("opacity", lensOp * (arcP > 0 && arcP < 1 ? 1 : 0.0));

    coordA.root.style.left = hg.cx + lensR * 0.78 + 26 + "px";
    coordA.root.style.top = hg.cy - lensR * 0.7 + "px";
    coordB.root.style.left = hg.cx - lensR * 0.78 - 250 + "px";
    coordB.root.style.top = hg.cy + lensR * 0.66 + "px";
    revealLetters(coordA, t, 2.5, { stagger: 0.018, dur: 0.7, rise: 6, blur: 6, out: 3.5, outDur: 0.3 });
    revealLetters(coordB, t, 2.7, { stagger: 0.018, dur: 0.7, rise: 6, blur: 6, out: 3.5, outDur: 0.3 });
    revealWords(bLine, t, 2.35, { stagger: 0.075, dur: 1.0, out: 3.3, outDur: 0.35 });

    /* --- C: gallery ------------------------------------------------- */
    const rowSpeed = Math.abs(rowOffset(t + 1 / 120) - rowOffset(t - 1 / 120)) * 60;
    galleryEls.forEach((g, i) => {
      if (!g) return;
      const x = rowX + i * PITCH;
      const tilt = cardTilt(x);
      const delay = 4.38 + Math.abs(i - HERO_INDEX) * 0.11 + (i > HERO_INDEX ? 0.04 : 0);
      const p = E.outExpo(seg(t, delay, delay + 1.25));
      put(g.wrap, x, ROW_Y + tilt.dy + (1 - p) * 90, { ry: tilt.ry + (1 - p) * 10 * Math.sign(i - HERO_INDEX), z: tilt.z - (1 - p) * 1500, op: Math.min(1, p * 1.6), blur: (1 - p) * 16 });
      g.img.style.transform = `translate3d(${(-(x - 960) * 0.06).toFixed(2)}px,0,0) scale(${lerp(1.22, 1.08, p)})`;
    });
    const blurX = Math.min(48, rowSpeed / 90);
    document.getElementById("mbRowG").setAttribute("stdDeviation", `${blurX.toFixed(2)} 0`);
    rowWrap.style.filter = blurX > 0.3 ? "url(#mbRow)" : "none";
    rowWrap.style.opacity = 1 - E.inQuad(seg(t, 6.25, 6.6));

    revealLetters(cEyebrow, t, 4.5, { stagger: 0.012, dur: 0.8, rise: 8, blur: 6, out: 5.85, outDur: 0.35 });
    revealWords(cHead, t, 4.62, { stagger: 0.085, dur: 1.15, out: 5.9, outStagger: 0.03, outDur: 0.4 });

    /* --- D/E/F: product -------------------------------------------- */
    const pin = E.outExpo(seg(t, 6.22, 7.3));
    const pout = E.inOut(seg(t, 11.85, 12.5));
    const pX = (1 - pin) * 900;
    const pSpeed = Math.abs((1 - E.outExpo(seg(t + 1 / 120, 6.22, 7.3))) * 900 - (1 - E.outExpo(seg(t - 1 / 120, 6.22, 7.3))) * 900) * 60;
    const pBlur = Math.min(40, pSpeed / 110);
    document.getElementById("mbProdG").setAttribute("stdDeviation", `${pBlur.toFixed(2)} 0`);
    prod.style.transformOrigin = "1290px 540px";
    prod.style.transform = `translate3d(${pX}px,0,0) scale(${1 + pout * 0.08})`;
    prod.style.opacity = t < 6.2 ? 0 : (1 - pout);
    prod.style.visibility = t < 6.2 || pout >= 1 ? "hidden" : "visible";
    prod.style.filter = [pBlur > 0.3 ? "url(#mbProd)" : "", pout > 0.01 ? `blur(${(pout * 22).toFixed(2)}px)` : ""].join(" ").trim() || "none";

    // step index: 0 discover, 1 save, 2 complete
    const k1 = E.inOutExpo(seg(t, T.E, T.E + 0.6));
    const k2 = E.inOutExpo(seg(t, T.F, T.F + 0.6));
    numCol.style.transform = `translate3d(0,${-(k1 + k2) * 150}px,0)`;
    revealLetters(eyebrow, t, 6.55, { stagger: 0.015, dur: 0.7, rise: 6, blur: 6 });
    fade(numSlot, E.outQuint(seg(t, 6.5, 7.1)));
    revealWords(titles[0], t, 6.62, { dur: 1.0, out: T.E, outDur: 0.35 });
    revealWords(titles[1], t, T.E + 0.18, { dur: 0.95, out: T.F, outDur: 0.35 });
    revealWords(titles[2], t, T.F + 0.18, { dur: 0.95 });
    const descIn = [6.8, T.E + 0.3, T.F + 0.3];
    const descOut = [T.E, T.F, 99];
    descs.forEach((d, i) => {
      const a = E.outQuint(seg(t, descIn[i], descIn[i] + 0.8));
      const b = E.inOut(seg(t, descOut[i], descOut[i] + 0.3));
      d.style.transform = `translate3d(0,${(1 - a) * 18 - b * 12}px,0)`;
      fade(d, a * (1 - b), (1 - a) * 8 + b * 8);
    });
    fade(stepTicks, E.outQuint(seg(t, 6.9, 7.5)));
    tickFill.forEach((f, i) => {
      const start = [6.9, T.E, T.F][i];
      const end = [T.E, T.F, 11.9][i];
      f.style.transform = `scaleX(${E.inOut(seg(t, start, end))})`;
    });

    // panel
    put(panel, PANEL.x + PANEL.w / 2, PANEL.y + PANEL.h / 2, { op: E.outQuint(seg(t, 6.42, 6.9)) * (1 - E.inOut(seg(t, 10.45, 10.9))), s: 1 - 0.03 * E.inOut(seg(t, 10.45, 10.9)) });
    panel.style.left = "0px";
    panel.style.top = "0px";

    // discover contents
    const discOut = E.inOut(seg(t, 9.0, 9.35));
    fade(discover, 1 - discOut, discOut * 10);
    fade(intentLbl, E.outQuint(seg(t, 6.75, 7.2)));
    const query = "a slow spring, somewhere in bloom";
    const typed = Math.floor(clamp((t - 6.82) / 0.88) * query.length);
    inputText.textContent = query.slice(0, typed);
    const caretX = inputText.getBoundingClientRect().width / (stage.getBoundingClientRect().width / W);
    caret.style.left = caretX + 4 + "px";
    const typing = t > 6.8 && t < 7.75;
    caret.style.opacity = t < 6.75 ? 0 : typing ? 1 : (Math.floor((t - 7.75) * 2.4) % 2 === 0 ? 1 : 0) * (1 - seg(t, 8.5, 8.6));
    const sh = seg(t, 7.72, 8.12);
    sheen.style.left = lerp(-280, 800, E.inOut(sh)) + "px";
    sheen.style.opacity = sh > 0 && sh < 1 ? 1 : 0;
    revealLetters(matchLbl, t, 7.8, { stagger: 0.012, dur: 0.6, rise: 6, blur: 5 });
    results.forEach((r, i) => {
      const s = 7.86 + i * 0.1;
      const p = E.outExpo(seg(t, s, s + 0.9));
      let lift = 0, op = Math.min(1, p * 1.5), blur = (1 - p) * 10, y = (1 - p) * 60;
      if (i === 0) lift = E.backOut(seg(t, T.E + 0.02, T.E + 0.45));
      else {
        const q = E.inOut(seg(t, T.E + 0.1 + i * 0.05, T.E + 0.45 + i * 0.05));
        op *= 1 - q;
        blur += q * 8;
        y += q * 26;
      }
      r.wrap.style.transform = `translate3d(0,${y - lift * 10}px,0) scale(${(0.94 + 0.06 * p) * (1 + lift * 0.04)})`;
      fade(r.wrap, op, blur);
      r.img.style.transform = `scale(${lerp(1.25, 1.06, E.outQuint(seg(t, s, s + 1.4)))})`;
    });
    skeletons.forEach((k, i) => {
      const op = E.outQuint(seg(t, 6.5, 6.95)) * (1 - E.inOut(seg(t, 7.86 + i * 0.1, 8.2 + i * 0.1)));
      fade(k.wrap, op);
      const pos = (200 - mod((t - 6.5) * 1.25 + i * 0.18, 1) * 400).toFixed(1);
      k.bars.forEach((b) => (b.style.backgroundPosition = `${pos}% 0`));
    });
    // the Tokyo result hands off to the flyer at 9.3
    if (t >= 9.3) results[0].wrap.style.visibility = "hidden";
    const chipP = E.backOut(seg(t, T.E + 0.12, T.E + 0.5));
    savedChip.style.transform = `translate(-50%,-50%) scale(${chipP})`;
    savedChip.style.opacity = Math.min(1, chipP * 2) * (t < 9.3 ? 1 : 0);

    // calendar
    fade(cal, t < 9.0 ? 0 : 1);
    fade(calHead, E.outQuint(seg(t, 9.05, 9.6)), (1 - E.outQuint(seg(t, 9.05, 9.6))) * 8);
    fade(calYear, E.outQuint(seg(t, 9.15, 9.7)));
    cells.forEach((c, i) => {
      const d = 9.05 + (i % 4) * 0.04 + Math.floor(i / 4) * 0.07;
      const p = E.outExpo(seg(t, d, d + 0.8));
      c.c.style.transform = `translate3d(0,${(1 - p) * 26}px,0) scale(${0.96 + 0.04 * p})`;
      fade(c.c, p, (1 - p) * 6);
      c.dots.forEach((dot, k) => {
        const dp = E.backOut(seg(t, 9.5 + i * 0.03 + k * 0.05, 9.85 + i * 0.03 + k * 0.05));
        dot.style.transform = `scale(${dp})`;
      });
      const inBand = i === 2 || i === 3;
      c.c.style.background = inBand ? `rgba(247,245,240,${0.92 - 0.6 * E.outQuint(seg(t, 9.9, 10.3))})` : "rgba(247,245,240,0.92)";
    });
    const bandP = E.outExpo(seg(t, 9.88, 10.5));
    band.style.transform = `scaleX(${bandP})`;
    band.style.opacity = bandP > 0 ? 1 : 0;
    revealLetters(bestLbl, t, 9.95, { stagger: 0.012, dur: 0.6, rise: 6, blur: 5 });
    revealWords(bestWhen, t, 10.0, { stagger: 0.05, dur: 0.8 });

    // flyer: result (D) → April cell (E) → completed card (F)
    const resRect = { x: PANEL.x + 48 + RW / 2, y: PANEL.y + RTOP + RH / 2 - 10, w: RW * 1.04, h: RH * 1.04, r: 16 };
    const apr = cellPos(3);
    const slot = { x: PANEL.x + apr.x + CW - 16 - 27, y: PANEL.y + apr.y + CH / 2, w: 54, h: 68, r: 10 };
    const big = { x: 1290, y: 500, w: 380, h: 475, r: 22 };
    const f1 = E.inOutExpo(seg(t, 9.3, 9.95));
    const f2 = E.inOutExpo(seg(t, T.F, T.F + 0.75));
    let fr = {
      x: lerp(resRect.x, slot.x, f1), y: lerp(resRect.y, slot.y, f1) - Math.sin(f1 * Math.PI) * 120,
      w: lerp(resRect.w, slot.w, f1), h: lerp(resRect.h, slot.h, f1), r: lerp(resRect.r, slot.r, f1),
    };
    fr = { x: lerp(fr.x, big.x, f2), y: lerp(fr.y, big.y, f2) - Math.sin(f2 * Math.PI) * 60, w: lerp(fr.w, big.w, f2), h: lerp(fr.h, big.h, f2), r: lerp(fr.r, big.r, f2) };
    flyer.style.width = fr.w + "px";
    flyer.style.height = fr.h + "px";
    flyer.style.borderRadius = fr.r + "px";
    const fRot = Math.sin(f1 * Math.PI) * -8 + Math.sin(f2 * Math.PI) * 4;
    const fTiltY = lerp(0, -10, f2) * (1 - E.inOut(seg(t, 11.0, 11.8)));
    put(flyer, fr.x, fr.y, { r: fRot, ry: fTiltY, op: t >= 9.3 ? 1 : 0, persp: 1400 });
    flyerImg.style.transform = `scale(${lerp(1.06, 1.12, f1) - 0.1 * f2 + 0.04 * seg(t, 11, 12)})`;
    put(flyerCap, big.x, big.y + big.h / 2 + 70, { op: E.outQuint(seg(t, 11.15, 11.7)), blur: (1 - seg(t, 11.15, 11.6)) * 6 });

    const bp = E.backOut(seg(t, 10.92, 11.3));
    put(badge, big.x, big.y + big.h / 2, { s: 0.5 + 0.5 * bp, op: Math.min(1, bp * 2) });
    chk.setAttribute("stroke-dashoffset", 16 * (1 - E.outQuint(seg(t, 11.02, 11.4))));
    const rg = seg(t, 11.0, 11.9);
    put(badgeRing, big.x, big.y + big.h / 2, { s: 1 + E.outExpo(rg) * 0.6, op: rg > 0 ? (1 - rg) * 0.8 : 0 });

    /* --- G: the mark ------------------------------------------------ */
    const spacing = lerp(0.16, -0.012, E.outExpo(seg(t, 12.2, 14.2)));
    logo.style.letterSpacing = spacing + "em";
    const settleG = E.outQuint(seg(t, 12.2, 15));
    logo.style.transform = `translate(-50%,-50%) scale(${lerp(1.06, 1.0, settleG)})`;
    logoLetters.forEach((s, i) => {
      const d = 12.25 + i * 0.09;
      const p = E.outQuint(seg(t, d, d + 1.1));
      s.style.transform = `translate3d(0,${(1 - p) * 70}px,0)`;
      s.style.opacity = p;
      s.style.filter = p < 0.995 ? `blur(${((1 - p) * 20).toFixed(2)}px)` : "none";
    });
    logo.style.visibility = t > 12.2 ? "visible" : "hidden";
    // The petal lands on the dot (an echo of the opening).
    let petalG = null;
    const dotLand = 13.18;
    if (t > 12.3) {
      const sr = stage.getBoundingClientRect();
      const sc = sr.width / W;
      const dr = logoDot.getBoundingClientRect();
      const target = { x: (dr.left - sr.left + dr.width / 2) / sc, y: (dr.top - sr.top + dr.height / 2) / sc };
      petalG = landingPetal(t, 12.3, dotLand, { x: 1260, y: -60 }, target, 9);
      if (petalG) petalG.size *= 1.7;
    }
    const dp = E.outQuint(seg(t, dotLand - 0.12, dotLand + 0.12));
    const dotBounce = 1 + 0.25 * Math.sin(seg(t, dotLand, dotLand + 0.5) * Math.PI) * (1 - seg(t, dotLand, dotLand + 0.5));
    logoDot.style.opacity = dp;
    logoDot.style.transform = `scale(${dp * dotBounce})`;
    revealWords(tagline, t, 13.38, { stagger: 0.08, dur: 1.1 });
    rule.style.transform = `translate(-50%,0) scaleX(${E.inOutExpo(seg(t, 13.9, 14.5))})`;
    revealLetters(endCaps, t, 14.0, { stagger: 0.01, dur: 0.7, rise: 6, blur: 6 });

    /* --- camera breathing ------------------------------------------ */
    const breathe = 1 + 0.018 * E.inOutSine(seg(t, 0, T.B)) - 0.018 * E.inOutSine(seg(t, T.B, T.B + 0.8));
    world.style.transform = `scale(${breathe})`;

    /* --- light leaks ------------------------------------------------ */
    const LEAKS = [
      { t: 1.98, x: 960, y: 520, a: 0.55, d: 1.0 },
      { t: 3.95, x: 1560, y: 120, a: 0.5, d: 1.2 },
      { t: 6.3, x: 1840, y: 560, a: 0.6, d: 1.0 },
      { t: 11.95, x: 960, y: 520, a: 0.7, d: 1.3 },
    ];
    let la = 0, lx = 960, ly = 540;
    for (const L of LEAKS) {
      const u = (t - L.t) / L.d + 0.3;
      if (u > 0 && u < 1) {
        const v = u < 0.3 ? E.inOutSine(u / 0.3) : 1 - E.inOutSine((u - 0.3) / 0.7);
        if (v * L.a > la) {
          la = v * L.a;
          lx = L.x + (u - 0.3) * 160;
          ly = L.y;
        }
      }
    }
    put(leak, lx, ly, { op: la, s: 0.9 + la * 0.3 });

    drawFx(t, petalA, petalG);

    if (frame !== lastFrame) {
      grainCtx.putImageData(grainFrames[frame % grainFrames.length], 0, 0);
      lastFrame = frame;
    }
  }

  /* ------------------------------------------------------------------ boot */

  function fit() {
    const s = Math.min(window.innerWidth / W, window.innerHeight / H);
    stage.style.transform = `translate(${(window.innerWidth - W * s) / 2}px, ${(window.innerHeight - H * s) / 2}px) scale(${s})`;
  }

  const params = new URLSearchParams(location.search);
  const capture = params.has("capture");
  const loopPreview = params.has("loop");

  window.__ready = (async () => {
    await document.fonts.load('300 40px "Newsreader"');
    await document.fonts.load('italic 300 40px "Newsreader"');
    await document.fonts.load('300 16px "Inter"');
    await document.fonts.load('400 16px "Inter"');
    await document.fonts.ready;
    for (const key of Object.keys(PAINT)) {
      const c = canvas(PW, PH);
      PAINT[key](c);
      images[key] = c.toDataURL("image/png");
    }
    const loads = [];
    const setSrc = (img, key) => {
      img.src = images[key];
      loads.push(img.decode());
    };
    galleryEls.forEach((g) => g && setSrc(g.img, g.key));
    setSrc(heroImg, "tokyo");
    setSrc(flyerImg, "tokyo");
    results.forEach((r) => setSrc(r.img, r.key));
    await Promise.all(loads);
    if (!capture) fit();
    renderFrame(0);
    return true;
  })();

  /* ------------------------------------------------------------ loop cut */

  // A silent ~9.6s portfolio loop: the same film, speed-ramped through a smooth
  // time warp, ending with the mark dissolving back into the dot it opened on.
  // Frames run to LOOP.total; the last LOOP.xfade seconds are cross-faded over
  // the first ones by render.cjs so the loop point is invisible.
  const LOOP = { length: 9.6, xfade: 0.6, total: 10.2 };
  const LOOP_KEYS = [[0, 1.86], [0.65, 1.93], [3.65, 6.35], [7.05, 11.9], [8.7, 14.0], [10.2, 14.6]];

  // Monotone cubic (Fritsch–Carlson): speed ramps without overshooting time.
  const warp = (() => {
    const xs = LOOP_KEYS.map((k) => k[0]);
    const ys = LOOP_KEYS.map((k) => k[1]);
    const n = xs.length;
    const d = xs.slice(0, -1).map((x, i) => (ys[i + 1] - ys[i]) / (xs[i + 1] - x));
    const m = xs.map((_, i) => (i === 0 ? d[0] : i === n - 1 ? d[n - 2] : d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2));
    for (let i = 0; i < n - 1; i++) {
      const a = m[i] / d[i], b = m[i + 1] / d[i];
      const h = a * a + b * b;
      if (h > 9) {
        const k = 3 / Math.sqrt(h);
        m[i] = k * a * d[i];
        m[i + 1] = k * b * d[i];
      }
    }
    return (u) => {
      u = clamp(u, xs[0], xs[n - 1]);
      let i = 0;
      while (i < n - 2 && u > xs[i + 1]) i++;
      const hx = xs[i + 1] - xs[i];
      const s = (u - xs[i]) / hx;
      const s2 = s * s, s3 = s2 * s;
      return (2 * s3 - 3 * s2 + 1) * ys[i] + (s3 - 2 * s2 + s) * hx * m[i] + (-2 * s3 + 3 * s2) * ys[i + 1] + (s3 - s2) * hx * m[i + 1];
    };
  })();

  function renderLoop(u) {
    renderFrame(warp(u), { frame: Math.round(u * 60), loop: true });

    // Outro: the wordmark lifts away and the dot glides home to centre.
    logoLetters.forEach((el, i) => {
      const q = E.inOut(seg(u, 8.85 + i * 0.05, 9.35 + i * 0.05));
      if (q <= 0) return;
      el.style.opacity = parseFloat(el.style.opacity) * (1 - q);
      el.style.transform = `translate3d(0,${(-q * 26).toFixed(2)}px,0)`;
      el.style.filter = `blur(${(q * 16).toFixed(2)}px)`;
    });
    const q2 = E.inOut(seg(u, 8.75, 9.2));
    [tagline.root, rule, endCaps.root].forEach((el) => {
      el.style.opacity = 1 - q2;
      el.style.filter = q2 > 0.01 ? `blur(${(q2 * 8).toFixed(2)}px)` : "none";
    });
    const m = E.inOutExpo(seg(u, 9.0, 9.65));
    if (m > 0) {
      logoDot.style.transform = "none";
      const sr = stage.getBoundingClientRect();
      const sc = sr.width / W;
      const dr = logoDot.getBoundingClientRect();
      const cx = (dr.left - sr.left + dr.width / 2) / sc;
      const cy = (dr.top - sr.top + dr.height / 2) / sc;
      const arc = Math.sin(m * Math.PI) * -40;
      logoDot.style.transform = `translate(${((960 - cx) * m).toFixed(2)}px,${((540 - cy) * m + arc).toFixed(2)}px) scale(${lerp(1, 0.51, m)})`;
    }
  }

  window.renderFrame = renderFrame;
  window.renderLoop = renderLoop;
  window.REEL = { DURATION, W, H, LOOP };

  if (!capture) {
    window.addEventListener("resize", fit);
    window.__ready.then(() => {
      let start = performance.now();
      let paused = false;
      let at = 0;
      const tick = (now) => {
        if (!paused) at = ((now - start) / 1000) % (loopPreview ? LOOP.length : DURATION);
        if (loopPreview) renderLoop(at);
        else renderFrame(at);
        requestAnimationFrame(tick);
      };
      window.addEventListener("keydown", (e) => {
        if (e.code === "Space") {
          paused = !paused;
          start = performance.now() - at * 1000;
        }
      });
      requestAnimationFrame(tick);
    });
  }
})();
