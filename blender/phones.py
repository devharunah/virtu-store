"""
VIRTU.STORE - procedural phone + fixture generator.

Builds 5 real phones (iPhone 17 Pro Max, iPhone 17, Galaxy S25 Ultra, A56, A17) and 2 store fixtures, exports each as GLB,
writes a manifest, and renders two lineup preview images.

Run headless (no MCP needed):
  "C:\\Program Files\\Blender Foundation\\Blender 5.2\\blender.exe" --background --factory-startup --python blender/phones.py

Or paste into Blender's Scripting tab / send through Blender MCP `execute_blender_code`.

Conventions (see docs/ASSET-PIPELINE.md):
  * Units are metres. Phone stands upright: width = X, height = Z, thickness = Y.
  * Screen faces Blender -Y  ->  glTF/three.js +Z (faces the default camera).
  * Origin = bottom-centre, so a phone placed at y=0 in three.js sits on the surface.
  * Material names are a contract with the web app:
      Body (runtime colour swap), Bezel, Screen (wallpaper texture slot, UV 0..1),
      Glass, LensRing, Flash, Wood, Base, Accent.
"""

import bpy
import bmesh
import json
import math
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
RAW_DIR = os.path.join(HERE, "out")                      # unoptimised exports
PREVIEW_DIR = os.path.join(ROOT, "docs", "img")
os.makedirs(RAW_DIR, exist_ok=True)
os.makedirs(PREVIEW_DIR, exist_ok=True)

MM = 0.001

# --------------------------------------------------------------------------
# --------------------------------------------------------------------------
BRAND_DIR = os.path.join(HERE, "brand")

# Real phones, approximated from public dimensions and design (mm). Coordinates on the back:
# x is measured so that +x appears on the LEFT when you look at the back (cameras top-left).
# Logos: simple-icons SVG paths (CC0 drawings); the trademarks belong to Apple and Samsung.
APPLE_LOGO = dict(svg="apple.svg", finish="mirror")
SAMSUNG_WORDMARK = dict(svg="samsung.svg", finish="print")
IPHONE_BUTTONS = [(1, 0.66, 18), (1, 0.37, 16), (-1, 0.80, 7), (-1, 0.72, 11), (-1, 0.64, 11)]
GALAXY_BUTTONS = [(1, 0.70, 26), (1, 0.58, 12)]

