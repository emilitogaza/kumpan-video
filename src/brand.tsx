import type React from "react";
import { cancelRender, continueRender, delayRender, Easing, interpolate, spring } from "remotion";
import geistMono from "./fonts/GeistMono.woff2";
import zalando from "./fonts/ZalandoSansSemiExpanded.ttf";

// Everything here copies kumpan.se: a white page, soft grey panels with big round corners, one purple
// and the wide Zalando Sans in a single weight. Things slide up on a bouncy spring and then sit still.

// Zalando Sans SemiExpanded for all text, in regular only. The site never uses bold for emphasis, it
// uses colour, so we do the same. Geist Mono is for code. The fonts are imported instead of loaded with
// staticFile, because at render time the public folder only holds one episode's audio.
for (const [family, url, weight] of [
  ["Zalando Sans SemiExpanded", zalando, "400"],
  ["Geist Mono", geistMono, "100 900"],
]) {
  const handle = delayRender(`Loading ${family}`);
  new FontFace(family, `url(${url})`, { weight })
    .load()
    .then((f) => {
      document.fonts.add(f);
      continueRender(handle);
    })
    .catch(cancelRender);
}

// The greys, taken from the site's light theme.
export const c = {
  white: "#FFFFFF", // the page, and cards on panels
  muted: "#F5F5F5", // panels
  ghost: "#D4D4D4", // dashed lines
  body: "#737373", // secondary text
  ink: "#0A0A0A", // text, and the code window background
};

// The brand purple and its light lilac partner (`brand` and `brand-panel` on the site), plus a paler lilac.
export const a = {
  brand: "#451484",
  lilac: "#D0CEFF",
  soft: "#ECEBFF",
  red: "#FF6467", // code that gets crossed out
};
// Background colours for tiles and cards that sit next to each other. We save solid purple for
// whatever the hosts are talking about right now.
export const turns = [a.lilac, c.white, a.soft];

export const font = "'Zalando Sans SemiExpanded', system-ui, sans-serif";
export const MONO = "'Geist Mono', ui-monospace, monospace";
export const label: React.CSSProperties = { fontFamily: font, fontWeight: 400, letterSpacing: "-0.02em", color: c.ink };

export const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const easeOut = Easing.bezier(0.16, 1, 0.3, 1);

// Goes from 0 to 1 over `dur` seconds, starting at second `start`. Fast at first, then it eases out.
export const prog = (t: number, start: number, dur = 0.6) => interpolate(t, [start, start + dur], [0, 1], { ...clamp, easing: easeOut });

// The same spring as the site (bounce 0.5 and visualDuration 0.35 in Motion). It's quick and overshoots
// a little before it settles. A higher `damping` calms it down, at 30 it hardly overshoots at all.
// Remotion works a spring out frame by frame, which gets slow late in a long video. It has always
// settled by 2.5 seconds, so after that we just return 1.
export const spr = (t: number, start: number, damping = 18) =>
  t < start ? 0 : t - start > 2.5 ? 1 : spring({ frame: (t - start) * 60, fps: 60, config: { damping, stiffness: 320, mass: 1 } });

// The site's reveal, with a blur that clears as it lands. The element fades in, sharpens and slides up
// `dist` pixels into place, starting at second `start`.
export const rise = (t: number, start: number, dist = 48, damping = 18): React.CSSProperties => {
  const blur = (1 - prog(t, start, 0.45)) * 12;
  return {
    opacity: prog(t, start, 0.3),
    translate: `0 ${(1 - spr(t, start, damping)) * dist}px`,
    filter: blur > 0.1 ? `blur(${blur}px)` : undefined,
  };
};

// The empty frame of piece k (a card, a tile, a bullet's pill). Every frame comes in as the slide opens, so
// the layout is whole from the start, and the content rises into it at its own reveal.
export const shell = (t: number, k: number, start: number, dist = 48) => rise(t, Math.min(start, 0.4 + k * 0.08), dist);

// How lit up piece k of n is. It goes to 1 when piece k appears and back to 0 when the next one does,
// so only the newest piece is purple. The last piece stays lit.
export const newest = (t: number, at: (k: number) => number, k: number, n: number) =>
  Math.max(0, Math.min(1, spr(t, at(k), 30) - (k + 1 < n ? spr(t, at(k + 1), 30) : 0)));

export const range = (n: number) => Array.from({ length: n }, (_, i) => i);

