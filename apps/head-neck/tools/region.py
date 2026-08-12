"""Deciding whether a Z-Anatomy object belongs to the head and neck.

A geometric box is not enough on its own. The clavicle's centre sits at
x 0.083, z 1.407 and the first ribs are narrower still, so a purely spatial
filter pulls in the whole ribcage and shoulder girdle. Long structures are the
mirror problem: the sympathetic trunk is centred in the neck but runs the
length of the thorax.

So three tests combine: the spatial box in zalib, the region collections
Z-Anatomy already tags, and how far down the object actually reaches.
"""
import zalib

# Region collections that mean "this belongs to the trunk or the arm".
NOT_HEAD_NECK = {
    "Thorax", "Thoracic skeleton", "Sternum", "Costal cartilages",
    "Bones of pectoral girdle", "Appendicular skeleton",
    "Bones of upper limb", "Left upper limb", "Right upper limb",
}

# Z-Anatomy tags the trachea as thoracic only, but the cervical trachea is a
# neck structure and it is on the syllabus, so it overrides the exclusion.
CERVICAL_ANYWAY = {"Trachea"}

REGION_TAGS = {"Head", "Neck"}

# Absolute Blender z, where the head origin is 1.6009 and the chin is ~1.50.
HARD_FLOOR = 1.20   # nothing reaching this deep belongs to a head model
SOFT_FLOOR = 1.35   # root of the neck; below it, a Head/Neck tag is required

# Clutter that adds polygons without ever being asked about in an exam, plus
# thoracic organs. Checked against the syllabus first: "carotid sheath" and
# "orbital septum" are on it, so plain "sheath" and "septum" are not skipped.
SKIP_SUBSTRINGS = (
    "bursa", "retinaculum", "aponeurosis", "compartment", "tendon sheath",
    "reference line", "reference plane", "median plane", "coronal plane",
    "sagittal plane", "movement", "orientation",
    "lung", "pleura", "azygos", "pulmonary", "valve", "leaflet", "heart",
)

KEEP_ANYWAY = ("carotid sheath", "orbital septum")


def wanted(obj):
    low = obj.name.lower()
    if any(k in low for k in KEEP_ANYWAY):
        return True
    return not any(s in low for s in SKIP_SUBSTRINGS)


def within_depth(obj, collections):
    """Reject structures that descend past the root of the neck.

    Z-Anatomy's own region tags do most of the work (splenius and longissimus
    colli are tagged Neck; pectoralis minor and the thymus are not), but the
    sympathetic trunk is tagged Neck and still runs the length of the thorax,
    hence the hard floor underneath.
    """
    bottom = zalib.world_bbox(obj)[0].z
    if bottom < HARD_FLOOR:
        return False
    return bottom >= SOFT_FLOOR or bool(collections & REGION_TAGS)


def excluded(collections, base):
    """True when region tags place this outside the head and neck."""
    return bool(collections & NOT_HEAD_NECK) and base not in CERVICAL_ANYWAY
