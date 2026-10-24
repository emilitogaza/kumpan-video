"""Voices an episode script with Kokoro, one WAV per line with the silence trimmed off both ends, and
next to it a JSON list of when each word starts. A line is only voiced again when its voice or text
changes.

Usage: uv run tts.py <course> <episode>
Writes the WAVs, the sound effects and music (sounds.py) and props.json (what Remotion reads, with every
line's start time and word times) to courses/<course>/audio/<episode>/, and the subtitles to
courses/<course>/out/<episode>.srt.
"""

import hashlib
import json
import re
import shutil
import sys
import wave
from pathlib import Path

import numpy as np
from mlx_audio.tts.utils import load_model

import sounds

MODEL = "mlx-community/Kokoro-82M-bf16"
RATE = 24000  # Kokoro output sample rate
LINE_GAP = 0.3  # seconds of silence after each line
SCENE_GAP = 0.6  # extra pause when the slide changes
INTRO = 3.0  # seconds of logo and titles before the first line
CUE_CHARS = 84  # two subtitle rows of about 42 characters


def cues(text, limit=CUE_CHARS):
    """Splits a line into subtitle-sized pieces, breaking at the end of a sentence when it can."""
    out, cur = [], ""
    for word in text.split():
        if cur and len(cur) + 1 + len(word) > limit:
            out.append(cur)
            cur = ""
        cur = f"{cur} {word}".strip()
        if len(cur) > limit / 2 and cur[-1] in ".?!":
            out.append(cur)
            cur = ""
    return out + [cur] if cur else out


assert cues("One two three. Four five six seven.", 20) == ["One two three.", "Four five six seven."]
assert cues("aaaa bbbb cccc dddd", 10) == ["aaaa bbbb", "cccc dddd"]


def speak(pipeline, text, voice, speed):
    """Voices one line. Returns the audio with the silence trimmed off both ends (Kokoro leaves about
    0.3 s before and 0.5 s after), and when each spoken word starts in it, in seconds."""
    audio, starts, offset = [], [], 0.0
    for result in pipeline(text, voice=voice, speed=speed):
        chunk = np.array(result.audio).reshape(-1)
        starts += [offset + t.start_ts for t in result.tokens if t.start_ts is not None and any(ch.isalnum() for ch in t.text)]
        audio.append(chunk)
        offset += len(chunk) / RATE
    audio = np.concatenate(audio)
    loud = np.flatnonzero(np.abs(audio) > 0.01)
    if not len(loud):  # nothing over the threshold, so keep it all
        loud = np.array([0, len(audio) - 1])
    begin = max(0.0, min([loud[0] / RATE, *starts[:1]]) - 0.05)
    end = min(len(audio) / RATE, loud[-1] / RATE + 0.12)
    return audio[int(begin * RATE) : int(end * RATE)], [round(s - begin, 3) for s in starts]


def word_times(shown, spoken):
    """When each of `shown` words starts, from when the `spoken` words start. They're the same words
    unless the line has a `say`; then each shown word takes the time at the same point in the line."""
    n, m = len(shown), len(spoken)
    if n == m or m == 0:
        return spoken if m else [0.0] * n
    out = []
    for j in range(n):
        s = j * (m - 1) / max(1, n - 1)
        i = int(s)
        out.append(spoken[i] if i + 1 >= m else round(spoken[i] + (s - i) * (spoken[i + 1] - spoken[i]), 3))
    return out


assert word_times(["a", "b"], [0.1, 0.5]) == [0.1, 0.5]
assert word_times(["MP4"], [0.0, 0.2, 0.4]) == [0.0]
assert word_times(["a", "b", "c"], [0.0, 1.0]) == [0.0, 0.5, 1.0]


def unmark(text):
    """Takes the stars off a *marked phrase*, the way Episode.tsx's tokens finds one. A star with a space
    after it (2 * 3) stays, so the words on screen and in the subtitles line up."""
    return re.sub(r"\*(?=\S)([^*]+)(?<=\S)\*", r"\1", text)


assert unmark("A *switch off*, 2 * 3 * 4") == "A switch off, 2 * 3 * 4"

course, episode = sys.argv[1:3]
root = Path("courses") / course
meta = json.loads((root / "course.json").read_text())
script = json.loads((root / "episodes" / f"{episode}.json").read_text())
out = root / "audio" / episode
out.mkdir(parents=True, exist_ok=True)

speed = meta.get("speed", 1)  # above 1 talks faster and shortens the pauses, for trailers
lang = meta.get("lang", "a")
pipeline = None
for scene in script["scenes"]:
    for line in scene["lines"]:
        voice = meta["hosts"][line["host"]]["voice"]
        spoken = line.get("say", line["text"]).replace("*", "")  # *marks* are only for the screen
        path = out / (hashlib.sha1(f"{MODEL}|{lang}|{voice}|{speed}|{spoken}".encode()).hexdigest()[:12] + ".wav")
        starts = path.with_suffix(".json")
        if not (path.exists() and starts.exists()):
            # The pipeline under model.generate, which also says when each word starts (mlx-audio is pinned).
            pipeline = pipeline or load_model(MODEL)._get_pipeline(lang)
            audio, words = speak(pipeline, spoken, voice, speed)
            tmp = path.with_suffix(".part")  # a crash mid-write never leaves half a file in the cache
            with wave.open(str(tmp), "wb") as w:
                w.setnchannels(1)
                w.setsampwidth(2)
                w.setframerate(RATE)
                w.writeframes((np.clip(audio, -1, 1) * 32767).astype("<i2").tobytes())
            starts.write_text(json.dumps(words))
            tmp.rename(path)
            print(f"voiced {line['host']}: {line['text'][:60]}")
        with wave.open(str(path)) as w:
            line["seconds"] = w.getnframes() / w.getframerate()
        line["file"] = path.name
        line["words"] = word_times(unmark(line["text"]).split(), json.loads(starts.read_text()))

t = INTRO
srt = []
for scene in script["scenes"]:
    scene["start"] = t
    for line in scene["lines"]:
        line["start"] = t
        pieces = cues(unmark(line["text"]))
        first = 0
        for k, piece in enumerate(pieces):  # each piece shows from its first word until the next piece's
            nxt = first + len(piece.split())
            end = t + line["words"][nxt] if k + 1 < len(pieces) else t + line["seconds"]
            srt.append((t + line["words"][first], end, piece))
            first = nxt
        t += line["seconds"] + LINE_GAP / speed
    t += SCENE_GAP / speed
    scene["end"] = t

for scene in script["scenes"]:  # photos sit next to course.json; Remotion reads them from the audio folder
    visual = scene["slide"].get("visual", {})
    if visual.get("type") == "photo":
        name = "-".join(Path(visual["src"]).parts)  # the whole path, so team.jpg in two folders stays two files
        shutil.copy(root / visual["src"], out / name)
        visual["src"] = name
sounds.write(out)  # the logo notes, ticks and music, made again only when sounds.py changes
(out / "props.json").write_text(json.dumps({"course": meta, **script, "duration": t}, ensure_ascii=False, indent=1))
stamp = lambda s: f"{int(s // 3600):02}:{int(s % 3600 // 60):02}:{int(s % 60):02},{int(s % 1 * 1000):03}"
subtitles = root / "out" / f"{episode}.srt"
subtitles.parent.mkdir(exist_ok=True)
subtitles.write_text("".join(f"{i}\n{stamp(a)} --> {stamp(b)}\n{text}\n\n" for i, (a, b, text) in enumerate(srt, 1)))
print(f"{t / 60:.1f} min -> {out}, {subtitles}")
