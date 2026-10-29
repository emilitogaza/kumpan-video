import { icons } from "lucide-react";
import React from "react";
import { Easing, Img, interpolate, interpolateColors, random } from "remotion";
import { a, c, clamp, IconTile, label, MONO, newest, Pill, prog, range, rise, Ripple, shell, spr, turns } from "./brand";

// The illustration on the right of a slide. Piece k (an item, a message or a highlight) appears at
// `at(k)`, together with bullet k. Times are in seconds from when the slide opened. Whatever the hosts
// are talking about right now is purple.
type Item = { icon: string; label: string; points?: string[] };
type Step = { from: number; to: number; label: string; reply?: string };
type Items = { type: "flow" | "icons" | "compare" | "piles"; items: Item[] };
type Part = { label: string; value: number };
type Tool = { from: "tool"; icon: string; title: string; text: string; steps: string[]; sections?: string[]; sectionsAt?: number };
type ChatItem = { from: "user"; text: string } | { from: "status"; text: string } | { from: "bot"; text: string; link?: string } | Tool;
export type Visual =
  | Items
  | { type: "cycle"; items: Item[]; center?: string }
  | { type: "stats"; items: { value: string; label: string }[] }
  | { type: "sequence"; actors: Item[]; steps: Step[] }
  | { type: "terminal"; command: string; lines: string[]; highlight?: number[][] }
  | { type: "browser"; url: string; tab?: string; columns: string[]; rows: string[][]; highlight?: number[][] }
  | { type: "erase"; code: string; files?: [string, string] }
  | { type: "prompt"; text: string; drafts?: string[]; steps?: string[] }
  | { type: "offline"; task: string }
  | { type: "photo"; src: string; caption?: string }
  | { type: "keys"; items: { keys: string[]; label?: string }[] }
  | { type: "drag"; stops: { x: number; y: number; label?: string }[] }
  | { type: "layers"; items: { label: string; note?: string }[] }
  | { type: "chart"; kind?: "line" | "bars"; points: Part[]; compare?: number[]; unit?: string; mark?: number; note?: string }
  | { type: "chat"; items: ChatItem[] }
  | { type: "stream"; title?: string; text: string; match: string; chips?: string[] }
  | { type: "diff"; titles?: [string, string]; items: { label: string; change?: "edited" | "added" | "removed"; note?: string }[] }
  | { type: "breakdown"; total: Part; parts: Part[]; by?: string; focus?: number; split?: Part[]; splitBy?: string }
  | { type: "gallery"; items: { icon: string; alt: string; id: string }[]; pick: number; field?: string; reject?: string }
  | { type: "slots"; max: number; want: number; label: string }
  | { type: "race"; items: { label: string; fail?: boolean }[]; counter?: string; result?: string }
  | { type: "files"; groups?: string[]; items: { name: string; note?: string; group: number }[]; links: { from: number; to: number; label?: string }[] }
  | { type: "url"; url: string; parts: { text: string; label: string }[]; to?: string; toLabel?: string }
  | { type: "tree"; nodes: { label: string; parent?: number; slugs: string[] }[]; paths: { node: number; lang?: number }[]; langs?: { prefix: string; label: string }[] }
  | { type: "lifecycle"; events: { label: string }[]; lanes: { label: string; from: number; to?: number; note?: string; endIcon?: string }[] }
  | { type: "sieve"; items: { label: string; stop?: number }[]; gates: Item[]; end: Item }
  | { type: "form"; fields: { label: string; value: string; error?: string; fixed?: string }[]; button: string; sending?: string; done: string };
type Props<V extends Visual = Items> = { visual: V; t: number; at: (k: number) => number; width: number };
type Of<T extends Visual["type"]> = Props<Extract<Visual, { type: T }>>;

export const VisualView: React.FC<Props<Visual>> = ({ visual, ...rest }) => {
  switch (visual.type) {
    case "flow":
      return <Flow visual={visual} {...rest} />;
    case "icons":
      return <IconRow visual={visual} {...rest} />;
    case "compare":
    case "piles":
      return <Compare visual={visual} {...rest} />;
    case "cycle":
      return <Cycle visual={visual} {...rest} />;
    case "stats":
      return <Stats visual={visual} {...rest} />;
    case "sequence":
      return <Sequence visual={visual} {...rest} />;
    case "terminal":
      return <Terminal visual={visual} {...rest} />;
    case "browser":
      return <Browser visual={visual} {...rest} />;
    case "erase":
      return <Erase visual={visual} {...rest} />;
    case "prompt":
      return <Prompt visual={visual} {...rest} />;
    case "offline":
      return <Offline visual={visual} {...rest} />;
    case "photo":
      return <Photo visual={visual} {...rest} />;
    case "keys":
      return <Keys visual={visual} {...rest} />;
    case "drag":
      return <Drag visual={visual} {...rest} />;
    case "layers":
      return <Layers visual={visual} {...rest} />;
    case "chart":
      return <Chart visual={visual} {...rest} />;
    case "chat":
      return <Chat visual={visual} {...rest} />;
    case "stream":
      return <Stream visual={visual} {...rest} />;
    case "diff":
      return <Diff visual={visual} {...rest} />;
    case "breakdown":
      return <Breakdown visual={visual} {...rest} />;
    case "gallery":
      return <Gallery visual={visual} {...rest} />;
    case "slots":
      return <Slots visual={visual} {...rest} />;
    case "race":
      return <Race visual={visual} {...rest} />;
    case "files":
      return <Files visual={visual} {...rest} />;
    case "url":
      return <Url visual={visual} {...rest} />;
    case "tree":
      return <Tree visual={visual} {...rest} />;
    case "lifecycle":
      return <Lifecycle visual={visual} {...rest} />;
    case "sieve":
      return <Sieve visual={visual} {...rest} />;
    case "form":
      return <Form visual={visual} {...rest} />;
    default:
      throw new Error(`Unknown visual type "${(visual as { type: string }).type}"`);
  }
};

// Turns "chef-hat" into Lucide's ChefHat icon, drawn with thin lines like on the site. A wrong name
// throws, so a typo shows up as an error in the Studio and not as an empty tile.
const Glyph: React.FC<{ name: string; size: number; color: string }> = ({ name, size, color }) => {
  const G = icons[name.replace(/(^|-)(\w)/g, (_, __, ch: string) => ch.toUpperCase()) as keyof typeof icons];
  if (!G) throw new Error(`Unknown Lucide icon "${name}", see lucide.dev/icons`);
  return <G size={size} color={color} strokeWidth={1.25} />;
};

// An icon on a tile. As `lit` goes from 0 to 1 the tile turns purple, the icon turns white and the tile
// gives a small bump on the way. `on` is the icon's own style, so the tile can sit empty until its reveal.
const Tile: React.FC<{ icon: string; size: number; bg: string; lit?: number; on?: React.CSSProperties }> = ({ icon, size, bg, lit = 0, on }) => (
  <div style={{ flexShrink: 0, scale: 1 + 0.12 * Math.sin(Math.PI * lit) }}>
    <IconTile size={size} bg={interpolateColors(lit, [0, 1], [bg, a.brand])}>
      <div style={{ display: "flex", ...on }}>
        <Glyph name={icon} size={size * 0.5} color={interpolateColors(lit, [0, 1], [a.brand, c.white])} />
      </div>
    </IconTile>
  </div>
);

const Text: React.FC<{ size: number; children: React.ReactNode; style?: React.CSSProperties }> = ({ size, children, style }) => (
  <div style={{ ...label, fontSize: size, lineHeight: 1.15, textAlign: "center", ...style }}>{children}</div>
);

// A purple arrow that draws itself from second `at`, pointing right or down.
const Arrow: React.FC<{ t: number; at: number; len: number; across: boolean; style?: React.CSSProperties }> = ({ t, at, len, across, style }) => {
  const grow = Math.min(1, spr(t, at, 30));
  const [line, head] = across
    ? [`M6 20 H${len - 8}`, `M${len - 20} 9 L${len - 7} 20 L${len - 20} 31`]
    : [`M20 6 V${len - 8}`, `M9 ${len - 20} L20 ${len - 7} L31 ${len - 20}`];
  return (
    <svg width={across ? len : 40} height={across ? 40 : len} fill="none" stroke={a.brand} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" style={{ flex: "none", overflow: "visible", ...style }}>
      <path d={line} pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - grow} />
      <path d={head} opacity={grow > 0.8 ? 1 : 0} />
    </svg>
  );
};

// Steps joined by arrows that draw themselves. On a slide of its own it's a row of tiles, next to
// bullets a column of cards. The newest step is purple.
const Flow: React.FC<Props> = ({ visual, t, at, width }) => {
  const n = visual.items.length;
  const across = width >= 1000;
  const tile = across ? 150 : n > 4 ? 64 : 80;
  const link = across ? Math.max(50, Math.min(140, (width - n * 220) / (n - 1))) : n > 4 ? 28 : 40;
  return (
    <div style={{ display: "flex", flexDirection: across ? "row" : "column", alignItems: "flex-start", width: across ? undefined : width }}>
      {visual.items.map((item, k) => {
        const lit = newest(t, at, k, n);
        return (
          <React.Fragment key={k}>
            {k > 0 && <Arrow t={t} at={at(k) - 0.25} len={link} across={across} style={across ? { marginTop: tile / 2 - 20 } : { marginLeft: 12 + tile / 2 - 20 }} />}
            <div style={shell(t, k, at(k))}>
              {across ? (
                <div style={{ width: 220, display: "flex", flexDirection: "column", alignItems: "center", gap: 24 }}>
                  <Tile icon={item.icon} size={tile} bg={c.white} lit={lit} on={rise(t, at(k), 16)} />
                  <Text size={30} style={rise(t, at(k), 16)}>
                    {item.label}
                  </Text>
                </div>
              ) : (
                <Pill
                  bg={interpolateColors(lit, [0, 1], [c.white, a.brand])}
                  size={n > 4 ? 28 : 32}
                  style={{ padding: "12px 32px 12px 12px", borderRadius: 28, color: interpolateColors(lit, [0, 1], [c.ink, c.white]) }}
                >
                  <Tile icon={item.icon} size={tile} bg={a.lilac} on={rise(t, at(k), 16)} />
                  <span style={rise(t, at(k), 16)}>{item.label}</span>
                </Pill>
              )}
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
};

// Big icon tiles, for metaphors and sets of things.
const IconRow: React.FC<Props> = ({ visual, t, at, width }) => {
  const n = visual.items.length;
  const cols = n === 4 && width < 1000 ? 2 : n;
  const size = width >= 1000 ? 200 : cols > 2 ? 150 : 180;
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: "48px 32px", width, justifyItems: "center" }}>
      {visual.items.map((item, k) => (
        <div key={k} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 24, ...shell(t, k, at(k), 64) }}>
          <Tile icon={item.icon} size={size} bg={turns[k % 2]} on={rise(t, at(k), 16)} />
          <Text size={32} style={rise(t, at(k), 16)}>
            {item.label}
          </Text>
        </div>
      ))}
    </div>
  );
};

