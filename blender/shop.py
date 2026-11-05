"""
VIRTU.STORE - Kampala arcade phone shop generator.

Reads src/data/shop-layout.json (the same file the web app reads for colliders and phone slots)
and blender/out/signs.{png,json} (run blender/make_signs.py first), then builds:

  shop_shell.glb   every static, opaque piece merged into one mesh (one draw call per material):
                   shop + arcade corridor, glass-counter frames and decks, MoMo desk, shelves,
                   pegboard, signboards, posters, tube lights, monobloc chairs, neighbours' shutters.
                   UV0 = tiling / atlas coordinates, UV1 = baked lightmap.
  shop_glass.glb   the counter glass (transparent, not baked)
  shop_fan.glb     ceiling fan; the node "FanBlades" spins in the app
  lightmap.png     (with --bake) diffuse light + shadows baked by Cycles onto UV1

Run headless (it clears the scene):
  "C:/Program Files/Blender Foundation/Blender 5.2/blender.exe" --background --factory-startup \\
      --python blender/shop.py -- [--bake] [--render]
"""

import json
import math
import os
import sys

import bmesh
import bpy
from mathutils import Vector

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from phones import RAW_DIR, bevel, export_glb, hex_rgba, material, reset_scene  # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
ARGS = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
LAYOUT = json.load(open(os.path.join(ROOT, "src", "data", "shop-layout.json"), encoding="utf-8"))
SIGNS = json.load(open(os.path.join(RAW_DIR, "signs.json"), encoding="utf-8"))
SIGNS_PNG = os.path.join(RAW_DIR, "signs.png")

SHOP, FRONT, COR = LAYOUT["shop"], LAYOUT["front"], LAYOUT["corridor"]
HX, HZ, H = SHOP["width"] / 2, SHOP["depth"] / 2, SHOP["height"]
CZ0, CZ1, CX, CH = HZ, HZ + COR["depth"], COR["halfLength"], COR["height"]
E = 0.004  # small offset that keeps decals off the surface they sit on


def B(p):
    """three.js (x, y-up, z) -> Blender (x, y, z-up)."""
    return Vector((p[0], -p[2], p[1]))


# --------------------------------------------------------------------------- materials
def mats():
    signs_img = bpy.data.images.load(SIGNS_PNG)
    signs = material("Signs", "#FFFFFF", 0.0, 0.6)
    nodes = signs.node_tree.nodes
    bsdf = next(n for n in nodes if n.type == "BSDF_PRINCIPLED")
    tex = nodes.new("ShaderNodeTexImage")
    tex.image = signs_img
    signs.node_tree.links.new(tex.outputs["Color"], bsdf.inputs["Base Color"])
    return dict(
        floor=material("TileFloor", "#ECE6DA", 0.0, 0.28),
        corridor=material("CorridorFloor", "#A39E94", 0.0, 0.7),
        wall=material("PaintWall", "#EFE9DA", 0.0, 0.85),
        accent=material("PaintAccent", "#0F6E74", 0.0, 0.8),
        cwall=material("CorridorWall", "#D7D1C3", 0.0, 0.9),
        ceiling=material("Ceiling", "#F3F1EA", 0.0, 0.95),
        metal=material("Metal", "#B9BDC3", 0.85, 0.32),
        dark=material("ShopDark", "#141414", 0.0, 0.9),
        velvet=material("Velvet", "#18181B", 0.0, 0.95),
        white=material("ShelfWhite", "#F1EFEA", 0.0, 0.5),
        wood=material("Wood", "#8E5E36", 0.0, 0.6),
        plastic=material("Plastic", "#F4F4F1", 0.0, 0.4),
        led=material("LED", "#FFFFFF", 0.0, 0.3, emission="#F2FAFF", strength=6.0),
        tube=material("Tube", "#FFFFFF", 0.0, 0.3, emission="#EEF7FF", strength=8.0),
        signs=signs,
        glass=material("Glass", "#DDEEF2", 0.0, 0.05),
    )


M = None
PARTS = []  # everything that ends up in shop_shell


def keep(ob):
    PARTS.append(ob)
    return ob


