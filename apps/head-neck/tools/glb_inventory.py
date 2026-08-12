"""Dump what a built GLB actually contains, in the same record shape as
tools/dump_inventory.py, so the syllabus can be matched against the shipped
model rather than against the whole atlas.

Run:
  python tools/glb_inventory.py models/head.glb data/glb-inventory.json
"""
import json
import struct
import sys
from pathlib import Path


def read_gltf(path):
    raw = Path(path).read_bytes()
    magic, _, length = struct.unpack_from("<4sII", raw, 0)
    assert magic == b"glTF", f"not a GLB: {magic!r}"
    off = 12
    while off < length:
        chunk_len, chunk_type = struct.unpack_from("<I4s", raw, off)
        if chunk_type == b"JSON":
            return json.loads(raw[off + 8: off + 8 + chunk_len])
        off += 8 + chunk_len + (-chunk_len % 4)
    raise AssertionError("no JSON chunk")


def main():
    src = sys.argv[1] if len(sys.argv) > 1 else "models/head.glb"
    out = sys.argv[2] if len(sys.argv) > 2 else "data/glb-inventory.json"

    gltf = read_gltf(src)
    records = []
    for node in gltf["nodes"]:
        extras = node.get("extras") or {}
        structure = extras.get("structure")
        if not structure:
            continue          # layer parent nodes carry no structure tag
        records.append({
            "name": node.get("name", structure),
            "structure": structure,
            "side": extras.get("side", ""),
            "kind": extras.get("kind", "structure"),
            "collections": [extras.get("layer", "")],
            "verts": 0,
        })

    records.sort(key=lambda r: (r["structure"], r["side"]))
    Path(out).write_text(json.dumps(records, ensure_ascii=False, indent=1),
                         encoding="utf-8")
    distinct = len({r["structure"] for r in records})
    print(f"{src}: {len(records)} nodes, {distinct} distinct structures -> {out}")


if __name__ == "__main__":
    main()
