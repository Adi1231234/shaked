# shaked-face

**Live: https://adi1231234.github.io/shaked-face/**

An interactive 3D head for a head & neck anatomy exam: a real face as the outer
skin layer, with anatomically correct layers underneath that you can peel away
and click to identify. Opens with everything on, which reads as her face; take
a system off to see under it, and tap any structure to name it.

Built entirely from free sources. No paid tool is used anywhere in the
pipeline, and nothing is uploaded: every step runs locally.

## Layers

`models/head.glb` ships each layer as one glTF node holding its named
structures, so the viewer can peel a layer and click a structure to identify
it. Current build: 1217 nodes, 847 distinct structures, 5.8 MB Draco-compressed.

- **skin** (52) - her face, reconstructed from photographs (see `capture/`), plus
  101 surface-region patches covering the scalp, ears and neck in her colour
- **eyes** (36) - globe, cornea to retina, plus tarsal plates and the lacrimal apparatus
- **myology** (183) - facial, masticatory, suprahyoid, cervical and upper back muscles
- **viscera** (27) - pharynx, larynx, tongue, salivary glands, thyroid, trachea
- **lymphoid** (51) - cervical node groups and the tonsils
- **osteology** (117) - cranium, mandible, teeth, hyoid, laryngeal cartilages, cervical spine.
  The 28 teeth carry her own enamel colour as vertex colours, measured off her
  photographs; see `capture/README.md`
- **neuro** (268) - brain, brainstem, cranial nerves, ear and other sense organs
- **angiology** (4) - everything Z-Anatomy has in the head, which is almost nothing
- **landmarks** (419) - clickable hotspots for named bony landmarks

### The skin is drawn in passes of its own, over a cleared depth buffer

Z-Anatomy's head is a generic adult's. Once it is scaled to her, several
structures sit a few millimetres proud of her much thinner soft tissue, so
plain depth testing put a stranger's teeth, eyeballs and orbicularis oris
straight through her face. `tools/breaches.py` measures it: 93 structures and
5520 sampled vertices break the surface, worst at the temples (Temporoparietalis,
40.0 mm), the ear and the neck.

Shrinking the anatomy to hide that would falsify the anatomy, which is the part
she is being examined on. So `app/scene.js` renders three times instead:

- **layer 0** the anatomy, and the teeth in their own right
- `clearDepth()`, **layer 2** the rest of the head in her measured skin colour
- `clearDepth()`, **layer 1** her face, and the teeth again

Each pass still self-occludes correctly because it depth-tests only against
itself, and back-face culling keeps the skin from covering the anatomy when you
rotate behind the head. Her face goes last so it always wins against the
generic surface underneath it, which is fuller than she is. The teeth appear in
both the first and the last pass, so whatever stands proud of her lips reads as
her smiling; the two extra passes are skipped entirely when the skin is off, or
those teeth would float in front of the skull.

Lights need `layers.enableAll()` or the later passes render black, and the
raycaster needs `layers.enableAll()` plus a preference for her face, so a tap
names what is actually on screen.

### Skin over the rest of the head

Her face mask is a face-shaped oval, so everything outside it - scalp, temples,
ears, neck - used to render as bare muscle whenever the skin was on. Z-Anatomy
has no integument mesh, but its "Regions of human body" collection is a set of
surface patches that between them tile the body, and those are the outermost
shell. 102 of them cover the head and neck; `tools/headskin.py` moves them into
the skin layer and tints them with the skin colour measured off her photographs
(195, 148, 133 RGB). They keep their own names - helix, tragus, mastoid region -
so they stay clickable and searchable.

They have to be claimed *before* `layers.classify()` runs: the auricle's surface
features are tagged as sense organs as well as regions, so the helix and the
tragus would otherwise go to the neuro layer and her ears would render as bare
cartilage.

### Names come from `extras`, not from node names

three.js strips dots and spaces when it loads a glTF, so `Cornea.l` arrives as
`Corneal` and `Sclera.l` as `Scleral`. Every node therefore carries glTF
`extras` with `structure`, `side` and `layer`, and the viewer reads those.

### Known gaps

Measured with `tools/match_syllabus.py` against her 342-term head and neck
syllabus: the build covers 156, which is everything Z-Anatomy has. The
shortfall is not the export, it is the atlas.

- **Vasculature** is the big one. The whole head has 4 vessel objects. The
  dural venous sinuses (26 syllabus terms) are absent from Z-Anatomy *and*
  from BodyParts3D upstream, and no free downloadable model exists. Plan is to
  model them along the bony grooves Z-Anatomy does have
  (`Groove for transverse sinus`, `Groove for occipital sinus`, `Carotid sulcus`).
- Arteries can come from "Arteries of head & neck" (CC-BY) on Sketchfab.
- Some cranial landmarks are genuinely missing: pterion, bregma, lambda,
  clivus, crista galli, zygomatic arch.

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

# her face and her teeth, then the GLB that carries both
python capture/bake_texture.py photos/raw --triage capture/triage-cam/triage.json --count 8
blender vendor/Z-Anatomy/Startup.blend -b -P tools/dump_teeth.py -- models/teeth.npz
python capture/teeth_colour.py photos/raw --triage capture/triage-cam/triage.json --count 10
blender vendor/Z-Anatomy/Startup.blend -b -P tools/export_head.py
```