# --------------------------------------------------------------------------- geometry helpers
def _mesh(name, verts, faces, mat, uvs=None):
    bm = bmesh.new()
    vs = [bm.verts.new(B(v)) for v in verts]
    uv_layer = bm.loops.layers.uv.new("UVMap")
    for fi, f in enumerate(faces):
        face = bm.faces.new([vs[i] for i in f])
        for li, loop in enumerate(face.loops):
            loop[uv_layer].uv = uvs[fi][li] if uvs else (0, 0)
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    ob = bpy.data.objects.new(name, me)
    bpy.context.collection.objects.link(ob)
    ob.data.materials.append(mat)
    return ob


def panel(name, origin, right, up, w, h, mat, uv_rect=None, tile=None):
    """A flat rectangle seen from the front: `origin` is its bottom-left corner (three coords),
    `right`/`up` unit vectors as the viewer sees them. Normal = right x up (towards the viewer).
    UVs: an atlas rect (u0, v0, u1, v1) or world-tiling at `tile` metres per repeat."""
    o, r, u = Vector(origin), Vector(right), Vector(up)
    corners = [o, o + r * w, o + r * w + u * h, o + u * h]
    if uv_rect:
        u0, v0, u1, v1 = uv_rect
        uv = [(u0, v0), (u1, v0), (u1, v1), (u0, v1)]
    elif tile:
        uv = [(c.dot(r) / tile, c.dot(u) / tile) for c in corners]
    else:
        uv = [(0, 0), (1, 0), (1, 1), (0, 1)]
    # three-coords right x up must face the viewer; Blender conversion is a proper rotation, so order is kept
    return _mesh(name, [tuple(c) for c in corners], [(0, 1, 2, 3)], mat, [uv])


def floor_quad(name, x0, x1, z0, z1, y, mat, tile, down=False):
    if down:  # ceiling: seen from below
        return panel(name, (x0, y, z0), (1, 0, 0), (0, 0, 1), x1 - x0, z1 - z0, mat, tile=tile)
    return panel(name, (x0, y, z1), (1, 0, 0), (0, 0, -1), x1 - x0, z1 - z0, mat, tile=tile)


def box(name, center_xz, y0, size, mat, rot_y=0.0):
    """Axis box in three coords: size = (sx, sy, sz); y0 = bottom; rotated about Y by rot_y."""
    sx, sy, sz = size
    bpy.ops.mesh.primitive_cube_add(size=1)
    ob = bpy.context.active_object
    ob.name = name
    ob.scale = (sx, sz, sy)  # Blender X, Y(depth), Z(height)
    ob.rotation_euler = (0, 0, rot_y)
    ob.location = B((center_xz[0], y0 + sy / 2, center_xz[1]))
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    ob.data.materials.append(mat)
    return ob


def local(fx, fz, cx, cz, rot):
    """Fixture-local (x, z) -> world (x, z) for a fixture at (cx, cz) rotated by rot about Y."""
    c, s = math.cos(rot), math.sin(rot)
    return (cx + fx * c + fz * s, cz - fx * s + fz * c)


def cyl(name, radius, depth, center, axis, mat, verts=24):
    rot = {"x": (0, math.pi / 2, 0), "y": (0, 0, 0), "z": (math.pi / 2, 0, 0)}[axis]
    bpy.ops.mesh.primitive_cylinder_add(vertices=verts, radius=radius, depth=depth, location=B(center), rotation=rot)
    ob = bpy.context.active_object
    ob.name = name
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    ob.data.materials.append(mat)
    return ob


