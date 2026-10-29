import { icons } from "lucide-react";
import React from "react";
import { Easing, Img, interpolate, interpolateColors } from "remotion";
import { a, c, clamp, IconTile, label, MONO, newest, Pill, prog, range, rise, Ripple, shell, spr, turns } from "./brand";

// The illustration on the right of a slide. Piece k (an item, a message or a highlight) appears at
// `at(k)`, together with bullet k. Times are in seconds from when the slide opened. Whatever the hosts
// are talking about right now is purple.
type Item = { icon: string; label: string; points?: string[] };
type Step = { from: number; to: number; label: string; reply?: string };
type Items = { type: "flow" | "icons" | "compare" | "piles"; items: Item[] };
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
  | { type: "photo"; src: string; caption?: string };
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
