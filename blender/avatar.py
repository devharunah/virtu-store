"""
VIRTU.STORE - your avatar: Avaturn (face -> full body) + Mixamo (rig + animations), both free.

Files live in blender/source/avatar/ (git-ignored: it is your likeness).

1) prep: Avaturn GLB -> Mixamo-ready FBX (meshes in their rest pose, Avaturn's own rig removed so
   Mixamo can auto-rig it; textures embedded).
     blender --background --factory-startup --python blender/avatar.py -- prep
   in:  blender/source/avatar/avaturn.glb
   out: blender/source/avatar/for-mixamo.fbx          -> upload to mixamo.com ("Upload Character")

2) merge: the four Mixamo downloads -> one player.glb with clips idle / walk / run / jump.
     blender --background --factory-startup --python blender/avatar.py -- merge --height 1.78
   in:  idle.fbx (With Skin), walk.fbx, run.fbx, jump.fbx (Without Skin, walk/run "In Place")
   out: blender/out/player.glb   (then gltf-transform, see docs/ASSET-PIPELINE.md)

The result matches what src/components/3d/Player.tsx expects: feet at the origin, facing +Z in
three.js, clip names idle/walk/run/jump. Height comes from --height (metres).
"""

import os
import sys

import bpy
from mathutils import Vector

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, "source", "avatar")
OUT = os.path.join(HERE, "out")
ARGS = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
CLIPS = {"idle": "idle.fbx", "walk": "walk.fbx", "run": "run.fbx", "jump": "jump.fbx"}


def arg(name, default=None):
    return ARGS[ARGS.index(name) + 1] if name in ARGS else default


def clear():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def need(path):
    if not os.path.exists(path):
        raise SystemExit(f"[virtu] missing {path}. See docs/realism-plan.html for the steps.")
    return path


# --------------------------------------------------------------------------- 1) prep
def prep():
    clear()
    bpy.ops.import_scene.gltf(filepath=need(os.path.join(SRC, "avaturn.glb")))
    meshes = [o for o in bpy.data.objects if o.type == "MESH"]
    arms = [o for o in bpy.data.objects if o.type == "ARMATURE"]
    for m in meshes:  # keep the rest pose geometry, drop Avaturn's rig (Mixamo auto-rigs)
        for mod in [md for md in m.modifiers if md.type == "ARMATURE"]:
            m.modifiers.remove(mod)
        world = m.matrix_world.copy()  # read before unparenting, or the transform is lost
        m.parent = None
        m.matrix_world = world
        m.vertex_groups.clear()
        if m.data.shape_keys:
            m.shape_key_clear()
    for a in arms:
        bpy.data.objects.remove(a)
    bpy.ops.object.select_all(action="DESELECT")
    for m in meshes:
        m.select_set(True)
    bpy.context.view_layer.objects.active = meshes[0]
    tris = sum(len(p.vertices) - 2 for m in meshes for p in m.data.polygons)
    out = os.path.join(SRC, "for-mixamo.fbx")
    bpy.ops.export_scene.fbx(filepath=out, use_selection=True, path_mode="COPY", embed_textures=True,
                             apply_scale_options="FBX_SCALE_ALL", add_leaf_bones=False)
    print(f"[virtu] wrote {out} ({len(meshes)} meshes, {tris} triangles). Upload it to mixamo.com.")


# --------------------------------------------------------------------------- 2) merge
def import_fbx(path):
    before = set(bpy.data.objects)
    actions_before = set(bpy.data.actions)
    bpy.ops.import_scene.fbx(filepath=need(path), automatic_bone_orientation=False)
    new_objs = [o for o in bpy.data.objects if o not in before]
    new_actions = [a for a in bpy.data.actions if a not in actions_before]
    return new_objs, new_actions


def merge():
    height = float(arg("--height", "1.75"))
    clear()
    objs, actions = import_fbx(os.path.join(SRC, CLIPS["idle"]))
    arm = next(o for o in objs if o.type == "ARMATURE")
    meshes = [o for o in objs if o.type == "MESH"]
    arm.name = "PlayerRig"
    if not actions:
        raise SystemExit("[virtu] idle.fbx has no animation; download it from Mixamo with an animation applied")
    actions[0].name = "idle"
    actions[0].use_fake_user = True

    for clip in ("walk", "run", "jump"):
        o2, a2 = import_fbx(os.path.join(SRC, CLIPS[clip]))
        if not a2:
            raise SystemExit(f"[virtu] {CLIPS[clip]} has no animation")
        a2[0].name = clip
        a2[0].use_fake_user = True
        for o in o2:  # the "Without Skin" downloads bring their own armature: drop it, keep the action
            bpy.data.objects.remove(o)

    # Measure the character in its idle pose, then scale/centre a parent root (the clips key the rig).
    arm.animation_data_create()
    arm.animation_data.action = bpy.data.actions["idle"]
    bpy.context.scene.frame_set(1)
    bpy.context.view_layer.update()
    dg = bpy.context.evaluated_depsgraph_get()
    pts = []
    for m in meshes:
        ev = m.evaluated_get(dg)
        me = ev.to_mesh()
        pts += [ev.matrix_world @ v.co for v in me.vertices]
        ev.to_mesh_clear()
    zmin, zmax = min(p.z for p in pts), max(p.z for p in pts)
    cx = sum(p.x for p in pts) / len(pts)
    cy = sum(p.y for p in pts) / len(pts)
    factor = height / (zmax - zmin)
    root = bpy.data.objects.new("Player", None)
    bpy.context.collection.objects.link(root)
    arm.parent = root
    root.scale = (factor, factor, factor)
    root.location = Vector((-cx, -cy, -zmin)) * factor
    print(f"[virtu] measured {zmax - zmin:.3f} units -> {height} m (x{factor:.5f})")

    arm.animation_data.action = None
    for name in ("idle", "walk", "run", "jump"):
        track = arm.animation_data.nla_tracks.new()
        track.name = name
        track.strips.new(name, int(bpy.data.actions[name].frame_range[0]), bpy.data.actions[name])

    os.makedirs(OUT, exist_ok=True)
    out = os.path.join(OUT, "player.glb")
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.export_scene.gltf(filepath=out, export_format="GLB", use_selection=True, export_yup=True,
                              export_animations=True, export_animation_mode="NLA_TRACKS",
                              export_force_sampling=True)
    tris = sum(len(p.vertices) - 2 for m in meshes for p in m.data.polygons)
    print(f"[virtu] exported {out}: {tris} triangles, clips idle/walk/run/jump")


if __name__ == "__main__":
    if "prep" in ARGS:
        prep()
    elif "merge" in ARGS:
        merge()
    else:
        raise SystemExit("usage: avatar.py -- prep | merge --height <metres>")