# --------------------------------------------------------------------------- the shop
def build_room():
    t_floor, t_wall = 1.5, 3.0
    keep(floor_quad("floor", -HX, HX, -HZ, HZ, 0, M["floor"], t_floor))
    keep(floor_quad("ceiling", -HX, HX, -HZ, HZ, H, M["ceiling"], 3, down=True))
    # interior walls (seen from inside)
    keep(panel("wall-back", (-HX, 0, -HZ), (1, 0, 0), (0, 1, 0), 2 * HX, H, M["accent"], tile=t_wall))
    keep(panel("wall-left", (-HX, 0, HZ), (0, 0, -1), (0, 1, 0), 2 * HZ, H, M["wall"], tile=t_wall))
    keep(panel("wall-right", (HX, 0, -HZ), (0, 0, 1), (0, 1, 0), 2 * HZ, H, M["wall"], tile=t_wall))
    # inside face of the wall above the opening
    keep(panel("wall-front-in", (HX, FRONT["openingTop"], HZ), (-1, 0, 0), (0, 1, 0), 2 * HX, H - FRONT["openingTop"], M["wall"]))
    # skirting band along the interior walls
    for nm, o, r, w in (("skirt-back", (-HX, 0, -HZ + E), (1, 0, 0), 2 * HX),
                        ("skirt-left", (-HX + E, 0, HZ), (0, 0, -1), 2 * HZ),
                        ("skirt-right", (HX - E, 0, -HZ), (0, 0, 1), 2 * HZ)):
        keep(panel(nm, o, r, (0, 1, 0), w, 0.1, M["dark"]))


def build_front():
    p, top, sb = FRONT["pillar"], FRONT["openingTop"], FRONT["shutterBottom"]
    z = CZ0
    # pillars (corridor face + inner sides)
    for s in (-1, 1):
        x_in = s * (HX - p)
        keep(box(f"pillar{s}", ((x_in + s * HX) / 2, z - 0.05), 0, (p, CH, 0.1), M["cwall"]))
    # fascia above the opening, corridor side
    keep(panel("fascia", (-HX, top, z + 0.051), (1, 0, 0), (0, 1, 0), 2 * HX, CH - top, M["cwall"]))
    # main signboard
    sw, sh = 6.2, 6.2 * 380 / 2048
    keep(panel("main-signboard", (-sw / 2, top + 0.3, z + 0.06), (1, 0, 0), (0, 1, 0), sw, sh, M["signs"], SIGNS["main-signboard"]))
    keep(box("signboard-frame", (0, z + 0.04), top + 0.26, (sw + 0.1, sh + 0.08, 0.03), M["metal"]))
    # half-raised roll-up shutter: housing tube + visible slats
    keep(cyl("shutter-box", 0.13, 2 * (HX - p), (0, top + 0.02, z + 0.12), "x", M["metal"], 32))
    keep(panel("shutter-slats", (-(HX - p), sb, z + 0.03), (1, 0, 0), (0, 1, 0), 2 * (HX - p), top - sb, M["signs"], SIGNS["shutter"]))
    # side rails the shutter runs in
    for s in (-1, 1):
        keep(box(f"shutter-rail{s}", (s * (HX - p - 0.02), z + 0.06), 0, (0.05, top, 0.06), M["metal"]))


def neighbour(n):
    side, x, op = n["side"], n["x"], n["shutterOpen"]
    w, top = 3.6, FRONT["openingTop"]
    if side == "opposite":
        zf, r = CZ1, (-1, 0, 0)
        o = lambda dx, y, dz=0: (x + w / 2 - dx, y, zf - dz)  # noqa: E731
    else:
        zf, r = CZ0, (1, 0, 0)
        o = lambda dx, y, dz=0: (x - w / 2 + dx, y, zf + dz)  # noqa: E731
    # dark shop interior behind the opening, shutter coming down to `shutter_y`
    shutter_y = top * op
    keep(panel(f"{n['id']}-dark", o(0, 0, 0.01), r, (0, 1, 0), w, top, M["dark"]))
    keep(panel(f"{n['id']}-shutter", o(0, shutter_y, 0.02), r, (0, 1, 0), w, top - shutter_y, M["signs"], SIGNS["shutter"]))
    sh = w * 220 / 1020
    keep(panel(f"{n['id']}-sign", o(0, top + 0.25, 0.03), r, (0, 1, 0), w, sh, M["signs"], SIGNS[n["id"]]))


