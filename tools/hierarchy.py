"""Recovering Z-Anatomy's anatomical hierarchy for the viewer's structure tree.

Z-Anatomy keeps a properly nested tree under its "Bonus collection", e.g.

    Muscular system > Cranial part > Muscles of head > Superficial > Facial muscles
    Nervous system > Central nervous system > Brain > Cerebrum > Telencephalon
    Skeletal system > Cranium > Bones of cranium > Frontal bone

An object usually sits on several of those paths at once, including a
cross-cutting one by innervation ("Cranial nerves > Facial nerve (VII)") and a
regional one ("Regions of human body > Main divisions > Head"). The deepest
path under the object's own system is the one that reads like a textbook
contents page, so that is what the tree uses.
"""
import bpy

ROOT = "Bonus collection"
REGIONS = "Regions of human body"

# A segment that must appear in the chosen path, so a muscle is filed under
# the muscular tree rather than under whichever cranial nerve supplies it.
# Z-Anatomy cross-files objects by innervation as well as by system.
LAYER_MARKER = {
    "osteology": "Skeletal system",
    "myology": "Muscular system",
    "neuro": "Nervous system",
    "viscera": "Visceral systems",
    "lymphoid": "Lymphoid system",
    "angiology": "Cardiovascular system",
    "eyes": "Sense organs",
}


def parent_map():
    """child collection name -> parent collection name."""
    parents, stack = {}, [bpy.context.scene.collection]
    while stack:
        coll = stack.pop()
        for child in coll.children:
            parents[child.name] = coll.name
            stack.append(child)
    return parents


def _chain(name, parents):
    """Root-to-leaf collection names, guarding against cycles."""
    chain, seen = [], set()
    while name and name not in seen:
        seen.add(name)
        chain.append(name)
        name = parents.get(name)
    return list(reversed(chain))


def candidates(obj, parents):
    """Every path this object sits on, rooted at the Bonus collection."""
    out = []
    for coll in obj.users_collection:
        chain = _chain(coll.name, parents)
        if ROOT not in chain:
            continue
        trimmed = chain[chain.index(ROOT) + 1:]
        if trimmed and trimmed[0] != REGIONS:
            out.append(trimmed)
    return out


# Where to file objects Z-Anatomy keeps entirely unfiled. These mirror the
# real paths the atlas uses, so nothing forms a parallel top-level branch:
# the eye really does live under Nervous system > Sense organs.
SENSE = ["Nervous system", "Sense organs"]
FALLBACK_ROOT = {
    "osteology": ["Skeletal system"],
    "myology": ["Muscular system"],
    "neuro": ["Nervous system"],
    "viscera": ["Visceral systems"],
    "lymphoid": ["Lymphoid system"],
    "angiology": ["Cardiovascular system"],
    "eyes": SENSE + ["Eye"],
}

EXTERNAL_EAR = ("helix", "tragus", "auricle", "concha")
EYELID = ("tarsus",)

# Z-Anatomy also files objects by innervation. That is a useful cross-reference
# but a bad home: without this the tarsal plates end up under the oculomotor
# nerve rather than in the eyelid.
CROSS_REF = ("Cranial nerves", "Peripheral nervous system")


def _named_path(base, parents):
    """Z-Anatomy gives most structures a collection of their own, holding that
    structure's landmarks. Its position in the tree is the structure's own."""
    named = bpy.data.collections.get(base)
    if not named:
        return None
    chain = _chain(named.name, parents)
    if ROOT not in chain:
        return None
    trimmed = chain[chain.index(ROOT) + 1:]
    return trimmed if trimmed and trimmed[0] != REGIONS else None


def path_for(obj, parents, layer, structure=None):
    """The tree path for one object, as a list of names.

    Preference order: the deepest path that sits inside the object's own
    system; then the path of the collection named after this structure; then
    the deepest path of any kind; then a fallback root.
    """
    base = structure or obj.name
    paths = candidates(obj, parents)
    marker = LAYER_MARKER.get(layer)
    own = [p for p in paths if marker in p]
    if own:
        return clean(max(own, key=len))

    named = _named_path(base, parents)
    if named:
        return clean(named)

    low = base.lower()
    if any(k in low for k in EXTERNAL_EAR):
        return SENSE + ["Ear", "External ear"]
    if any(k in low for k in EYELID):
        return SENSE + ["Eye", "Accessory visual structures", "Eyelid"]

    if layer != "neuro":
        paths = [p for p in paths if not any(x in p for x in CROSS_REF)]
    if paths:
        return clean(max(paths, key=len))
    return FALLBACK_ROOT.get(layer, [layer]) + ["Other"]


def clean(path):
    """Drop Z-Anatomy's trailing asterisk, which marks a non-official term.

    It is meaningful on a structure's own name but only noise in a navigation
    path, where it turns "Sense organs > Eye" into "Sense organs > Eye*".
    """
    return [segment.rstrip("*' ") or segment for segment in path]
