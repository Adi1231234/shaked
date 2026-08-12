"""Which Z-Anatomy objects go into which peelable layer.

Everything inside the head/neck region is taken and then classified by the
top-level Z-Anatomy system it belongs to. The earlier approach of listing a
few source collections silently dropped whole syllabus groups: the laryngeal
cartilages sit under "Axial skeleton", not under "Cranium", so the larynx was
almost entirely missing from the build.

Layers are claimed in LAYER_ORDER and a structure joins only the first layer
that wants it, because Z-Anatomy files many objects under several collections
at once.
"""
import bpy

import region
import zalib

SYSTEM_LAYER = {
    "1: Skeletal system": "osteology",
    "3: Joints": "osteology",
    "4: Muscular system": "myology",
    "5: Cardiovascular system": "angiology",
    "6: Lymphoid organs": "lymphoid",
    "7: Nervous system & Sense organs": "neuro",
    "8: Visceral systems": "viscera",
}

# Deliberately not classified:
#   "2: Muscular insertions" - hundreds of tiny origin/insertion patches
#   "9: Regions of human body" - flat surface patches, except the auricle below
#   reference lines, planes and movement arrows - teaching aids, not anatomy

# The external ear is filed under Regions but is real exam anatomy, so it is
# pulled in by name and grouped with the rest of the ear in the neuro layer.
AURICLE = {
    "Helix", "Antihelix", "Crura of antihelix", "Tragus", "Antitragus",
    "Concha of auricle", "Lobule of auricle", "Apex of auricle",
    "Anterior notch of auricle",
}

# The globe and its adnexa. Enumerated spatially (every object centred within
# 16 mm of the sclera) rather than guessed, then trimmed to real structures.
# Z-Anatomy has no choroid, ciliary body, conjunctiva or macula.
EYE_STRUCTURES = {
    "Sclera", "Cornea", "Iris", "Lens", "Retina",
    "Vitreous body", "Anterior chamber of eyeball",
    "Anterior segment of eyeball", "Posterior segment of eyeball",
    "Zonular fibres", "Suspensory ligament of eyeball",
    "Superior tarsus", "Inferior tarsus",
    "Lacrimal gland", "Lacrimal canaliculus", "Ampulla of lacrimal canaliculus",
    "Lacrimal sac", "Nasolacrimal duct",
}

LAYER_COLOURS = {
    "eyes":      (0.86, 0.88, 0.92, 1.0),
    "myology":   (0.72, 0.22, 0.22, 1.0),
    "osteology": (0.93, 0.90, 0.82, 1.0),
    "viscera":   (0.82, 0.62, 0.48, 1.0),
    "lymphoid":  (0.55, 0.72, 0.58, 1.0),
    "neuro":     (0.88, 0.85, 0.78, 1.0),
    "angiology": (0.75, 0.16, 0.20, 1.0),
    "landmarks": (1.00, 0.78, 0.25, 1.0),
}

# Eyes claim first so the tarsal plates land with the eye rather than with the
# muscles; the rest is outermost-first.
LAYER_ORDER = ["eyes", "myology", "viscera", "lymphoid", "osteology",
               "neuro", "angiology"]

LANDMARK_LAYER = "osteology"   # whose surfaces the .j hotspots snap onto

SIDES = {".l": "left", ".r": "right"}


def base_name(name):
    """Strip Z-Anatomy's left/right suffix so name sets can stay unsided."""
    for suffix in SIDES:
        if name.endswith(suffix):
            return name[: -len(suffix)]
    return name


def side_of(name):
    """"left", "right", or "" for midline structures."""
    for suffix, side in SIDES.items():
        if name.endswith(suffix):
            return side
    return ""


def structure_name(name):
    """Z-Anatomy name with the label and side suffixes removed."""
    if name.endswith(".j"):
        name = name[:-2]
    return base_name(name)


def layer_of(obj):
    """The layer an object belongs to, or None to leave it out."""
    base = structure_name(obj.name)
    if base in EYE_STRUCTURES:
        return "eyes"
    if base in AURICLE:
        return "neuro"
    collections = {c.name for c in obj.users_collection}
    if region.excluded(collections, base):
        return None
    if not region.within_depth(obj, collections):
        return None
    for system, layer in SYSTEM_LAYER.items():
        if system in collections:
            return layer
    return None


def classify():
    """Split the whole head/neck region into {layer: [objects]} plus labels."""
    solids = {name: [] for name in LAYER_ORDER}
    landmarks = []
    for obj in bpy.data.objects:
        if obj.type != 'MESH' or not len(obj.data.vertices):
            continue
        if not region.wanted(obj):
            continue
        if not zalib.in_region(obj, zalib.NECK_CUT):
            continue
        layer = layer_of(obj)
        if layer is None:
            continue
        if zalib.is_landmark(obj):
            landmarks.append(obj)
        else:
            solids[layer].append(obj)
    return solids, landmarks
