#!/usr/bin/env bash
# Download the upstream atlases into vendor/. They are gitignored because they
# are large and freely re-downloadable.
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p vendor

if [ ! -f vendor/Z-Anatomy/Startup.blend ]; then
  echo "fetching Z-Anatomy (CC-BY-SA 4.0) ..."
  curl -fsSL -o vendor/Z-Anatomy.zip \
    https://github.com/Z-Anatomy/Models-of-human-anatomy/raw/master/Z-Anatomy.zip
  python -c "import zipfile; zipfile.ZipFile('vendor/Z-Anatomy.zip').extractall('vendor/')"
fi
echo "Z-Anatomy ready: $(du -h vendor/Z-Anatomy/Startup.blend | cut -f1)"
