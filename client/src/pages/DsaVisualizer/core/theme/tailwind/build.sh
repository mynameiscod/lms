#!/usr/bin/env bash
# Regenerates ../visualizer-scoped.css. Run after adding Tailwind classes or editing ../base.css:
#   bash client/src/pages/DsaVisualizer/core/theme/tailwind/build.sh
# Build tools install into ./node_modules here (git-ignored); the LMS app itself needs no Tailwind.
set -e
cd "$(dirname "$0")"
[ -d node_modules/@tailwindcss/cli ] || npm install --no-save --no-package-lock --no-audit --no-fund \
  tailwindcss@4.3.3 @tailwindcss/cli@4.3.3 postcss@8 lightningcss@1
npx tailwindcss -i input.css -o tw-raw.css
node postprocess.mjs tw-raw.css ../visualizer-scoped.css
rm -f tw-raw.css
