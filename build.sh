#!/usr/bin/env bash
# Usage: ./build.sh <course> <episode> [remotion flags]
# Voices the episode, then renders courses/<course>/out/<episode>.mp4 with a subtitle track, and an .mp3
# of the voices alone, without music or effects, so it works as a podcast. A script with
# "vertical": true also gets <episode>.vertical.mp4, 1080 by 1920, for phones.
set -euo pipefail
cd "$(dirname "$0")"
course=$1 episode=$2
shift 2
out=courses/$course/out

uv run tts.py "$course" "$episode"
args=(src/index.ts --public-dir="courses/$course/audio/$episode" "$@")
npx remotion render "${args[@]}" --props='{"src":"props.json"}' Episode "$out/$episode.mp4"
# The filter that brings a file up to the usual loudness for online video (-16 LUFS); Kokoro's voices
# come out about 10 dB under that. It's one steady gain, so the intro and end card stay quieter than the
# voices, with a limiter after it for the odd peak. (ffmpeg's loudnorm on its own lifts the quiet parts.)
loudness() {
  local i
  i=$(ffmpeg -hide_banner -i "$1" -af loudnorm=print_format=json -f null - 2>&1 | grep '"input_i"' | tr -dc '0-9.-')
  echo "volume=$(echo "-16 - $i" | bc)dB,alimiter=limit=0.84:level=0"
}
# Adds the subtitles to a video as a track you can switch on in the player, and sets the loudness. This
# needs Homebrew's ffmpeg, the one that comes with Remotion can't do it.
finish() {
  ffmpeg -loglevel error -y -i "$1" -i "$out/$episode.srt" -map 0 -map 1 -c:v copy -c:s mov_text \
    -af "$(loudness "$1")" -ar 48000 -c:a aac -b:a 192k -metadata:s:s:0 language=eng "$1.tmp.mp4"
  mv "$1.tmp.mp4" "$1"
}
finish "$out/$episode.mp4"
if grep -q '"vertical": *true' "courses/$course/episodes/$episode.json"; then
  npx remotion render "${args[@]}" --props='{"src":"props.json","vertical":true}' Episode "$out/$episode.vertical.mp4"
  finish "$out/$episode.vertical.mp4"
fi
npx remotion render "${args[@]}" --props='{"src":"props.json","sound":false}' Episode "$out/$episode.voice.mp3" --codec=mp3
ffmpeg -loglevel error -y -i "$out/$episode.voice.mp3" -af "$(loudness "$out/$episode.voice.mp3")" -ar 48000 -b:a 192k "$out/$episode.mp3"
rm "$out/$episode.voice.mp3"
