"""Skin over the rest of the head, so only her face is a photograph.

Her face mask covers a face-shaped oval and nothing else, which left the scalp,
the temples, the ears and the neck showing muscle whenever the skin layer was
on. Z-Anatomy has no integument mesh, but its "Regions of human body"
collection is a set of surface patches that between them tile the body, and
those are exactly the outermost shell. Tinted to the skin colour measured off
her photographs they close the head.

The patches stay individually named and clickable, because they are real
anatomical regions - frontal, parietal, mastoid, auricular - and she is
examined on them.
"""
import json
from pathlib import Path

import layers as L
import region as R
import zalib

COLLECTION = "9: Regions of human body"
SKIN_COLOUR = "models/skin-colour.json"
FALLBACK = (0.80, 0.63, 0.55, 1.0)          # only if nothing was measured

# The face itself is hers, and the eyeball is not skin. Anything here is left
# to her photograph or to the anatomy underneath.
NOT_SKIN = ("hair", "eyelash", "eyebrow", "iris", "pupil", "cornea",
            "conjunctiva", "nail", "tooth", "teeth", "gingiva", "tongue")


def colour():
    """Her measured skin albedo, from capture/bake_texture.py."""
    path = Path(SKIN_COLOUR)
    if not path.exists():
        print("  headskin   : no measured skin colour, using a default")
        return FALLBACK
    rgb = json.loads(path.read_text(encoding="utf-8"))["linear_rgb"]
    return (*rgb, 1.0)


def patches():
    """Head and neck surface patches, by the same gate the anatomy uses."""
    keep = []
    for obj in zalib.collection_objects(COLLECTION, zalib.is_solid):
        low = obj.name.lower()
        if any(word in low for word in NOT_SKIN):
            continue
        collections = {c.name for c in obj.users_collection}
        if R.excluded(collections, L.structure_name(obj.name)):
            continue
        if not R.within_depth(obj, collections):
            continue
        keep.append(obj)
    return keep


BRANCH = ("Integument", "Skin of the head and neck")


def build(hierarchy, parents):
    """Move the patches into the skin layer and give them her colour.

    They sit under Integument beside her face so that one tap on the skin chip
    takes the whole covering off, and they keep Z-Anatomy's own region grouping
    below that - auricular, frontal, mastoid - because those are real named
    regions and she is examined on them.
    """
    found = patches()
    if not found:
        print("  headskin   : no region patches found")
        return []
    target = zalib.ensure_collection("skin")
    mat = zalib.flat_material("mat_headskin", colour())
    out = []
    for obj in found:
        structure = L.structure_name(obj.name)
        path = [*BRANCH, group_of(obj), structure]
        zalib.move_to(obj, target)
        zalib.apply_material(obj, mat)
        zalib.tag(obj, structure=structure, side=L.side_of(obj.name),
                  layer="skin", kind="region", path="/".join(path))
        out.append(obj)
    print(f"  {'headskin':11s}: {len(out):4d} surface patches in her skin colour")
    return out


def group_of(obj):
    """The region this patch belongs to, from the collection holding it."""
    for coll in obj.users_collection:
        if coll.name != COLLECTION:
            return coll.name
    return "Regions"
