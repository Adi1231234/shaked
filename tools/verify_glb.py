"""Sanity-check a built GLB: parse the container, list the layer nodes, and
confirm the structure names survived the export (the viewer identifies
structures by node name, so a mangled name is a silent content bug).

Run:
  python tools/verify_glb.py models/head.glb
"""
import json
import struct
import sys
from collections import Counter
from pathlib import Path

path = Path(sys.argv[1] if len(sys.argv) > 1 else "models/head.glb")
raw = path.read_bytes()

magic, version, length = struct.unpack_from("<4sII", raw, 0)
assert magic == b"glTF", f"not a GLB: {magic!r}"
assert length == len(raw), f"header says {length} bytes, file is {len(raw)}"

offset, gltf = 12, None
while offset < length:
    chunk_len, chunk_type = struct.unpack_from("<I4s", raw, offset)
    body = raw[offset + 8: offset + 8 + chunk_len]
    if chunk_type == b"JSON":
        gltf = json.loads(body)
    offset += 8 + chunk_len + (-chunk_len % 4)

assert gltf, "no JSON chunk"
nodes = gltf["nodes"]
print(f"{path.name}: glTF {version}, {len(raw)/1e6:.1f} MB")
print(f"  extensions : {', '.join(gltf.get('extensionsUsed', [])) or 'none'}")
print(f"  nodes      : {len(nodes)}")
print(f"  meshes     : {len(gltf.get('meshes', []))}")
print(f"  materials  : {', '.join(m.get('name', '?') for m in gltf.get('materials', []))}")

roots = gltf["scenes"][gltf.get("scene", 0)]["nodes"]
print("\n  layers (root nodes):")
named = 0
for ri in roots:
    node = nodes[ri]
    kids = node.get("children", [])
    print(f"    {node.get('name', '?'):14s} {len(kids):4d} structures")
    for ki in kids[:3]:
        print(f"        e.g. {nodes[ki].get('name')}")
    named += sum(1 for ki in kids if nodes[ki].get("name"))

total_kids = sum(len(nodes[ri].get("children", [])) for ri in roots)
print(f"\n  named structures: {named}/{total_kids}")

dupes = [n for n, c in Counter(
    nodes[ki].get("name") for ri in roots for ki in nodes[ri].get("children", [])
).items() if c > 1]
print(f"  duplicate names : {len(dupes)}" + (f"  {dupes[:5]}" if dupes else ""))
assert named == total_kids, "some structures lost their name in export"
print("\nOK")