def build_corridor():
    keep(floor_quad("corridor-floor", -CX, CX, CZ0, CZ1, 0, M["corridor"], 3))
    keep(floor_quad("corridor-ceiling", -CX, CX, CZ0, CZ1, CH, M["ceiling"], 3, down=True))
    keep(panel("corridor-opposite", (CX, 0, CZ1), (-1, 0, 0), (0, 1, 0), 2 * CX, CH, M["cwall"], tile=3))
    for s in (-1, 1):  # our side, either side of the shop front
        x0 = -CX if s < 0 else HX
        keep(panel(f"corridor-near{s}", (x0, 0, CZ0), (1, 0, 0), (0, 1, 0), CX - HX, CH, M["cwall"], tile=3))
        xe = s * CX
        keep(panel(f"corridor-end{s}", (xe, 0, CZ1 if s < 0 else CZ0), (0, 0, -1) if s < 0 else (0, 0, 1),
                   (0, 1, 0), CZ1 - CZ0, CH, M["cwall"], tile=3))
    for n in LAYOUT["neighbours"]:
        neighbour(n)
    for x in (-9.5, -3.2, 3.2, 9.5):  # corridor tube lights
        tube_light(x, (CZ0 + CZ1) / 2, CH, along="x")


def tube_light(x, z, ceiling, along="x"):
    rot = 0 if along == "x" else math.pi / 2
    keep(box("tube-housing", (x, z), ceiling - 0.05, (1.25, 0.05, 0.12), M["metal"], rot))
    c = (x, ceiling - 0.075, z)
    keep(cyl("tube", 0.017, 1.18, c, "x" if along == "x" else "z", M["tube"], 12))


def counter(c):
    L, D, Hc, rot = c["length"], c["depth"], c["height"], c["rotY"]
    cx, cz = c["x"], c["z"]
    deck = 0.55
    at = lambda fx, fz: local(fx, fz, cx, cz, rot)  # noqa: E731
    keep(box(f"{c['id']}-plinth", at(0, 0), 0, (L - 0.04, 0.08, D - 0.04), M["dark"], rot))
    keep(box(f"{c['id']}-cabinet", at(0, 0), 0.08, (L, deck - 0.08, D), M["white"], rot))
    keep(box(f"{c['id']}-deck", at(0, 0), deck, (L - 0.04, 0.03, D - 0.04), M["velvet"], rot))
    t = 0.025
    for fx in (-L / 2 + t / 2, L / 2 - t / 2):  # corner posts
        for fz in (-D / 2 + t / 2, D / 2 - t / 2):
            keep(box(f"{c['id']}-post", at(fx, fz), deck, (t, Hc - deck, t), M["metal"], rot))
    for fz in (-D / 2 + t / 2, D / 2 - t / 2):  # top rails along the length
        keep(box(f"{c['id']}-rail", at(0, fz), Hc - t, (L, t, t), M["metal"], rot))
    for fx in (-L / 2 + t / 2, L / 2 - t / 2):
        keep(box(f"{c['id']}-rail", at(fx, 0), Hc - t, (t, t, D), M["metal"], rot))
    keep(box(f"{c['id']}-led", at(0, D / 2 - 0.05), Hc - 0.035, (L - 0.1, 0.008, 0.02), M["led"], rot))
    # glass: top + four sides above the deck (separate, transparent GLB)
    glass = []
    gh = Hc - deck - 0.03
    glass.append(box(f"{c['id']}-glass-top", at(0, 0), Hc - 0.006, (L - 0.02, 0.006, D - 0.02), M["glass"], rot))
    glass.append(box(f"{c['id']}-glass-front", at(0, D / 2 - 0.01), deck + 0.03, (L - 0.02, gh, 0.006), M["glass"], rot))
    glass.append(box(f"{c['id']}-glass-back", at(0, -D / 2 + 0.01), deck + 0.03, (L - 0.02, gh, 0.006), M["glass"], rot))
    for fx in (-L / 2 + 0.01, L / 2 - 0.01):
        glass.append(box(f"{c['id']}-glass-side", at(fx, 0), deck + 0.03, (0.006, gh, D - 0.02), M["glass"], rot))
    return glass


def hero_stand():
    s = LAYOUT["heroStand"]
    back = next(c for c in LAYOUT["counters"] if c["id"] == "counter-back")
    y = back["height"]
    keep(box("hero-base", (s["x"], s["z"]), y, (0.34, s["height"] - 0.02, 0.26), M["white"]))
    keep(box("hero-led", (s["x"], s["z"] + 0.131), y + 0.02, (0.3, 0.012, 0.004), M["led"]))
    keep(box("hero-top", (s["x"], s["z"]), y + s["height"] - 0.02, (0.36, 0.02, 0.28), M["metal"]))


