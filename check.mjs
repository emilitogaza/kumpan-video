// Usage: node check.mjs <course> <episode>...
// Checks episode scripts against the rules in CLAUDE.md. Errors would break the video, warnings are about style.
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";

const { icons } = createRequire(import.meta.url)("lucide-react");
const [course, ...episodes] = process.argv.slice(2);
const meta = JSON.parse(readFileSync(`courses/${course}/course.json`, "utf8"));
const words = (s) => s.split(/\s+/).filter(Boolean).length;
const iconOk = (name) => icons[name.replace(/(^|-)(\w)/g, (_, __, ch) => ch.toUpperCase())];
// How many reveal lines a visual needs. Piece k appears at the k-th reveal.
const pieces = (v) =>
  ({ flow: v.items, icons: v.items, compare: v.items, piles: v.items, cycle: v.items, stats: v.items, sequence: v.steps, keys: v.items, layers: v.items, chat: v.items, drag: v.stops, files: v.links, tree: v.paths, lifecycle: v.events })[v.type]?.length ??
  ({
    terminal: v.highlight?.length ?? 0,
    browser: v.highlight?.length ?? 0,
    erase: 3,
    prompt: 1 + (v.steps?.length ?? 0),
    offline: 2,
    photo: v.caption ? 2 : 1,
    chart: v.mark === undefined ? 1 : 2,
    stream: 1,
    diff: 3,
    breakdown: v.split ? 3 : 2,
    gallery: v.reject ? 3 : 2,
    slots: v.want > v.max ? 2 : 1,
    race: v.result ? 2 : 1,
    url: v.parts?.length + (v.to ? 1 : 0),
    sieve: v.gates?.length + 1,
    form: v.fields?.some((f) => f.error) ? 4 : 3,
  })[v.type];

