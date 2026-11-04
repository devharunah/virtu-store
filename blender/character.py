"""
VIRTU.STORE - player character converter (Phase 2).

Source: "Animated Human" by Quaternius, CC0 1.0 (OpenGameArt). Not committed as a zip;
download it, extract it and point this script at the FBX and the textures folder.

  "C:/Program Files/Blender Foundation/Blender 5.2/blender.exe" --background --factory-startup \
      --python blender/character.py -- "<...>/FBX/Animated Human.fbx" "<...>/Blend/Textures/ClothedDarkSkin.png"

What it does:
  * scales the rig so the character is HEIGHT_M tall, feet on the origin, facing +Z in three.js
  * applies the palette texture (Quaternius packs colours into a tiny palette PNG)
  * keeps only the clips the app uses and renames them to the names ecctrl expects
  * exports blender/out/player.glb (then optimise with gltf-transform, see docs/ASSET-PIPELINE.md)
"""

import os
import sys

import bpy
from mathutils import Vector

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "out", "player.glb")
HEIGHT_M = 1.75
KEEP = {"Idle": "idle", "Walk": "walk", "Run": "run", "Jump": "jump"}

args = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
if len(args) < 2:
    raise SystemExit("usage: character.py -- <fbx> <palette.png>")
fbx_path, tex_path = args[0], args[1]

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.fbx(filepath=fbx_path)

arm = next(o for o in bpy.data.objects if o.type == "ARMATURE")
mesh = next(o for o in bpy.data.objects if o.type == "MESH")
mesh.name = "PlayerMesh"

# Bind pose (first frame of Idle) world-space bounds -> uniform scale to target height.
idle = next(a for a in bpy.data.actions if a.name.endswith("|Idle"))
arm.animation_data_create()
arm.animation_data.action = idle
bpy.context.scene.frame_set(1)
bpy.context.view_layer.update()
dg = bpy.context.evaluated_depsgraph_get()
ev = mesh.evaluated_get(dg)
pts = [ev.matrix_world @ v.co for v in ev.to_mesh().vertices]
zmin, zmax = min(p.z for p in pts), max(p.z for p in pts)
cx = sum(p.x for p in pts) / len(pts)
cy = sum(p.y for p in pts) / len(pts)
ev.to_mesh_clear()
factor = HEIGHT_M / (zmax - zmin)
# The clips key the armature object's own transform, so scaling the armature would be overwritten
# on export. Scale and recentre a parent root node instead; the animation plays inside it.
root = bpy.data.objects.new("Player", None)
bpy.context.collection.objects.link(root)
arm.name = "PlayerRig"
arm.parent = root
root.scale = (factor, factor, factor)
root.location = Vector((-cx, -cy, -zmin)) * factor
print(f"[virtu] height {zmax - zmin:.3f} -> {HEIGHT_M} m (x{factor:.4f})")

# Palette texture on the single material, crisp (nearest) sampling.
img = bpy.data.images.load(tex_path)
for mat in mesh.data.materials:
    mat.name = "Character"
    nodes = mat.node_tree.nodes
    bsdf = next(n for n in nodes if n.type == "BSDF_PRINCIPLED")
    tex = nodes.new("ShaderNodeTexImage")
    tex.image = img
    tex.interpolation = "Closest"
    mat.node_tree.links.new(tex.outputs["Color"], bsdf.inputs["Base Color"])
    bsdf.inputs["Roughness"].default_value = 0.8
    bsdf.inputs["Metallic"].default_value = 0.0

# Keep and rename only the clips we use; stash them on NLA tracks so the exporter writes each one.
for act in list(bpy.data.actions):
    short = act.name.split("|")[-1]
    if short in KEEP:
        act.name = KEEP[short]
        act.use_fake_user = True
    else:
        bpy.data.actions.remove(act)
arm.animation_data.action = None
for name in KEEP.values():
    track = arm.animation_data.nla_tracks.new()
    track.name = name
    track.strips.new(name, 1, bpy.data.actions[name])

os.makedirs(os.path.dirname(OUT), exist_ok=True)
bpy.ops.object.select_all(action="SELECT")
bpy.ops.export_scene.gltf(
    filepath=OUT,
    export_format="GLB",
    use_selection=True,
    export_yup=True,
    export_animations=True,
    export_animation_mode="NLA_TRACKS",
    export_force_sampling=True,
)
print(f"[virtu] exported {OUT} with clips {sorted(KEEP.values())}")
