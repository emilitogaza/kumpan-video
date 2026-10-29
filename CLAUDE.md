@README.md

# How it works

Turns material into two-host episodes: an `.mp4` with animated slides and visuals, an `.srt` and an
`.mp3` of the voices alone. `tts.py` voices each line with Kokoro through mlx-audio, trims the silence
off both ends and saves when each word starts (kinetic slides and subtitles use those times), and calls
`sounds.py`, which synthesizes the music and sound effects with numpy. The video is a Remotion
composition in `src/`, `check.mjs` lints scripts. Only code and scripts are versioned;
generated audio and video stay local (see `.gitignore`).

```
courses/<course>/
  course.json              title, hosts + voices                              (versioned)
  episodes/<episode>.json  the script                                         (versioned)
  audio/<episode>/         line WAVs, word times, sounds, props.json          (ignored)
  out/                     <episode>.mp4, .mp3, .srt (and .vertical.mp4)      (ignored)
```

A one-off video is a course with one episode.

## Making episodes

When the user gives you a topic or material (a file, a folder such as another repo's `docs/`, a URL):

1. New course: create `courses/<course>/course.json` (ask about hosts and voices only if they care).
2. Write one script per source page, with a `visual` on most core scenes, in `courses/<course>/episodes/`, following "Writing scripts" below, and run `node check.mjs <course> <episode>` until it reports no errors. Name episodes so they sort in order (`02-how-the-web-works`). Scripts for several pages can be written in parallel.
3. Voice it (`uv run tts.py <course> <episode>`) and show it in the Remotion Studio so the user can watch along: `preview_start` with the `studio` config in `.claude/launch.json` (port 3100), then open `http://localhost:3100/<course>-<episode>`. Do this after every script or visual change; `tts.py` only re-voices lines whose text changed.
4. Render **one episode at a time**: `./build.sh <course> <episode>`. Parallel renders run the Mac out of memory. Before a full render, check stills of the slides with code, the most bullets or the longest titles:
   `npx remotion still src/index.ts --public-dir=courses/<course>/audio/<episode> --props='{"src":"props.json"}' Episode <file>.jpg --frame=<n> --image-format=jpeg`
5. Report the paths of the `.mp4`, `.mp3` and `.srt`.

`./render-all.sh <course>` builds every episode that has no `.mp4` yet. Extra flags go to `remotion render`: `--concurrency=2` if a render stalls (usually memory), `--scale=1.3333333333333333` for 2560×1440 (all 16 digits, or the height comes out 1439.99…).

Remotion API guidance is in `.claude/skills/remotion-*`. Never commit generated media.

## course.json

```json
{
  "title": "Kumpan onboarding",
  "lang": "a",
  "hosts": { "A": { "name": "Ava", "voice": "af_heart" }, "B": { "name": "Max", "voice": "am_michael" } }
}
```

- `lang`: Kokoro language code. `a` is American English, `b` British. Kokoro has no Swedish; for
  Swedish, swap the model in `tts.py` for one that has it (mlx-audio also runs Chatterbox).
- `voice`: a Kokoro preset. `af_heart` and `af_bella` are the strongest; `am_michael`, `am_fenrir`,
  `bm_george` and `bf_emma` are decent.
- `sound` (optional, default true): `false` leaves out the music and sound effects.
- `speed` (optional, default 1): above 1 the hosts talk faster and the pauses shrink to match. Keep
  lessons at 1. For a trailer or teaser use about 1.15–1.2; higher starts to sound rushed.

## The look

Every video shares the Kumpan look from kumpan.se (`src/brand.tsx`). Keep to it: no new colours,
fonts, outlines, shadows or wobble.

- 1920×1080 at 30 fps (or 1080×1920, see `vertical` below). A white page, the slide on a big grey panel and a narrow purple card on the
  right with the Kumpan mark, the course and episode titles, both hosts and a progress bar. Each host
  is one of the site's service shapes (arch, petal); whoever is talking lights up, lifts and gets a
  moving level meter.
- `tts.py` leaves 3 s of silence up front for the intro (the mark assembles, the shapes fly out to
  the corners, the titles come in, it all blurs away and the panels slide up). Episodes end on a 4 s
  end card: the shapes fly out, the mark assembles, the course title comes in.
- Between scenes a lilac band and a purple one sweep over the panel, sideways and upwards in turn.
- Zalando Sans SemiExpanded at one weight (regular) for everything you read, Geist Mono for code,
  both imported from `src/fonts/`, not loaded from the public dir (which is one episode's audio
  folder at render time). Emphasis is colour, never weight.
- Colours: `c` neutrals, `a` the brand purple and its lilac partner, `turns` for tiles side by side.
  Solid purple marks whatever is being talked about right now (the newest bullet, flow step,
  highlighted line); code and terminals sit in dark windows.
- Motion is frame-driven from `t` (seconds): `rise` (the site's springy slide-up, sharpening from a
  blur) for almost everything, `spr` for anything else springy, `newest` for the purple "talking
  about this" state. Titles come in word by word, each word fading in from a blur. Slides blur out as
  they leave. Purple sweeps across a bullet when it lights up, and a tile gives a small bump.
- Sound (`src/sound.tsx`, files from `sounds.py`): three marimba notes as the logo lands, pops as the
  shapes fly out, a soft tick for every reveal, key clicks while a prompt or terminal types, a low tock
  at each wipe, and a calm music loop that dips under the voices. `LEVEL` sets how loud each one is;
  keep them subtle. When an animation's timing changes, move its cue in `cues()` too. `build.sh`
  brings the finished video to -16 LUFS with one steady gain.
- A title-only slide is a big centred title among the service shapes. In any title or kinetic line,
  `*a phrase*` turns purple and gets a lilac marker swept in behind it:
  `"A loop that won't *switch off*"`. Mark one phrase at most.

## Episode script

```json
{
  "title": "How the web works",
  "minutes": 8,
  "scenes": [
    {
      "slide": {
        "title": "Status codes worth knowing",
        "bullets": ["401: who are you?", "403: I know you, and no"],
        "visual": { "type": "icons", "items": [{ "icon": "user-x", "label": "401" }, { "icon": "ban", "label": "403" }] }
      },
      "lines": [
        { "host": "B", "text": "What else do I need?" },
        { "host": "A", "reveal": true, "text": "401 means unauthenticated.", "say": "Four oh one means unauthenticated." },
        { "host": "A", "reveal": true, "text": "And 403 means you're known, but not allowed.", "say": "And four oh three means you're known, but not allowed." }
      ]
    }
  ]
}
```

- A **scene** is one slide on screen while its lines play. The slide has a `title`, optional
  `bullets`, and on the right either `code` (with optional `highlight`) or a `visual` (not both).
- A **line** is one spoken turn. `text` is the subtitle. `say` (optional) is what the voice reads
  when it should differ from the subtitle.
- **Reveal**: bullet k and visual item k appear together when the k-th line marked
  `"reveal": true` starts. Mark one line per bullet (or per visual item on a slide without
  bullets), or none to bring everything in as the slide opens. Bullets and the item-by-item
  visuals (`flow`, `icons`, `compare`, `piles`, `cycle`, `stats`) show every empty pill, card or
  tile as the slide opens, and fill each one at its reveal (`shell` in `src/brand.tsx`).
- **Code highlight**: a slide with `code` can add `"highlight": [[line indexes], …]`. Group k lights
  up at the k-th reveal and the other lines dim, so the hosts can walk through a snippet.
- **Purple slide**: `"purple": true` gives one slide a solid purple panel and white type. Keep it for
  the one punchline of a video, usually a kinetic call to action at the end.
- **Music drop**: `"drop": true` on a line cuts the music half a second before it, and the music comes
  back with the end card. Use it once, on the last line of a trailer.
- **Vertical**: `"vertical": true` at the top of the script makes `build.sh` also render
  `<episode>.vertical.mp4` (1080×1920, slide over a strip with the hosts). To see it in the Studio, set
  `"vertical": true` in the props panel on the right.
- **Kinetic slide**: `"kinetic": true` (with only a `title`, which isn't shown) turns the slide into
  the spoken lines as big type. Each line takes the slide over as it starts and each word comes in
  just before Kokoro says it. `*Marks*` in `text` show on screen only, never in the subtitles or the voice.
  Use it for hooks, punchlines and calls to action; keep its lines under 12 words.

## Visuals

Icons are [Lucide](https://lucide.dev/icons) names in kebab case (`chef-hat`, `shield-check`), drawn
thin in purple on a tile; a wrong name fails loudly in the Studio and in `check.mjs`. Prefer a visual
that *explains* (a sequence, real output) over one that decorates (icons): it should show the
mechanism the hosts are describing.

| `type` | Looks like | Use it for | Shape |
|---|---|---|---|
| `sequence` | actors with lifelines; each message is an arrow drawn as it's spoken, replies dashed, older steps dimmed | protocols and who-talks-to-whom: DNS lookup, TLS, CORS, auth, a hand-off between teams | `actors: [{icon, label}]` (2–4), `steps: [{from, to, label, reply?}]` (≤ 5, actor indexes) |
| `terminal` | a dark terminal that types the command, prints the output, then lights up the lines being discussed; long lines wrap (text never drops below 22px) | real tool output: `curl -v`, `tsc` errors, `git log`, `docker ps` | `command`, `lines: []` (≤ 12), `highlight: [[line indexes]]`, one group per reveal |
| `flow` | steps joined by self-drawing arrows: a column of cards beside bullets, a row of tiles alone; the newest one is purple | a process or pipeline: parse → layout → paint, lead → offer → contract | `items: [{icon, label}]`, 2–5, labels ≤ 12 characters |
| `cycle` | tiles round a circle joined by arcs; when the loop closes, the center pill springs in, a ring spreads and a dot runs round | feedback loops: build → measure → learn, edit → voice → watch | `items: [{icon, label}]`, 3–4, `center?` |
| `stats` | big numbers that count up on purple, lilac and white cards | figures worth remembering: "70%", "3x", "1 in 5" (only single numbers count up) | `items: [{value, label}]`, 1–3, values ≤ 7 characters |
| `icons` | big tiles | metaphors and sets of things: a letter, a kitchen | `items: [{icon, label}]`, 1–4 |
| `compare` | side-by-side cards, the last one purple as the better option | before vs after, bad vs good, cost of each option | `items: [{icon, label, points?}]`, 2–3 |
| `piles` | equal tinted cards whose points are chips | sorting things into groups: "already do / same idea / new" | `items: [{icon, label, points}]`, 2–3 |
| `browser` | a browser with devtools open on a table (Network tab by default); each row appears with the first highlight group that includes it, so later rows don't give the story away | caching (disk cache, 304, CDN hit), status codes, cookies (`"tab": "Application"`) | `url`, `tab?`, `columns: []`, `rows: [[cells]]` (≤ 8), `highlight: [[row indexes]]` |
| `prompt` | a Claude Code prompt box. Any `drafts` type out in grey and get deleted first, then the real prompt types out and gets sent, then steps come in under it, each with a spinner that turns into a check | showing what someone asks Claude, and what happens next; drafts show it could be about anything | `text`, `drafts?: []` (≤ 3, short), `steps?: []` (≤ 4); reveal 0 starts the typing, reveal k brings in step k (or leave out reveals and they follow on their own) |
| `offline` | a Wi-Fi switch that flips off while a task under it keeps going to 100% and gets a check | proof that something runs without a network | `task`; 2 reveals: the switch goes off, then the task finishes two seconds later |
| `photo` | a photo in a rounded frame that rises in and slowly zooms, with a caption pill that pops in over its corner | people, places, real screenshots | `src` (a file next to `course.json`), `caption?`; reveal 0 brings the photo, reveal 1 the caption. Match a photo's colours to the brand with ImageMagick first if they clash |
| `erase` | code whose `⟦marked⟧` parts turn red and struck through, then collapse away, and the tab title switches | what a build step removes: TypeScript types, dead code | `code` with `⟦…⟧` marks, `files?: ["greet.ts", "greet.js"]`; 3 reveals: show, mark, erase |

Beside bullets, code-like visuals (`code`, `terminal`, `browser`, `erase`, `prompt`) get a wider column and the
bullets get slightly smaller text.

When an episode's central idea deserves its own animation, add a new type to `src/visuals.tsx` in
the same look, register it in `check.mjs` and document it here. Prefer data-driven types that other
courses can reuse.

Give most core scenes a visual: it's what the viewer looks at while the hosts talk. Keep the bullets
too, and match the visual's pieces (items, steps or highlight groups) to them so they land together.
Terminal output must be real: run the command and paste trimmed lines, shortening long tokens to `…`.
Use documentation addresses (`example.com`, `203.0.113.7`) for made-up hosts.

# Writing scripts

## Length: fit the page

One source page is one episode, sized to the page. Set `"minutes"` in the script (default 8) and aim
for about 145 spoken words a minute (count `say` where a line has it, otherwise `text`). Measured:
1,250 words voiced to 8.6 minutes, pauses included.

| Source page | Episode | Spoken words |
|---|---|---|
| Welcome / intro | 4 min | ~580 |
| Short (under ~900 words) | 5–6 min | ~800 |
| Medium (~1,200–1,600 words) | 8 min | ~1,150 |
| Deep dive (2,000+ words) | 10 min at most | ~1,450 |

- **Long page: condense, don't split.** Pick the 4–6 ideas a viewer must walk away with and spend
  the time on those. Drop exhaustive tables, reference lists and most checklist items. One example
  told well beats five name-checks. Name what you dropped in one recap line ("The full checklist is
  in the handbook").
- **Short page: don't pad.**
- **Trailer or teaser (30 s)**: about 55 spoken words over 4–5 scenes at `"speed": 1.18`. Open on a
  kinetic slide, put one or two quick visuals in between (prompt with drafts, offline, flow), and close
  on a purple kinetic slide whose last line has `"drop": true`. Add `"vertical": true` for a phone
  version. Keep lines short. The intro and end card take 7 of the 30 seconds. Skip stats that count
  the tool's own features; they make it sound small.

`node check.mjs <course> <episode>` prints the spoken word count against the target and the errors
(reveal counts, icons, highlight lines, actors) that would break the video. `tts.py` then prints the
real speech length.

## Shape of an episode

1. **Hook**: one title-only scene of 3–5 lines on the problem this episode solves. The first
   episode of a course introduces the hosts and the course. Later ones open with "welcome back"
   and one sentence on the previous episode.
2. **Core ideas**: most of the scenes, one idea per scene. Explain it, then make it concrete with
   an analogy, a short code snippet or a "here's what goes wrong" moment.
3. **One real-world story** in its own scene: the main story from the material, told as
   before vs after when the material has that contrast.
4. **Recap**: the last scene. Up to four recap bullets, then "one thing to try today" as a spoken
   line (with a code block beside the bullets if it's a command).
5. **Teaser**: the last line of the recap scene names the next episode's topic. No extra scene.

## Dialogue

- Host A explains. Host B is a smart, curious listener who asks what the audience would ask,
  pushes back, gets things half right and sums up in their own words. Write a conversation, not
  a lecture read in turns, and vary the line lengths.
- Plain, confident English. No buzzwords or clever lines.
- Keep `text` under ~35 words; long lines are split into several subtitle cues.
- Never read code aloud. Put it on the slide and talk about what it does.
- Keep the public names the material is built around (real tools, real products). Anonymise
  people's past employers and client projects ("a hotel-booking integration") unless the user says
  otherwise.

## Pronunciation

The text-to-phoneme step reads known all-caps words as words (REST, CORS, DOM) and spells the rest
letter by letter (DNS, API, CDN). That is usually right. Use `say` where it isn't, or where symbols
and digits are involved:

| Write | `say` |
|---|---|
| 401, 2xx, TS2322 | four oh one, two hundred, T S twenty-three twenty-two |
| 2015, 82M | twenty fifteen, eighty two million |
| CNAME, JSON, tsc, CI, MP4 | C name, Jason, T S C, C I, M P 4 |
| Next.js, Vue, Vite, HTTP/2 | Next J S, View, Veet, HTTP two |
| tsconfig, useEffect, Promise.all | T S config, use effect, promise dot all |
| kumpan.se, BankID | kumpan dot S E, Bank I D |

Never put Markdown, URLs, file paths or code in `say`. The voices are English: give domains and
Swedish words a spelling they can manage, or rephrase so they aren't needed. Unsure about a word?
Print its phonemes:

```bash
.venv/bin/python -c "from misaki import en, espeak; print(en.G2P(trf=False, fallback=espeak.EspeakFallback(british=False))('CNAME Kumpan')[0])"
```

## Slides

- Every scene has a slide. A title-only slide is fine for a conversational stretch, and a
  code-only slide is fine for a core idea.
- Titles of six words or fewer. At most four bullets of at most seven words. Code at most ten
  lines of about 60 characters. Code never wraps: it shrinks to fit, so shorter lines read bigger.
- Use `reveal` so bullets land as they are spoken.
