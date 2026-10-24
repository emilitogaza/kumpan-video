import type React from "react";
import { Html5Audio, interpolate, random, Sequence, staticFile, useVideoConfig } from "remotion";
import { clamp } from "./brand";
import type { Line, Scene } from "./Episode";
import { promptTiming } from "./visuals";

// How loud each sound plays. The files all peak at full scale (sounds.py) and Kokoro's voices peak
// around -8 dB, so these keep every effect well under them: you should feel the sounds more than hear
// them. The music sits about 13 dB under the voices in the pauses and 20 dB under while someone talks.
const LEVEL = { logo: 0.16, pops: 0.07, tick: 0.07, key: 0.04, tock: 0.1, music: 0.035 };

type Cue = { file: keyof typeof LEVEL; at: number; volume?: number };

// Where each sound goes, in seconds from the start of the video. The times follow the animations in
// Episode.tsx and visuals.tsx, so when one of those moves, its sound has to move with it.
const cues = (scenes: Scene[], duration: number): Cue[] => {
  const out: Cue[] = [];
  // A click for every `step`th character as a prompt or command types out, a little louder or softer each time.
  const keys = (from: number, to: number, chars: number, step = 2) => {
    for (let j = 0; j < chars; j += step) out.push({ file: "key", at: from + ((to - from) * j) / chars, volume: LEVEL.key * (0.6 + 0.8 * random(`key${from}${j}`)) });
  };
  // The intro and the end card: the logo's three notes as its pieces land, and pops as the shapes fly out.
  out.push({ file: "logo", at: 0.18 }, { file: "pops", at: 0.35 });
  out.push({ file: "logo", at: duration + 0.38 }, { file: "pops", at: duration + 0.3 });
  for (const [i, scene] of scenes.entries()) {
    const { slide, start } = scene;
    const reveals = scene.lines.filter((l) => l.reveal).map((l) => l.start - start);
    const at = (k: number) => reveals[k] ?? 0.4 + k * 0.15;
    if (i > 0) out.push({ file: "tock", at: start }); // the wipe covers the panel right as the scene changes
    if (!slide.bullets && !slide.code && !slide.visual && !slide.kinetic) out.push({ file: "pops", at: start + 0.15 });
    const v = slide.visual;
    if (v?.type === "prompt") {
      const p = promptTiming(v, at);
      p.runs.forEach((r, j) => {
        keys(start + r.from, start + r.typed, r.text.length);
        if (j < p.runs.length - 1) keys(start + r.held, start + r.gone, r.text.length, 5); // deleting a draft
      });
      out.push({ file: "tick", at: start + p.sent, volume: LEVEL.tick * 1.6 });
      (v.steps ?? []).forEach((_, j) => out.push({ file: "tick", at: start + p.stepAt(j) }));
      continue;
    }
    if (v?.type === "terminal") keys(start + 0.2, start + 1, v.command.length);
    for (const r of reveals) out.push({ file: "tick", at: start + r });
  }
  return out;
};

// The music dips while anyone talks, comes back up a little in the pauses, fades in over the first
// second and a half and fades out with the end card. A line marked `drop` cuts it out half a second
// before it starts, and it comes back with the end card. `total` is the whole video, end card included.
const musicVolume = (t: number, lines: Line[], duration: number, total: number) => {
  const drop = lines.find((l) => l.drop);
  const silence = drop ? Math.min(interpolate(t, [drop.start - 0.6, drop.start - 0.45], [0, 1], clamp), interpolate(t, [duration, duration + 0.2], [1, 0], clamp)) : 0;
  let talk = 0;
  for (const l of lines) {
    if (t < l.start - 0.3 || t > l.start + l.seconds + 0.6) continue;
    talk = Math.max(talk, Math.min(interpolate(t, [l.start - 0.25, l.start], [0, 1], clamp), interpolate(t, [l.start + l.seconds, l.start + l.seconds + 0.5], [1, 0], clamp)));
  }
  return LEVEL.music * (1 - 0.55 * talk) * (1 - silence) * interpolate(t, [0, 1.5, total - 2.5, total], [0, 1, 1, 0], clamp);
};

export const Sound: React.FC<{ dir: string; scenes: Scene[]; duration: number; total: number }> = ({ dir, scenes, duration, total }) => {
  const { fps } = useVideoConfig();
  const lines = scenes.flatMap((s) => s.lines);
  return (
    <>
      <Html5Audio src={staticFile(dir + "music.wav")} loop loopVolumeCurveBehavior="extend" volume={(frame) => musicVolume(frame / fps, lines, duration, total)} />
      {cues(scenes, duration).map((cue, i) => (
        <Sequence key={i} name={cue.file} from={Math.round(cue.at * fps)} durationInFrames={2 * fps} layout="none">
          <Html5Audio src={staticFile(dir + cue.file + ".wav")} volume={cue.volume ?? LEVEL[cue.file]} />
        </Sequence>
      ))}
    </>
  );
};