def kiosk():
    k = LAYOUT["kiosk"]
    rot, w, d, h = k["rotY"], k["width"], k["depth"], k["height"]
    at = lambda fx, fz: local(fx, fz, k["x"], k["z"], rot)  # noqa: E731
    keep(box("kiosk-body", at(0, 0), 0, (w, h - 0.04, d), M["wood"], rot))
    keep(box("kiosk-top", at(0, 0.02), h - 0.04, (w + 0.06, 0.04, d + 0.08), M["metal"], rot))
    # red agent board on the customer-facing front of the desk
    fx0, fz0 = at(-w / 2 + 0.05, d / 2 + 0.003)
    right = Vector((math.cos(rot), 0, -math.sin(rot)))
    out = Vector((math.sin(rot), 0, math.cos(rot)))
    bw = w - 0.1
    keep(panel("kiosk-board", (fx0, 0.35, fz0), right, (0, 1, 0), bw, bw * 220 / 1020, M["signs"], SIGNS["momo-red"]))
    # yellow board on the wall above the desk (right wall, facing into the shop)
    yw = 1.6
    keep(panel("momo-wall-board", (HX - E, 2.05, k["z"] - yw / 2), (0, 0, 1), (0, 1, 0), yw, yw * 220 / 1020, M["signs"], SIGNS["momo-yellow"]))
    # "pay here" sign on the desk's side
    sx, sz = at(w / 2 + 0.003, d / 2 - 0.02)
    side_right = Vector((-math.sin(rot), 0, -math.cos(rot)))  # local -z, as seen facing the +x side
    keep(panel("pay-here", (sx, 0.5, sz), side_right, (0, 1, 0), d - 0.04, (d - 0.04) * 130 / 1020, M["signs"], SIGNS["sign-cash"]))


def back_wall():
    s = LAYOUT["backShelves"]
    w, d = s["width"], s["depth"]
    for i, y in enumerate(s["levels"]):
        keep(box(f"shelf{i}", (s["x"], -HZ + d / 2), y, (w, 0.025, d), M["white"]))
    for fx in (-w / 2, 0, w / 2):
        keep(box("shelf-upright", (s["x"] + fx, -HZ + d / 2), s["levels"][0], (0.03, s["levels"][-1] - s["levels"][0] + 0.025, d), M["white"]))
    cw = 3.4
    keep(panel("sign-credit", (-cw / 2, 2.62, -HZ + E), (1, 0, 0), (0, 1, 0), cw, cw * 130 / 1020, M["signs"], SIGNS["sign-credit"]))


def right_wall():
    p = LAYOUT["pegboard"]
    w = p["width"]
    keep(panel("pegboard", (HX - E, p["bottom"], p["z"] - w / 2), (0, 0, 1), (0, 1, 0), w, p["top"] - p["bottom"], M["signs"], SIGNS["pegboard"]))


def left_wall():
    for poster in LAYOUT["posters"]:
        w, h = poster["w"], poster["h"]
        keep(panel(poster["id"], (-HX + E, poster["y"] - h / 2, poster["z"] + w / 2), (0, 0, -1), (0, 1, 0), w, h, M["signs"], SIGNS[poster["id"]]))
    sw = 2.0
    keep(panel("sign-screen", (-HX + E, 2.6, 2.6), (0, 0, -1), (0, 1, 0), sw, sw * 130 / 1020, M["signs"], SIGNS["sign-screen"]))


