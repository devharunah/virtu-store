"""
VIRTU.STORE - showroom props generator (Phase 1).

Builds: checkout counter, wall display bay, potted plant, 3D "VIRTU.STORE" sign.
Reuses the helpers from phones.py. Same conventions (see docs/ASSET-PIPELINE.md):
metres, Z-up in Blender -> Y-up in glTF, front faces Blender -Y -> three.js +Z,
origin at bottom-centre (sign: centre-bottom of the letters).

Run headless (it clears the scene, so don't run it inside a Blender file you care about):
  "C:/Program Files/Blender Foundation/Blender 5.2/blender.exe" --background --factory-startup --python blender/store_props.py
"""

import json
import math
import os
import sys

import bpy

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from phones import (RAW_DIR, bevel, cylinder_y, export_glb, join, material, prism,  # noqa: E402
                    reset_scene, rrect_pts, shade_smooth, tri_count)


def box(name, w, d, h, x, y, z, mat, bev=0.0):
    """Axis-aligned box: width X, depth Y, height Z; (x, y, z) is the bottom-centre."""
    ob = prism(name, rrect_pts(w, h, 0.0, x, z + h / 2, seg=1), y - d / 2, y + d / 2, mat)
    if bev:
        bevel(ob, bev)
    return ob


def smooth_by_angle(deg=35):
    try:
        bpy.ops.object.shade_smooth_by_angle(angle=math.radians(deg))
    except Exception:
        pass


# ---------------------------------------------------------------- counter
def build_counter():
    m_base = material("Base", "#F2F0EC", 0.0, 0.4)
    m_wood = material("Wood", "#B07A4F", 0.0, 0.55)
    m_acc = material("Accent", "#E4A11B", 0.8, 0.3)
    m_dark = material("Dark", "#1E1F22", 0.2, 0.35)
    parts = [
        box("body", 2.0, 0.6, 0.98, 0, 0, 0, m_base, bev=0.01),
        box("top", 2.12, 0.7, 0.04, 0, 0, 0.98, m_wood, bev=0.008),
        box("strip", 2.0, 0.01, 0.05, 0, -0.305, 0.12, m_acc),           # accent strip on the customer side
        box("kick", 1.96, 0.56, 0.08, 0, 0.0, 0.0, m_dark),               # recessed plinth
        box("till", 0.34, 0.04, 0.24, 0.55, 0.12, 1.02, m_dark, bev=0.005),  # card terminal / screen
        box("till_foot", 0.12, 0.12, 0.02, 0.55, 0.14, 1.02, m_dark),
    ]
    ob = join(parts, "counter")
    smooth_by_angle()
    return ob


# ---------------------------------------------------------------- wall bay
def build_wall_bay():
    m_wood = material("Wood", "#B07A4F", 0.0, 0.55)
    m_base = material("Base", "#F2F0EC", 0.0, 0.4)
    m_led = material("LED", "#FFF1D6", 0.0, 0.5, emission="#FFE7B8", strength=3.0)
    w, h = 2.4, 2.3
    parts = [
        box("back", w, 0.04, h, 0, 0.0, 0, m_wood, bev=0.006),
        box("frame_l", 0.06, 0.32, h, -w / 2 + 0.03, -0.14, 0, m_base, bev=0.004),
        box("frame_r", 0.06, 0.32, h, w / 2 - 0.03, -0.14, 0, m_base, bev=0.004),
        box("cap", w, 0.32, 0.06, 0, -0.14, h - 0.06, m_base, bev=0.004),
        box("plinth", w, 0.32, 0.12, 0, -0.14, 0, m_base, bev=0.004),
    ]
    for i, sz in enumerate((0.95, 1.35, 1.75)):
        parts.append(box(f"shelf{i}", w - 0.12, 0.28, 0.025, 0, -0.16, sz, m_base, bev=0.004))
        parts.append(box(f"led{i}", w - 0.16, 0.012, 0.006, 0, -0.27, sz - 0.008, m_led))
    ob = join(parts, "wall_bay")
    smooth_by_angle()
    return ob