// Cards side by side, used two ways. In `compare` the last card is the better option and is purple.
// In `piles` every card gets a tint and its points become small chips, for sorting things into groups.
// Three cards don't fit next to bullets, so there they stack as rows.
const Compare: React.FC<Props> = ({ visual, t, at, width }) => {
  const wide = width >= 1000;
  const rows = !wide && visual.items.length > 2;
  const chips = visual.type === "piles";
  return (
    <div style={{ display: "flex", flexDirection: rows ? "column" : "row", gap: rows ? 20 : 28, width, alignItems: "stretch" }}>
      {visual.items.map((item, k) => {
        const best = visual.type === "compare" && k === visual.items.length - 1;
        // The better option's card waits white like the others and only turns purple when it's revealed.
        const on = prog(t, at(k), 0.3);
        const bg = best ? interpolateColors(on, [0, 1], [c.white, a.brand]) : chips ? turns[k % turns.length] : c.white;
        return (
          <div
            key={k}
            style={{
              flex: 1,
              minWidth: 0,
              padding: rows ? "20px 28px" : wide ? "48px 36px" : "32px 24px",
              borderRadius: 36,
              background: bg,
              display: "flex",
              flexDirection: rows ? "row" : "column",
              alignItems: "center",
              gap: rows ? 24 : 20,
              ...shell(t, k, at(k), 64),
            }}
          >
            <Tile
              icon={item.icon}
              size={rows ? 80 : wide ? 128 : chips ? 92 : 104}
              bg={best ? interpolateColors(on, [0, 1], [a.lilac, c.white]) : bg === c.white ? a.lilac : c.white}
              on={rise(t, at(k), 16)}
            />
            <div style={{ display: "flex", flexDirection: "column", alignItems: rows ? "flex-start" : "center", gap: 12, minWidth: 0, ...rise(t, at(k), 24) }}>
              <Text size={wide ? 40 : 32} style={{ color: best ? c.white : c.ink, ...(rows && { textAlign: "left" }) }}>
                {item.label}
              </Text>
              {chips ? (
                <div style={{ display: "flex", flexWrap: "wrap", justifyContent: rows ? "flex-start" : "center", gap: 10 }}>
                  {item.points?.map((point, i) => (
                    <div key={i} style={{ ...label, fontSize: wide ? 28 : 24, lineHeight: 1.2, textAlign: "center", padding: "8px 18px", borderRadius: 16, background: bg === c.white ? c.muted : c.white }}>
                      {point}
                    </div>
                  ))}
                </div>
              ) : (
                item.points?.map((point, i) => (
                  <div key={i} style={{ ...label, fontSize: wide ? 30 : 26, lineHeight: 1.35, color: best ? a.lilac : c.body, textAlign: rows ? "left" : "center" }}>
                    {point}
                  </div>
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

// A loop of 3 or 4 tiles around a circle. Each arc draws itself as the next tile comes in. When the
// last arc closes the loop, the label in the middle pops in, a ring spreads out and a dot starts
// running round.
const Cycle: React.FC<Of<"cycle">> = ({ visual, t, at, width }) => {
  const n = visual.items.length;
  const size = Math.min(width, 700);
  const R = size / 2 - 110;
  const mid = size / 2;
  const angle = (k: number) => -Math.PI / 2 + (k / n) * Math.PI * 2;
  const point = (θ: number) => [mid + R * Math.cos(θ), mid + R * Math.sin(θ)];
  const gap = 132 / R; // radians left empty around each tile and its label
  const closed = at(n - 1) + 0.9;
  // The dot runs along the arcs and hides while it passes behind a tile.
  const θ = angle(0) + (t - closed - 0.4) * 1.8;
  const dot = point(θ);
  const offArc = range(n).some((k) => Math.abs(Math.atan2(Math.sin(θ - angle(k)), Math.cos(θ - angle(k)))) < gap * 0.9);
  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <Ripple t={t} at={closed} x={mid} y={mid} r={120} />
      <svg width={size} height={size} fill="none" stroke={a.brand} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" style={{ position: "absolute", overflow: "visible" }}>
        {visual.items.map((_, k) => {
          const [θ1, θ2] = [angle(k) + gap, angle(k + 1) - gap];
          const [[x1, y1], [x2, y2]] = [point(θ1), point(θ2)];
          const grow = Math.min(1, spr(t, k + 1 < n ? at(k + 1) - 0.3 : closed, 30));
          const [dx, dy] = [-Math.sin(θ2), Math.cos(θ2)]; // the way the arc points at its end, for the arrowhead
          return (
            <g key={k}>
              <path d={`M${x1} ${y1} A${R} ${R} 0 0 1 ${x2} ${y2}`} pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - grow} />
              <path d={`M${x2 - dx * 13 + dy * 11} ${y2 - dy * 13 - dx * 11} L${x2} ${y2} L${x2 - dx * 13 - dy * 11} ${y2 - dy * 13 + dx * 11}`} opacity={grow > 0.85 ? 1 : 0} />
            </g>
          );
        })}
        {t > closed + 0.4 && !offArc && <circle cx={dot[0]} cy={dot[1]} r={13} fill={a.brand} stroke={c.muted} strokeWidth={5} />}
      </svg>
      {visual.items.map((item, k) => {
        const [x, y] = point(angle(k));
        return (
          <div key={k} style={{ position: "absolute", left: x - 110, top: y - 85, width: 220, display: "flex", flexDirection: "column", alignItems: "center", gap: 14, ...shell(t, k, at(k)) }}>
            <Tile icon={item.icon} size={n > 3 ? 96 : 112} bg={turns[k % 2]} lit={newest(t, at, k, n) * (1 - prog(t, closed, 0.4))} on={rise(t, at(k), 16)} />
            <Text size={28} style={rise(t, at(k), 16)}>
              {item.label}
            </Text>
          </div>
        );
      })}
      {visual.center && (
        <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center" }}>
          <div style={{ scale: spr(t, closed) }}>
            <Pill bg={a.brand} size={32} style={{ color: c.white }}>
              {visual.center}
            </Pill>
          </div>
        </div>
      )}
    </div>
  );
};

// Counts "70%" up from "0%", keeping any decimals. A value with two numbers, like "1 in 5", would look
// odd counting, so it stays as it is.
const countUp = (value: string, k: number) => {
  const nums = value.match(/\d+([.,]\d+)?/g) ?? [];
  if (nums.length !== 1) return value;
  return value.replace(nums[0], (n) => {
    if (/^\d{1,3},\d{3}$/.test(n)) return Math.round(Number(n.replace(",", "")) * k).toLocaleString("en-US"); // 1,500: the comma groups thousands
    const [, sep = ".", dec = ""] = /\d+(?:([.,])(\d+))?/.exec(n) ?? [];
    return (Number(n.replace(",", ".")) * k).toFixed(dec.length).replace(".", sep);
  });
};

// Big numbers that count up, each on a card with a short label. They sit in a row on a slide of their
// own and in a column next to bullets. The first card is purple.
const Stats: React.FC<Of<"stats">> = ({ visual, t, at, width }) => {
  const across = width >= 1000;
  const n = visual.items.length;
  const card = across ? (width - 28 * (n - 1)) / n - 72 : (width - 72) * 0.45;
  return (
    <div style={{ display: "flex", flexDirection: across ? "row" : "column", gap: 28, width }}>
      {visual.items.map((s, k) => {
        const bg = [a.brand, a.lilac, c.white][k % 3];
        const color = bg === a.brand ? c.white : c.ink;
        return (
          <div
            key={k}
            style={{
              flex: 1,
              display: "flex",
              flexDirection: across ? "column" : "row",
              alignItems: "center",
              gap: across ? 20 : 32,
              padding: across ? "72px 36px" : "26px 36px",
              borderRadius: 36,
              background: bg,
              ...shell(t, k, at(k), 64),
            }}
          >
            {/* The final value sits here invisibly and keeps the width fixed, so the card doesn't jump as the number grows. */}
            <div style={{ ...label, display: "grid", flex: "none", fontSize: Math.min(across ? 150 : 96, card / (s.value.length * 0.66)), lineHeight: 1, letterSpacing: "-0.04em", whiteSpace: "nowrap", color, ...rise(t, at(k), 24) }}>
              <span style={{ gridArea: "1 / 1", visibility: "hidden" }}>{s.value}</span>
              <span style={{ gridArea: "1 / 1", textAlign: across ? "center" : "right" }}>{countUp(s.value, prog(t, at(k) + 0.1, 1.1))}</span>
            </div>
            <Text size={across ? 34 : 30} style={{ color, textAlign: across ? "center" : "left", lineHeight: 1.25, ...rise(t, at(k), 24) }}>
              {s.label}
            </Text>
          </div>
        );
      })}
    </div>
  );
};

// Who talks to whom. The actors stand along the top and each message is an arrow that draws itself
// when its line is spoken. Older messages fade back so you follow the newest one.
const ROW = 60;
const Sequence: React.FC<Of<"sequence">> = ({ visual, t, at, width: full }) => {
  const n = visual.actors.length;
  const head = 160;
  let bottom = head + 48;
  const rows = visual.steps.map((step) => {
    const y = bottom;
    bottom += step.reply ? 2 * ROW : ROW;
    return { step, y };
  });
  // On a slide of its own it's laid out narrower and zoomed up, so it fills about 700 pixels of height.
  const zoom = full >= 1000 ? Math.min(1.4, 700 / bottom) : 1;
  const width = full / zoom;
  const x = (i: number) => (width * (i + 0.5)) / n;
  const current = visual.steps.filter((_, k) => t >= at(k)).length - 1;
  return (
    <div style={{ position: "relative", width, height: bottom, zoom }}>
      {visual.actors.map((actor, i) => (
        <div key={i} style={{ position: "absolute", left: x(i) - 100, width: 200, top: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 14, ...rise(t, 0.2 + i * 0.1) }}>
          <Tile icon={actor.icon} size={92} bg={turns[i % 2]} />
          <Text size={24}>{actor.label}</Text>
        </div>
      ))}
      <svg width={width} height={bottom} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
        {visual.actors.map((_, i) => (
          <line key={i} x1={x(i)} x2={x(i)} y1={head} y2={bottom} stroke={c.ghost} strokeWidth={3} strokeDasharray="2 10" strokeLinecap="round" />
        ))}
        {rows.map(({ step, y }, k) => (
          <g key={k} opacity={k < current ? 0.35 : 1}>
            <Message x1={x(step.from)} x2={x(step.to)} y={y} t={t} at={at(k)} text={step.label} />
            {step.reply && <Message x1={x(step.to)} x2={x(step.from)} y={y + ROW} t={t} at={at(k) + 0.6} text={step.reply} dashed />}
          </g>
        ))}
      </svg>
    </div>
  );
};

const Message: React.FC<{ x1: number; x2: number; y: number; t: number; at: number; text: string; dashed?: boolean }> = ({ x1, x2, y, t, at, text, dashed }) => {
  const p = prog(t, at, 0.45);
  if (p === 0) return null;
  const dir = Math.sign(x2 - x1);
  const tip = x1 + (x2 - x1) * p;
  return (
    <g>
      <line x1={x1} y1={y} x2={tip - dir * 10} y2={y} stroke={a.brand} strokeWidth={4} strokeLinecap="round" strokeDasharray={dashed ? "8 10" : undefined} />
      <polygon points={`${tip},${y} ${tip - dir * 18},${y - 10} ${tip - dir * 18},${y + 10}`} fill={a.brand} stroke={a.brand} strokeWidth={3} strokeLinejoin="round" />
      {/* A thick outline in the panel colour hides the dashed lines behind the label. */}
      <text x={(x1 + x2) / 2} y={y - 16} textAnchor="middle" style={{ ...label, fontSize: 22 }} fill={c.ink} stroke={c.muted} strokeWidth={12} paintOrder="stroke" opacity={p}>
        {text}
      </text>
    </g>
  );
};

const fitFont = (width: number, chars: number) => Math.min(28, Math.floor((width - 72) / (chars * 0.6))); // a monospace character is about 0.6em wide
const CODE = "#EDEDED"; // text in the dark code windows

// Lights up the lines in highlight group k from `at(k)` and dims the rest. In the dark windows a lit
// line turns lilac. In the white browser it gets a lilac background.
const litLines = (groups: number[][] | undefined, t: number, at: (k: number) => number, dark = true) => {
  const g = groups ?? [];
  const dim = g.length ? Math.min(1, spr(t, at(0), 30)) : 0;
  return (i: number): React.CSSProperties => {
    const k = Math.max(0, ...g.map((group, j) => (group.includes(i) ? newest(t, at, j, g.length) : 0)));
    return {
      margin: "0 -32px",
      padding: "0 32px",
      opacity: 1 - 0.6 * dim * (1 - k),
      background: dark ? `rgba(208, 206, 255, ${0.14 * k})` : interpolateColors(k, [0, 1], ["rgba(208, 206, 255, 0)", a.lilac]),
      color: dark ? interpolateColors(k, [0, 1], [CODE, a.lilac]) : c.ink,
    };
  };
};

const Dots: React.FC<{ fill: string }> = ({ fill }) => range(3).map((i) => <div key={i} style={{ flex: "none", width: 14, height: 14, borderRadius: 7, background: fill }} />);

// A dark editor or terminal window with three dots, an optional file name and monospace text.
const Window: React.FC<{ width: number; font: number; title?: React.ReactNode; wrap?: boolean; children: React.ReactNode }> = ({ width, font: size, title, wrap, children }) => (
  <div style={{ width, borderRadius: 32, background: c.ink, overflow: "hidden", fontFamily: MONO, fontVariantLigatures: "none", fontSize: size, lineHeight: 1.55, color: CODE }}>
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "20px 26px", borderBottom: "2px solid #262626" }}>
      <Dots fill="#3A3A3A" />
      {title && <div style={{ marginLeft: 14, fontSize: 20, color: c.body }}>{title}</div>}
    </div>
    <div style={{ padding: "20px 32px 28px", whiteSpace: wrap ? "pre-wrap" : "pre", overflowWrap: "anywhere" }}>{children}</div>
  </div>
);

// The `code` on a slide. Highlight groups light up as the hosts walk through it.
export const CodeBlock: React.FC<{ code: string; highlight?: number[][]; t: number; at: (k: number) => number; width: number }> = ({ code, highlight, t, at, width }) => {
  const lines = code.split("\n");
  const style = litLines(highlight, t, at);
  return (
    <Window width={width} font={fitFont(width, Math.max(...lines.map((l) => l.length)))}>
      {lines.map((line, i) => (
        <div key={i} style={style(i)}>
          {line || " "}
        </div>
      ))}
    </Window>
  );
};

// A real command that types itself out, then its output, then highlights group by group. Long lines
// wrap so the text never gets smaller than 22px.
const Terminal: React.FC<Of<"terminal">> = ({ visual, t, at, width }) => {
  const typedBy = 1;
  const typed = Math.round(interpolate(t, [0.2, typedBy], [0, visual.command.length], clamp));
  const style = litLines(visual.highlight, t, at);
  return (
    <Window width={width} font={Math.max(22, fitFont(width, Math.max(visual.command.length + 2, ...visual.lines.map((l) => l.length))))} wrap>
      <div style={{ color: c.white }}>
        <span style={{ color: a.lilac }}>{"$ "}</span>
        {visual.command.slice(0, typed)}
        <span style={{ color: a.lilac, opacity: typed < visual.command.length || t % 1 < 0.5 ? 1 : 0 }}>▍</span>
      </div>
      {visual.lines.map((line, i) => (
        <div key={i} style={{ ...style(i), opacity: t < typedBy + 0.2 + i * 0.07 ? 0 : style(i).opacity }}>
          {line || " "}
        </div>
      ))}
    </Window>
  );
};

// A browser with devtools open on a table, the Network tab unless `tab` says otherwise. Each row shows
// up with the first highlight group it's in, or straight away if it's in none, so later rows don't
// give the story away.
const Browser: React.FC<Of<"browser">> = ({ visual, t, at, width }) => {
  const style = litLines(visual.highlight, t, at, false);
  const size = width > 1200 ? 26 : 22;
  const grid = { display: "grid", gap: 20, gridTemplateColumns: visual.columns.map((_, i) => (i === visual.columns.length - 1 ? "1.8fr" : "1fr")).join(" ") };
  const tab = visual.tab ?? "Network";
  const appearAt = (i: number) => {
    const k = (visual.highlight ?? []).findIndex((g) => g.includes(i));
    return k < 0 ? 0.3 + i * 0.1 : at(k);
  };
  return (
    <div style={{ width, borderRadius: 32, background: c.white, overflow: "hidden", fontSize: size, color: c.ink }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "16px 24px", background: a.soft }}>
        <Dots fill={a.lilac} />
        <div style={{ flex: 1, marginLeft: 14, display: "flex", alignItems: "center", gap: 12, padding: "8px 20px", borderRadius: 999, background: c.white, fontFamily: MONO, fontSize: size - 2 }}>
          <Glyph name="lock" size={size - 2} color={a.brand} />
          {visual.url}
        </div>
      </div>
      <div style={{ display: "flex", gap: 30, padding: "14px 32px", borderBottom: `2px solid ${c.muted}`, ...label, fontSize: size - 4 }}>
        {["Elements", "Console", "Network", "Application"].map((name) => (
          <span key={name} style={name === tab ? { background: a.brand, color: c.white, borderRadius: 999, padding: "2px 14px", margin: "-2px -14px" } : { color: c.body }}>
            {name}
          </span>
        ))}
      </div>
      <div style={{ padding: "14px 32px 26px", fontFamily: MONO, fontVariantLigatures: "none" }}>
        <div style={{ ...grid, color: c.body, fontSize: size - 4, paddingBottom: 8 }}>
          {visual.columns.map((col) => (
            <span key={col}>{col}</span>
          ))}
        </div>
        {visual.rows.map((row, i) => (
          <div key={i} style={{ ...grid, ...style(i), padding: "8px 32px", opacity: t < appearAt(i) ? 0 : style(i).opacity }}>
            {row.map((cell, j) => (
              <span key={j} style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {cell}
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

// Code with ⟦marked⟧ parts, like type annotations. At the second reveal they turn red and get crossed
// out, at the third they shrink away and leave the code that actually runs. `files` switches the tab
// name from the first file to the second.
const Erase: React.FC<Of<"erase">> = ({ visual, t, at, width }) => {
  const marked = t >= at(1);
  const gone = prog(t, at(2), 0.5);
  const lines = visual.code.split("\n");
  const [before, after] = visual.files ?? [];
  return (
    <Window width={width} font={fitFont(width, Math.max(...lines.map((l) => l.replace(/[⟦⟧]/g, "").length)))} title={gone < 0.5 ? before : after}>
      {lines.map((line, i) => (
        <div key={i}>
          {line.split(/(⟦[^⟧]*⟧)/).map((part, j) =>
            part.startsWith("⟦") ? (
              <span
                key={j}
                style={{
                  display: "inline-block",
                  verticalAlign: "bottom",
                  overflow: "hidden",
                  width: `${(part.length - 2) * 0.6 * (1 - gone)}em`,
                  opacity: 1 - gone,
                  color: marked ? a.red : undefined,
                  textDecoration: marked ? "line-through" : "none",
                  textDecorationColor: a.red,
                  textDecorationThickness: "0.12em",
                }}
              >
                {part.slice(1, -1)}
              </span>
            ) : (
              part
            ),
          )}
          {line === "" && " "}
        </div>
      ))}
    </Window>
  );
};

// When the parts of a `prompt` happen, in seconds from the start of the slide. sound.tsx uses this too,
// for the key clicks. Each draft types out at 40 characters a second, stays a moment and is deleted three
// times as fast. Then the real prompt types out and is sent a beat later. Step j comes in at its reveal
// line, but never before the prompt is sent.
const TYPE = 40;
export const promptTiming = (visual: { text: string; drafts?: string[] }, at: (k: number) => number) => {
  let from = at(0) + 0.3;
  const runs = [...(visual.drafts ?? []), visual.text].map((text) => {
    const typed = from + text.length / TYPE;
    const run = { text, from, typed, held: typed + 0.3, gone: typed + 0.3 + text.length / (3 * TYPE) };
    from = run.gone + 0.15;
    return run;
  });
  const sent = runs[runs.length - 1].typed + 0.25;
  return { runs, sent, stepAt: (j: number) => Math.max(at(j + 1), sent + 0.3 + j * 0.4) };
};

// A Claude Code prompt. Any `drafts` type out in grey and get deleted first, to show it could be about
// anything. Then the real prompt types out and gets sent, and the steps come in under it, each with a
// spinner that turns into a check once the next step starts.
const Prompt: React.FC<Of<"prompt">> = ({ visual, t, at, width }) => {
  const { runs, sent, stepAt } = promptTiming(visual, at);
  const last = runs.length - 1;
  const k = runs.findIndex((r, i) => i === last || t < r.gone + 0.15);
  const run = runs[k];
  const chars = k === last || t < run.held ? interpolate(t, [run.from, run.typed], [0, run.text.length], clamp) : interpolate(t, [run.held, run.gone], [run.text.length, 0], clamp);
  const busy = chars > 0 && chars < run.text.length; // the caret only blinks while nothing is typed or deleted
  const longest = runs.reduce((most, r) => (r.text.length > most.length ? r.text : most), "");
  const steps = visual.steps ?? [];
  const ready = prog(t, runs[last].typed, 0.3);
  const press = t > sent ? Math.sin(Math.min(1, (t - sent) / 0.25) * Math.PI) : 0;
  const size = width >= 1000 ? 44 : 36;
  return (
    <div style={{ width, display: "flex", flexDirection: "column", gap: 28 }}>
      <div style={{ borderRadius: 36, background: c.white, padding: "30px 40px 28px", ...rise(t, at(0), 64) }}>
        <div style={{ ...label, fontSize: 24, color: c.body }}>Claude Code</div>
        {/* The longest text sits here invisibly, so the box is its final size before the typing starts. */}
        <div style={{ display: "grid", marginTop: 14, ...label, fontSize: size, lineHeight: 1.3 }}>
          <span style={{ gridArea: "1 / 1", visibility: "hidden" }}>{longest}</span>
          <span style={{ gridArea: "1 / 1", color: k === last ? c.ink : c.body }}>
            {run.text.slice(0, Math.round(chars))}
            <span style={{ display: "inline-block", width: 4, height: "1em", marginLeft: 4, verticalAlign: "-0.12em", borderRadius: 2, background: a.brand, opacity: t < sent && (busy || t % 1 < 0.5) ? 1 : 0 }} />
          </span>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
          <div style={{ width: 64, height: 64, borderRadius: 32, display: "grid", placeItems: "center", background: interpolateColors(ready, [0, 1], [c.muted, a.brand]), scale: 1 - 0.15 * press }}>
            <Glyph name="arrow-up" size={32} color={interpolateColors(ready, [0, 1], [c.ghost, c.white])} />
          </div>
        </div>
      </div>
      {steps.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
          {steps.map((step, j) => {
            const done = t >= (j + 1 < steps.length ? stepAt(j + 1) : stepAt(j) + 0.5);
            return (
              <Pill key={j} bg={done ? a.lilac : c.white} size={size * 0.75} style={{ gap: 14, ...rise(t, stepAt(j)) }}>
                <span style={{ display: "grid", rotate: done ? undefined : `${t * 300}deg` }}>
                  <Glyph name={done ? "check" : "loader-circle"} size={size * 0.7} color={a.brand} />
                </span>
                {step}
              </Pill>
            );
          })}
        </div>
      )}
    </div>
  );
};

// Proof that something runs without a network. A Wi-Fi switch flips off at the first reveal while the
// `task` under it keeps going, and the task finishes two seconds after the second reveal.
const Offline: React.FC<Of<"offline">> = ({ visual, t, at, width }) => {
  const off = spr(t, at(0), 22);
  const icon = Math.min(1, off);
  const done = Math.max(at(1), at(0)) + 2;
  const p = interpolate(t, [0.3, done], [0.18, 1], { ...clamp, easing: Easing.inOut(Easing.quad) });
  const size = width >= 1000 ? 40 : 34;
  return (
    <div style={{ width: Math.min(width, 900), display: "flex", flexDirection: "column", gap: 24 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 28, padding: "28px 36px", borderRadius: 36, background: c.white, ...rise(t, 0.2) }}>
        <Tile icon={off > 0.5 ? "wifi-off" : "wifi"} size={96} bg={interpolateColors(icon, [0, 1], [a.lilac, c.muted])} />
        <div style={{ flex: 1 }}>
          <div style={{ ...label, fontSize: size }}>Wi-Fi</div>
          <div style={{ ...label, fontSize: size * 0.7, color: c.body }}>{off > 0.5 ? "Off" : "On"}</div>
        </div>
        {/* The switch: the knob slides left and the track goes grey. */}
        <div style={{ width: 112, height: 64, borderRadius: 32, padding: 6, background: interpolateColors(icon, [0, 1], [a.brand, c.ghost]) }}>
          <div style={{ width: 52, height: 52, borderRadius: 26, background: c.white, translate: `${(1 - off) * 48}px 0` }} />
        </div>
      </div>
      <div style={{ padding: "28px 36px 32px", borderRadius: 36, background: c.white, ...rise(t, 0.35) }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", ...label, fontSize: size }}>
          {visual.task}
          {t < done ? (
            <span style={{ color: c.body }}>{Math.round(p * 100)}%</span>
          ) : (
            <span style={{ display: "flex", alignItems: "center", gap: 12, color: a.brand, scale: spr(t, done) }}>
              <Glyph name="check" size={size} color={a.brand} />
              Done
            </span>
          )}
        </div>
        <div style={{ marginTop: 20, height: 12, borderRadius: 6, background: a.soft, overflow: "hidden" }}>
          <div style={{ width: `${p * 100}%`, height: "100%", borderRadius: 6, background: a.brand }} />
        </div>
      </div>
    </div>
  );
};

// A photo in a rounded frame. It rises in at the first reveal and then zooms in slowly while it's on
// screen; the caption pops in over its corner at the second reveal. `src` is already a full URL here
// (Episode.tsx resolves it).
const Photo: React.FC<Of<"photo">> = ({ visual, t, at, width }) => (
  <div style={{ position: "relative", ...rise(t, at(0), 64) }}>
    <div style={{ borderRadius: 36, overflow: "hidden" }}>
      <Img src={visual.src} style={{ display: "block", height: width >= 1000 ? 700 : 560, maxWidth: width, objectFit: "cover", scale: 1 + 0.05 * Math.min(1, Math.max(0, t - at(0)) / 6) }} />
    </div>
    {visual.caption && (
      <div style={{ position: "absolute", left: 28, bottom: 28, scale: spr(t, at(1)), transformOrigin: "0 100%" }}>
        <Pill bg={a.lilac} size={36} style={{ color: a.brand }}>
          {visual.caption}
        </Pill>
      </div>
    )}
  </div>
);

// Keyboard shortcuts as keycaps on a lilac base. Combo k rises in at its reveal, then its keys press down together.
const Keys: React.FC<Of<"keys">> = ({ visual, t, at, width }) => {
  const size = width >= 1000 ? 168 : 124;
  const n = visual.items.length;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 64, alignItems: "flex-start" }}>
      {visual.items.map((item, k) => {
        const lit = newest(t, at, k, n);
        const press = Math.sin(Math.PI * prog(t, at(k) + 0.5, 0.35)) * 12;
        return (
          <div key={k} style={{ display: "flex", alignItems: "center", gap: 20, ...shell(t, k, at(k), 64) }}>
            {item.keys.map((key, j) => (
              <React.Fragment key={j}>
                {j > 0 && (
                  <Text size={size * 0.34} style={{ color: c.body, ...rise(t, at(k), 16) }}>
                    +
                  </Text>
                )}
                {/* The cap sinks into its base: the lilac edge under it gets thinner as it goes down. */}
                <div style={{ marginTop: press, paddingBottom: 14 - press, borderRadius: size * 0.24, background: a.lilac }}>
                  <div
                    style={{
                      minWidth: size,
                      height: size,
                      padding: `0 ${size * 0.2}px`,
                      boxSizing: "border-box",
                      borderRadius: size * 0.24,
                      display: "grid",
                      placeItems: "center",
                      background: interpolateColors(lit, [0, 1], [c.white, a.brand]),
                      ...label,
                      fontSize: size * 0.38,
                      color: interpolateColors(lit, [0, 1], [c.ink, c.white]),
                    }}
                  >
                    <span style={rise(t, at(k), 16)}>{key}</span>
                  </div>
                </div>
              </React.Fragment>
            ))}
            {item.label && (
              <Text size={size * 0.22} style={{ marginLeft: 16, color: c.body, textAlign: "left", ...rise(t, at(k), 16) }}>
                {item.label}
              </Text>
            )}
          </div>
        );
      })}
    </div>
  );
};

const Cursor: React.FC<{ x: number; y: number; opacity: number }> = ({ x, y, opacity }) => (
  <svg width={40} height={48} viewBox="0 0 20 24" style={{ position: "absolute", left: x, top: y, opacity, overflow: "visible" }}>
    <path d="M2 2 L2 19 L6.5 15 L9.5 22 L12.5 20.7 L9.6 14 L16 14 Z" fill={c.ink} stroke={c.white} strokeWidth={1.5} strokeLinejoin="round" />
  </svg>
);

// A screen with a sidebar and a floating window. The window grows out of its corner at the first reveal. At each
// later one a cursor drags it by its header to the next stop, given as fractions of the free space. A stop past 1
// pushes it off screen, and a beat later it springs back to the first stop. A stop's label shows in the corner.
const Drag: React.FC<Of<"drag">> = ({ visual, t, at, width }) => {
  const W = Math.min(width, 1240);
  const H = Math.round(W * 0.58);
  const side = Math.round(W * 0.17);
  const win = { w: W * 0.3, h: H * 0.56 };
  const place = (s: { x: number; y: number }) => [side + 24 + s.x * (W - side - win.w - 48), 24 + s.y * (H - win.h - 48)];
  const home = place(visual.stops[0]);
  let [x, y] = home;
  for (const [k, stop] of visual.stops.entries()) {
    if (k === 0) continue;
    const p = interpolate(t, [at(k), at(k) + 0.9], [0, 1], { ...clamp, easing: Easing.inOut(Easing.cubic) });
    const [nx, ny] = place(stop);
    [x, y] = [x + (nx - x) * p, y + (ny - y) * p];
    if (stop.x > 1 || stop.y > 1) {
      const back = spr(t, at(k) + 1.4, 20);
      [x, y] = [x + (home[0] - x) * back, y + (home[1] - y) * back];
    }
  }
  const open = spr(t, at(0), 22);
  const k = visual.stops.filter((_, i) => t >= at(i)).length - 1;
  // The cursor shows up just before a drag and lets go once the window has landed.
  const grab = k >= 1 ? Math.min(prog(t, at(k) - 0.35, 0.25), 1 - prog(t, at(k) + 0.95, 0.25)) : 0;
  const caption = visual.stops[Math.max(0, k)].label;
  return (
    <div style={{ position: "relative", width: W, height: H, borderRadius: 36, background: c.white, overflow: "hidden", ...rise(t, 0.2, 64) }}>
      <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: side, padding: 24, display: "flex", flexDirection: "column", gap: 16, background: a.soft }}>
        {range(5).map((i) => (
          <div key={i} style={{ height: 18, width: `${78 - i * 9}%`, borderRadius: 9, background: a.lilac }} />
        ))}
        <div style={{ flex: 1 }} />
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 16, background: interpolateColors(Math.min(open, 1), [0, 1], [a.soft, c.white]), ...label, fontSize: 22 }}>
          <Glyph name="sparkles" size={24} color={a.brand} />
          Dash
        </div>
      </div>
      <div style={{ position: "absolute", left: side + 48, top: 40, right: 48, display: "flex", flexDirection: "column", gap: 18 }}>
        <div style={{ height: 40, width: "46%", borderRadius: 14, background: c.muted }} />
        {range(6).map((i) => (
          <div key={i} style={{ height: 18, width: `${92 - (i % 3) * 14}%`, borderRadius: 9, background: c.muted }} />
        ))}
      </div>
      <div style={{ position: "absolute", left: x, top: y, width: win.w, height: win.h, borderRadius: 24, overflow: "hidden", background: a.lilac, scale: open, transformOrigin: "0 100%" }}>
        <div style={{ height: 52, display: "flex", alignItems: "center", gap: 10, padding: "0 18px", background: a.brand, ...label, fontSize: 22, color: c.white }}>
          <Glyph name="sparkles" size={22} color={c.white} />
          Dash
        </div>
        <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ alignSelf: "flex-end", height: 34, width: "62%", borderRadius: 17, background: a.soft }} />
          <div style={{ height: 16, width: "84%", borderRadius: 8, background: c.white }} />
          <div style={{ height: 16, width: "70%", borderRadius: 8, background: c.white }} />
        </div>
      </div>
      <Cursor x={x + win.w * 0.45} y={y + 18} opacity={grab} />
      {caption && (
        <div key={k} style={{ position: "absolute", right: 28, top: 28, ...rise(t, at(Math.max(0, k)) + 0.3, 24) }}>
          <Pill bg={a.brand} size={26} style={{ color: c.white }}>
            {caption}
          </Pill>
        </div>
      )}
    </div>
  );
};

// An exploded view of flat layers, seen from above at an angle, the first item at the bottom. The whole stack
// lifts in pale as the slide opens, and layer k fills in at its reveal with its label beside it. The newest one
// is purple.
const Layers: React.FC<Of<"layers">> = ({ visual, t, at, width }) => {
  const n = visual.items.length;
  const L = Math.min(300, (width - 380) / 1.42);
  // Half the width and height of a square once it's turned 45° and tilted back 55°.
  const half = { w: L * 0.71, h: L * 0.41 };
  const gap = Math.min(120, (680 - 2 * half.h) / Math.max(1, n - 1));
  const H = (n - 1) * gap + 2 * half.h + 20;
  return (
    <div style={{ position: "relative", width: Math.min(width, 2 * half.w + 400), height: H }}>
      {visual.items.map((item, k) => {
        const up = spr(t, Math.min(at(k), 0.4 + k * 0.08), 24);
        const lit = newest(t, at, k, n);
        const y = H - 10 - half.h - k * gap + (1 - up) * 90;
        return (
          <React.Fragment key={k}>
            <div
              style={{
                position: "absolute",
                left: half.w - L / 2,
                top: y - L / 2,
                width: L,
                height: L,
                borderRadius: L * 0.1,
                background: interpolateColors(lit, [0, 1], [turns[k % 3], a.brand]),
                opacity: Math.min(up, 1) * (0.35 + 0.65 * prog(t, at(k), 0.3)),
                transform: "rotateX(55deg) rotateZ(-45deg)",
              }}
            />
            <div style={{ position: "absolute", left: 2 * half.w + 40, top: y - 24, ...rise(t, at(k) + 0.1, 24) }}>
              <div style={{ ...label, fontSize: 34, lineHeight: 1.2, color: interpolateColors(lit, [0, 1], [c.ink, a.brand]) }}>{item.label}</div>
              {item.note && <div style={{ ...label, fontSize: 24, lineHeight: 1.3, color: c.body }}>{item.note}</div>}
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
};

// Rounds a chart's top up to 1, 2, 2.5 or 5 times a power of ten, so the gridlines land on round numbers.
const niceMax = (value: number) => {
  const mag = 10 ** Math.floor(Math.log10(value || 1));
  return ([1, 2, 2.5, 5, 10].find((f) => f * mag >= value) ?? 10) * mag;
};

// A chart that draws itself at the first reveal: a purple line over a pale area, or bars that grow one after
// another. `compare` is an earlier series, dashed in grey behind it. With `mark`, that point or bar lights up at
// the second reveal, with a ripple and the `note`.
const Chart: React.FC<Of<"chart">> = ({ visual, t, at, width }) => {
  const W = Math.min(width, 1300);
  const H = Math.round(Math.min(600, W * 0.66));
  const pad = { l: 110, r: 44, t: 90, b: 76 };
  const { points, mark } = visual;
  const n = points.length;
  const bars = visual.kind === "bars";
  const max = niceMax(Math.max(...points.map((p) => p.value), ...(visual.compare ?? [])));
  const step = (W - pad.l - pad.r) / (bars ? n : n - 1);
  const x = (i: number) => pad.l + step * (bars ? i + 0.5 : i);
  const y = (v: number) => pad.t + (1 - v / max) * (H - pad.t - pad.b);
  const path = (values: number[]) => values.map((v, i) => `${i ? "L" : "M"}${x(i)} ${y(v)}`).join(" ");
  const draw = prog(t, at(0) + 0.2, 1.6);
  const lit = mark === undefined ? 0 : Math.min(1, spr(t, at(1), 30));
  const fmt = (v: number) => `${Number(v.toFixed(2)).toLocaleString("en-US")}${visual.unit ?? ""}`;
  const tip = mark === undefined ? undefined : { x: Math.min(Math.max(x(mark), 170), W - 170), y: y(points[mark].value) };
  return (
    <div style={{ position: "relative", width: W, height: H, borderRadius: 36, background: c.white, ...rise(t, at(0), 64) }}>
      <svg width={W} height={H} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
        {[0, 0.5, 1].map((f) => (
          <g key={f}>
            <line x1={pad.l} x2={W - pad.r} y1={y(max * f)} y2={y(max * f)} stroke={c.ghost} strokeWidth={3} strokeDasharray="2 10" strokeLinecap="round" />
            <text x={pad.l - 22} y={y(max * f) + 8} textAnchor="end" style={{ ...label, fontSize: 22 }} fill={c.body}>
              {fmt(max * f)}
            </text>
          </g>
        ))}
        {points.map(
          (p, i) =>
            p.label && (
              <text key={i} x={x(i)} y={H - pad.b + 46} textAnchor="middle" style={{ ...label, fontSize: 22 }} fill={c.body}>
                {p.label}
              </text>
            ),
        )}
        {bars ? (
          points.map((p, i) => {
            const h = (y(0) - y(p.value)) * Math.min(1, spr(t, at(0) + 0.2 + i * 0.05, 26));
            return <rect key={i} x={x(i) - step * 0.32} width={step * 0.64} y={y(0) - h} height={h} rx={Math.min(16, step * 0.2)} fill={interpolateColors(i === mark ? lit : 0, [0, 1], [a.lilac, a.brand])} />;
          })
        ) : (
          <>
            <path d={`${path(points.map((p) => p.value))} L${x(n - 1)} ${y(0)} L${x(0)} ${y(0)} Z`} fill={a.soft} opacity={draw} />
            {visual.compare && <path d={path(visual.compare)} fill="none" stroke={c.ghost} strokeWidth={4} strokeDasharray="10 12" strokeLinecap="round" opacity={draw} />}
            <path d={path(points.map((p) => p.value))} fill="none" stroke={a.brand} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - draw} />
            {tip && lit > 0 && <circle cx={x(mark!)} cy={tip.y} r={13 * spr(t, at(1), 18)} fill={a.brand} stroke={c.white} strokeWidth={5} />}
          </>
        )}
      </svg>
      {tip && <Ripple t={t} at={at(1)} x={x(mark!)} y={tip.y} r={70} />}
      {tip && visual.note && (
        <div style={{ position: "absolute", left: tip.x, top: tip.y > 170 ? tip.y - 96 : tip.y + 36, translate: "-50% 0", scale: spr(t, at(1) + 0.15) }}>
          <Pill bg={a.brand} size={28} style={{ color: c.white }}>
            {visual.note}
          </Pill>
        </div>
      )}
    </div>
  );
};

// A tool card ticks through its steps by itself after its reveal, one every STEP seconds. The step at
// `sectionsAt` lasts long enough for its sections to come in, one every SECTION seconds. sound.tsx ticks along.
const STEP = 1.1;
const SECTION = 0.6;
export const toolTiming = (tool: { steps: string[]; sections?: string[]; sectionsAt?: number }) => {
  const starts: number[] = [];
  let s = 0.5;
  for (const j of tool.steps.keys()) {
    starts.push(s);
    s += j === tool.sectionsAt ? Math.max(STEP, (tool.sections?.length ?? 0) * SECTION + 0.4) : STEP;
  }
  return { starts, done: s };
};

// A wave that runs through a status line, each letter bobbing up in turn like Dash's thinking word.
const bob = (s: number, letters: number) => {
  const cycle = letters * 0.08 + 0.6;
  const phase = ((s % cycle) + cycle) % cycle;
  return phase < 0.6 ? Math.sin((Math.PI * phase) / 0.6) : 0;
};

// One tool call in the chat: an icon, what it's doing and a ring that fills, over a rail of steps. Done steps are
// purple, the running one pulses and its sections come in under it as chips.
const ToolCard: React.FC<{ tool: Tool; t: number; size: number }> = ({ tool, t, size }) => {
  const { starts, done } = toolTiming(tool);
  const ends = [...starts.slice(1), done];
  const step = t >= done ? tool.steps.length : Math.max(0, starts.filter((s) => t >= s).length - 1);
  const ring = ends.reduce((sum, end) => sum + prog(t, end, 0.4), 0) / tool.steps.length;
  const sections = tool.sections ?? [];
  const from = tool.sectionsAt === undefined ? 0 : starts[tool.sectionsAt] + 0.25;
  const shown = sections.filter((_, j) => t >= from + j * SECTION).length;
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 18, padding: "14px 20px", borderRadius: 24, background: a.soft }}>
        <IconTile size={56} bg={c.white}>
          <Glyph name={tool.icon} size={30} color={a.brand} />
        </IconTile>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ ...label, fontSize: size * 0.85, lineHeight: 1.25 }}>{tool.title}</div>
          <div style={{ ...label, fontSize: size * 0.72, lineHeight: 1.3, color: c.body, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{tool.text}</div>
        </div>
        <svg width={48} height={48} viewBox="0 0 24 24" style={{ flex: "none", rotate: "-90deg" }}>
          <circle cx={12} cy={12} r={9} fill="none" stroke={c.white} strokeWidth={3} />
          {ring > 0.01 && <circle cx={12} cy={12} r={9} fill="none" stroke={a.brand} strokeWidth={3} strokeLinecap="round" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - ring} />}
        </svg>
      </div>
      <div style={{ marginLeft: 48, marginTop: 10 }}>
        {tool.steps.map((name, j) => {
          const state = j < step ? "done" : j === step ? "running" : "pending";
          return (
            <div key={j} style={{ position: "relative", padding: "5px 0 5px 34px" }}>
              {j > 0 && <div style={{ position: "absolute", left: 6, top: -12, height: 24, width: 3, borderRadius: 2, background: state === "pending" ? c.ghost : a.brand }} />}
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  top: size * 0.62 - 7,
                  width: 15,
                  height: 15,
                  borderRadius: 8,
                  background: state === "pending" ? c.ghost : a.brand,
                  scale: state === "running" ? 1 + 0.25 * Math.sin(t * 6) : 1,
                }}
              />
              <div style={{ ...label, fontSize: size * 0.8, lineHeight: 1.3, color: state === "running" ? a.brand : state === "done" ? c.ink : c.body }}>{name}</div>
              {j === tool.sectionsAt && shown > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, margin: "8px 0 4px" }}>
                  {sections.slice(0, shown).map((section, i) => {
                    const writing = state === "running" && i === shown - 1;
                    return (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 14px", borderRadius: 14, background: writing ? a.brand : a.lilac, scale: spr(t, from + i * SECTION), ...label, fontSize: size * 0.62, color: writing ? c.white : a.brand }}>
                        {!writing && <Glyph name="check" size={size * 0.6} color={a.brand} />}
                        {section}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Dash's chat window. Item k comes in at its reveal at the bottom and pushes older ones up and out under a fade:
// the user's messages in lilac bubbles on the right, replies that type themselves in word by word, a status
// line with a wave running through it until the next item arrives, and tool cards that tick through their steps.
const Chat: React.FC<Of<"chat">> = ({ visual, t, at, width }) => {
  const size = width >= 1000 ? 30 : 26;
  const n = visual.items.length;
  return (
    <div style={{ position: "relative", width: Math.min(width, 980), height: 720, borderRadius: 36, background: c.white, display: "flex", flexDirection: "column", overflow: "hidden", ...rise(t, 0.3, 64) }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "26px 36px 18px", ...label, fontSize: 28 }}>
        <Glyph name="sparkles" size={28} color={a.brand} />
        Dash
        <span style={{ marginLeft: "auto", fontSize: 22, color: c.body }}>New chat</span>
      </div>
      <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", justifyContent: "flex-end", gap: 22, padding: "0 36px 32px", overflow: "hidden" }}>
        {visual.items.map((item, k) => {
          if (t < at(k)) return null;
          const local = t - at(k);
          const style = rise(t, at(k), 32);
          if (item.from === "status") {
            if (k + 1 < n && t >= at(k + 1)) return null;
            return (
              <div key={k} style={{ ...style, ...label, fontSize: size, color: c.body }}>
                {[...item.text].map((ch, i) => (
                  <span key={i} style={{ display: "inline-block", whiteSpace: "pre", translate: `0 ${-0.15 * bob(local - i * 0.08, item.text.length)}em` }}>
                    {ch}
                  </span>
                ))}
                …
              </div>
            );
          }
          if (item.from === "user")
            return (
              <div key={k} style={{ ...style, alignSelf: "flex-end", maxWidth: "80%", padding: "16px 26px", borderRadius: 28, background: a.lilac, ...label, fontSize: size, lineHeight: 1.3 }}>
                {item.text}
              </div>
            );
          if (item.from === "tool")
            return (
              <div key={k} style={style}>
                <ToolCard tool={item} t={local} size={size} />
              </div>
            );
          const words = item.text.split(" ");
          const pace = Math.min(0.08, 2.5 / words.length);
          return (
            <div key={k} style={{ ...label, fontSize: size, lineHeight: 1.35 }}>
              {words.map((word, i) => {
                const sharp = prog(local, i * pace, 0.25);
                return (
                  <span key={i} style={{ opacity: sharp, filter: sharp < 1 ? `blur(${(1 - sharp) * 4}px)` : undefined }}>
                    {word}{" "}
                  </span>
                );
              })}
              {item.link && <span style={{ color: a.brand, opacity: prog(local, words.length * pace, 0.3) }}>{item.link}</span>}
            </div>
          );
        })}
      </div>
      {/* Older items slide out under the header through a fade, like in Dash. */}
      <div style={{ position: "absolute", left: 0, right: 0, top: 72, height: 36, background: `linear-gradient(${c.white}, rgba(255, 255, 255, 0))` }} />
    </div>
  );
};

// When each chunk of a `stream` arrives: 3 to 12 characters at a time, CHUNK seconds apart, from just after the
// first reveal. sound.tsx clicks along.
const CHUNK = 0.11;
export const streamTiming = (visual: { text: string }, at: (k: number) => number) => {
  const cuts: number[] = [];
  for (let i = 0, k = 0; i < visual.text.length; k++) cuts.push((i = Math.min(visual.text.length, i + 3 + Math.floor(random(`chunk${k}`) * 10))));
  const start = at(0) + 0.4;
  return { cuts, start, arrived: (pos: number) => start + cuts.findIndex((cut) => cut >= pos) * CHUNK };
};

// A model's answer arriving chunk by chunk in a dark window. Every match of the `match` regex lights up once it
// has fully arrived, and chip k pops in under the window as match k completes. The newest chip is purple.
const Stream: React.FC<Of<"stream">> = ({ visual, t, at, width }) => {
  const { cuts, start, arrived } = streamTiming(visual, at);
  const shown = cuts.filter((_, j) => t >= start + j * CHUNK).at(-1) ?? 0;
  const matches = [...visual.text.matchAll(new RegExp(visual.match, "g"))].map((m) => [m.index, m.index + m[0].length]);
  const lines = visual.text.split("\n");
  const parts: React.ReactNode[] = [];
  let pos = 0;
  for (const [from, to] of matches) {
    if (to > shown) break;
    parts.push(
      visual.text.slice(pos, from),
      <span key={from} style={{ color: a.lilac, background: "rgba(208, 206, 255, 0.16)", borderRadius: 6 }}>
        {visual.text.slice(from, to)}
      </span>,
    );
    pos = to;
  }
  parts.push(visual.text.slice(pos, shown));
  const chips = visual.chips ?? [];
  const when = (k: number) => (matches[k] ? arrived(matches[k][1]) : 1e6);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 28, ...rise(t, 0.3, 64) }}>
      <Window width={width} font={Math.max(22, fitFont(width, Math.max(...lines.map((l) => l.length))))} title={visual.title} wrap>
        {/* The whole text sits here invisibly, so the window is its final size from the start. */}
        <div style={{ display: "grid" }}>
          <span style={{ gridArea: "1 / 1", visibility: "hidden" }}>{visual.text}</span>
          <span style={{ gridArea: "1 / 1" }}>
            {parts}
            <span style={{ color: a.lilac, opacity: shown < visual.text.length || t % 1 < 0.5 ? 1 : 0 }}>▍</span>
          </span>
        </div>
      </Window>
      {chips.length > 0 && (
        <div style={{ minHeight: 64, display: "flex", flexWrap: "wrap", gap: 14 }}>
          {chips.map((chip, k) => {
            if (t < when(k)) return null;
            const lit = newest(t, when, k, chips.length);
            return (
              <div key={k} style={{ scale: spr(t, when(k)) }}>
                <Pill bg={interpolateColors(lit, [0, 1], [a.lilac, a.brand])} size={26} style={{ color: interpolateColors(lit, [0, 1], [a.brand, c.white]) }}>
                  {chip}
                </Pill>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// Two lists side by side, joined row by row with dashed lines. Before comes in at the first reveal, after at the
// second. At the third, rows that stayed the same fade back, edited and added rows on the right turn purple with
// their note, and removed rows on the left get crossed out in red.
const Diff: React.FC<Of<"diff">> = ({ visual, t, at, width }) => {
  const [left, right] = visual.titles ?? ["Before", "After"];
  const W = Math.min(width, 1100);
  const mid = 90;
  const col = (W - mid) / 2;
  const judged = Math.min(1, spr(t, at(2), 30));
  const size = width >= 1000 ? 30 : 26;
  const card = (text: string, bg: string, color: string, style?: React.CSSProperties, extra?: React.ReactNode) => (
    <div style={{ height: 76, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "0 26px", borderRadius: 24, background: bg, ...label, fontSize: size, color, ...style }}>
      <span>{text}</span>
      {extra}
    </div>
  );
  return (
    <div style={{ width: W, display: "grid", gridTemplateColumns: `${col}px ${mid}px ${col}px`, rowGap: 16, alignItems: "center" }}>
      <Text size={26} style={{ color: c.body, textAlign: "left", ...rise(t, at(0)) }}>
        {left}
      </Text>
      <div />
      <Text size={26} style={{ color: c.body, textAlign: "left", ...rise(t, at(1)) }}>
        {right}
      </Text>
      {visual.items.map((item, i) => {
        const hot = item.change === "edited" || item.change === "added" ? judged : 0;
        const dim = item.change ? 1 : 1 - 0.6 * judged;
        const gone = item.change === "removed" && judged > 0.5;
        const linked = item.change !== "added" && item.change !== "removed";
        return (
          <React.Fragment key={i}>
            <div style={rise(t, at(0) + i * 0.06)}>
              {item.change !== "added" &&
                card(item.label, c.white, gone ? a.red : c.ink, { opacity: dim, textDecoration: gone ? "line-through" : "none", textDecorationColor: a.red, textDecorationThickness: "0.1em" })}
            </div>
            <svg width={mid} height={20} style={{ overflow: "visible" }}>
              {linked && (
                <line x1={10} x2={mid - 10} y1={10} y2={10} stroke={interpolateColors(hot, [0, 1], [c.ghost, a.brand])} strokeWidth={4} strokeDasharray="2 10" strokeLinecap="round" opacity={prog(t, at(1) + i * 0.06, 0.4) * dim} />
              )}
            </svg>
            <div style={rise(t, at(1) + i * 0.06)}>
              {item.change !== "removed" &&
                card(
                  item.label,
                  interpolateColors(hot, [0, 1], [c.white, a.brand]),
                  interpolateColors(hot, [0, 1], [c.ink, c.white]),
                  { opacity: dim },
                  item.note && hot > 0 && (
                    <span style={{ padding: "4px 14px", borderRadius: 14, background: a.lilac, color: a.brand, fontSize: size * 0.7, scale: spr(t, at(2) + 0.2 + i * 0.05) }}>{item.note}</span>
                  ),
                )}
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
};

// A total that splits into parts that add up to it. The total bar comes in at the first reveal and at the second
// it splits into its parts, each growing in turn. With `split`, the `focus` part turns purple at the third and
// opens into a bar of its own below. Every bar's caption says what it adds up to.
const Breakdown: React.FC<Of<"breakdown">> = ({ visual, t, at, width }) => {
  const W = Math.min(width, 1240);
  const fmt = (v: number) => v.toLocaleString("en-US");
  const sum = (parts: Part[]) => parts.reduce((s, p) => s + p.value, 0);
  const zoom = visual.split ? Math.min(1, spr(t, at(2), 30)) : 0;
  const focus = visual.focus ?? 0;
  const offset = (parts: Part[], j: number) => (sum(parts.slice(0, j)) / sum(parts)) * W;
  const bar = (parts: Part[], start: number, lit: (j: number) => number) => (
    <div style={{ position: "relative", height: 104 }}>
      {parts.map((p, j) => {
        const w = (p.value / sum(parts)) * W;
        const grow = Math.min(1, spr(t, start + j * 0.12, 26));
        const hot = lit(j);
        return (
          <div
            key={j}
            style={{
              position: "absolute",
              left: offset(parts, j) + 3,
              width: Math.max(0, w - 6),
              height: "100%",
              boxSizing: "border-box",
              padding: "14px 20px",
              borderRadius: 24,
              background: interpolateColors(hot, [0, 1], [turns[j % 3], a.brand]),
              clipPath: `inset(0 ${(1 - grow) * 100}% 0 0 round 24px)`,
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              overflow: "hidden",
              ...label,
              color: interpolateColors(hot, [0, 1], [c.ink, c.white]),
              whiteSpace: "nowrap",
            }}
          >
            {w > 150 && (
              <>
                <span style={{ fontSize: 24 }}>{p.label}</span>
                <span style={{ fontSize: 32 }}>{fmt(p.value)}</span>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
  const caption = (text: string, start: number) => (
    <Text size={26} style={{ color: c.body, textAlign: "left", ...rise(t, start, 24) }}>
      {text}
    </Text>
  );
  return (
    <div style={{ width: W, display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={rise(t, at(0), 48)}>{bar([visual.total], at(0), () => 1)}</div>
      {caption(`${visual.by ?? "Split"} · ${fmt(sum(visual.parts))} in all`, at(1))}
      {bar(visual.parts, at(1), (j) => (j === focus ? zoom : 0))}
      {visual.split && (
        <>
          {/* A pale funnel from the focused part down to the full width of the bar below. */}
          <svg width={W} height={50} style={{ overflow: "visible", opacity: zoom }}>
            <polygon points={`${offset(visual.parts, focus)},0 ${offset(visual.parts, focus + 1)},0 ${W},50 0,50`} fill={a.lilac} opacity={0.6} />
          </svg>
          {caption(`${visual.splitBy ?? visual.parts[focus].label} · ${fmt(sum(visual.split))} in all`, at(2) + 0.2)}
          {bar(visual.split, at(2) + 0.3, () => 0)}
        </>
      )}
    </div>
  );
};

// The media library as an assistant sees it: tiles with an icon standing in for the picture, its alt text and its
// id. At the second reveal the picked tile turns purple and its id lands in the field below. With `reject`, a
// made-up id tries the field at the third reveal, gets crossed out in red and drops away.
const Gallery: React.FC<Of<"gallery">> = ({ visual, t, at, width }) => {
  const W = Math.min(width, 1200);
  const n = visual.items.length;
  const cols = n > 4 ? 3 : 2;
  const gap = 24;
  const tile = (W - (cols - 1) * gap) / cols;
  const picked = Math.min(1, spr(t, at(1), 30));
  const struck = t >= at(2) + 0.6;
  const drop = prog(t, at(2) + 1.5, 0.5);
  return (
    <div style={{ width: W, display: "flex", flexDirection: "column", gap: 30 }}>
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap }}>
        {visual.items.map((item, k) => {
          const lit = k === visual.pick ? picked : 0;
          return (
            <div key={k} style={{ position: "relative", ...rise(t, at(0) + k * 0.08, 48) }}>
              {k === visual.pick && <Ripple t={t} at={at(1)} x={tile / 2} y={tile * 0.3} r={tile * 0.4} />}
              <div style={{ borderRadius: 28, overflow: "hidden", opacity: k === visual.pick ? 1 : 1 - 0.5 * picked, background: interpolateColors(lit, [0, 1], [c.white, a.brand]), scale: 1 + 0.05 * Math.sin(Math.PI * lit) }}>
                <div style={{ height: tile * 0.4, display: "grid", placeItems: "center", background: [a.lilac, a.soft][k % 2] }}>
                  <Glyph name={item.icon} size={tile * 0.17} color={a.brand} />
                </div>
                <div style={{ padding: "14px 22px 18px" }}>
                  <div style={{ ...label, fontSize: 24, lineHeight: 1.25, color: interpolateColors(lit, [0, 1], [c.ink, c.white]) }}>{item.alt}</div>
                  <div style={{ marginTop: 6, fontFamily: MONO, fontSize: 20, color: interpolateColors(lit, [0, 1], [c.body, a.lilac]) }}>{item.id}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 20, height: 64, ...rise(t, at(0) + 0.5, 24) }}>
        <Text size={28} style={{ color: c.body }}>
          {visual.field ?? "image"}
        </Text>
        {t < at(1) + 0.4 ? (
          <Pill bg={c.white} size={26} style={{ color: c.body }}>
            empty
          </Pill>
        ) : (
          <div style={{ scale: spr(t, at(1) + 0.4) }}>
            <Pill bg={a.brand} size={26} style={{ color: c.white, fontFamily: MONO }}>
              {visual.items[visual.pick].id}
            </Pill>
          </div>
        )}
        {visual.reject && t >= at(2) && drop < 1 && (
          <div style={{ scale: spr(t, at(2)) * (1 - drop), translate: `0 ${drop * 40}px`, opacity: 1 - drop }}>
            <Pill bg={c.white} size={26} style={{ fontFamily: MONO, color: struck ? a.red : c.ink, textDecoration: struck ? "line-through" : "none", textDecorationThickness: "0.1em" }}>
              {visual.reject}
            </Pill>
          </div>
        )}
      </div>
    </div>
  );
};

// A limit as a grid of slots under a big counter. At the first reveal `max` of them fill up one by one. With
// `want` over `max`, the slots past the limit come in at the second reveal with a red cross, and the count turns red.
const Slots: React.FC<Of<"slots">> = ({ visual, t, at, width }) => {
  const { max, want } = visual;
  const cols = Math.min(want, 8);
  const gap = 18;
  const size = Math.min(104, (Math.min(width, 1100) - (cols - 1) * gap) / cols);
  const fillAt = (j: number) => at(0) + 0.3 + j * 0.07;
  const overAt = (j: number) => at(1) + (j - max) * 0.12;
  const count = range(want).filter((j) => (j < max ? t >= fillAt(j) : want > max && t >= overAt(j))).length;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 36, alignItems: "center" }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 20, ...rise(t, 0.3) }}>
        <span style={{ ...label, fontSize: 150, lineHeight: 1, letterSpacing: "-0.04em", color: count > max ? a.red : a.brand }}>{count}</span>
        <span style={{ ...label, fontSize: 52, color: c.body }}>/ {max}</span>
      </div>
      <Text size={32} style={rise(t, 0.4)}>
        {visual.label}
      </Text>
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, ${size}px)`, gap }}>
        {range(want).map((j) => {
          if (j >= max) {
            const k = spr(t, overAt(j), 22);
            return (
              <div key={j} style={{ width: size, height: size, borderRadius: size * 0.28, display: "grid", placeItems: "center", background: c.white, scale: k, opacity: Math.min(1, k) }}>
                <Glyph name="x" size={size * 0.5} color={a.red} />
              </div>
            );
          }
          const f = Math.min(1, spr(t, fillAt(j), 26));
          return <div key={j} style={{ width: size, height: size, borderRadius: size * 0.28, background: interpolateColors(f, [0, 1], [c.white, a.brand]), scale: 1 + 0.1 * Math.sin(Math.PI * f), ...rise(t, 0.3 + j * 0.02, 24) }} />;
        })}
      </div>
    </div>
  );
};

// How files fit together: file cards in bands from top to bottom (`groups` names them on the left), joined by
// arrows that draw themselves, one per reveal, each with a label beside it. The file the newest arrow points at is
// purple and older arrows fade back. Two arrows between the same pair of files, one each way, sit a little apart.
const Files: React.FC<Of<"files">> = ({ visual, t, at, width }) => {
  const W = Math.min(width, 1372);
  const bands = Math.max(...visual.items.map((item) => item.group)) + 1;
  const side = visual.groups ? 200 : 0;
  const cardH = 100;
  const gapY = bands > 1 ? Math.min(170, (700 - bands * cardH) / (bands - 1)) : 0;
  const count = range(bands).map(() => 0);
  const slots = visual.items.map((item) => count[item.group]++);
  const most = Math.max(...count);
  const gapX = 80;
  const cardW = Math.min(400, (W - side - (most - 1) * gapX) / most);
  const H = bands * cardH + (bands - 1) * gapY;
  const box = (i: number) => {
    const { group } = visual.items[i];
    const row = count[group] * cardW + (count[group] - 1) * gapX;
    const left = side + (W - side - row) / 2 + slots[i] * (cardW + gapX);
    const top = group * (cardH + gapY);
    return { left, top, bottom: top + cardH, cx: left + cardW / 2 };
  };
  const n = visual.links.length;
  const current = visual.links.filter((_, k) => t >= at(k)).length - 1;
  const lit = (i: number) => Math.max(0, ...visual.links.map((link, k) => (link.to === i ? newest(t, at, k, n) : 0)));
  const lean = (dx: number) => Math.max(-cardW * 0.3, Math.min(cardW * 0.3, dx * 0.25));
  return (
    <div style={{ position: "relative", width: W, height: H }}>
      {visual.groups?.map((name, g) => (
        <div key={g} style={{ position: "absolute", left: 0, width: side - 24, top: g * (cardH + gapY), height: cardH, display: "flex", alignItems: "center", ...label, fontSize: 26, lineHeight: 1.2, color: c.body, ...rise(t, 0.2 + g * 0.08, 24) }}>
          {name}
        </div>
      ))}
      <svg width={W} height={H} fill="none" stroke={a.brand} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" style={{ position: "absolute", inset: 0, overflow: "visible" }}>
        {visual.links.map((link, k) => {
          const [from, to] = [box(link.from), box(link.to)];
          const both = visual.links.some((other) => other.from === link.to && other.to === link.from);
          const shift = both ? (link.from < link.to ? -18 : 18) : 0;
          const dir = Math.sign(to.top - from.top) || 1;
          const [sx, sy] = [from.cx + lean(to.cx - from.cx) + shift, dir > 0 ? from.bottom : from.top];
          const [ex, ey] = [to.cx + lean(from.cx - to.cx) + shift, dir > 0 ? to.top : to.bottom];
          const mid = (sy + ey) / 2;
          const grow = Math.min(1, spr(t, at(k), 30));
          if (grow <= 0) return null;
          // The label goes on the side of whichever end sits further out, away from the other arrows.
          const centre = side + (W - side) / 2;
          const outer = Math.abs(from.cx - centre) > Math.abs(to.cx - centre) ? from.cx : to.cx;
          const left = shift ? shift < 0 : outer < centre - 20;
          return (
            <g key={k} opacity={k < current ? 0.35 : 1}>
              <path d={`M${sx} ${sy} C${sx} ${mid}, ${ex} ${mid}, ${ex} ${ey - dir * 4}`} pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - grow} />
              <path d={`M${ex - 11} ${ey - dir * 16} L${ex} ${ey - dir * 3} L${ex + 11} ${ey - dir * 16}`} opacity={grow > 0.85 ? 1 : 0} />
              {link.label && (
                <text x={(sx + ex) / 2 + (left ? -20 : 20)} y={mid + 8} textAnchor={left ? "end" : "start"} style={{ ...label, fontSize: 22 }} fill={c.ink} stroke={c.muted} strokeWidth={12} paintOrder="stroke" opacity={prog(t, at(k) + 0.2, 0.3)}>
                  {link.label}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      {visual.items.map((item, i) => {
        const { left, top } = box(i);
        const on = lit(i);
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left,
              top,
              width: cardW,
              height: cardH,
              boxSizing: "border-box",
              display: "flex",
              alignItems: "center",
              gap: 16,
              padding: "0 20px",
              borderRadius: 28,
              background: interpolateColors(on, [0, 1], [c.white, a.brand]),
              scale: 1 + 0.06 * Math.sin(Math.PI * on),
              ...rise(t, 0.3 + i * 0.08, 32),
            }}
          >
            <IconTile size={60} bg={interpolateColors(on, [0, 1], [a.lilac, c.white])}>
              <Glyph name="file-code" size={30} color={a.brand} />
            </IconTile>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontFamily: MONO, fontSize: 22, lineHeight: 1.3, color: interpolateColors(on, [0, 1], [c.ink, c.white]), whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.name}</div>
              {item.note && <div style={{ ...label, fontSize: 20, lineHeight: 1.3, color: interpolateColors(on, [0, 1], [c.body, a.lilac]), whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.note}</div>}
            </div>
          </div>
        );
      })}
    </div>
  );
};

// When each lane of a `race` finishes, 2 to 5 seconds after the first reveal. sound.tsx ticks along.
export const raceTiming = (visual: { items: { label: string }[] }, at: (k: number) => number) => visual.items.map((item) => at(0) + 2.2 + 2.6 * random(`race${item.label}`));

// Jobs that run side by side. From the first reveal each lane fills at its own pace, so they finish in any order.
// A lane with `fail` stops partway and turns red. `counter` counts the ones that made it, with {n} and {total}
// filled in, and `result` pops in at the second reveal.
const Race: React.FC<Of<"race">> = ({ visual, t, at, width }) => {
  const ends = raceTiming(visual, at);
  const start = at(0) + 0.4;
  const made = visual.items.filter((item, i) => !item.fail && t >= ends[i]).length;
  return (
    <div style={{ width: Math.min(width, 1100), padding: "36px 44px", borderRadius: 36, background: c.white, display: "flex", flexDirection: "column", gap: 22, ...rise(t, 0.3, 64) }}>
      {visual.counter && <div style={{ ...label, fontSize: 30, color: c.body, marginBottom: 6 }}>{visual.counter.replace("{n}", String(made)).replace("{total}", String(visual.items.length))}</div>}
      {visual.items.map((item, i) => {
        const over = t >= ends[i];
        const p = interpolate(t, [start, ends[i]], [0, item.fail ? 0.55 : 1], { ...clamp, easing: Easing.inOut(Easing.quad) });
        return (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 28, ...rise(t, 0.4 + i * 0.06, 32) }}>
            <div style={{ width: 210, ...label, fontSize: 30 }}>{item.label}</div>
            <div style={{ flex: 1, height: 16, borderRadius: 8, background: a.soft, overflow: "hidden" }}>
              <div style={{ width: `${p * 100}%`, height: "100%", borderRadius: 8, background: over && item.fail ? a.red : a.brand }} />
            </div>
            <div style={{ width: 40, display: "grid", placeItems: "center" }}>
              {t < start ? null : over ? (
                <span style={{ display: "grid", scale: spr(t, ends[i]) }}>
                  <Glyph name={item.fail ? "x" : "check"} size={36} color={item.fail ? a.red : a.brand} />
                </span>
              ) : (
                <span style={{ display: "grid", rotate: `${t * 300}deg` }}>
                  <Glyph name="loader-circle" size={34} color={a.brand} />
                </span>
              )}
            </div>
          </div>
        );
      })}
      {visual.result && (
        <div style={{ alignSelf: "flex-start", marginTop: 8, scale: spr(t, at(1)), transformOrigin: "0 50%" }}>
          <Pill bg={a.lilac} size={28} style={{ color: a.brand }}>
            {visual.result}
          </Pill>
        </div>
      )}
    </div>
  );
};

// A URL types itself into an address bar, then comes apart: each reveal lights one of `parts` with a label
// under it. With `to`, one more reveal drops an arrow to the path the server really serves, where `*marks*`
// turn lilac. Labels sit on two rows in turn so short parts side by side don't collide.
const Url: React.FC<Of<"url">> = ({ visual, t, at, width }) => {
  const W = Math.min(width, 1300);
  const total = visual.parts.length + (visual.to ? 1 : 0);
  const size = Math.min(48, Math.floor((W - 170) / (visual.url.length * 0.62)));
  const typed = Math.round(interpolate(t, [0.3, 1.1], [0, visual.url.length], clamp));
  const runs: { text: string; start: number; k?: number }[] = [];
  let i = 0;
  visual.parts.forEach((part, k) => {
    const j = visual.url.indexOf(part.text, i);
    if (j < 0) throw new Error(`"${part.text}" isn't in ${visual.url} after the earlier parts`);
    if (j > i) runs.push({ text: visual.url.slice(i, j), start: i });
    runs.push({ text: part.text, start: j, k });
    i = j + part.text.length;
  });
  if (i < visual.url.length) runs.push({ text: visual.url.slice(i), start: i });
  const n = visual.parts.length;
  return (
    <div style={{ width: W, display: "flex", flexDirection: "column", alignItems: "center" }}>
      <div style={{ width: W, boxSizing: "border-box", display: "flex", alignItems: "center", gap: 24, padding: "24px 40px", borderRadius: 999, background: c.white, ...rise(t, 0.2) }}>
        <Glyph name="lock" size={size * 0.8} color={c.body} />
        <div style={{ display: "flex", whiteSpace: "pre", fontFamily: MONO, fontVariantLigatures: "none", fontSize: size, lineHeight: 1.3, color: c.ink }}>
          {runs.map((run, r) => {
            const shown = run.text.slice(0, Math.max(0, typed - run.start));
            if (run.k === undefined) return <span key={r}>{shown}</span>;
            const on = Math.min(1, spr(t, at(run.k), 30));
            const lit = newest(t, at, run.k, total);
            const row = run.k % 2;
            return (
              <span
                key={r}
                style={{
                  position: "relative",
                  margin: "0 -5px",
                  padding: "0 5px",
                  borderRadius: size * 0.25,
                  background: interpolateColors(lit, [0, 1], [interpolateColors(on, [0, 1], ["rgba(208, 206, 255, 0)", a.lilac]), a.brand]),
                  color: interpolateColors(lit, [0, 1], [interpolateColors(on, [0, 1], [c.ink, a.brand]), c.white]),
                }}
              >
                {shown}
                <span style={{ position: "absolute", left: "50%", top: "100%", translate: "-50% 0", display: "flex", flexDirection: "column", alignItems: "center", opacity: on > 0 ? 1 : 0 }}>
                  <span style={{ width: 3, height: (34 + row * 56) * Math.min(1, on), background: a.lilac }} />
                  <span style={{ ...label, fontSize: 26, whiteSpace: "nowrap", color: interpolateColors(lit, [0, 1], [c.body, a.brand]), ...rise(t, at(run.k) + 0.1, 16) }}>{visual.parts[run.k].label}</span>
                </span>
              </span>
            );
          })}
        </div>
      </div>
      <div style={{ height: 150 }} />
      {visual.to && (
        <>
          <Arrow t={t} at={at(n)} len={80} across={false} />
          <div style={{ marginTop: 16, display: "flex", flexDirection: "column", alignItems: "center", gap: 18, ...rise(t, at(n) + 0.2) }}>
            <div style={{ padding: "22px 44px", borderRadius: 999, background: c.ink, fontFamily: MONO, fontVariantLigatures: "none", fontSize: size * 0.85, color: CODE, whiteSpace: "pre" }}>
              {visual.to.split("*").map((s, j) => (
                <span key={j} style={{ color: j % 2 ? a.lilac : CODE }}>
                  {s}
                </span>
              ))}
            </div>
            {visual.toLabel && <Text size={26} style={{ color: c.body }}>{visual.toLabel}</Text>}
          </div>
        </>
      )}
    </div>
  );
};

// A page tree whose URLs are built by walking up the parents. Each reveal follows one path from the top down,
// lighting the pages on it, while its URL assembles in the bar below, one segment per page. A path can switch
// `lang`, and then every page shows its slug in that language. A page with an empty slug adds nothing to the URL.
const Tree: React.FC<Of<"tree">> = ({ visual, t, at, width }) => {
  const W = Math.min(width, 1300);
  const { nodes, paths } = visual;
  const langs = visual.langs ?? [{ prefix: "", label: "" }];
  const kids = nodes.map((_, i) => nodes.flatMap((node, j) => (node.parent === i ? [j] : [])));
  const chain = (i: number): number[] => (nodes[i].parent === undefined ? [i] : [...chain(nodes[i].parent!), i]);
  const depth = (i: number) => chain(i).length - 1;
  // Leaves get a column each from left to right, and a parent sits over the middle of its children.
  const col: number[] = [];
  let leaves = 0;
  const place = (i: number): number => (col[i] = kids[i].length ? kids[i].map(place).reduce((s, x) => s + x, 0) / kids[i].length : leaves++);
  nodes.forEach((node, i) => node.parent === undefined && place(i));
  const levels = Math.max(...nodes.map((_, i) => depth(i))) + 1;
  const gapX = 28;
  const cardW = Math.min(280, (W - (leaves - 1) * gapX) / leaves);
  const cardH = 104;
  const gapY = levels > 3 ? 44 : 64;
  const offset = (W - (leaves * cardW + (leaves - 1) * gapX)) / 2;
  const box = (i: number) => ({ left: offset + col[i] * (cardW + gapX), top: depth(i) * (cardH + gapY) });
  const H = levels * cardH + (levels - 1) * gapY;
  const current = paths.filter((_, k) => t >= at(k)).length - 1;
  const lang = current < 0 ? 0 : (paths[current].lang ?? 0);
  const switched = current > 0 && (paths[current - 1].lang ?? 0) !== lang;
  const litIn = (k: number, i: number) => {
    const d = chain(paths[k].node).indexOf(i);
    return d < 0 ? 0 : Math.min(1, spr(t, at(k) + 0.18 * d, 30));
  };
  const lit = (i: number) => (current < 0 ? 0 : Math.max(litIn(current, i), current > 0 ? litIn(current - 1, i) * (1 - Math.min(1, spr(t, at(current), 30))) : 0));
  const slug = (i: number) => nodes[i].slugs[lang] ?? nodes[i].slugs[0];
  const segments = current < 0 ? [] : chain(paths[current].node).map((i, d) => ({ d, text: slug(i) })).filter((s) => s.text);
  return (
    <div style={{ width: W, display: "flex", flexDirection: "column", alignItems: "center", gap: 56 }}>
      <div style={{ position: "relative", width: W, height: H }}>
        <svg width={W} height={H} fill="none" strokeWidth={4} strokeLinecap="round" style={{ position: "absolute", inset: 0, overflow: "visible" }}>
          {nodes.map((node, i) => {
            if (node.parent === undefined) return null;
            const [p, k] = [box(node.parent), box(i)];
            const [sx, sy, ex, ey] = [p.left + cardW / 2, p.top + cardH, k.left + cardW / 2, k.top];
            return <path key={i} d={`M${sx} ${sy} C${sx} ${(sy + ey) / 2}, ${ex} ${(sy + ey) / 2}, ${ex} ${ey}`} stroke={interpolateColors(lit(i), [0, 1], [c.ghost, a.brand])} opacity={prog(t, 0.4 + depth(i) * 0.12, 0.4)} />;
          })}
        </svg>
        {nodes.map((node, i) => {
          const on = lit(i);
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                ...box(i),
                width: cardW,
                height: cardH,
                boxSizing: "border-box",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                borderRadius: 28,
                background: interpolateColors(on, [0, 1], [c.white, a.brand]),
                scale: 1 + 0.06 * Math.sin(Math.PI * on),
                ...rise(t, 0.3 + depth(i) * 0.12 + col[i] * 0.03, 32),
              }}
            >
              <div style={{ ...label, fontSize: 26, color: interpolateColors(on, [0, 1], [c.ink, c.white]), whiteSpace: "nowrap" }}>{node.label}</div>
              <div key={lang} style={{ fontFamily: MONO, fontSize: 22, color: interpolateColors(on, [0, 1], [a.brand, a.lilac]), whiteSpace: "nowrap", ...(switched ? rise(t, at(current) + 0.1, 12) : {}) }}>
                {slug(i) ? `/${slug(i)}` : "/"}
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ minWidth: Math.min(W, 760), boxSizing: "border-box", display: "flex", alignItems: "center", gap: 24, padding: "20px 36px 20px 20px", borderRadius: 999, background: c.white, ...rise(t, 0.6) }}>
        <Pill bg={a.lilac} size={26} style={{ color: a.brand, opacity: langs[lang].label ? 1 : 0 }}>
          <span key={lang} style={switched ? rise(t, at(current), 12) : undefined}>
            {langs[lang].label || "—"}
          </span>
        </Pill>
        <div style={{ display: "flex", whiteSpace: "pre", fontFamily: MONO, fontVariantLigatures: "none", fontSize: 36, color: c.ink }}>
          {current >= 0 && langs[lang].prefix && <span style={{ color: a.brand, ...rise(t, at(current), 16) }}>{langs[lang].prefix}</span>}
          {current >= 0 && !segments.length && !langs[lang].prefix && <span style={rise(t, at(current), 16)}>/</span>}
          {segments.map((s, j) => (
            <span key={`${current}-${s.d}`} style={{ color: j === segments.length - 1 ? a.brand : c.ink, ...rise(t, at(current) + 0.18 * s.d + 0.1, 16) }}>
              /{s.text}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

// Things that live along a timeline, like a branch or a deploy for each pull request. `events` sit along the top
// and a playhead springs to event k at reveal k. A lane is born at event `from` and grows behind the playhead.
// With `to` it stops there, turns lilac and gets a check. Without one it runs on past the end and off the edge,
// which is how something that never gets cleaned up looks. A lane's `note` pops in under its end.
const Lifecycle: React.FC<Of<"lifecycle">> = ({ visual, t, at, width }) => {
  const W = Math.min(width, 1300);
  const { events, lanes } = visual;
  const n = events.length;
  const side = width >= 1000 ? 250 : 190;
  const tail = 140;
  const step = (W - side - tail - 40) / Math.max(1, n - 1);
  const x = (e: number) => side + 20 + e * step;
  const p = range(n - 1).reduce((s, k) => s + Math.min(1, spr(t, at(k + 1), 26)), 0);
  const head = x(p);
  const started = t >= at(0);
  const runOff = Math.min(1, spr(t, at(n - 1) + 0.6, 30));
  const axis = 96;
  const laneH = 104;
  const H = axis + 56 + lanes.length * laneH;
  return (
    <div style={{ position: "relative", width: W, height: H }}>
      <div style={{ position: "absolute", left: x(0), top: axis - 2, width: x(n - 1) - x(0), height: 4, borderRadius: 2, background: c.ghost, ...rise(t, 0.3, 0) }} />
      {started && <div style={{ position: "absolute", left: x(0), top: axis - 2, width: head - x(0), height: 4, borderRadius: 2, background: a.brand }} />}
      {events.map((event, e) => {
        const reached = Math.min(1, spr(t, at(e), 26));
        return (
          <React.Fragment key={e}>
            <div style={{ position: "absolute", left: x(e) - 120, width: 240, top: 0, height: axis - 26, display: "flex", alignItems: "flex-end", justifyContent: "center", ...rise(t, at(e), 24) }}>
              <Text size={width >= 1000 ? 26 : 22} style={{ color: interpolateColors(newest(t, at, e, n), [0, 1], [c.body, a.brand]) }}>
                {event.label}
              </Text>
            </div>
            <div style={{ position: "absolute", left: x(e) - 14, top: axis - 14, width: 28, height: 28, borderRadius: 14, boxSizing: "border-box", border: `4px solid ${interpolateColors(reached, [0, 1], [c.ghost, a.brand])}`, background: c.white, scale: 1 + 0.3 * Math.sin(Math.PI * reached), ...rise(t, 0.3 + e * 0.05, 0) }} />
          </React.Fragment>
        );
      })}
      {started && <div style={{ position: "absolute", left: head - 2, top: axis + 20, width: 4, height: H - axis - 20, borderRadius: 2, background: a.lilac }} />}
      {lanes.map((lane, i) => {
        const top = axis + 56 + i * laneH;
        const born = started && p >= lane.from - 0.02 ? Math.min(1, spr(t, at(lane.from), 26)) : 0;
        const ended = lane.to !== undefined && p >= lane.to - 0.02 ? Math.min(1, spr(t, at(lane.to), 30)) : 0;
        const end = lane.to !== undefined ? x(Math.min(p, lane.to)) : head + runOff * (W - head);
        const start = x(lane.from);
        const color = interpolateColors(ended, [0, 1], [a.brand, a.lilac]);
        const noteAt = at(lane.to ?? n - 1) + 0.5;
        return (
          <React.Fragment key={i}>
            <div style={{ position: "absolute", left: 0, width: side - 20, top, height: 36, display: "flex", alignItems: "center", ...label, fontSize: width >= 1000 ? 26 : 22, color: c.ink, ...rise(t, 0.4 + i * 0.08, 24) }}>
              {lane.label}
            </div>
            {born > 0 && (
              <>
                <div
                  style={{
                    position: "absolute",
                    left: start - 18,
                    top: top,
                    width: Math.max(36, end - start + 36),
                    height: 36,
                    borderRadius: 18,
                    background: lane.to === undefined && runOff > 0 ? `linear-gradient(90deg, ${a.brand} ${Math.max(0, 100 - 30 * runOff)}%, rgba(69, 20, 132, 0))` : color,
                    scale: `${born} 1`,
                    transformOrigin: "18px 50%",
                  }}
                />
                {ended > 0 && (
                  <div style={{ position: "absolute", left: end + 26, top: top - 2, display: "grid", scale: ended }}>
                    <Glyph name={lane.endIcon ?? "check"} size={40} color={a.brand} />
                  </div>
                )}
              </>
            )}
            {lane.note && (
              <div style={{ position: "absolute", top: top + 46, ...(lane.to === undefined ? { right: 0 } : { left: x(lane.to), translate: "-50% 0" }), scale: spr(t, noteAt), transformOrigin: "50% 0" }}>
                <Pill bg={lane.to === undefined ? a.red : a.lilac} size={22} style={{ color: lane.to === undefined ? c.white : a.brand }}>
                  {lane.note}
                </Pill>
              </div>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

// Things falling through checks, like form submissions through spam filters. The items start in a row at the
// top. At reveal k gate k draws across, the item that `stop`s there lands on it, turns red and gets struck out,
// and the rest fall through to the next row. The last reveal lights `end` at the bottom and ticks off whatever
// made it all the way down.
const Sieve: React.FC<Of<"sieve">> = ({ visual, t, at, width }) => {
  const W = Math.min(width, 1300);
  const { items, gates, end } = visual;
  const G = gates.length;
  const n = items.length;
  const side = Math.min(330, W * 0.28);
  const area = W - side;
  const gapX = 16;
  const chipW = (area - (n - 1) * gapX) / n;
  const chipH = 64;
  const rowH = 128;
  const H = (G + 1) * rowH + 10;
  const size = width >= 1000 ? 24 : 20;
  // A gate's tile is there from the start like any empty slot, and its name rises in at its reveal.
  const head = (k: number, icon: string, text: string, top: number, on: number) => (
    <div style={{ position: "absolute", left: 0, width: side - 28, top, height: chipH, display: "flex", alignItems: "center", gap: 18 }}>
      <div style={shell(t, k, at(k), 24)}>
        <Tile icon={icon} size={60} bg={a.lilac} lit={on} />
      </div>
      <div style={{ ...label, fontSize: size + 2, lineHeight: 1.15, color: interpolateColors(on, [0, 1], [c.ink, a.brand]), ...rise(t, at(k), 16) }}>{text}</div>
    </div>
  );
  const done = Math.min(1, spr(t, at(G), 30));
  return (
    <div style={{ position: "relative", width: W, height: H }}>
      <div style={{ position: "absolute", left: side - 12, top: G * rowH + 8, width: area + 24, height: rowH - 8, borderRadius: 36, background: interpolateColors(done, [0, 1], [c.white, a.brand]), ...shell(t, G, at(G), 24) }} />
      {head(G, end.icon, end.label, G * rowH + 34, newest(t, at, G, G + 1))}
      {gates.map((gate, g) => {
        const y = g * rowH + rowH - 16;
        const on = newest(t, at, g, G + 1);
        return (
          <React.Fragment key={g}>
            <svg width={area + 24} height={8} style={{ position: "absolute", left: side - 12, top: y - 4, overflow: "visible" }}>
              <line x1={4} x2={area + 20} y1={4} y2={4} stroke={interpolateColors(on, [0, 1], [c.ghost, a.brand])} strokeWidth={5} strokeLinecap="round" strokeDasharray="2 14" opacity={prog(t, Math.min(at(g), 0.4 + g * 0.08), 0.4)} />
            </svg>
            {head(g, gate.icon, gate.label, y - chipH - 6, on)}
          </React.Fragment>
        );
      })}
      {items.map((item, i) => {
        const stop = item.stop ?? G;
        const rows = range(Math.min(stop, G)).reduce((s, g) => s + spr(t, at(g) + 0.15 + i * 0.07, 20), 0);
        const red = item.stop !== undefined ? Math.min(1, spr(t, at(item.stop) + 0.25, 30)) : 0;
        const made = item.stop === undefined ? Math.min(1, spr(t, at(G) + 0.2 + i * 0.08, 26)) : 0;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: side + i * (chipW + gapX),
              top: rowH - 16 - chipH - 12 + rows * rowH,
              width: chipW,
              height: chipH,
              boxSizing: "border-box",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              padding: "0 14px",
              borderRadius: 22,
              background: c.white,
              opacity: 1 - 0.35 * red,
              ...rise(t, 0.3 + i * 0.06, 32),
            }}
          >
            <span style={{ ...label, fontSize: size, lineHeight: 1.1, textAlign: "center", color: interpolateColors(red, [0, 1], [interpolateColors(made, [0, 1], [c.ink, a.brand]), a.red]), textDecoration: red > 0.5 ? "line-through" : "none", textDecorationThickness: "0.1em" }}>
              {item.label}
            </span>
            {red > 0 && <span style={{ display: "grid", scale: red }}><Glyph name="x" size={28} color={a.red} /></span>}
            {made > 0 && <span style={{ display: "grid", scale: made }}><Glyph name="check" size={28} color={a.brand} /></span>}
          </div>
        );
      })}
    </div>
  );
};

// When each field of a `form` types in, from the first reveal. sound.tsx clicks along.
export const formTiming = (visual: { fields: { value: string }[] }, at: (k: number) => number) =>
  visual.fields.map((field, j) => ({ from: at(0) + 0.2 + j * 0.8, to: at(0) + 0.2 + j * 0.8 + Math.min(0.65, field.value.length * 0.04) }));

// A form a visitor fills in. Reveal 0 types the values, then, if any field has an `error`, the next reveal
// marks those fields red with the message under them. The next one fixes them (to `fixed`) and the button
// spins while it sends. The last one swaps the form for the `done` message.
const Form: React.FC<Of<"form">> = ({ visual, t, at, width }) => {
  const W = Math.min(width, 760);
  const errors = visual.fields.some((f) => f.error);
  const [check, send, finish] = errors ? [1, 2, 3] : [-1, 1, 2];
  const typing = formTiming(visual, at);
  const sending = t >= at(send);
  const out = prog(t, at(finish), 0.35);
  return (
    <div style={{ position: "relative", width: W, ...rise(t, 0.3, 64) }}>
      <div style={{ boxSizing: "border-box", width: W, padding: "40px 44px", borderRadius: 40, background: c.white, display: "flex", flexDirection: "column", gap: 10, opacity: 1 - out, filter: out > 0 ? `blur(${out * 12}px)` : undefined }}>
        {visual.fields.map((field, j) => {
          const typed = Math.round(interpolate(t, [typing[j].from, typing[j].to], [0, field.value.length], clamp));
          const wrong = field.error && check >= 0 ? Math.min(1, spr(t, at(check), 30)) * (sending ? 0 : 1) : 0;
          const value = sending && field.fixed !== undefined ? field.fixed : field.value.slice(0, typed);
          const caret = t >= typing[j].from && t < typing[j].to + 0.4 && t < at(check < 0 ? send : check);
          return (
            <div key={j} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ ...label, fontSize: 22, color: c.body }}>{field.label}</div>
              <div style={{ height: 60, boxSizing: "border-box", display: "flex", alignItems: "center", padding: "0 22px", borderRadius: 18, background: c.muted, border: `3px solid ${interpolateColors(wrong, [0, 1], ["rgba(255, 100, 103, 0)", a.red])}`, ...label, fontSize: 26, whiteSpace: "pre", scale: 1 + 0.03 * Math.sin(Math.PI * wrong) }}>
                <span key={sending ? "fixed" : "typed"} style={sending && field.fixed !== undefined ? rise(t, at(send), 10) : undefined}>
                  {value}
                </span>
                {caret && <span style={{ color: a.brand, opacity: t % 1 < 0.5 ? 1 : 0 }}>▍</span>}
              </div>
              <div style={{ height: 26, ...label, fontSize: 20, color: a.red, opacity: wrong }}>{field.error}</div>
            </div>
          );
        })}
        <div style={{ alignSelf: "flex-start", marginTop: 10 }}>
          <Pill bg={a.brand} size={28} style={{ color: c.white }}>
            {sending && (
              <span style={{ display: "grid", rotate: `${t * 300}deg` }}>
                <Glyph name="loader-circle" size={30} color={c.white} />
              </span>
            )}
            {sending ? (visual.sending ?? "Sending…") : visual.button}
          </Pill>
        </div>
      </div>
      {t >= at(finish) && (
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 28, padding: 48, ...rise(t, at(finish) + 0.2) }}>
          <Tile icon="check" size={120} bg={a.brand} lit={1} />
          <Text size={34}>{visual.done}</Text>
        </div>
      )}
    </div>
  );
};