def monobloc(x, z, rot):
    """The white plastic monobloc chair found in every Ugandan shop."""
    at = lambda fx, fz: local(fx, fz, x, z, rot)  # noqa: E731
    keep(box("chair-seat", at(0, 0), 0.42, (0.46, 0.035, 0.44), M["plastic"], rot))
    keep(box("chair-skirt", at(0, 0), 0.36, (0.44, 0.06, 0.42), M["plastic"], rot))
    back = box("chair-back", at(0, -0.22), 0.45, (0.44, 0.42, 0.03), M["plastic"], rot)
    keep(back)
    for fx in (-0.2, 0.2):
        for fz in (-0.19, 0.19):
            keep(box("chair-leg", at(fx, fz), 0, (0.045, 0.42, 0.045), M["plastic"], rot))
        keep(box("chair-arm", at(fx * 1.12, 0.0), 0.62, (0.035, 0.03, 0.42), M["plastic"], rot))
        keep(box("chair-arm-post", at(fx * 1.12, 0.17), 0.45, (0.035, 0.17, 0.035), M["plastic"], rot))


def fan():
    f = LAYOUT["fan"]
    parts = [
        cyl("fan-rod", 0.012, 0.3, (f["x"], f["y"] - 0.15, f["z"]), "y", M["metal"], 12),
        cyl("fan-motor", 0.09, 0.08, (f["x"], f["y"] - 0.34, f["z"]), "y", M["white"], 32),
    ]
    blades = []
    for i in range(3):
        a = i * 2 * math.pi / 3
        b = box("blade", (f["x"] + 0.38 * math.cos(a), f["z"] + 0.38 * math.sin(a)), f["y"] - 0.36,
                (0.62, 0.008, 0.12), M["white"], -a)
        blades.append(b)
    return parts, blades


# --------------------------------------------------------------------------- export / bake
def join_objects(objs, name):
    bpy.ops.object.select_all(action="DESELECT")
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    bpy.ops.object.join()
    ob = bpy.context.active_object
    ob.name = name
    ob.data.name = name
    return ob


def add_lightmap_uv(ob):
    uv = ob.data.uv_layers.new(name="Lightmap")
    ob.data.uv_layers.active = uv
    bpy.ops.object.select_all(action="DESELECT")
    ob.select_set(True)
    bpy.context.view_layer.objects.active = ob
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="SELECT")
    # Lightmap pack sizes every face by its real area, so big floors get as many texels as they need
    bpy.ops.uv.lightmap_pack(PREF_CONTEXT="ALL_FACES", PREF_PACK_IN_ONE=True, PREF_NEW_UVLAYER=False,
                             PREF_BOX_DIV=48, PREF_MARGIN_DIV=0.3)
    bpy.ops.object.mode_set(mode="OBJECT")
    ob.data.uv_layers.active = ob.data.uv_layers["UVMap"]
    return uv


def use_gpu_if_any(scene):
    try:
        prefs = bpy.context.preferences.addons["cycles"].preferences
        for kind in ("OPTIX", "CUDA", "HIP", "ONEAPI", "METAL"):
            try:
                prefs.compute_device_type = kind
                prefs.get_devices()
                gpus = [d for d in prefs.devices if d.type != "CPU"]
                if gpus:
                    for d in prefs.devices:
                        d.use = True
                    scene.cycles.device = "GPU"
                    print(f"[virtu] baking on {kind}: {[d.name for d in gpus]}")
                    return
            except Exception:
                continue
    except Exception:
        pass
    print("[virtu] baking on CPU")


