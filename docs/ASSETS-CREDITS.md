# VIRTU.STORE — Asset Credits & Licence Log

> Rule from the brief: **every** downloaded asset gets a row here *before* it goes into `public/`. "Free" does not mean "free for commercial use." See [ASSET-PIPELINE.md](ASSET-PIPELINE.md) for how assets are processed.

Status: ✅ in repo · 🟡 planned / to download · ❌ rejected

## In the repo

| Status | Asset | File(s) | Source | Author | Licence | Notes |
|---|---|---|---|---|---|---|
| ✅ | iPhone 17 Pro Max, iPhone 17, Galaxy S25 Ultra, Galaxy A56, Galaxy A17 (3D models) | `public/models/phones/*.glb` | `blender/phones.py` (original geometry approximating the real designs) | VIRTU.STORE team | Own work; **depicts trademarked products** | Real product names, designs and logos belong to Apple Inc. and Samsung Electronics. The UI shows a trademark / not-affiliated notice (`TrademarkNotice.tsx`) |
| ✅ | Apple logo and SAMSUNG wordmark outlines | `blender/brand/*.svg` | [simple-icons@16.36.0](https://simpleicons.org/) | Simple Icons contributors | SVG paths CC0 1.0; **the marks are trademarks of Apple Inc. and Samsung Electronics** | Used on the phone backs to depict the real products; not for any other use |
| ✅ | Podium, Display table | `public/models/fixtures/*.glb` | `blender/phones.py` (original) | VIRTU.STORE team | Own work | |
| ✅ | Lineup renders | `docs/img/lineup-*.png`, `public/og/lineup-back.png` | Blender EEVEE render | VIRTU.STORE team | Own work | Can be used for the OG image and social posts |
| ✅ | Player character "Animated Human" | `public/models/characters/player.glb` | [OpenGameArt](https://opengameart.org/content/animated-human-low-poly) | Quaternius | CC0 1.0 (licence file in the pack) | Converted and recoloured by `blender/character.py`; only idle/walk/run/jump kept |
| ✅ | Kampala arcade shop: shell, glass counters, MoMo desk, shelves, pegboard, chairs, fan, tube lights, baked lightmap | `public/models/shop/*` | `blender/shop.py` from `src/data/shop-layout.json` (original) | VIRTU.STORE team | Own work | |
| ✅ | Signage atlas: VIRTU MOBILE signboard, fictional neighbouring shops, generic "Mobile Money" boards, posters, wall signs | embedded in `shop_shell.glb` | `blender/make_signs.py` (original) | VIRTU.STORE team | Own work | No MTN/Airtel logos (generic yellow/red boards). Shop names are fictional |
| ✅ | Shop floor "Floor Tiles 08" (normal + ARM; colour from the material) | `public/textures/shop-floor/*.webp` | [Poly Haven](https://polyhaven.com/a/floor_tiles_08) | Rob Tuytel | CC0 | 1K WebP; one repeat = 1.5 m |
| ✅ | Arcade corridor floor "Large Floor Tiles 02" | `public/textures/corridor/*.webp` | [Poly Haven](https://polyhaven.com/a/large_floor_tiles_02) | Rob Tuytel | CC0 | 1K WebP; one repeat = 3 m |
| ✅ | Wall texture "Beige Wall 001" (normal + ARM used; colour map not displayed) | `public/textures/wall/*.webp` | [Poly Haven](https://polyhaven.com/a/beige_wall_001) | Dimitrios Savva, Rico Cilliers | CC0 | 1K WebP; one repeat = 3 m |
| ✅ | HDRI "Brown Photostudio 02" | `public/hdri/brown_photostudio_02_1k.hdr` | [Poly Haven](https://polyhaven.com/a/brown_photostudio_02) | Sergej Majboroda | CC0 | Lighting only, not shown as background |

## Planned picks (fill in exact URLs when downloaded)

| Status | Need | Source | Licence | Attribution needed? | Notes |
|---|---|---|---|---|---|
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
