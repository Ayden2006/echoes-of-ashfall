#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
project_root="$(cd "${script_dir}/.." && pwd)"
cd "${project_root}"

vite="${project_root}/node_modules/.bin/vite"
if [[ ! -x "${vite}" ]]; then
  echo "vite is unavailable. Run npm ci before building GitHub Pages." >&2
  exit 69
fi

"${vite}" build --config vite.pages.config.ts
cp "${project_root}/dist-pages/index.html" "${project_root}/dist-pages/404.html"
touch "${project_root}/dist-pages/.nojekyll"
