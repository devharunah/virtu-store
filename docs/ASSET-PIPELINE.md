# VIRTU.STORE — 3D Asset Pipeline

> See also: [architecture.html §08](architecture.html#assets) · [ASSETS-CREDITS.md](ASSETS-CREDITS.md) · [BUILD-PLAN.md](BUILD-PLAN.md)

## 1. Blender MCP (Claude ↔ Blender live link)

**Status on this machine (4 Nov 2026):**
- [x] `uv` installed via winget (`uvx.exe` at `%LOCALAPPDATA%\Microsoft\WinGet\Packages\astral-sh.uv_…\uvx.exe`)
- [x] Add-on installed: `%APPDATA%\Blender Foundation\Blender\5.2\scripts\addons\blender_mcp.py`, enabled and saved in preferences
- [x] Registered with Claude Code (local scope, this project): `claude mcp add blender -s local -- <full path>\uvx.exe mcp-for-blender`
- [ ] **You:** open Blender → press **N** in the 3D viewport → **MCP for Blender** tab → **Start MCP Server** (port 9876)
- [ ] **You:** restart the Claude Code session in this folder so the `blender` tools load

Notes:
- The package was renamed from `blender-mcp` to `mcp-for-blender`; both still work.
- The full path to `uvx.exe` avoids the Windows `spawn uvx ENOENT` problem.
- Blender must be **open with the server started** whenever Claude uses the MCP tools.
- Remove it with `claude mcp remove blender -s local`.

**Headless fallback (no MCP, no GUI).** This is how the current models were made:
```bash
"C:/Program Files/Blender Foundation/Blender 5.2/blender.exe" --background --factory-startup --python blender/phones.py
```
Add `-- --no-render` to skip the preview renders.

## 2. Coordinate & naming conventions (the contract with the web app)

| Rule | Why |
|---|---|
| Units = **metres**, real size (a phone is ~0.076 × 0.163 × 0.008) | Physics and camera distances stay realistic |
| Blender **Z-up**, export with **+Y up** | three.js is Y-up |
| Phone front/screen faces Blender **−Y** → three.js **+Z** | Faces the default camera with no rotation in code |
| Origin at **bottom-centre** | `position-y = tableHeight` places it on the surface |
| Apply all transforms and modifiers before export | No surprises in three.js |
| One mesh per product, multiple materials | Fewer nodes; recolouring is by material name |
| File name = product id, kebab-case (`pulse-x-pro.glb`) | `modelUrl` comes from the id |

**Material names are an API.** The web app looks these up by name:

| Material | Used by app for |
|---|---|
| `Body` | Runtime colourway swap |
| `Screen` | Wallpaper texture (UVs span 0–1 over the display) and emissive glow when inspected |
| `Bezel`, `Glass`, `LensRing`, `Flash` | Static |
| `Wood`, `Base`, `Accent` | Fixtures (table, podium) |

## 3. Procedural phone recipe (`blender/phones.py`)

Each entry in `PHONES` is data only: dimensions in mm, corner radius, screen inset, island kind, lens list, flash position, and colour/metal/roughness.

1. **Body**: a rounded-rectangle outline (8 segments per corner) extruded through the thickness. A Bevel modifier (angle-limited) softens only the front/back rims.
2. **Front**: a black `Bezel` n-gon, then the `Screen` n-gon inset by `inset` mm with planar UVs 0–1, plus a punch-hole selfie camera.
3. **Camera island** (`kind`):
   - `none`: lenses sit directly on the back (budget look)
   - `pill`: a vertical capsule, raised 1.4 mm
   - `square`: a rounded square, raised 1.4 mm
   - `circle`: a large round glass disc, raised 1.6 mm
   - `bar`: a full-width glass camera bar, raised 1.8 mm
4. **Lenses**: a metal `LensRing` cylinder with a `Glass` cylinder inside. The flash is a small emissive disc.
5. **Buttons**: power + volume rocker on the +X edge.
6. Join → smooth by angle (35°) → export GLB → record in `manifest.json`.

**Adding a phone:** copy a dict in `PHONES`, change the numbers and the id, re-run the script, then optimise (§4). Add the product to `src/data/products.ts`.

**Through the MCP** you can say, for example, *"Using blender/phones.py, add a 6th phone with a diagonal dual-camera island, then show me a viewport screenshot."* Claude edits the dict, runs the code in your open Blender, and screenshots the result.

### Store props (`blender/store_props.py`)
This script imports the helpers from `phones.py` and builds the `counter`, `wall_bay`, `plant` and `sign`. They are exported to `blender/out/` and optimised into `public/models/environment/`. Run it the same way as `phones.py`. **It clears the scene, so run it headless, not inside a Blender file you have open.** Prop dimensions are in `public/models/environment/props.json`; the matching colliders are in `src/data/store-layout.ts`.

| Prop | Size (m) | Triangles | Optimised |
|---|---|---|---|
| counter | 2.12 × 0.70 × 1.26 | 1,224 | 11 KB |
| wall_bay | 2.40 × 0.32 × 2.30 | 3,124 | 19 KB |
| plant | 0.44 × 0.44 × 1.42 | 3,132 | 24 KB |
| sign | 3.25 × 0.06 × 0.59 | 1,120 | 10 KB |

### Textures and HDRI (Poly Haven)
1K JPGs from the Poly Haven API, converted to WebP with Pillow (colour q82, normal/ARM q88) into `public/textures/<surface>/{color,normal,arm}.webp`. ARM = AO (R), roughness (G), metalness (B), which is the packing three.js expects, so one texture feeds `aoMap`, `roughnessMap` and `metalnessMap`. Set the repeat from the texture's real-world size (in `Room.tsx`). The HDRI is used as-is (1K `.hdr`).

## 4. Optimise for the web

```bash
# phones (keep materials separate! --palette false)
npx @gltf-transform/cli optimize blender/out/pulse-x.glb public/models/phones/pulse-x.glb \
  --compress meshopt --simplify false --palette false --texture-compress webp

# inspect: size, triangles, material names
npx @gltf-transform/cli inspect public/models/phones/pulse-x.glb
```

| | Raw Blender export | Optimised |
|---|---|---|
| nova-a1 | 49 KB | 14 KB |
| nova-a5 | 82 KB | 19 KB |
| pulse-x | 86 KB | 20 KB |
| pulse-x-pro | 100 KB | 23 KB |
| zenith-ultra | 93 KB | 21 KB |
| podium / table | 39 / 30 KB | 10 / 7 KB |

⚠️ **Do not use the default `optimize` without `--palette false`.** It merges all materials into one palette texture, which deletes the `Body` material the app needs for colour swaps.

meshopt was chosen over Draco because its decoder is bundled with three.js/drei, so no extra fetch from a Google CDN is needed. That matters on slow connections.

## 5. Third-party assets (character, room, props)

1. Download GLB/glTF (or FBX) from a source in [ASSETS-CREDITS.md](ASSETS-CREDITS.md). **Log it before using it.**
2. Open it in Blender, fix the scale (metres), rotation and origin, and rename the animation clips for ecctrl (`idle`, `walk`, `run`, `jump`, `jumpIdle`, `jumpLand`, `fall`).
3. Export GLB → optimise (characters: `--compress meshopt --simplify false`; keep animations).
4. Textures: max 1K for props, 2K for the floor, WebP. HDRI: Poly Haven **1K** `.hdr`.

## 6. Folder layout

```
blender/
  phones.py          generator (source of truth)
  out/               raw exports + manifest (regenerated, can be git-ignored)
public/models/
  phones/            optimised phone GLBs
  fixtures/          podium, display_table
  characters/        player character
  environment/       room shell, props
  manifest.json
docs/img/            preview renders
```
