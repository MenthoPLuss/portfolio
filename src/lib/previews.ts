import { ICON_PATHS, MARK_PATHS } from "./mark";
import type { ProjectSlug } from "@/content/portfolio";

/**
 * Original, code-drawn project previews. All data shown is illustrative.
 * Each draw function takes canvas pixels and time in seconds, and adapts to any aspect ratio.
 */

export const C = {
  canvas: "#0B0E0D",
  terrain: "#222923",
  warm: "#F3EFE4",
  muted: "#B9B9AE",
  ember: "#FFAF76",
  sage: "#B7D0A5",
  risk: "#F08A6C",
};

let fontCache: { sans: string; mono: string } | null = null;
export function fonts() {
  if (fontCache) return fontCache;
  if (typeof document === "undefined") return { sans: "sans-serif", mono: "monospace" };
  const cs = getComputedStyle(document.documentElement);
  const sans = cs.getPropertyValue("--font-sans").trim() || "system-ui, sans-serif";
  const mono = cs.getPropertyValue("--font-mono").trim() || "ui-monospace, monospace";
  fontCache = { sans, mono };
  return fontCache;
}
export function resetFontCache() {
  fontCache = null;
}

type Ctx = CanvasRenderingContext2D;

function rr(ctx: Ctx, x: number, y: number, w: number, h: number, r: number) {
  const rad = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.arcTo(x + w, y, x + w, y + h, rad);
  ctx.arcTo(x + w, y + h, x, y + h, rad);
  ctx.arcTo(x, y + h, x, y, rad);
  ctx.arcTo(x, y, x + w, y, rad);
  ctx.closePath();
}

const ease = (t: number) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));
const clamp01 = (t: number) => Math.min(1, Math.max(0, t));

const pathCache = new Map<string, Path2D>();
function p2d(d: string) {
  let p = pathCache.get(d);
  if (!p) {
    p = new Path2D(d);
    pathCache.set(d, p);
  }
  return p;
}

export function drawIcon(ctx: Ctx, name: string, x: number, y: number, size: number, color: string, width = 1.6) {
  const icon = ICON_PATHS[name];
  if (!icon) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size / 24, size / 24);
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  icon.paths.forEach((d) => ctx.stroke(p2d(d)));
  icon.circles?.forEach(([cx, cy, r]) => {
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
  });
  ctx.restore();
}

/** Draws the AB mark in a box of `size` px (32-unit grid). */
export function drawMark(ctx: Ctx, x: number, y: number, size: number, color: string, stroke = 1.5, glow = 0) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size / 32, size / 32);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = color;
  if (glow > 0) {
    ctx.shadowColor = C.ember;
    ctx.shadowBlur = glow;
  }
  ctx.lineWidth = stroke;
  MARK_PATHS.forEach((d) => ctx.stroke(p2d(d)));
  ctx.restore();
}

/** Maps a fixed design world onto the canvas with "cover" fit. */
function world(ctx: Ctx, w: number, h: number, ww: number, wh: number, fit: "cover" | "contain" = "cover") {
  const s = fit === "cover" ? Math.max(w / ww, h / wh) : Math.min(w / ww, h / wh);
  ctx.translate((w - ww * s) / 2, (h - wh * s) / 2);
  ctx.scale(s, s);
  return s;
}

/* ---------------- JEC Maps: route drawing across a campus illustration ---------------- */

const CAMPUS = {
  blocks: [
    [8, 8, 18, 11, "Gate"],
    [34, 6, 22, 13, "Admin"],
    [64, 8, 14, 20, "Library"],
    [84, 6, 12, 14, ""],
    [8, 30, 14, 18, "Dept."],
    [62, 38, 16, 12, "Labs"],
    [82, 30, 14, 26, "Hostel"],
    [8, 56, 20, 13, "Canteen"],
    [60, 58, 18, 11, ""],
  ] as [number, number, number, number, string][],
  field: [30, 28, 26, 26],
  roads: [
    "M0 24 H100",
    "M28 0 V75",
    "M58 0 V75",
    "M80 24 V75",
    "M0 52 H28",
    "M58 54 H100",
    "M28 52 C40 52 46 60 58 60",
  ],
  route: [
    [17, 19],
    [17, 24],
    [28, 24],
    [28, 52],
    [40, 53.5],
    [58, 60],
    [58, 54],
    [70, 54],
    [80, 54],
    [80, 43],
  ] as [number, number][],
};