def bake_lightmap(shell, size=2048, samples=40):
    scene = bpy.context.scene
    scene.render.engine = "CYCLES"
    use_gpu_if_any(scene)
    scene.cycles.samples = samples
    scene.cycles.use_denoising = True
    world = scene.world or bpy.data.worlds.new("World")
    scene.world = world
    world.use_nodes = True
    bg = next(n for n in world.node_tree.nodes if n.type == "BACKGROUND")
    bg.inputs[0].default_value = hex_rgba("#C9CDD2")
    bg.inputs[1].default_value = 0.35
    # extra area lights under every tube so the bake is not noisy
    for x, z in LAYOUT["tubes"]:
        bpy.ops.object.light_add(type="AREA", location=B((x, H - 0.12, z)))
        l = bpy.context.active_object
        l.data.shape, l.data.size, l.data.size_y, l.data.energy = "RECTANGLE", 1.2, 0.15, 90
        l.data.color = (0.93, 0.97, 1.0)
    for x in (-9.5, -3.2, 3.2, 9.5):
        bpy.ops.object.light_add(type="AREA", location=B((x, CH - 0.12, (CZ0 + CZ1) / 2)))
        l = bpy.context.active_object
        l.data.shape, l.data.size, l.data.size_y, l.data.energy = "RECTANGLE", 1.2, 0.15, 140

    img = bpy.data.images.new("lightmap", size, size, alpha=False, float_buffer=True)
    # Bake LIGHT only: temporarily make every surface plain white (keeping emission), so the
    # lightmap never contains surface colours or sign artwork. Restored after the bake.
    saved = []
    for mat in shell.data.materials:
        bsdf = next(n for n in mat.node_tree.nodes if n.type == "BSDF_PRINCIPLED")
        sock = bsdf.inputs["Base Color"]
        links = [(l.from_socket, l.to_socket) for l in mat.node_tree.links if l.to_socket == sock]
        for l in [l for l in mat.node_tree.links if l.to_socket == sock]:
            mat.node_tree.links.remove(l)
        saved.append((mat, tuple(sock.default_value), links))
        sock.default_value = (0.8, 0.8, 0.8, 1.0)
    for mat in shell.data.materials:
        node = mat.node_tree.nodes.new("ShaderNodeTexImage")
        node.image = img
        uvn = mat.node_tree.nodes.new("ShaderNodeUVMap")
        uvn.uv_map = "Lightmap"
        mat.node_tree.links.new(uvn.outputs["UV"], node.inputs["Vector"])
        mat.node_tree.nodes.active = node
        node.select = True
    bpy.ops.object.select_all(action="DESELECT")
    shell.select_set(True)
    bpy.context.view_layer.objects.active = shell
    # Cycles places baked texels using the *active render* UV map, so point it at the lightmap UVs
    shell.data.uv_layers.active = shell.data.uv_layers["Lightmap"]
    shell.data.uv_layers["Lightmap"].active_render = True
    scene.render.bake.use_pass_direct = True
    scene.render.bake.use_pass_indirect = True
    scene.render.bake.use_pass_color = False
    scene.render.bake.margin = 6
    print("[virtu] baking lightmap…")
    bpy.ops.object.bake(type="DIFFUSE", pass_filter={"DIRECT", "INDIRECT"}, margin=6)
    # remove the bake nodes so the exporter does not treat the lightmap as a base colour
    for mat in shell.data.materials:
        for n in list(mat.node_tree.nodes):
            if n.type in ("TEX_IMAGE", "UVMAP") and getattr(n, "image", None) is img or (n.type == "UVMAP" and n.uv_map == "Lightmap"):
                mat.node_tree.nodes.remove(n)
    shell.data.uv_layers.active = shell.data.uv_layers["UVMap"]
    shell.data.uv_layers["UVMap"].active_render = True  # export UV0 = tiling, UV1 = lightmap
    for mat, colour, links in saved:
        bsdf = next(n for n in mat.node_tree.nodes if n.type == "BSDF_PRINCIPLED")
        bsdf.inputs["Base Color"].default_value = colour
        for frm, to in links:
            mat.node_tree.links.new(frm, to)
    # Normalise exposure so the bright end (95th percentile) sits at 0.85: no clipped white walls
    px = list(img.pixels)
    lum = sorted(0.2126 * px[i] + 0.7152 * px[i + 1] + 0.0722 * px[i + 2] for i in range(0, len(px), 4 * 7))
    p95 = lum[int(len(lum) * 0.95)] or 1.0
    k = 0.85 / p95
    for i in range(0, len(px), 4):
        px[i], px[i + 1], px[i + 2] = px[i] * k, px[i + 1] * k, px[i + 2] * k
    img.pixels = px
    print(f"[virtu] lightmap exposure x{k:.3f} (p95 was {p95:.3f})")
    # save as 8-bit sRGB PNG (the app reads it as an sRGB lightMap)
    out = os.path.join(RAW_DIR, "lightmap.png")
    img.filepath_raw = out
    img.file_format = "PNG"
    scene.view_settings.view_transform = "Standard"
    img.save_render(out, scene=scene)
    for o in [o for o in bpy.data.objects if o.type == "LIGHT"]:
        bpy.data.objects.remove(o)
    print(f"[virtu] wrote {out}")


