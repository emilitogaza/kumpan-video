import type React from "react";
import {
  AbsoluteFill,
  type CalculateMetadataFunction,
  Easing,
  Html5Audio,
  interpolate,
  interpolateColors,
  random,
  Sequence,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { a, c, clamp, font, label, Logo, newest, prog, range, rise, Shape, type ShapeName, shell, spr, Title } from "./brand";
import { Sound } from "./sound";
import { CodeBlock, type Visual, VisualView } from "./visuals";

// The shape of props.json. tts.py writes it from course.json and the episode script, and adds the timings in seconds.
// `words` is when each word of `text` starts, in seconds from the start of the line, from Kokoro.
export type Line = { host: string; text: string; reveal?: boolean; drop?: boolean; file: string; start: number; seconds: number; words?: number[] };
type Slide = { title: string; kinetic?: boolean; purple?: boolean; bullets?: string[]; code?: string; highlight?: number[][]; visual?: Visual };
export type Scene = { slide: Slide; start: number; end: number; lines: Line[] };
type Hosts = Record<string, { name: string }>;
type Data = { course: { title: string; hosts: Hosts; sound?: boolean }; title: string; duration: number; scenes: Scene[] };
// `src` is where props.json lives in the public folder. calculateMetadata reads it and passes it on as `data`.
// `sound: false` leaves out the music and effects, whatever course.json says (build.sh uses it for the .mp3).
// `vertical: true` makes the video 1080 by 1920, for phones.
export type EpisodeProps = { src: string; sound?: boolean; vertical?: boolean; data?: Data };

export const FPS = 30;
const OUTRO = 4; // how long the end card stays after the last line, in seconds
const RADIUS = 48;
const HOST_SHAPES: ShapeName[] = ["arch", "petal", "pill", "spark"];

// Where the panels go. A wide video (1920 by 1080) has the slide on a big grey panel and the hosts on a
// narrow purple card to the right. A tall one (1080 by 1920) puts the hosts on a strip under the slide.
const useLayout = () => {
  const { width, height } = useVideoConfig();
  const tall = height > width;
  const panel = tall ? { left: 32, top: 32, width: 1016, height: 1420 } : { left: 40, top: 40, width: 1516, height: 1000 };
  const card = tall ? { left: 32, top: 1476, width: 1016, height: 412 } : { left: 1580, top: 40, width: 300, height: 1000 };
  const pad = tall ? 56 : 72;
  return { tall, panel, card, pad, inner: panel.width - 2 * pad };
};

export const calculateMetadata: CalculateMetadataFunction<EpisodeProps> = async ({ props }) => {
  const data: Data = await fetch(staticFile(props.src), { cache: "no-store" }).then((r) => r.json());
  return { durationInFrames: Math.round((data.duration + OUTRO) * FPS), props: { ...props, data }, ...(props.vertical && { width: 1080, height: 1920 }) };
};

export const Episode: React.FC<EpisodeProps> = ({ src, sound, data }) => {
  const { fps } = useVideoConfig();
  const { tall, panel, card } = useLayout();
  const t = useCurrentFrame() / fps;
  const { course, title, scenes, duration } = data!;
  const f = (seconds: number) => Math.round(seconds * fps);
  const dir = src.slice(0, src.lastIndexOf("/") + 1);
  const lines = scenes.flatMap((scene) => scene.lines);
  const intro = scenes[0].start; // tts.py leaves this much silence at the start for the intro
  // The panels slide up into place while the intro fades out.
  const arrive = (delay: number): React.CSSProperties => rise(t, intro - 0.45 + delay, 140, 26);
  return (
    <AbsoluteFill style={{ background: c.white, fontFamily: font, color: c.ink }}>
      <Sequence name="Intro" durationInFrames={f(intro)}>
        <Intro course={course.title} episode={title} seconds={intro} />
      </Sequence>
      <div style={{ position: "absolute", ...panel, borderRadius: RADIUS, background: c.muted, ...arrive(0) }} />
      {scenes.map((scene, i) => (
        <Sequence key={i} name={scene.slide.title} from={f(scene.start)} durationInFrames={f(scene.end) - f(scene.start)} premountFor={fps}>
          <SlideView slide={withMedia(scene.slide, dir)} seconds={scene.end - scene.start} lines={scene.lines.map((l) => ({ ...l, start: l.start - scene.start }))} />
        </Sequence>
      ))}
      {scenes.slice(1).map((scene, i) => (
        <Sequence key={i} name="Wipe" from={f(scene.start - WIPE / 2)} durationInFrames={f(WIPE)} layout="none">
          <Wipe up={i % 2 === 1} />
        </Sequence>
      ))}
      {lines.map((line, i) => (
        <Sequence key={i} name={line.text} from={f(line.start)} layout="none">
          <Html5Audio src={staticFile(dir + line.file)} />
        </Sequence>
      ))}
      <div style={{ position: "absolute", ...card, ...arrive(0.08) }}>
        <HostCard t={t} tall={tall} course={course.title} episode={title} hosts={course.hosts} lines={lines} progress={Math.min(1, Math.max(0, (t - intro) / (duration - intro)))} />
      </div>
      <Sequence name="End card" from={f(duration)} premountFor={fps}>
        <EndCard title={course.title} />
      </Sequence>
      {(sound ?? course.sound ?? true) && <Sound dir={dir} scenes={scenes} duration={duration} total={duration + OUTRO} />}
    </AbsoluteFill>
  );
};

// A photo's file sits next to the voice lines (tts.py copies it there), so its path starts from the same folder.
const withMedia = (slide: Slide, dir: string): Slide =>
  slide.visual?.type === "photo" ? { ...slide, visual: { ...slide.visual, src: staticFile(dir + slide.visual.src) } } : slide;

// Splits a title or a line into words. A *marked phrase* stays together as one, along with any
// punctuation right after it. A star with a space after it (2 * 3) is just a star. tts.py's unmark matches.
const tokens = (text: string) =>
  (text.match(/\*(?=\S)[^*]+(?<=\S)\*\S*|\S+/g) ?? []).map((word) => {
    const [, mark, rest = ""] = /^\*([^*]+)\*(\S*)$/.exec(word) ?? [];
    return mark ? { text: mark, rest, mark: true } : { text: word, rest: "", mark: false };
  });

// One word coming in at second `at`. It fades in, sharpens from a blur and slides up a little, quickly
// enough to read as there within a few frames. A marked word turns purple, and a moment later a lilac
// marker sweeps in behind it.
const Word: React.FC<{ t: number; at: number; text: string; rest: string; mark: boolean }> = ({ t, at, text, rest, mark }) => {
  const sharp = prog(t, at, 0.25);
  return (
    <span style={{ display: "inline-block", opacity: prog(t, at, 0.15), filter: sharp < 1 ? `blur(${(1 - sharp) * 0.12}em)` : undefined, translate: `0 ${(1 - spr(t, at, 22)) * 0.3}em` }}>
      {mark ? (
        <span style={{ position: "relative", isolation: "isolate", color: a.brand }}>
          <span style={{ position: "absolute", inset: "0.1em -0.12em -0.02em", zIndex: -1, borderRadius: "0.18em", background: a.lilac, transformOrigin: "0 50%", scale: `${prog(t, at + 0.15, 0.5)} 1` }} />
          {text}
        </span>
      ) : (
        text
      )}
      {rest}
    </span>
  );
};

// A title whose words come in one after the other from second `start`. Put a phrase in *stars* to mark
// it. `light` makes it white, for a purple slide.
const RevealTitle: React.FC<{ t: number; text: string; size: number; start?: number; light?: boolean }> = ({ t, text, size, start = 0.1, light }) => (
  <Title size={size} style={light ? { color: c.white } : undefined}>
    {tokens(text).map((word, i) => (
      <span key={i}>
        {i > 0 && " "}
        <Word t={t} at={start + i * 0.06} {...word} />
      </span>
    ))}
  </Title>
);

// A slide that is only the spoken words, big. Each line takes the slide over as it starts and blurs away
// when the next one begins. Each word comes in a tenth of a second before Kokoro says it, so it reads in
// sync once it has faded in. A line voiced before word times existed shares its length out by word.
const LEAD = 0.1;
const Kinetic: React.FC<{ t: number; lines: Line[]; width: number; light: boolean }> = ({ t, lines, width, light }) => (
  <div style={{ height: "100%", display: "grid", placeItems: "center", textAlign: "center" }}>
    {lines.map((line, i) => {
      const next = lines[i + 1]?.start ?? 1e6;
      if (t > next + 0.5) return null;
      const words = tokens(line.text);
      const chars = words.reduce((n, w) => n + w.text.length + w.rest.length + 1, 0);
      const size = chars <= 18 ? 150 : chars <= 32 ? 124 : chars <= 50 ? 104 : 88;
      const out = prog(t, next - 0.05, 0.35);
      const count = line.text.split(/\s+/).length;
      let said = 0; // words of the line before this one; a *marked phrase* can be several
      return (
        <div key={i} style={{ gridArea: "1 / 1", maxWidth: Math.min(1240, width), opacity: 1 - out, filter: out > 0 ? `blur(${out * 16}px)` : undefined, translate: `0 ${-60 * out}px` }}>
          <Title size={size} style={light ? { color: c.white } : undefined}>
            {words.map((word, j) => {
              const at = line.start + (line.words?.[said] ?? (line.seconds * said) / count) - LEAD;
              said += word.text.split(/\s+/).length;
              return (
                <span key={j}>
                  {j > 0 && " "}
                  <Word t={t} at={at} {...word} />
                </span>
              );
            })}
          </Title>
        </div>
      );
    })}
  </div>
);

// Between scenes a lilac band and then a purple one sweep over the panel, sideways and upwards in turn.
// The old slide has faded by the time they cover it, and the new one comes in as they leave.
const WIPE = 0.8; // seconds
const Wipe: React.FC<{ up: boolean }> = ({ up }) => {
  const { fps } = useVideoConfig();
  const { panel } = useLayout();
  const t = useCurrentFrame() / fps;
  return (
    <div style={{ position: "absolute", ...panel, borderRadius: RADIUS, overflow: "hidden" }}>
      {[a.lilac, a.brand].map((bg, i) => {
        const x = interpolate(t - i * 0.07, [0, WIPE - 0.07], [-1.1, 1.1], { ...clamp, easing: Easing.inOut(Easing.cubic) });
        return <div key={i} style={{ position: "absolute", inset: 0, borderRadius: RADIUS, background: bg, translate: up ? `0 ${-x * 100}%` : `${x * 100}% 0` }} />;
      })}
    </div>
  );
};

// The service shapes, tucked into the corners of a `width` by `height` area. From second `at` they fly out
// of the middle one by one, spinning into place, and then float slowly. `seed` flips the layout for some
// titles, so title slides vary. Sizes follow the area's short side, so they fit a tall video too.
const SCATTER: { shape: ShapeName; fill: string; size: number; x: number; y: number }[] = [
  { shape: "arch", fill: a.lilac, size: 0.36, x: -0.06, y: -0.03 },
  { shape: "spark", fill: a.brand, size: 0.13, x: 0.11, y: 0.7 },
  { shape: "pill", fill: a.soft, size: 0.26, x: 0.85, y: 0.05 },
  { shape: "petal", fill: a.lilac, size: 0.32, x: 0.79, y: 0.72 },
];
const Scatter: React.FC<{ t: number; seed: string; width: number; height: number; at?: number }> = ({ t, seed, width, height, at = 0.05 }) => {
  const flip = random(seed) > 0.5;
  return SCATTER.map((s, i) => {
    const size = s.size * Math.min(width, height);
    const w = s.shape === "pill" ? size * 0.6 : size;
    const [left, top] = [flip ? (1 - s.x) * width - w : s.x * width, s.y * height];
    const k = spr(t, at + i * 0.06, 20);
    const [dx, dy] = [width / 2 - left - w / 2, height / 2 - top - size / 2]; // from the shape's spot to the middle
    return (
      <div
        key={i}
        style={{
          position: "absolute",
          left,
          top,
          scale: k,
          translate: `${dx * (1 - k)}px ${dy * (1 - k) + Math.sin(t * 0.5 + i * 1.7) * 14}px`,
          rotate: `${(1 - k) * -90 + (s.shape === "spark" ? t * 14 : Math.sin(t * 0.4 + i) * 4)}deg`,
        }}
      >
        <Shape shape={s.shape} size={size} fill={s.fill} />
      </div>
    );
  });
};

// Bullet k and visual piece k come in when the k-th line marked `reveal: true` starts. Without reveal
// lines they come in one after another as the slide opens. The newest bullet is purple until the next
// one arrives. Line times here count from the start of the slide.
const SlideView: React.FC<{ slide: Slide; seconds: number; lines: Line[] }> = ({ slide, seconds, lines }) => {
  const { fps } = useVideoConfig();
  const { tall, panel, pad, inner } = useLayout();
  const t = useCurrentFrame() / fps;
  const reveals = lines.filter((l) => l.reveal).map((l) => l.start);
  const at = (k: number) => reveals[k] ?? 0.4 + k * 0.15;
  const out = prog(t, seconds - 0.35, 0.35);
  const box: React.CSSProperties = {
    position: "absolute",
    left: panel.left + pad,
    top: panel.top + 64,
    width: inner,
    height: panel.height - 128,
    opacity: 1 - out,
    translate: `0 ${-36 * out}px`,
    filter: out > 0 ? `blur(${out * 14}px)` : undefined,
  };
  // A purple slide has a solid purple panel and white type. It stays put while the content fades, so the
  // wipe covers it before the next slide.
  const light = !!slide.purple;
  const back = light && <div style={{ position: "absolute", ...panel, borderRadius: RADIUS, background: a.brand }} />;
  if (slide.kinetic)
    return (
      <>
        {back}
        <div style={box}>
          <Kinetic t={t} lines={lines} width={inner} light={light} />
        </div>
      </>
    );
  if (!slide.bullets && !slide.code && !slide.visual)
    return (
      <>
        {back}
        <div style={{ position: "absolute", ...panel, borderRadius: RADIUS, overflow: "hidden", opacity: 1 - out }}>
          <Scatter t={t} seed={slide.title} width={panel.width} height={panel.height} />
        </div>
        <div style={{ ...box, display: "grid", placeItems: "center", textAlign: "center" }}>
          <div style={{ maxWidth: Math.min(1180, inner) }}>
            <RevealTitle t={t} text={slide.title} size={112} start={0.2} light={light} />
          </div>
        </div>
      </>
    );
  // Code, terminals, browsers and prompts need more room to stay readable, so next to bullets they get a
  // wider column. A tall video stacks the bullets over the visual instead.
  const codeLike = !!slide.code || ["terminal", "browser", "erase", "prompt", "stream", "chat"].includes(slide.visual?.type ?? "");
  const side = tall || !slide.bullets ? inner : codeLike ? 800 : 700;
  return (
    <>
      {back}
      <div style={{ ...box, display: "flex", flexDirection: "column", gap: 48 }}>
        <RevealTitle t={t} text={slide.title} size={tall ? 72 : 76} light={light} />
        <div style={{ flex: 1, display: "flex", flexDirection: tall ? "column" : "row", gap: tall ? 40 : 56, alignItems: tall ? "stretch" : "center", justifyContent: "center" }}>
          {slide.bullets && (
            <div style={{ flex: tall ? "none" : 1, display: "flex", flexDirection: "column", gap: 20 }}>
              {slide.bullets.map((text, k) => (
                <Bullet key={k} t={t} at={at(k)} k={k} lit={reveals.length ? newest(t, at, k, slide.bullets!.length) : 0} small={codeLike} text={text} />
              ))}
            </div>
          )}
          {(slide.code || slide.visual) && (
            <div style={{ flex: "none", width: side, display: "flex", justifyContent: "center" }}>
              {slide.code ? (
                <div style={rise(t, 0.4)}>
                  <CodeBlock code={slide.code} highlight={slide.highlight} t={t} at={at} width={side} />
                </div>
              ) : (
                <VisualView visual={slide.visual!} t={t} at={at} width={side} />
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

// A numbered white card. As `lit` goes from 0 to 1, purple sweeps across it from the left.
const Bullet: React.FC<{ t: number; at: number; k: number; lit: number; small: boolean; text: string }> = ({ t, at, k, lit, small, text }) => (
  <div
    style={{
      position: "relative",
      display: "flex",
      alignItems: "center",
      gap: 24,
      padding: "18px 32px 18px 18px",
      borderRadius: 32,
      background: c.white,
      ...shell(t, k, at),
    }}
  >
    <div style={{ position: "absolute", inset: 0, borderRadius: 32, background: a.brand, clipPath: `inset(0 ${(1 - lit) * 100}% 0 0 round 32px)` }} />
    <div style={{ position: "relative", flex: "none", width: 60, height: 60, borderRadius: 30, display: "grid", placeItems: "center", background: a.lilac, ...label, color: a.brand, fontSize: 28 }}>{k + 1}</div>
    <span style={{ position: "relative", ...label, fontSize: small ? 30 : 34, lineHeight: 1.25, color: interpolateColors(lit, [0, 1], [c.ink, c.white]), ...rise(t, at, 16) }}>{text}</span>
  </div>
);

// The first three seconds, before the panels arrive. The logo builds itself, the shapes fly out to the
// corners, the course and episode titles come in under the logo, and then it all blurs away.
const Intro: React.FC<{ course: string; episode: string; seconds: number }> = ({ course, episode, seconds }) => {
  const { fps, width, height } = useVideoConfig();
  const t = useCurrentFrame() / fps;
  const out = prog(t, seconds - 0.7, 0.45);
  return (
    <AbsoluteFill style={{ opacity: 1 - out, filter: out > 0 ? `blur(${out * 20}px)` : undefined, translate: `0 ${-60 * out}px` }}>
      <Scatter t={t} seed={episode} width={width} height={height} at={0.25} />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", textAlign: "center" }}>
        <Logo size={160} fill={a.brand} t={t} at={0.1} />
        <div style={{ marginTop: 72, ...label, fontSize: 36, color: c.body, ...rise(t, 0.55) }}>{course}</div>
        <div style={{ marginTop: 24, maxWidth: Math.min(1400, width - 160) }}>
          <RevealTitle t={t} text={episode} size={100} start={0.65} />
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// Five small bars that bounce while a host talks and shrink back to dots when they stop. The movement
// is made up rather than read from the audio, which nobody notices at this size.
const Meter: React.FC<{ t: number; on: number; seed: number }> = ({ t, on, seed }) => (
  <div style={{ height: 44, display: "flex", alignItems: "center", gap: 7 }}>
    {range(5).map((j) => {
      const level = Math.abs(Math.sin(t * (7 + j * 1.9) + seed * 3 + j) * Math.sin(t * 2.3 + j)) * (1 - Math.abs(j - 2) * 0.2);
      return <div key={j} style={{ width: 8, height: 8 + on * 36 * level, borderRadius: 4, background: a.lilac, opacity: 0.4 + 0.6 * on }} />;
    })}
  </div>
);

// The purple card with the logo, course and episode titles, both hosts and a progress bar: a column to the
// right of the slide, or a strip under it in a tall video. Each host is one of the service shapes.
// Whoever is talking lights up, lifts a little and gets a meter.
const HostCard: React.FC<{ t: number; tall: boolean; course: string; episode: string; hosts: Hosts; lines: Line[]; progress: number }> = ({ t, tall, course, episode, hosts, lines, progress }) => (
  <div style={{ width: "100%", height: "100%", borderRadius: RADIUS, background: a.brand, padding: tall ? "36px 44px 40px" : "44px 32px 48px", display: "flex", flexDirection: "column" }}>
    <div style={{ display: "flex", flexDirection: tall ? "row" : "column", alignItems: tall ? "center" : "flex-start", gap: tall ? 24 : 40 }}>
      <Logo size={48} fill={a.lilac} />
      <div>
        <div style={{ ...label, fontSize: 22, lineHeight: 1.3, color: a.lilac }}>{course}</div>
        <div style={{ marginTop: 10, ...label, fontSize: 30, lineHeight: 1.2, color: c.white, textWrap: "balance" }}>{episode}</div>
      </div>
    </div>
    <div style={{ flex: 1, display: "flex", flexDirection: tall ? "row" : "column", justifyContent: "space-evenly", alignItems: "center" }}>
      {Object.keys(hosts).map((id, i) => {
        const last = lines.findLast((l) => l.host === id && l.start <= t);
        const on = last ? prog(t, last.start, 0.3) * (1 - prog(t, last.start + last.seconds, 0.4)) : 0;
        return (
          <div key={id} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: tall ? 14 : 20 }}>
            <div style={{ translate: `0 ${-12 * on}px`, scale: 0.86 + 0.14 * on, opacity: 0.4 + 0.6 * on }}>
              <Shape shape={HOST_SHAPES[i % HOST_SHAPES.length]} size={tall ? 110 : 140} fill={a.lilac} />
            </div>
            <Meter t={t} on={on} seed={i} />
            <div style={{ ...label, fontSize: 30, color: interpolateColors(on, [0, 1], ["rgba(208, 206, 255, 0.6)", c.white]) }}>{hosts[id].name}</div>
          </div>
        );
      })}
    </div>
    <div style={{ height: 8, borderRadius: 4, background: "rgba(208, 206, 255, 0.25)", overflow: "hidden" }}>
      <div style={{ width: `${progress * 100}%`, height: "100%", borderRadius: 4, background: a.lilac }} />
    </div>
  </div>
);

// The end card fades in white over everything. The shapes pop in, the logo builds itself and the
// course title slides up.
const EndCard: React.FC<{ title: string }> = ({ title }) => {
  const { fps, width, height } = useVideoConfig();
  const t = useCurrentFrame() / fps;
  return (
    <AbsoluteFill style={{ background: c.white, opacity: prog(t, 0, 0.4), alignItems: "center", justifyContent: "center", textAlign: "center" }}>
      <Scatter t={t} seed={title} width={width} height={height} at={0.2} />
      <Logo size={140} fill={a.brand} t={t} at={0.3} />
      <div style={{ marginTop: 64, maxWidth: Math.min(1300, width - 160) }}>
        <RevealTitle t={t} text={title} size={96} start={0.7} />
      </div>
      <div style={{ marginTop: 28, ...label, fontSize: 36, color: c.body, ...rise(t, 1.1) }}>Thanks for listening</div>
      <div style={{ position: "absolute", bottom: 64, ...label, fontSize: 28, color: a.brand, ...rise(t, 1.3) }}>kumpan.se</div>
    </AbsoluteFill>
  );
};