# ---------------------------------------------------------------- plant
def build_plant():
    m_pot = material("Pot", "#C96F45", 0.0, 0.7)
    m_soil = material("Soil", "#3B2A1E", 0.0, 0.9)
    m_leaf = material("Leaf", "#3F7D4A", 0.0, 0.6)
    bpy.ops.mesh.primitive_cone_add(vertices=40, radius1=0.17, radius2=0.22, depth=0.5, location=(0, 0, 0.25))
    pot = bpy.context.active_object
    pot.data.materials.append(m_pot)
    bevel(pot, 0.01)
    bpy.ops.mesh.primitive_cylinder_add(vertices=40, radius=0.205, depth=0.02, location=(0, 0, 0.49))
    soil = bpy.context.active_object
    soil.data.materials.append(m_soil)
    parts = [pot, soil]

    # Snake-plant style: tall sword leaves fanning out slightly (deterministic, no RNG)
    golden = math.radians(137.5)
    n = 13
    for i in range(n):
        a = i * golden
        k = i / (n - 1)                        # 0 = inner/tallest, 1 = outer/shortest
        length = 0.95 - 0.4 * k
        tilt = math.radians(4 + 22 * k)        # outer leaves lean out more
        r = 0.03 + 0.11 * k
        bpy.ops.mesh.primitive_uv_sphere_add(segments=10, ring_count=10, radius=1.0)
        leaf = bpy.context.active_object
        leaf.scale = (0.05, 0.012, length / 2)
        bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
        for v in leaf.data.vertices:           # move pivot to leaf base so it tilts from the soil
            v.co.z += length / 2
        leaf.rotation_euler = (tilt, 0, a)
        leaf.location = (-r * math.sin(a), r * math.cos(a), 0.47)
        bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
        leaf.data.materials.append(m_leaf)
        parts.append(leaf)
    for p in parts:
        shade_smooth(p)
    ob = join(parts, "plant")
    smooth_by_angle(50)
    return ob


# ---------------------------------------------------------------- sign
def build_sign(text="VIRTU.STORE"):
    m_glow = material("SignGlow", "#FFF4E2", 0.0, 0.4, emission="#FFE2B0", strength=4.0)
    m_back = material("Dark", "#1E1F22", 0.2, 0.35)
    bpy.ops.object.text_add(location=(0, 0, 0), rotation=(math.radians(90), 0, 0))
    t = bpy.context.active_object
    t.data.body = text
    t.data.size = 0.42
    t.data.extrude = 0.015
    t.data.bevel_depth = 0.0
    t.data.resolution_u = 3  # curve smoothness; keeps the sign around 4k triangles
    t.data.align_x = "CENTER"
    t.data.align_y = "BOTTOM"
    t.data.space_character = 1.12
    bpy.ops.object.convert(target="MESH")
    letters = bpy.context.active_object
    letters.data.materials.append(m_glow)
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    # sit letters on z=0, centred in x
    xs = [v.co.x for v in letters.data.vertices]
    zs = [v.co.z for v in letters.data.vertices]
    ys = [v.co.y for v in letters.data.vertices]
    cx, z0, y1 = (min(xs) + max(xs)) / 2, min(zs), max(ys)
    for v in letters.data.vertices:
        v.co.x -= cx
        v.co.z -= z0
        v.co.y -= y1 + 0.02  # letters float 2 cm in front of the backing plate
    width, height = max(xs) - min(xs), max(zs) - min(zs)
    plate = box("plate", width + 0.5, 0.02, height + 0.3, 0, 0.0, -0.15, m_back, bev=0.005)
    ob = join([letters, plate], "sign")
    return ob


BUILDERS = (build_counter, build_wall_bay, build_plant, build_sign)


def main():
    manifest_path = os.path.join(RAW_DIR, "props.json")
    props = []
    for builder in BUILDERS:
        reset_scene()
        ob = builder()
        path = os.path.join(RAW_DIR, f"{ob.name}.glb")
        export_glb(ob, path)
        dims = [round(d, 3) for d in ob.dimensions]
        props.append({"id": ob.name, "file": f"/models/environment/{ob.name}.glb", "triangles": tri_count(ob),
                      "dimensions_m": dims, "materials": [m.name for m in ob.data.materials]})
        print(f"[virtu] exported {path} ({tri_count(ob)} tris, {dims} m)")
    with open(manifest_path, "w") as f:
        json.dump(props, f, indent=2)
    print("[virtu] done")


if __name__ == "__main__":
    main()