def render_previews(shell):
    scene = bpy.context.scene
    try:
        scene.render.engine = "BLENDER_EEVEE"
    except TypeError:
        scene.render.engine = "BLENDER_EEVEE_NEXT"
    scene.render.resolution_x, scene.render.resolution_y = 1400, 800
    scene.view_settings.view_transform = "AgX"
    for x, z in LAYOUT["tubes"]:
        bpy.ops.object.light_add(type="AREA", location=B((x, H - 0.12, z)))
        l = bpy.context.active_object
        l.data.size, l.data.energy = 1.2, 120
    for x in (-9.5, -3.2, 3.2, 9.5):
        bpy.ops.object.light_add(type="AREA", location=B((x, CH - 0.12, (CZ0 + CZ1) / 2)))
        bpy.context.active_object.data.energy = 160
    shots = {
        "shop-wide": ((0, 1.6, 6.4), (0, 1.2, -1.5)),
        "shop-counter": ((-1.6, 1.5, 0.4), (-3.86, 0.6, -0.4)),
        "shop-corridor": ((-6.5, 1.7, 6.6), (2.5, 1.6, 3.4)),
    }
    for name, (eye, target) in shots.items():
        bpy.ops.object.camera_add(location=B(eye))
        cam = bpy.context.active_object
        d = B(target) - B(eye)
        cam.rotation_euler = d.to_track_quat("-Z", "Y").to_euler()
        cam.data.lens = 22
        scene.camera = cam
        scene.render.filepath = os.path.join(ROOT, "docs", "img", f"{name}.png")
        bpy.ops.render.render(write_still=True)
        print(f"[virtu] rendered {name}")


def main():
    global M
    reset_scene()
    M = mats()
    build_room()
    build_front()
    build_corridor()
    glass = []
    for c in LAYOUT["counters"]:
        glass += counter(c)
    hero_stand()
    kiosk()
    back_wall()
    right_wall()
    left_wall()
    for ch in LAYOUT["chairs"]:
        monobloc(ch["x"], ch["z"], ch["rotY"])
    for x, z in LAYOUT["tubes"]:
        tube_light(x, z, H)
    fan_parts, fan_blades = fan()

    shell = join_objects(PARTS, "ShopShell")
    add_lightmap_uv(shell)
    glass_ob = join_objects(glass, "ShopGlass")
    fan_body = join_objects(fan_parts, "Fan")
    blades = join_objects(fan_blades, "FanBlades")
    f = LAYOUT["fan"]
    pivot = B((f["x"], f["y"] - 0.36, f["z"]))
    # put the blades' origin on the spin axis, parent them to the fan body
    bpy.context.scene.cursor.location = pivot
    bpy.ops.object.select_all(action="DESELECT")
    blades.select_set(True)
    bpy.context.view_layer.objects.active = blades
    bpy.ops.object.origin_set(type="ORIGIN_CURSOR")
    blades.parent = fan_body
    blades.matrix_parent_inverse = fan_body.matrix_world.inverted()

    if "--bake" in ARGS:
        glass_ob.hide_render = True
        fan_body.hide_render = blades.hide_render = True
        bake_lightmap(shell)
        glass_ob.hide_render = False
        fan_body.hide_render = blades.hide_render = False

    export_glb(shell, os.path.join(RAW_DIR, "shop_shell.glb"))
    export_glb(glass_ob, os.path.join(RAW_DIR, "shop_glass.glb"))
    bpy.ops.object.select_all(action="DESELECT")
    fan_body.select_set(True)
    blades.select_set(True)
    bpy.ops.export_scene.gltf(filepath=os.path.join(RAW_DIR, "shop_fan.glb"), export_format="GLB",
                              use_selection=True, export_apply=True, export_yup=True)
    tris = sum(len(p.vertices) - 2 for p in shell.data.polygons)
    print(f"[virtu] shell: {tris} tris, {len(shell.data.materials)} materials: {[m.name for m in shell.data.materials]}")
    if "--render" in ARGS:
        render_previews(shell)
    print("[virtu] done")


if __name__ == "__main__":
    main()