export const Title: React.FC<{ children: React.ReactNode; size?: number; style?: React.CSSProperties }> = ({ children, size = 96, style }) => (
  <h1 style={{ margin: 0, ...label, fontSize: size, lineHeight: 1.08, letterSpacing: "-0.035em", textWrap: "balance", ...style }}>{children}</h1>
);

// A rounded square with an icon in it.
export const IconTile: React.FC<{ children: React.ReactNode; size?: number; bg?: string }> = ({ children, size = 112, bg = a.lilac }) => (
  <div style={{ flexShrink: 0, width: size, height: size, borderRadius: size * 0.3, background: bg, display: "flex", alignItems: "center", justifyContent: "center" }}>{children}</div>
);

// A rounded label on a solid background.
export const Pill: React.FC<{ bg: string; children: React.ReactNode; size?: number; style?: React.CSSProperties }> = ({ bg, children, size = 36, style }) => (
  <div
    style={{
      display: "inline-flex",
      alignItems: "center",
      gap: size * 0.6,
      padding: `${size * 0.4}px ${size * 0.75}px`,
      borderRadius: size * 1.2,
      background: bg,
      ...label,
      fontSize: size,
      lineHeight: 1.15,
      whiteSpace: "nowrap",
      ...style,
    }}
  >
    {children}
  </div>
);

// The four shapes the site uses for its services, drawn on a 100 by 100 grid from whole circle arcs
// with small 3% corners.
export const shapes = {
  arch: { w: 100, d: "M3 100Q0 100 0 97V50A50 50 0 0 1 100 50V97Q100 100 97 100Z" },
  pill: { w: 60, d: "M30 0A30 30 0 0 1 60 30V70A30 30 0 0 1 0 70V30A30 30 0 0 1 30 0Z" },
  spark: { w: 100, d: "M50 0A50 50 0 0 0 100 50A50 50 0 0 0 50 100A50 50 0 0 0 0 50A50 50 0 0 0 50 0Z" },
  petal: { w: 100, d: "M50 0H97Q100 0 100 3V50A50 50 0 0 1 50 100H3Q0 100 0 97V50A50 50 0 0 1 50 0Z" },
};
export type ShapeName = keyof typeof shapes;

// `size` sets the height. The width follows from the shape.
export const Shape: React.FC<{ shape: ShapeName; size: number; fill: string }> = ({ shape, size, fill }) => (
  <svg viewBox={`0 0 ${shapes[shape].w} 100`} height={size} width={(size * shapes[shape].w) / 100} style={{ display: "block" }}>
    <path d={shapes[shape].d} fill={fill} />
  </svg>
);

// The Kumpan logo mark in three pieces: the circle, the leaf and the base. Pass `t` and the pieces pop
// in one after the other from second `at`. Leave it out for a still logo.
const MARK = [
  "M175 350C271.65 350 350 271.65 350 175C350 78.35 271.65 0 175 0C78.35 0 0 78.35 0 175C0 271.65 78.35 350 175 350Z",
  "M740 0H410C404.5 0 400 4.5 400 10V340C400 345.5 404.5 350 410 350C597.8 350 750 197.8 750 10C750 4.5 745.5 0 740 0Z",
  "M410 400H350H10C4.5 400 0 404.5 0 410C0 597.8 152.2 750 340 750H400H740C745.5 750 750 745.5 750 740C750 552.2 597.8 400 410 400Z",
];
export const Logo: React.FC<{ size: number; fill: string; t?: number; at?: number }> = ({ size, fill, t, at = 0 }) => (
  <svg viewBox="0 0 750 750" width={size} height={size} fill={fill} style={{ display: "block", overflow: "visible" }}>
    {MARK.map((d, i) => (
      <path key={i} d={d} style={{ transformBox: "fill-box", transformOrigin: "center", scale: t === undefined ? 1 : spr(t, at + i * 0.12) }} />
    ))}
  </svg>
);

// A purple ring that grows out from (x, y) and fades away, starting at second `at`. It marks the moment
// something clicks into place, like a loop closing. The parent needs a position.
export const Ripple: React.FC<{ t: number; at: number; x: number; y: number; r?: number }> = ({ t, at, x, y, r = 120 }) => {
  const k = prog(t, at, 1);
  if (k <= 0 || k >= 1) return null;
  return <div style={{ position: "absolute", left: x - r, top: y - r, width: 2 * r, height: 2 * r, borderRadius: "50%", border: `5px solid ${a.brand}`, scale: 0.5 + k, opacity: 1 - k }} />;
};
