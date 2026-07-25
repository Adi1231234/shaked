"""Cross-match the head & neck syllabus against the Z-Anatomy head/neck inventory.

Answers the only question that matters for content: how many of the structures
she actually has to know exist as clickable meshes in Z-Anatomy.

Run:
  python tools/match_syllabus.py <syllabus.json> <inventory.json> [out-report.json]
"""
import json
import re
import sys
from pathlib import Path

# Z-Anatomy suffixes: .l/.r = left/right, .j = label ("joint") helper object.
SIDE_SUFFIX = re.compile(r"\.(l|r|j)$", re.I)
NOISE = re.compile(r"[^a-z0-9 ]+")

# Terminologia Anatomica vs Complete Anatomy wording. Applied after normalising.
REWRITES = [
    (r"\bmuscle\b", ""), (r"\bbone\b", ""), (r"\bcartilage\b", ""),
    (r"\bligament\b", ""), (r"\bnerve\b", ""), (r"\bartery\b", ""),
    (r"\bvein\b", ""), (r"\bsinus\b", ""), (r"\bgland\b", ""),
    (r"\bof the\b", "of"), (r"\bpart of\b", "of"),
    (r"\bcn[- ]?\d+\b", ""), (r"\(.*?\)", ""),
]


def norm(s: str) -> str:
    s = SIDE_SUFFIX.sub("", s.strip())
    s = NOISE.sub(" ", s.lower())
    return re.sub(r"\s+", " ", s).strip()


def key(s: str) -> str:
    """Aggressive key: drop generic anatomical nouns and word order."""
    s = norm(s)
    for pat, rep in REWRITES:
        s = re.sub(pat, rep, s)
    words = sorted(w for w in s.split() if w)
    return " ".join(words)


def load_terms(path):
    d = json.loads(Path(path).read_text(encoding="utf-8"))
    out = []
    for gi, g in enumerate(d["groups"]):
        for it in (g.get("items") or g.get("terms") or []):
            term = it["term"] if isinstance(it, dict) else it
            out.append({"term": term, "group": gi})
    return out, d


def main():
    syllabus_path, inventory_path = sys.argv[1], sys.argv[2]
    out_path = sys.argv[3] if len(sys.argv) > 3 else None

    terms, raw = load_terms(syllabus_path)
    inventory = json.loads(Path(inventory_path).read_text(encoding="utf-8"))

    # Build lookup tables over the Z-Anatomy inventory.
    by_norm, by_key = {}, {}
    for rec in inventory:
        by_norm.setdefault(norm(rec["name"]), []).append(rec["name"])
        by_key.setdefault(key(rec["name"]), []).append(rec["name"])

    hits, misses = [], []
    for t in terms:
        n, k = norm(t["term"]), key(t["term"])
        if n in by_norm:
            hits.append({**t, "match": by_norm[n][0], "how": "exact"})
        elif k in by_key:
            hits.append({**t, "match": by_key[k][0], "how": "normalised"})
        else:
            # Last resort: unique substring containment on the aggressive key.
            cands = [name for kk, names in by_key.items()
                     if k and (k in kk or kk in k) for name in names]
            if len(set(cands)) == 1:
                hits.append({**t, "match": cands[0], "how": "substring"})
            else:
                misses.append({**t, "candidates": sorted(set(cands))[:4]})

    total = len(terms)
    print(f"syllabus terms      : {total}")
    print(f"matched in Z-Anatomy: {len(hits)}  ({100*len(hits)/total:.0f}%)")
    print(f"unmatched           : {len(misses)}")
    for how in ("exact", "normalised", "substring"):
        print(f"   via {how:11s}: {sum(1 for h in hits if h['how'] == how)}")

    print("\n--- per group ---")
    for gi in range(len(raw["groups"])):
        gt = [t for t in terms if t["group"] == gi]
        gh = [h for h in hits if h["group"] == gi]
        print(f"  group {gi}: {len(gh):3d}/{len(gt):3d} matched")

    print("\n--- first 40 unmatched ---")
    for m in misses[:40]:
        cand = f"   ~ {m['candidates'][0]}" if m["candidates"] else ""
        print(f"  [g{m['group']}] {m['term']}{cand}")

    if out_path:
        Path(out_path).write_text(
            json.dumps({"hits": hits, "misses": misses}, ensure_ascii=False, indent=1),
            encoding="utf-8")
        print(f"\nwrote {out_path}")


if __name__ == "__main__":
    main()