PHONES = [
    dict(id="galaxy-a17", name="Galaxy A17 5G", tier="Entry",
         w=77.9, h=164.4, t=7.5, r=9, inset=3.0, selfie="hole",
         islands=[dict(kind="rrect", x=25, z=130, w=17, h=44, r=8.5, depth=1.4, material="body")],
         lenses=[(25, 144, 5.0), (25, 130, 5.0), (25, 116, 4.0)], flash=(12.5, 144),
         logo=dict(SAMSUNG_WORDMARK, width=19, z=16), buttons=GALAXY_BUTTONS,
         color="#1C1D20", metallic=0.0, roughness=0.45),
    dict(id="galaxy-a56", name="Galaxy A56 5G", tier="Mid-range",
         w=77.5, h=162.2, t=7.4, r=9, inset=2.2, selfie="hole",
         islands=[dict(kind="rrect", x=24, z=129, w=20, h=48, r=10, depth=1.6, material="body")],
         lenses=[(24, 145, 5.5), (24, 129, 5.5), (24, 113, 5.5)], flash=(9.5, 145),
         logo=dict(SAMSUNG_WORDMARK, width=19, z=16), buttons=GALAXY_BUTTONS,
         color="#3B3D40", metallic=0.1, roughness=0.35),
    dict(id="iphone-17", name="iPhone 17", tier="Upper mid",
         w=71.5, h=149.6, t=7.95, r=10.5, inset=1.7, selfie="island",
         islands=[dict(kind="rrect", x=22, z=126, w=20, h=41, r=10, depth=1.5, material="body")],
         lenses=[(22, 136.5, 6.6), (22, 115.5, 6.6)], flash=(7.5, 140),
         logo=dict(APPLE_LOGO, width=15, z=72), buttons=IPHONE_BUTTONS,
         color="#1E1F22", metallic=0.0, roughness=0.4),
    dict(id="galaxy-s25-ultra", name="Galaxy S25 Ultra", tier="Flagship",
         w=77.6, h=162.8, t=8.2, r=7, inset=1.4, selfie="hole",
         islands=[],
         lenses=[(27, 146, 6.3), (27, 131, 6.3), (27, 116, 6.3), (14, 146, 4.4), (14, 131, 4.4)],
         flash=(14, 118),
         logo=dict(SAMSUNG_WORDMARK, width=20, z=16), buttons=GALAXY_BUTTONS,
         color="#A7B3C0", metallic=0.35, roughness=0.3),
    dict(id="iphone-17-pro-max", name="iPhone 17 Pro Max", tier="Flagship",
         w=78.0, h=163.4, t=8.75, r=11.5, inset=1.6, selfie="island",
         # The full-width aluminium camera plateau, then lenses in a triangle, flash and LiDAR
         islands=[dict(kind="rrect", x=0, z=136, w=77.0, h=46, r=11, depth=1.1, material="body")],
         lenses=[(24, 146.5, 7.4), (24, 125.5, 7.4), (8.5, 136, 7.4), (-11, 125, 3.0)],
         flash=(-11, 146),
         logo=dict(APPLE_LOGO, width=16, z=74), buttons=IPHONE_BUTTONS,
         color="#E8732C", metallic=0.55, roughness=0.32),
]


# --------------------------------------------------------------------------
# Helpers
# --------------------------------------------------------------------------
def hex_rgba(h, a=1.0):
    h = h.lstrip("#")
    srgb = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    lin = [c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4 for c in srgb]
    return (*lin, a)


def reset_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete()
    for block in (bpy.data.meshes, bpy.data.materials, bpy.data.curves, bpy.data.lights, bpy.data.cameras):
        for item in list(block):
            if item.users == 0:
                block.remove(item)


def material(name, color="#ffffff", metallic=0.0, roughness=0.5, emission=None, strength=0.0, unique=False):
    # unique=True: always a new datablock (several phones in one scene each keep their own Body colour)
    mat = (None if unique else bpy.data.materials.get(name)) or bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = hex_rgba(color)
    bsdf.inputs["Metallic"].default_value = metallic
    bsdf.inputs["Roughness"].default_value = roughness
    if emission:
        key = "Emission Color" if "Emission Color" in bsdf.inputs else "Emission"
        bsdf.inputs[key].default_value = hex_rgba(emission)
        bsdf.inputs["Emission Strength"].default_value = strength
    return mat


def rrect_pts(w, h, r, cx=0.0, cz=0.0, seg=8):
    """Rounded rectangle outline in the XZ plane, centred on (cx, cz). Counter-clockwise."""
    r = min(r, w / 2, h / 2)
    pts = []
    corners = [(w / 2 - r, h / 2 - r, 0), (-w / 2 + r, h / 2 - r, 90),
               (-w / 2 + r, -h / 2 + r, 180), (w / 2 - r, -h / 2 + r, 270)]
    for ox, oz, a0 in corners:
        for i in range(seg + 1):
            a = math.radians(a0 + 90 * i / seg)
            pts.append((cx + ox + r * math.cos(a), cz + oz + r * math.sin(a)))
    return pts


def new_obj(name, bm, mat):
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    ob = bpy.data.objects.new(name, me)
    bpy.context.collection.objects.link(ob)
    ob.data.materials.append(mat)
    return ob


