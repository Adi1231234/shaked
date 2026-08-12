#!/usr/bin/env bash
# Deletes the eight repos whose full history now lives in Adi1231234/shaked.
# shul-subtitles is deliberately kept - it hosts the installer Releases.
set -euo pipefail
for r in shaked-face shaked-limbs-anatomy shaked-completeanatomy-test \
         blood-vessels-diagram suhsh shaked-ent-roadmap \
         shaked-cv-react spotify-song-site; do
  echo "deleting Adi1231234/$r"
  gh repo delete "Adi1231234/$r" --yes
done
echo "done - shul-subtitles kept for its Releases."
