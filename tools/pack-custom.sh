#!/usr/bin/env bash
set -euo pipefail
root=$(cd "$(dirname "$0")/.." && pwd)
stage=$(mktemp -d /tmp/ai-usagebar-pack.XXXXXX)
trap 'rm -rf "$stage"' EXIT
cp "$root"/{metadata.json,extension.js,prefs.js,stylesheet.css,LICENSE,README.md} "$stage/"
cp -r "$root"/{lib,ui,icons,locale,schemas} "$stage/"
gnome-extensions pack "$stage" --extra-source=lib --extra-source=ui --extra-source=icons --extra-source=locale --extra-source=LICENSE --extra-source=README.md --out-dir="$root" --force