def prism(name, pts, y0, y1, mat):
    """Extrude a 2D outline (XZ) between y0 and y1."""
    bm = bmesh.new()
    a = [bm.verts.new((x, y0, z)) for x, z in pts]
    b = [bm.verts.new((x, y1, z)) for x, z in pts]
    bm.faces.new(a)
    bm.faces.new(list(reversed(b)))
    n = len(pts)
    for i in range(n):
        j = (i + 1) % n
        bm.faces.new((a[i], a[j], b[j], b[i]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return new_obj(name, bm, mat)


def flat(name, pts, y, mat, flip=False, uv_box=None):
    """Single n-gon in the XZ plane at depth y, with optional 0..1 UVs over uv_box=(x0,z0,w,h)."""
    bm = bmesh.new()
    vs = [bm.verts.new((x, y, z)) for x, z in pts]
    face = bm.faces.new(list(reversed(vs)) if flip else vs)
    if uv_box:
        uv = bm.loops.layers.uv.new("UVMap")
        x0, z0, bw, bh = uv_box
        for loop in face.loops:
            co = loop.vert.co
            loop[uv].uv = ((co.x - x0) / bw, (co.z - z0) / bh)
    return new_obj(name, bm, mat)


def cylinder_y(name, radius, depth, x, y, z, mat, verts=40):
    """Cylinder whose axis points along Y, starting at y and growing toward +Y by depth."""
    bpy.ops.mesh.primitive_cylinder_add(vertices=verts, radius=radius, depth=depth,
                                        location=(x, y + depth / 2, z),
                                        rotation=(math.radians(90), 0, 0))
    ob = bpy.context.active_object
    ob.name = name
    ob.data.materials.append(mat)
    return ob


def bevel(ob, width, segments=3, angle=30):
    mod = ob.modifiers.new("Bevel", "BEVEL")
    mod.width = width
    mod.segments = segments
    mod.limit_method = "ANGLE"
    mod.angle_limit = math.radians(angle)
    mod.harden_normals = False
    return mod


def shade_smooth(ob):
    for p in ob.data.polygons:
        p.use_smooth = True


def join(objs, name):
    bpy.ops.object.select_all(action="DESELECT")
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    for o in objs:   # bake modifiers before joining
        bpy.context.view_layer.objects.active = o
        for m in list(o.modifiers):
            bpy.ops.object.modifier_apply(modifier=m.name)
    bpy.context.view_layer.objects.active = objs[0]
    bpy.ops.object.join()
    ob = bpy.context.active_object
    ob.name = name
    ob.data.name = name
    return ob


def export_glb(ob, path):
    bpy.ops.object.select_all(action="DESELECT")
    ob.select_set(True)
    bpy.context.view_layer.objects.active = ob
    bpy.ops.export_scene.gltf(filepath=path, export_format="GLB", use_selection=True,
                              export_apply=True, export_yup=True)


def tri_count(ob):
    return sum(len(p.vertices) - 2 for p in ob.data.polygons)


# --------------------------------------------------------------------------
# Builders
# --------------------------------------------------------------------------
def build_logo(spec, back):
    """Import a brand SVG, turn it into a flat mesh and seat it on the phone's back.

    The back faces +Y, so someone looking at it sees +X on their left: mirror X so the mark reads
    correctly. Its own "Logo" material keeps it out of the runtime Body recolour.
    """
    finish = spec.get("finish", "print")
    if finish == "mirror":
        mat = material("Logo", "#D4D5D8", 1.0, 0.12)
    else:
        mat = material("Logo", "#C9CBCE", 0.2, 0.45)

    before = set(bpy.data.objects)
    bpy.ops.import_curve.svg(filepath=os.path.join(BRAND_DIR, spec["svg"]))
    curves = [o for o in bpy.data.objects if o not in before and o.type == "CURVE"]
    bpy.ops.object.select_all(action="DESELECT")
    for c in curves:
        c.data.dimensions = "2D"
        c.data.fill_mode = "BOTH"
        c.data.resolution_u = 6
        c.select_set(True)
    bpy.context.view_layer.objects.active = curves[0]
    if len(curves) > 1:
        bpy.ops.object.join()
    bpy.ops.object.convert(target="MESH")
    logo = bpy.context.active_object
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    logo.data.materials.clear()
    logo.data.materials.append(mat)

    xs = [v.co.x for v in logo.data.vertices]
    ys = [v.co.y for v in logo.data.vertices]
    cx, cy = (min(xs) + max(xs)) / 2, (min(ys) + max(ys)) / 2
    scale = spec["width"] * MM / (max(xs) - min(xs))
    lift = back + 0.08 * MM
    for v in logo.data.vertices:
        x, y = v.co.x, v.co.y
        v.co = (-(x - cx) * scale, lift, (y - cy) * scale + spec["z"] * MM)

    # Flat logo: make every face point out of the back (+Y)
    bm = bmesh.new()
    bm.from_mesh(logo.data)
    bm.normal_update()
    for f in bm.faces:
        if f.normal.y < 0:
            f.normal_flip()
    bm.to_mesh(logo.data)
    bm.free()
    logo.name = "logo"
    return logo


def build_phone(s):
    w, h, t, r = s["w"] * MM, s["h"] * MM, s["t"] * MM, s["r"] * MM
    front, back = -t / 2, t / 2

    m_body = material("Body", s["color"], s["metallic"], s["roughness"], unique=True)
    m_bezel = material("Bezel", "#050505", 0.0, 0.15)
    m_screen = material("Screen", "#0A1020", 0.0, 0.08, emission="#16243F", strength=0.6)
    m_glass = material("Glass", "#020203", 0.3, 0.05)
    m_ring = material("LensRing", "#8A8D93", 1.0, 0.25)
    m_flash = material("Flash", "#FFF4D6", 0.0, 0.3, emission="#FFF4D6", strength=0.4)

    parts = []

    # Body shell with softened rims
    body = prism("body", rrect_pts(w, h, r, 0, h / 2), front, back, m_body)
    bevel(body, min(1.2 * MM, t * 0.25))
    parts.append(body)

    # Front glass bezel and display (UV 0..1 across the display so a wallpaper can be mapped)
    e = 0.15 * MM
    bz_w, bz_h = w - 1.0 * MM, h - 1.0 * MM
    parts.append(flat("bezel", rrect_pts(bz_w, bz_h, r - 0.5 * MM, 0, h / 2), front - e, m_bezel, flip=True))
    ins = s["inset"] * MM
    sw, sh = w - 2 * ins, h - 2 * ins
    parts.append(flat("screen", rrect_pts(sw, sh, max(r - ins, 1 * MM), 0, h / 2), front - 2 * e, m_screen,
                      flip=True, uv_box=(-sw / 2, h / 2 - sh / 2, sw, sh)))
    # Front camera: a punch-hole, or Apple's Dynamic Island pill
    if s.get("selfie") == "island":
        parts.append(flat("selfie", rrect_pts(19 * MM, 5.6 * MM, 2.8 * MM, 0, h - ins - 6.5 * MM, seg=8),
                          front - 3 * e, m_bezel, flip=True))
    else:
        parts.append(flat("selfie", rrect_pts(3.4 * MM, 3.4 * MM, 1.7 * MM, 0, h - ins - 6 * MM, seg=6),
                          front - 3 * e, m_glass, flip=True))

    # Raised camera islands on the back (body-coloured or glass); lenses sit on the highest one
    lens_base = back
    for i, isl in enumerate(s.get("islands", [])):
        depth = isl.get("depth", 1.4) * MM
        mat = m_glass if isl.get("material") == "glass" else m_body
        if isl["kind"] == "circle":
            ob = cylinder_y(f"island{i}", isl["d"] * MM / 2, depth, isl["x"] * MM, back, isl["z"] * MM, mat, verts=64)
        else:
            iw, ih = isl["w"] * MM, isl["h"] * MM
            ir = isl.get("r", min(isl["w"], isl["h"]) / 2) * MM
            ob = prism(f"island{i}", rrect_pts(iw, ih, ir, isl["x"] * MM, isl["z"] * MM), back, back + depth, mat)
        bevel(ob, min(0.5 * MM, depth * 0.4))
        parts.append(ob)
        lens_base = max(lens_base, back + depth)

    for i, (lx, lz, lr) in enumerate(s["lenses"]):
        x, z, rad = lx * MM, lz * MM, lr * MM
        parts.append(cylinder_y(f"ring{i}", rad, 1.0 * MM, x, lens_base, z, m_ring))
        parts.append(cylinder_y(f"lens{i}", rad * 0.72, 1.15 * MM, x, lens_base, z, m_glass))
    fx, fz = s["flash"]
    parts.append(cylinder_y("flash", 1.9 * MM, 0.4 * MM, fx * MM, lens_base, fz * MM, m_flash, verts=24))

    # Side buttons: (side, height as a fraction of the phone, length in mm); +1 = right edge seen from the front
    for i, (side, bz, bl) in enumerate(s.get("buttons", [(1, 0.62, 14), (1, 0.76, 26)])):
        ob = prism(f"button{i}", rrect_pts(1.6 * MM, bl * MM, 0.7 * MM, side * (w / 2 + 0.3 * MM), h * bz),
                   -1.3 * MM, 1.3 * MM, m_body)
        parts.append(ob)

    if s.get("logo"):
        parts.append(build_logo(s["logo"], back))

    for p in parts:
        shade_smooth(p)
    phone = join(parts, s["id"])
    # Auto-smooth equivalent: keep crisp edges where faces meet at sharp angles
    try:
        bpy.ops.object.shade_smooth_by_angle(angle=math.radians(35))
    except Exception:
        pass
    return phone


def build_podium():
    m_base = material("Base", "#F2F0EC", 0.0, 0.4)
    m_acc = material("Accent", "#E4A11B", 0.8, 0.3)
    bpy.ops.mesh.primitive_cylinder_add(vertices=64, radius=0.28, depth=0.9, location=(0, 0, 0.45))
    col = bpy.context.active_object
    col.data.materials.append(m_base)
    bevel(col, 0.01)
    bpy.ops.mesh.primitive_cylinder_add(vertices=64, radius=0.29, depth=0.02, location=(0, 0, 0.91))
    ring = bpy.context.active_object
    ring.data.materials.append(m_acc)
    for o in (col, ring):
        shade_smooth(o)
    ob = join([col, ring], "podium")
    bpy.ops.object.shade_smooth_by_angle(angle=math.radians(35))
    return ob


def build_table():
    m_wood = material("Wood", "#B07A4F", 0.0, 0.55)
    m_base = material("Base", "#F2F0EC", 0.0, 0.4)
    top = prism("top", rrect_pts(1.6, 0.04, 0.0, 0, 0.88, seg=1), -0.4, 0.4, m_wood)
    bevel(top, 0.008)
    plinth = prism("plinth", rrect_pts(1.4, 0.86, 0.0, 0, 0.43, seg=1), -0.3, 0.3, m_base)
    bevel(plinth, 0.01)
    ob = join([top, plinth], "display_table")
    return ob


# --------------------------------------------------------------------------
# Lineup renders (docs/img)
# --------------------------------------------------------------------------
def render_lineup(objs, path, show_back):
    scene = bpy.context.scene
    gap = 0.11
    for i, ob in enumerate(objs):
        ob.location = ((i - (len(objs) - 1) / 2) * gap, 0, 0)
        ob.rotation_euler = (0, 0, math.radians(180 - 18 if show_back else 18))

    floor_mat = material("Floor", "#EDEAE4", 0.0, 0.6)
    bpy.ops.mesh.primitive_plane_add(size=4, location=(0, 0, 0))
    bpy.context.active_object.data.materials.append(floor_mat)

    bpy.ops.object.light_add(type="AREA", location=(-0.4, -0.6, 0.6))
    key = bpy.context.active_object
    key.data.energy, key.data.size = 60, 0.8
    key.rotation_euler = (math.radians(55), 0, math.radians(-35))
    bpy.ops.object.light_add(type="AREA", location=(0.5, -0.3, 0.4))
    fill = bpy.context.active_object
    fill.data.energy, fill.data.size = 25, 1.0
    fill.rotation_euler = (math.radians(60), 0, math.radians(45))
    bpy.ops.object.light_add(type="AREA", location=(0, 0.5, 0.5))
    rim = bpy.context.active_object
    rim.data.energy, rim.data.size = 30, 1.0
    rim.rotation_euler = (math.radians(-60), 0, 0)

    bpy.ops.object.camera_add(location=(0, -0.95, 0.13), rotation=(math.radians(87), 0, 0))
    cam = bpy.context.active_object
    cam.data.lens = 50
    scene.camera = cam

    world = scene.world or bpy.data.worlds.new("World")
    scene.world = world
    world.use_nodes = True
    world.node_tree.nodes["Background"].inputs["Color"].default_value = hex_rgba("#F4F1EB")
    world.node_tree.nodes["Background"].inputs["Strength"].default_value = 0.6

    scene.render.resolution_x, scene.render.resolution_y = 1600, 700
    scene.render.filepath = path
    scene.render.image_settings.file_format = "PNG"
    try:
        scene.view_settings.view_transform = "AgX"
    except Exception:
        pass

    for engine in ("BLENDER_EEVEE", "BLENDER_EEVEE_NEXT", "CYCLES"):
        try:
            scene.render.engine = engine
            if engine == "CYCLES":
                scene.cycles.samples = 48
                scene.cycles.use_denoising = True
            bpy.ops.render.render(write_still=True)
            print(f"[virtu] rendered {path} with {engine}")
            return engine
        except Exception as ex:  # engine missing or no GPU context in background mode
            print(f"[virtu] {engine} failed: {ex}")
    return None


# --------------------------------------------------------------------------
# Main
# --------------------------------------------------------------------------
def main():
    reset_scene()
    manifest = {"phones": [], "fixtures": []}

    for spec in PHONES:
        reset_scene()
        ob = build_phone(spec)
        path = os.path.join(RAW_DIR, f"{spec['id']}.glb")
        export_glb(ob, path)
        manifest["phones"].append({
            "id": spec["id"], "name": spec["name"], "tier": spec["tier"],
            "file": f"/models/phones/{spec['id']}.glb",
            "dimensions_mm": [spec["w"], spec["h"], spec["t"]],
            "triangles": tri_count(ob),
            "materials": [m.name for m in ob.data.materials],
            "default_color": spec["color"],
        })
        print(f"[virtu] exported {path} ({tri_count(ob)} tris)")

    for builder in (build_podium, build_table):
        reset_scene()
        ob = builder()
        path = os.path.join(RAW_DIR, f"{ob.name}.glb")
        export_glb(ob, path)
        manifest["fixtures"].append({"id": ob.name, "file": f"/models/fixtures/{ob.name}.glb",
                                     "triangles": tri_count(ob),
                                     "materials": [m.name for m in ob.data.materials]})
        print(f"[virtu] exported {path}")

    with open(os.path.join(RAW_DIR, "manifest.json"), "w") as f:
        json.dump(manifest, f, indent=2)

    if "--no-render" not in sys.argv:
        for show_back, fname in ((True, "lineup-back.png"), (False, "lineup-front.png")):
            reset_scene()
            objs = [build_phone(s) for s in PHONES]
            render_lineup(objs, os.path.join(PREVIEW_DIR, fname), show_back)

    print("[virtu] done")


if __name__ == "__main__":  # Blender's --python runs us as __main__; store_props.py imports the helpers
    main()
