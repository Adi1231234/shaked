# capture

Turning her photographs into the face that sits on top of the anatomy. Every
step runs locally and uses only free tools.

```
triage.py        which photos are of her, and how usable each one is
fit_face.py      the 468-vertex geometry, from the calmest photos
bake_texture.py  her colour, warped out of the photos into the UV atlas
render_fit.py    preview renders
likeness.py      reprojection error on held-out photos
probe_texel.py   what painted one texel of the atlas, and how badly stretched
```

The whole budget is one 359 px face. About 15% of its detail survives the warp
into the atlas, and 468 vertices cannot carry cheekbone or jaw definition, so
the texture is doing most of the work of looking like her.

## Her teeth

`teeth_colour.py` measures her own enamel and `tools/teethpaint.py` puts it on
the atlas dentition as vertex colours. The shape stays Z-Anatomy's: it is what
she is examined on, and no free method reconstructs a dentition from smiling
snapshots. The colour is hers, and colour is most of what makes a mouth read as
a particular person's.

The camera is solved per photo with `solvePnP` against the rigid part of her
face only - eye corners, nose bridge, sides of the head. Solving it from a
smiling mouth would put the teeth wherever the smile went. Only the upper arch
is sampled, because the mandible drops when she smiles and the lower teeth are
then not rigid with the skull the pose came from.

Three things had to be right:

- **Gate on the pixel, not the geometry.** Reprojection lands within 3 to 7 px
  and her whole visible tooth row is about sixty across, so accepting anything
  inside the lip contour sampled her lip: the median came back (166, 129, 120)
  RGB. Requiring the pixel to look like enamel - bright and unsaturated, unlike
  a lip or the dark behind the teeth - makes the misalignment harmless, because
  a vertex that misses simply finds nothing to take. 98 samples survive, which
  is few but they are all really enamel.
- **White balance off the sclera.** The illuminant across her photos runs from
  (71, 70, 70) to (150, 128, 110) BGR. Without correcting it her teeth measure
  distinctly yellow, which is the afternoon, not her.
- **De-shade before storing.** Everything sampled was photographed inside a
  mouth and the viewer lights the model again, so keeping the photographed
  level would apply that shadow twice.

The result is edge (230, 221, 210) and neck (225, 215, 193) RGB, which is the
real shape of a tooth's colour: greyer where the enamel is thin at the biting
edge, warmer where dentine shows through at the neck. Roots are tinted towards
dentine from there, because you can hide the maxilla and look straight at them.

## Findings worth keeping

These were each paid for with a measurement. The code carries the detail; this
is the short version.

- **Photos are gated per region, not as a whole.** Her eye opening across the
  usable photos ran from 0.043 to 0.416 and her mouth from shut to wide.
  Averaging that gives a half-closed eye and a mouth that is neither open nor
  shut, which is what the squint and the wrong mouth were. Gating whole photos
  instead dropped UV coverage to 57%. So the eyes take colour only from photos
  where she is open-eyed and looking ahead, the mouth only from the five where
  it is properly shut, and the cheeks and forehead from all of them.

- **Each eye is gated on its own, and only a few photos paint them.** Nothing
  in the correspondence set pins an iris - the warp only knows the eyelid
  contour - so every extra photo can only smear the iris further across its own
  eye opening. Testing the *average* of the two eyes let a photo through where
  she is looking hard to one side: one reads 0.627 left and 0.351 right, an
  average of 0.489, comfortably inside a tolerance of 0.09 around 0.450. Three
  of the eight photos feeding the eye region were like that, each iris ended up
  somewhere different, and she came out cross-eyed. Now each eye must sit
  within 0.05 of its own median and the two must agree to within 0.08, and the
  four sharpest survivors paint the region.

- **Regions are levelled against the skin they border.** Different photo sets
  for the eyes, the mouth and the rest leave a step at each region's edge even
  after every face has been matched into one LAB reference: the eyes needed
  +11.6, +11.9, +14.5 BGR. Measured from skin either side of the boundary and
  applied flat, which is what makes the step vanish rather than move.

- **The mouth region has to be grown by a ring.** The lip contour is not where
  the mouth stops moving; the corners and the philtrum stretch when she smiles.
  Left on the general skin budget they took their colour from photos with her
  mouth open, which painted a stranger's teeth into her lip line. Growing the
  mask looked useless at first because the dilation grew its own set while
  sweeping the face list, so one "ring" flood-filled 83% of the mesh.

- **Coverage must be the alpha that was actually written.** `warp_triangle`
  used to discard its antialiased mask and the caller stamped a separate,
  opaque polygon as confidence. A sliver that wrote a tenth of a pixel over an
  empty atlas was therefore recorded as certain, and a rejected triangle was
  recorded as certain with no colour at all - a black spike at the corner of
  her mouth.

- **Robust averaging did not help and is not worth retrying.** Per-texel
  outlier rejection mottled both cheeks. Per-photo, per-region rejection cannot
  separate an occlusion from ordinary variation: her hand over her mouth scored
  52.8 against 44.1 typical for that region. Occluded photos are a curated list
  in `bake_texture.py` instead, found by eye in a contact sheet.

- **The sharpness figure the bake prints is a detail *and* noise meter.**
  Mottling the atlas raised it from 660 to 793. Look at the atlas.

- **Expression regression destroyed likeness.** It extrapolates outside the
  observed load range (0.49 to 6.0): +11.2% against +24.7% for a plain mean. A
  trimmed mean over the calmest 35%, mirrored, scored +22.3% with 40 of 40
  held-out wins.
