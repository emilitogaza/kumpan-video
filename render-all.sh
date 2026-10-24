#!/usr/bin/env bash
# Usage: ./render-all.sh <course> [remotion flags]
# Builds every episode of the course that has no .mp4 yet, one at a time. Delete an .mp4 to build it again.
# Extra flags go to `remotion render`. For 2560 by 1440, pass --scale=1.3333333333333333 with all 16
# digits, or the height comes out as 1439.99.
set -euo pipefail
cd "$(dirname "$0")"
course=$1
shift
todo=()
for script in courses/"$course"/episodes/*.json; do
  episode=$(basename "$script" .json)
  [ -f "courses/$course/out/$episode.mp4" ] || todo+=("$episode")
done
echo "${#todo[@]} to render: ${todo[*]:-none}"
for i in "${!todo[@]}"; do
  echo "=== [$((i + 1))/${#todo[@]}] ${todo[$i]} ($(date +%H:%M))"
  ./build.sh "$course" "${todo[$i]}" "$@"
done
echo "All done ($(date +%H:%M))"