function routeLength(pts: [number, number][]) {
  let L = 0;
  for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  return L;
}
const ROUTE_LEN = routeLength(CAMPUS.route);

function drawJecMaps(ctx: Ctx, w: number, h: number, t: number) {
  ctx.fillStyle = "#121a15";
  ctx.fillRect(0, 0, w, h);
  ctx.save();
  const s = world(ctx, w, h, 100, 75);
  const px = 1 / s;
  // contour hint
  ctx.strokeStyle = "rgba(183,208,165,0.07)";
  ctx.lineWidth = px;
  for (let i = 0; i < 7; i++) {
    ctx.beginPath();
    ctx.ellipse(43, 41, 14 + i * 7, 10 + i * 5.5, -0.2, 0, Math.PI * 2);
    ctx.stroke();
  }
  // roads
  ctx.lineCap = "round";
  ctx.strokeStyle = "#2c372e";
  ctx.lineWidth = 3.2;
  CAMPUS.roads.forEach((d) => ctx.stroke(p2d(d)));
  ctx.strokeStyle = "rgba(243,239,228,0.08)";
  ctx.lineWidth = 0.35;
  ctx.setLineDash([1.2, 1.4]);
  CAMPUS.roads.forEach((d) => ctx.stroke(p2d(d)));
  ctx.setLineDash([]);
  // field with track
  const [fx, fy, fw, fh] = CAMPUS.field;
  rr(ctx, fx, fy, fw, fh, 3);
  ctx.fillStyle = "#1b2a1f";
  ctx.fill();
  ctx.strokeStyle = "rgba(183,208,165,0.25)";
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.ellipse(fx + fw / 2, fy + fh / 2, fw / 2 - 3, fh / 2 - 4, 0, 0, Math.PI * 2);
  ctx.stroke();
  // blocks
  const f = fonts();
  CAMPUS.blocks.forEach(([x, y, bw, bh, label]) => {
    rr(ctx, x, y, bw, bh, 1.4);
    ctx.fillStyle = "#243026";
    ctx.fill();
    ctx.strokeStyle = "rgba(183,208,165,0.22)";
    ctx.lineWidth = 0.4;
    ctx.stroke();
    if (label) {
      ctx.fillStyle = "rgba(243,239,228,0.55)";
      ctx.font = `500 2.1px ${f.mono}`;
      ctx.fillText(label.toUpperCase(), x + 1.5, y + 3.4);
    }
  });
  // route animation: draw, hold, fade, repeat (7s)
  const cycle = t % 7;
  const prog = ease(clamp01(cycle / 3.6));
  const fade = cycle > 6.2 ? 1 - (cycle - 6.2) / 0.8 : 1;
  const target = prog * ROUTE_LEN;
  ctx.save();
  ctx.globalAlpha = fade;
  ctx.strokeStyle = C.ember;
  ctx.lineWidth = 1.3;
  ctx.lineJoin = "round";
  ctx.shadowColor = "rgba(255,175,118,0.7)";
  ctx.shadowBlur = 6 * s * 0.25;
  ctx.beginPath();
  let acc = 0;
  let head: [number, number] = CAMPUS.route[0];
  ctx.moveTo(head[0], head[1]);
  for (let i = 1; i < CAMPUS.route.length; i++) {
    const a = CAMPUS.route[i - 1];
    const b = CAMPUS.route[i];
    const seg = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (acc + seg >= target) {
      const k = (target - acc) / seg;
      head = [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];
      ctx.lineTo(head[0], head[1]);
      break;
    }
    acc += seg;
    head = b;
    ctx.lineTo(b[0], b[1]);
  }
  ctx.stroke();
  ctx.shadowBlur = 0;
  // start node
  const st = CAMPUS.route[0];
  ctx.fillStyle = C.sage;
  ctx.beginPath();
  ctx.arc(st[0], st[1], 1.6, 0, Math.PI * 2);
  ctx.fill();
  // travelling head
  ctx.fillStyle = C.warm;
  ctx.beginPath();
  ctx.arc(head[0], head[1], 1.1, 0, Math.PI * 2);
  ctx.fill();
  // destination pulse
  const end = CAMPUS.route[CAMPUS.route.length - 1];
  const arrived = prog >= 1;
  ctx.strokeStyle = C.ember;
  ctx.lineWidth = 0.5;
  const pr = arrived ? ((cycle - 3.6) % 1.4) / 1.4 : 0;
  if (arrived) {
    ctx.globalAlpha = fade * (1 - pr);
    ctx.beginPath();
    ctx.arc(end[0], end[1], 2 + pr * 5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = fade;
  }
  ctx.fillStyle = arrived ? C.ember : "rgba(255,175,118,0.4)";
  ctx.beginPath();
  ctx.arc(end[0], end[1], 1.8, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.restore();
}

/* ---------------- M-PHISH: synthetic message + inspection view ---------------- */

function drawMPhish(ctx: Ctx, w: number, h: number, t: number) {
  ctx.fillStyle = "#121517";
  ctx.fillRect(0, 0, w, h);
  const f = fonts();
  const wide = w / h > 1.05;
  const pad = Math.min(w, h) * 0.07;
  const u = Math.min(w, h) / 24; // type unit
  const cycle = t % 9;

  // message card
  const mx = pad;
  const my = pad;
  const mw = wide ? w * 0.52 - pad * 1.2 : w - pad * 2;
  const mh = wide ? h - pad * 2 : h * 0.46 - pad;
  rr(ctx, mx, my, mw, mh, u * 0.7);
  ctx.fillStyle = "#1c2124";
  ctx.fill();
  ctx.strokeStyle = "rgba(243,239,228,0.1)";
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.save();
  rr(ctx, mx, my, mw, mh, u * 0.7);
  ctx.clip();
  const lx = mx + u * 1.1;
  let ly = my + u * 1.9;
  ctx.fillStyle = C.muted;
  ctx.font = `500 ${u * 0.72}px ${f.mono}`;
  ctx.fillText("EXAMPLE MESSAGE", lx, ly);
  ly += u * 1.5;
  ctx.fillStyle = C.warm;
  ctx.font = `600 ${u * 0.95}px ${f.sans}`;
  ctx.fillText("Library Desk", lx, ly);
  ly += u * 1.1;
  ctx.fillStyle = C.muted;
  ctx.font = `400 ${u * 0.72}px ${f.mono}`;
  ctx.fillText("notice@library-desk.example", lx, ly);
  ly += u * 1.6;
  ctx.fillStyle = C.warm;
  ctx.font = `500 ${u * 0.9}px ${f.sans}`;
  ctx.fillText("Your account will be paused", lx, ly);
  ly += u * 1.1;
  ctx.fillStyle = "rgba(185,185,174,0.35)";
  const lineW = mw - u * 2.2;
  [1, 0.86, 0.92, 0.6].forEach((k) => {
    rr(ctx, lx, ly, lineW * k, u * 0.36, u * 0.18);
    ctx.fill();
    ly += u * 0.75;
  });
  ly += u * 0.4;
  // fake link chip (not a real link)
  const chipW = Math.min(lineW, u * 13.5);
  rr(ctx, lx, ly, chipW, u * 1.4, u * 0.7);
  const linkHot = cycle > 3.2;
  ctx.fillStyle = linkHot ? "rgba(240,138,108,0.18)" : "rgba(183,208,165,0.12)";
  ctx.fill();
  ctx.fillStyle = linkHot ? C.risk : C.sage;
  ctx.font = `500 ${u * 0.7}px ${f.mono}`;
  ctx.fillText("login-verify.example.com/account", lx + u * 0.6, ly + u * 0.92, chipW - u * 1.2);
  // scan line
  const scan = clamp01((cycle - 0.4) / 2.4);
  if (scan > 0 && scan < 1) {
    const sy = my + mh * scan;
    const g = ctx.createLinearGradient(0, sy - u * 2, 0, sy);
    g.addColorStop(0, "rgba(183,208,165,0)");
    g.addColorStop(1, "rgba(183,208,165,0.22)");
    ctx.fillStyle = g;
    ctx.fillRect(mx, sy - u * 2, mw, u * 2);
    ctx.fillStyle = "rgba(183,208,165,0.7)";
    ctx.fillRect(mx, sy, mw, 1);
  }
  ctx.restore();

  // inspection panel
  const ix = wide ? w * 0.52 + pad * 0.2 : pad;
  const iy = wide ? pad : my + mh + pad * 0.6;
  const iw = wide ? w - ix - pad : w - pad * 2;
  const ih = wide ? h - pad * 2 : h - iy - pad;
  rr(ctx, ix, iy, iw, ih, u * 0.7);
  ctx.fillStyle = "#171c1e";
  ctx.fill();
  ctx.strokeStyle = "rgba(243,239,228,0.08)";
  ctx.stroke();
  let ry = iy + u * 1.8;
  const rx = ix + u * 1;
  ctx.fillStyle = C.muted;
  ctx.font = `500 ${u * 0.72}px ${f.mono}`;
  ctx.fillText("INSPECTION", rx, ry);
  const rows = [
    { at: 1.2, label: "Claimed sender", value: "Library Desk", tone: C.muted },
    { at: 2.4, label: "Destination", value: "login-verify.example.com", tone: C.ember },
    { at: 3.4, label: "Identity vs destination", value: "Mismatch", tone: C.risk },
    { at: 4.4, label: "Password form", value: "Posts to another origin", tone: C.risk },
  ];
  ry += u * 0.6;
  const rowH = Math.min(u * 2.2, (ih - u * 6) / rows.length);
  rows.forEach((r) => {
    const a = ease(clamp01((cycle - r.at) / 0.5));
    if (a <= 0) {
      ry += rowH;
      return;
    }
    ctx.globalAlpha = a;
    ctx.fillStyle = "rgba(243,239,228,0.06)";
    ctx.fillRect(rx, ry + rowH - 1, iw - u * 2, 1);
    ctx.fillStyle = C.muted;
    ctx.font = `400 ${u * 0.66}px ${f.sans}`;
    ctx.fillText(r.label, rx, ry + rowH * 0.42, iw - u * 2);
    ctx.fillStyle = r.tone;
    ctx.font = `500 ${u * 0.74}px ${f.sans}`;
    ctx.fillText(r.value, rx, ry + rowH * 0.85, iw - u * 2);
    ctx.globalAlpha = 1;
    ry += rowH;
  });
  // trust state chip
  const states = [
    { at: 0, label: "CHECKING", c: C.muted },
    { at: 2.4, label: "CAUTION", c: C.ember },
    { at: 4.8, label: "HIGH RISK", c: C.risk },
  ];
  const st = [...states].reverse().find((s) => cycle >= s.at) ?? states[0];
  const cy = iy + ih - u * 2.3;
  rr(ctx, rx, cy, u * 6.2, u * 1.5, u * 0.75);
  ctx.fillStyle = st.c;
  ctx.globalAlpha = 0.16;
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.strokeStyle = st.c;
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = st.c;
  ctx.font = `600 ${u * 0.68}px ${f.mono}`;
  ctx.fillText(st.label, rx + u * 0.7, cy + u * 0.98);
  drawIcon(ctx, "shield", ix + iw - u * 2.6, cy - u * 0.05, u * 1.6, st.c, 1.8);
}

/* ---------------- Tender AI: neutral document illustration ---------------- */

function drawTender(ctx: Ctx, w: number, h: number, t: number) {
  ctx.fillStyle = "#14171a";
  ctx.fillRect(0, 0, w, h);
  const f = fonts();
  ctx.save();
  world(ctx, w, h, 100, 75, "contain");
  const cycle = t % 8;
  // back pages
  const page = (x: number, y: number, rot: number, alpha: number) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.globalAlpha = alpha;
    rr(ctx, -17, -24, 34, 48, 1.2);
    ctx.fillStyle = "#e9e5da";
    ctx.fill();
    ctx.restore();
  };
  page(40, 39, -0.12, 0.18);
  page(46, 38, -0.05, 0.32);
  // front page
  ctx.save();
  ctx.translate(55, 38);
  ctx.rotate(0.03);
  rr(ctx, -17, -25, 34, 50, 1.2);
  ctx.fillStyle = "#EEEADF";
  ctx.fill();
  // folded corner
  ctx.fillStyle = "#cfcabd";
  ctx.beginPath();
  ctx.moveTo(11, -25);
  ctx.lineTo(17, -19);
  ctx.lineTo(11, -19);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#2a2f2b";
  ctx.font = `600 2.4px ${f.sans}`;
  ctx.fillText("Request for proposal", -13, -18.5);
  ctx.fillStyle = "rgba(42,47,43,0.6)";
  ctx.font = `500 1.5px ${f.mono}`;
  ctx.fillText("SAMPLE DOCUMENT", -13, -15.6);
  const lines = [0.92, 0.8, 0.88, 0.5, 0.95, 0.84, 0.7, 0.9, 0.62, 0.86, 0.78, 0.4];
  const hiA = [2, 5, 8];
  lines.forEach((k, i) => {
    const y = -12 + i * 2.9;
    const lw = 26 * k;
    const hiIndex = hiA.indexOf(i);
    if (hiIndex >= 0) {
      const p = ease(clamp01((cycle - 0.8 - hiIndex * 1.3) / 0.9));
      if (p > 0) {
        ctx.fillStyle = "rgba(255,175,118,0.55)";
        ctx.fillRect(-13.4, y - 0.9, (lw + 0.8) * p, 2.1);
      }
    }
    ctx.fillStyle = "rgba(42,47,43,0.42)";
    rr(ctx, -13, y - 0.3, lw, 0.75, 0.35);
    ctx.fill();
  });
  ctx.restore();
  // margin notes
  const notes = ["Clause", "Eligibility", "Deadline"];
  notes.forEach((n, i) => {
    const p = ease(clamp01((cycle - 1.4 - i * 1.3) / 0.6));
    if (p <= 0) return;
    ctx.globalAlpha = p * (cycle > 7.3 ? 1 - (cycle - 7.3) / 0.7 : 1);
    const y = 27 + i * 8.6;
    const x = 75 + (1 - p) * 3;
    rr(ctx, x, y, 17, 5.2, 2.6);
    ctx.fillStyle = "rgba(255,175,118,0.14)";
    ctx.fill();
    ctx.strokeStyle = "rgba(255,175,118,0.6)";
    ctx.lineWidth = 0.3;
    ctx.stroke();
    ctx.fillStyle = C.ember;
    ctx.font = `500 2px ${f.mono}`;
    ctx.fillText(n.toUpperCase(), x + 2, y + 3.3);
    ctx.globalAlpha = 1;
  });
  ctx.restore();
}

/* ---------------- Plugora: sample charger card + booking flow ---------------- */

function drawPlugora(ctx: Ctx, w: number, h: number, t: number) {
  ctx.fillStyle = "#111614";
  ctx.fillRect(0, 0, w, h);
  const f = fonts();
  const cycle = t % 8;
  ctx.save();
  world(ctx, w, h, 100, 75, "contain");
  // streets
  ctx.strokeStyle = "#202924";
  ctx.lineWidth = 2.4;
  ctx.lineCap = "round";
  ["M-60 18 H160", "M-60 48 C-20 44 0 46 0 46 C30 42 60 50 100 44 C120 41 140 44 160 42", "M22 -60 V135", "M60 -60 C59 0 58 30 64 50 C66 70 62 100 62 135", "M84 -60 V135", "M-60 66 H160", "M-60 -8 H160", "M-60 92 H160", "M-12 -60 V135", "M118 -60 V135"].forEach((d) =>
    ctx.stroke(p2d(d)),
  );
  // pins
  const pins: [number, number][] = [
    [14, 30],
    [40, 12],
    [70, 30],
    [46, 58],
  ];
  pins.forEach(([x, y], i) => {
    const sel = i === 2;
    if (sel) {
      const pr = (cycle % 1.6) / 1.6;
      ctx.strokeStyle = `rgba(255,175,118,${0.6 * (1 - pr)})`;
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.arc(x, y, 3 + pr * 6, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.fillStyle = sel ? C.ember : "#2f3b33";
    ctx.beginPath();
    ctx.arc(x, y, 3.2, 0, Math.PI * 2);
    ctx.fill();
    drawIcon(ctx, "plug", x - 2.2, y - 2.2, 4.4, sel ? "#1a1410" : C.sage, 2.2);
  });
  // driver dot
  ctx.fillStyle = C.sage;
  ctx.beginPath();
  ctx.arc(30, 46, 1.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(183,208,165,0.35)";
  ctx.setLineDash([1, 1.2]);
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.moveTo(30, 46);
  ctx.quadraticCurveTo(52, 44, 70, 30);
  ctx.stroke();
  ctx.setLineDash([]);
  // card
  const cx = 8;
  const cyy = 40;
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.5)";
  ctx.shadowBlur = 4;
  rr(ctx, cx, cyy, 46, 30, 2);
  ctx.fillStyle = "#1b221e";
  ctx.fill();
  ctx.restore();
  ctx.strokeStyle = "rgba(243,239,228,0.1)";
  ctx.lineWidth = 0.3;
  rr(ctx, cx, cyy, 46, 30, 2);
  ctx.stroke();
  ctx.fillStyle = C.warm;
  ctx.font = `600 2.6px ${f.sans}`;
  ctx.fillText("Home charger", cx + 3, cyy + 5);
  ctx.fillStyle = C.muted;
  ctx.font = `500 1.7px ${f.mono}`;
  ctx.fillText("SAMPLE · 0.8 KM AWAY", cx + 3, cyy + 8.2);
  const slots = ["18:00", "19:00", "20:00"];
  const pick = cycle > 2 ? 1 : -1;
  slots.forEach((s, i) => {
    const sx = cx + 3 + i * 13.5;
    rr(ctx, sx, cyy + 11, 12, 5, 1.2);
    const on = i === pick;
    ctx.fillStyle = on ? "rgba(255,175,118,0.2)" : "rgba(243,239,228,0.05)";
    ctx.fill();
    ctx.strokeStyle = on ? C.ember : "rgba(243,239,228,0.15)";
    ctx.lineWidth = 0.3;
    ctx.stroke();
    ctx.fillStyle = on ? C.ember : C.muted;
    ctx.font = `500 1.9px ${f.mono}`;
    ctx.fillText(s, sx + 2.6, cyy + 14.3);
  });
  const reserved = cycle > 4.2;
  const press = cycle > 3.6 && cycle < 4.2 ? 0.6 : 1;
  rr(ctx, cx + 3, cyy + 19.5, 40, 6.5, 3.2);
  ctx.fillStyle = reserved ? "rgba(183,208,165,0.22)" : `rgba(255,175,118,${0.85 * press})`;
  ctx.fill();
  ctx.fillStyle = reserved ? C.sage : "#1a1410";
  ctx.font = `600 2.2px ${f.sans}`;
  ctx.textAlign = "center";
  ctx.fillText(reserved ? "Slot reserved · sample" : "Reserve slot", cx + 23, cyy + 23.6);
  ctx.textAlign = "start";
  ctx.restore();
}

const DRAW: Record<ProjectSlug, (ctx: Ctx, w: number, h: number, t: number) => void> = {
  "jec-maps": drawJecMaps,
  "m-phish": drawMPhish,
  "tender-ai": drawTender,
  plugora: drawPlugora,
};

/** Representative still time for reduced-motion and static posters. */
export const STILL_T: Record<ProjectSlug, number> = {
  "jec-maps": 4.4,
  "m-phish": 5.6,
  "tender-ai": 5.4,
  plugora: 4.6,
};

export function drawPreview(slug: ProjectSlug, ctx: Ctx, w: number, h: number, t: number) {
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, w, h);
  DRAW[slug](ctx, w, h, t);
  ctx.restore();
}