let failed = false;
for (const episode of episodes) {
  const script = JSON.parse(readFileSync(`courses/${course}/episodes/${episode}.json`, "utf8"));
  const errors = [];
  const warnings = [];
  let total = 0;
  for (const { slide, lines } of script.scenes) {
    const at = `"${slide.title}"`;
    const v = slide.visual;
    const reveals = lines.filter((l) => l.reveal).length;
    const bullets = slide.bullets?.length ?? 0;
    const highlight = slide.code ? (slide.highlight?.length ?? 0) : 0;
    const used = v ? pieces(v) : 0;
    if (used === undefined) errors.push(`${at}: unknown visual type "${v.type}"`);
    if (slide.code && v) errors.push(`${at}: has both code and a visual`);
    if (v?.type === "photo" && !existsSync(`courses/${course}/${v.src}`)) errors.push(`${at}: photo courses/${course}/${v.src} doesn't exist`);
    if (slide.kinetic && (bullets || slide.code || v)) errors.push(`${at}: a kinetic slide only shows its lines, so it can't have bullets, code or a visual`);
    const needed = Math.max(bullets, used ?? 0, highlight);
    if (reveals && reveals < needed) errors.push(`${at}: ${reveals} reveal lines, but ${needed} bullets/visual pieces/highlights to reveal`);
    if (!reveals && v?.type === "erase") errors.push(`${at}: erase needs 3 reveal lines`);
    if (reveals > needed) warnings.push(`${at}: ${reveals} reveal lines for ${needed} things to reveal`);
    for (const icon of [...(v?.items ?? []), ...(v?.actors ?? [])].map((i) => i.icon).filter(Boolean))
      if (!iconOk(icon)) errors.push(`${at}: unknown Lucide icon "${icon}"`);
    if (v?.type === "cycle" && (v.items.length < 3 || v.items.length > 4)) errors.push(`${at}: cycle needs 3–4 items`);
    for (const step of v?.type === "sequence" ? v.steps : [])
      if (!v.actors[step.from] || !v.actors[step.to]) errors.push(`${at}: step "${step.label}" points at a missing actor`);
    for (const link of v?.type === "files" ? v.links : [])
      if (!v.items[link.from] || !v.items[link.to]) errors.push(`${at}: link "${link.label}" points at a missing file`);
    for (const icon of v?.type === "sieve" ? [...v.gates, v.end].map((g) => g.icon) : []) if (!iconOk(icon)) errors.push(`${at}: unknown Lucide icon "${icon}"`);
    if (v?.type === "sieve") for (const item of v.items) if (item.stop !== undefined && !v.gates[item.stop]) errors.push(`${at}: "${item.label}" stops at a missing gate`);
    if (v?.type === "url") {
      let from = 0;
      for (const part of v.parts) {
        const j = v.url.indexOf(part.text, from);
        if (j < 0) errors.push(`${at}: url part "${part.text}" isn't in the URL after the parts before it`);
        else from = j + part.text.length;
      }
    }
    if (v?.type === "tree") {
      for (const [i, node] of v.nodes.entries()) if (node.parent !== undefined && !(node.parent < i)) errors.push(`${at}: tree node "${node.label}" needs a parent listed before it`);
      for (const path of v.paths) {
        if (!v.nodes[path.node]) errors.push(`${at}: tree path points at a missing node`);
        if ((path.lang ?? 0) >= (v.langs?.length ?? 1)) errors.push(`${at}: tree path uses a missing language`);
      }
    }
    if (v?.type === "lifecycle")
      for (const lane of v.lanes) if (!v.events[lane.from] || (lane.to !== undefined && !(lane.to > lane.from && v.events[lane.to]))) errors.push(`${at}: lifecycle lane "${lane.label}" points at a missing event`);
    const rows = v?.lines ?? v?.rows ?? slide.code?.split("\n") ?? [];
    for (const i of (v?.highlight ?? slide.highlight ?? []).flat())
      if (i < 0 || i >= rows.length) errors.push(`${at}: highlight line ${i} doesn't exist`);
    for (const row of v?.rows ?? [])
      if (row.length !== v.columns.length) errors.push(`${at}: browser row has ${row.length} cells for ${v.columns.length} columns`);
    if (words(slide.title) > 6) warnings.push(`${at}: title over six words`);
    if (bullets > 4) warnings.push(`${at}: ${bullets} bullets`);
    for (const b of slide.bullets ?? []) if (words(b) > 7) warnings.push(`${at}: long bullet "${b}"`);
    if (rows.length > 12) warnings.push(`${at}: ${rows.length} lines of code/output`);
    for (const line of lines) {
      if (!meta.hosts[line.host]) errors.push(`${at}: unknown host "${line.host}"`);
      if (words(line.text) > 35) warnings.push(`${at}: line over 35 words: "${line.text.slice(0, 40)}…"`);
      if (slide.kinetic && words(line.text) > 12) warnings.push(`${at}: kinetic line over 12 words, it will be small: "${line.text.slice(0, 40)}…"`);
      total += words(line.say ?? line.text);
    }
  }
  if (script.scenes.filter((s) => s.slide.purple).length > 1) warnings.push("more than one purple slide, keep it for the one punchline");
  if (script.scenes.flatMap((s) => s.lines).filter((l) => l.drop).length > 1) warnings.push("more than one drop line, only the first one counts");
  // About 145 spoken words a minute with pauses. We measured 1,250 words at 8.6 minutes.
  const minutes = script.minutes ?? 8;
  if (total < minutes * 130 || total > minutes * 160) warnings.push(`${total} spoken words, aim for about ${minutes * 145} (${minutes} min)`);
  console.log(`${episode}: ${total} words, ${errors.length} errors, ${warnings.length} warnings`);
  for (const e of errors) console.log(`  error   ${e}`);
  for (const w of warnings) console.log(`  warning ${w}`);
  failed ||= errors.length > 0;
}
process.exit(failed ? 1 : 0);
