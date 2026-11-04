# VIRTU.STORE — Asset Credits & Licence Log

> Rule from the brief: **every** downloaded asset gets a row here *before* it goes into `public/`. "Free" does not mean "free for commercial use." See [ASSET-PIPELINE.md](ASSET-PIPELINE.md) for how assets are processed.

Status: ✅ in repo · 🟡 planned / to download · ❌ rejected

## In the repo

| Status | Asset | File(s) | Source | Author | Licence | Notes |
|---|---|---|---|---|---|---|
| ✅ | Nova A1, Nova A5, Pulse X, Pulse X Pro, Zenith Ultra | `public/models/phones/*.glb` | `blender/phones.py` (original) | VIRTU.STORE team | Own work | Brand-neutral, no logos or trademarks |
| ✅ | Podium, Display table | `public/models/fixtures/*.glb` | `blender/phones.py` (original) | VIRTU.STORE team | Own work | |
| ✅ | Lineup renders | `docs/img/lineup-*.png`, `public/og/lineup-back.png` | Blender EEVEE render | VIRTU.STORE team | Own work | Can be used for the OG image and social posts |
| ✅ | Counter, wall display bay, snake plant, "VIRTU.STORE" sign | `public/models/environment/*.glb` | `blender/store_props.py` (original) | VIRTU.STORE team | Own work | Sign uses Blender's bundled font (Bfont, GPL with font exception, so fine to embed as geometry) |
| ✅ | Floor texture "Marble 01" | `public/textures/floor/*.webp` | [Poly Haven](https://polyhaven.com/a/marble_01) | Rob Tuytel | CC0 | 1K, converted to WebP; one repeat = 1.5 m |
| ✅ | Wall texture "Beige Wall 001" (normal + ARM used; colour map not displayed) | `public/textures/wall/*.webp` | [Poly Haven](https://polyhaven.com/a/beige_wall_001) | Dimitrios Savva, Rico Cilliers | CC0 | 1K WebP; one repeat = 3 m |
| ✅ | HDRI "Brown Photostudio 02" | `public/hdri/brown_photostudio_02_1k.hdr` | [Poly Haven](https://polyhaven.com/a/brown_photostudio_02) | Sergej Majboroda | CC0 | Lighting only, not shown as background |

## Planned picks (fill in exact URLs when downloaded)

| Status | Need | Source | Licence | Attribution needed? | Notes |
|---|---|---|---|---|---|
| 🟡 | Player character (rigged, Idle/Walk/Run) | [Quaternius](https://quaternius.com/) (e.g. "Ultimate Animated Character" / "Universal Animation Library") | CC0 (check the pack's licence file) | No | Preferred over Mixamo so the repo stays redistributable |
| 🟡 | Extra decor if needed (seating, posters) | [Kenney](https://kenney.nl/assets) / [Poly Pizza](https://poly.pizza/) | CC0 / **mixed CC-BY** | Only for CC-BY | Counter, shelves, plants and sign are now our own (see above) |
| 🟡 | Phone wallpapers for `Screen` material | Our own art (Figma/Canva or generated) | Own work | — | No real OS UI or app logos |
| 🟡 | Extra animations (optional) | [Mixamo](https://www.mixamo.com/) | Adobe royalty-free (account required) | No | Fine to use inside the app; models can't be redistributed as standalone files |

## Later: Aisle 2 (sneakers)

| Status | Need | Source | Licence | Notes |
|---|---|---|---|---|
| 🟡 | 5 sneaker models | [Sketchfab](https://sketchfab.com/) → *Downloadable* filter → licence CC0 / CC-BY | per model | Avoid CC-BY-**NC** (non-commercial) and branded shoes (Nike/Adidas logos = trademark risk) |

## Rejected

| Asset | Reason |
|---|---|
| Free phone models on CGTrader / RenderHub / Sketchfab | Mostly paid, CC-BY-SA, or modelled after real branded devices. Replaced by our own procedural phones |

## Attribution block (for the site footer, if any CC-BY assets are used)
```
3D assets: "<title>" by <author> (<url>), licensed CC BY 4.0.
```
