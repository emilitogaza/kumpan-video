"""The video's sounds, made from scratch with numpy, so nothing has to be downloaded or licensed.

write(folder) puts them in an episode's audio folder next to the voice lines:
  logo.wav   three soft marimba notes, one for each piece of the logo as it lands
  pops.wav   four little rising pops, one for each shape as it flies out
  tick.wav   a short, muffled tick for when a bullet, tile or step comes in
  key.wav    one quiet key click, played over and over while a prompt or command types out
  tock.wav   a low, soft knock for the wipe between scenes
  music.wav  a calm 16 second loop of pads and plucks to sit under the voices
Every file peaks at full scale. src/sound.tsx decides how loud each one plays.
"""

import wave
from pathlib import Path

import numpy as np

RATE = 44100
rng = np.random.default_rng(7)  # fixed, so the sounds come out the same every time


def save(path, x):
    x = x / np.max(np.abs(x))
    with wave.open(str(path), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(RATE)
        w.writeframes((x * 32000).astype("<i2").tobytes())


def clock(seconds):
    return np.arange(int(seconds * RATE)) / RATE


def hz(midi):
    return 440 * 2 ** ((midi - 69) / 12)


def lowpass(x, cutoff):
    """A gentle one-pole low-pass, to take the edge off noise. Fine for short sounds, slow for long ones."""
    a = 1 - np.exp(-2 * np.pi * cutoff / RATE)
    y = np.zeros_like(x)
    for n in range(1, len(x)):
        y[n] = y[n - 1] + a * (x[n] - y[n - 1])
    return y


def struck(freq, seconds, decay, partials=((1, 1),)):
    """A struck note: sine partials (ratio, level) that fade out, the higher ones faster."""
    t = clock(seconds)
    x = sum(level * np.sin(2 * np.pi * freq * ratio * t) * np.exp(-t * ratio**0.7 / decay) for ratio, level in partials)
    return x * np.minimum(1, t / 0.003)  # 3 ms fade-in, so it doesn't click


def mix(*parts):
    """Adds sounds of different lengths, all starting together."""
    out = np.zeros(max(len(p) for p in parts))
    for p in parts:
        out[: len(p)] += p
    return out


def place(buffer, at, x, wrap=False):
    """Adds x into buffer from second `at`. With `wrap`, whatever runs off the end comes back in at the start."""
    i = int(at * RATE)
    if wrap:
        idx = (i + np.arange(len(x))) % len(buffer)
        np.add.at(buffer, idx, x)
    else:
        buffer[i : i + len(x)] += x[: len(buffer) - i]


MARIMBA = ((1, 1), (3.9, 0.3), (9.2, 0.06))


def logo():
    out = np.zeros(int(1.6 * RATE))
    for k, midi in enumerate((69, 74, 78)):  # A, D, F sharp: a bright D major, rising
        place(out, k * 0.12, struck(hz(midi), 1.3, 0.45, MARIMBA))
    return out


def pops():
    out = np.zeros(int(0.5 * RATE))
    t = clock(0.12)
    for k in range(4):
        f0 = 300 * 1.12**k
        freq = f0 + f0 * 1.2 * (1 - np.exp(-t / 0.018))  # the pitch jumps up quickly, like a bubble
        phase = 2 * np.pi * np.cumsum(freq) / RATE
        place(out, k * 0.06, np.sin(phase) * np.exp(-t / 0.035) * np.minimum(1, t / 0.002))
    return out


def tick():
    noise = lowpass(rng.standard_normal(int(0.04 * RATE)), 2500) * np.exp(-clock(0.04) / 0.004)
    return mix(0.5 * struck(1400, 0.06, 0.012), struck(320, 0.08, 0.02), 2 * noise)


def key():
    noise = lowpass(rng.standard_normal(int(0.03 * RATE)), 4000) * np.exp(-clock(0.03) / 0.003)
    return mix(3 * noise, 0.4 * struck(180, 0.03, 0.01))


def tock():
    noise = lowpass(rng.standard_normal(int(0.2 * RATE)), 600) * np.exp(-clock(0.2) / 0.01)
    return mix(struck(150, 0.2, 0.09, ((1, 1), (2, 0.3))), 4 * noise)


# Four chords of four seconds each (120 bpm), voiced close together so the pad barely moves:
# (pad notes, bass note, notes the plucks pick from).
CHORDS = [
    ((50, 54, 57, 61), 38, (69, 73, 74, 78)),  # D major 7
    ((50, 54, 57, 59), 35, (66, 69, 71, 74)),  # B minor 7
    ((50, 54, 55, 59), 43, (67, 71, 74, 78)),  # G major 7
    ((49, 52, 57, 59), 45, (64, 69, 71, 73)),  # A with an added 9th
]
PATTERN = (0, 2, 1, 3, 2, 1, 3, 2)


def swell(seconds, attack, release):
    """Rises over `attack`, holds, then falls over `release` after `seconds`."""
    t = clock(seconds + release)
    up = np.sin(np.minimum(1, t / attack) * np.pi / 2) ** 2
    down = np.cos(np.clip((t - seconds) / release, 0, 1) * np.pi / 2) ** 2
    return up * down


def music():
    bar = 4.0
    out = np.zeros(int(bar * len(CHORDS) * RATE))
    for c, (pad, bass, plucks) in enumerate(CHORDS):
        start = c * bar
        env = swell(bar, 1.0, 1.5)
        t = clock(bar + 1.5)
        for midi in pad:  # two sines a hair apart beat slowly against each other, which keeps the pad alive
            f = hz(midi)
            place(out, start, 0.3 * env * (np.sin(2 * np.pi * f * t) + np.sin(2 * np.pi * f * 1.003 * t) + 0.2 * np.sin(4 * np.pi * f * t)), wrap=True)
        place(out, start, 0.5 * swell(bar, 0.3, 0.8) * np.sin(2 * np.pi * hz(bass) * clock(bar + 0.8)), wrap=True)
        for k, i in enumerate(PATTERN):
            level = 0.18 * (0.7 + 0.3 * rng.random())
            place(out, start + k * 0.5, level * struck(hz(plucks[i]), 0.9, 0.3, ((1, 1), (2, 0.25), (3, 0.08))), wrap=True)
    return out


def write(folder):
    """Makes the sounds, unless they're all there already and newer than this file. All of them or none,
    since they share the random numbers."""
    made = [folder / f"{name}.wav" for name in ("logo", "pops", "tick", "key", "tock", "music")]
    if all(p.exists() and p.stat().st_mtime > Path(__file__).stat().st_mtime for p in made):
        return
    for path, make in zip(made, (logo, pops, tick, key, tock, music)):
        save(path, make())


if __name__ == "__main__":
    # Writes the sounds to a folder of your choice, to listen to them on their own.
    import sys

    write(Path(sys.argv[1]))
