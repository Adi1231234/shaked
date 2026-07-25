# shaked-face

An interactive 3D head for Shaked's head & neck anatomy exam: her own face as the
outer skin layer, with anatomically correct layers underneath that you can peel
away and click to identify.

Same idea as `shaked-legs`, but the outer surface is a real reconstruction of her
face instead of an atlas model.

## Layers

1. **Skin** - her face, reconstructed from photos (see `capture/`)
2. **Myology** - facial and masticatory muscles
3. **Osteology** - cranium, mandible, teeth, and named bony landmarks
4. **Neuro** - brain and cranial nerves
5. **Angiology** - arteries and veins of the head and neck

## Sources

Everything here is free. No paid tool is used anywhere in the pipeline.

- Anatomy layers 2-4: [Z-Anatomy](https://github.com/Z-Anatomy/Models-of-human-anatomy), CC-BY-SA 4.0
- Upstream of Z-Anatomy: BodyParts3D, The Database Center for Life Science, CC-BY-SA 2.1 Japan
- Cranial nerves: University of Dundee, CAHID (bundled in Z-Anatomy), CC-BY 4.0
- Mesh processing: [Blender](https://www.blender.org/) 4.5 LTS, GPL

Required attribution when publishing:

> "BodyParts3D - The Database Center for Life Science - CC-BY-SA 2.1 Japan"
> "Z-Anatomy - The libre 3D atlas of anatomy - CC-BY-SA 4.0"
> "Cranial Nerves and Foramina - by University of Dundee, CAHID - CC-BY 4.0"

Because Z-Anatomy is **share-alike**, anything published from this repo has to
carry CC-BY-SA 4.0 too.

## Why not the obvious tools

- **KeenTools FaceBuilder** - no longer free. 15-day trial, then a subscription.
  The Blender add-on is open source but the Core Library that does the actual
  work is proprietary.
- **FLAME** (DECA / MICA / EMOCA / Pixel3DMM) - free to download but the academic
  licence forbids making derived meshes "available in any form to any third
  party". That rules it out for anything published on the web.
- **RealityScan** - genuinely free under $1M revenue, but meshing and texturing
  need an NVIDIA CUDA GPU. This machine has an Intel Arc iGPU, so it can align
  images but cannot produce a model locally.

## Layout

```
tools/     Blender + Python scripts for building the anatomy GLB
capture/   turning her photos into a face mesh
data/      the syllabus, the atlas inventory, and the match report between them
models/    built GLB output
```

## Build

```bash
tools/fetch_sources.sh                                   # download Z-Anatomy
blender vendor/Z-Anatomy/Startup.blend -b -P tools/dump_inventory.py -- data/za-headneck-inventory.json
python tools/match_syllabus.py data/syllabus-headneck.json data/za-headneck-inventory.json data/match-report.json
```
