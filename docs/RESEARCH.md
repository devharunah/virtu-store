# VIRTU.STORE — Research Notes

> Companion to [BUILD-PLAN.md](BUILD-PLAN.md) · [architecture.html](architecture.html) · [ASSET-PIPELINE.md](ASSET-PIPELINE.md) · [ASSETS-CREDITS.md](ASSETS-CREDITS.md)
> Compiled 4 Nov 2026. Figures move fast, so re-check before quoting them publicly.

## 1. Why phones first (instead of sneakers)

| Factor | Phones | Sneakers |
|---|---|---|
| Local demand (Uganda) | Highest-volume consumer electronics category; the audience relates to it instantly | Strong, but more fragmented (second-hand/mitumba dominates) |
| 3D asset effort | Simple hard-surface geometry → **built procedurally in Blender in minutes** (done: 5 models, ~20 KB each) | Organic, high-detail meshes → must download from Sketchfab and check each licence; files are often 5–30 MB |
| Licence risk | Zero: our own brand-neutral designs | High: many "free" shoe models are CC-BY-NC or trademark-heavy (Nike/Adidas logos) |
| Variant story | Storage tiers + colourways map cleanly onto the PDF's "size + colour" | Sizes don't change the 3D model |

**Decision:** phones are Aisle 1. Sneakers come later as Aisle 2 using the same `Product` schema, with `variantKind: "size"` instead of `"storage"`.

### Uganda handset market (web-usage share, StatCounter)
- 2026 snapshots: Samsung ~25–35%, Tecno ~14–20%, Infinix ~7–8%, Apple ~5%, Itel ~3–4%, and a large "Unknown" share (generic or unidentified Android).
- Statista (Nov 2023): Tecno led at ~27%, Samsung ~20.5%.
- Transsion brands (Tecno, Itel, Infinix) lead **imports** by unit volume (TechJaja).
- UCC Q3 2025: ~56.1 M connected devices, of which smartphones were ~34%.

**What this means for the store:** pricing tiers need to reflect a budget-heavy market. Our 5 fictional phones run from about UGX 349k to 3.5M (see BUILD-PLAN catalogue). Real brand names, logos, and product names stay out of the 3D models and copy.

Sources: [StatCounter Uganda](https://gs.statcounter.com/vendor-market-share/mobile/uganda) · [Statista](https://statista.com/statistics/570196/mobile-device-vendor-share-in-uganda) · [TechJaja imports](https://techjaja.com/chinese-phones-dominate-ugandas-mobile-phones-imports) · [PC Tech Mag – UCC Q3 2025](https://pctechmag.com/2025/12/ucc-report-ugandas-digital-footprint-grows-modestly-in-q3-2025/)

## 2. Network & device constraints → performance budget

- Coverage estimates: 2G ~96–98%, 3G ~85–90%, 4G ~65–70%, concentrated in urban centres. 3G is still a common real-world connection.
- Data is cheap per GB on some bundles, but users still notice large downloads, and mid/low-end Android GPUs are the norm.
- Most visitors from TikTok/LinkedIn will be **on a phone**, so mobile controls cannot wait for the last phase.

**Budget we commit to:**
| Item | Target |
|---|---|
| First 3D payload (store shell + 5 phones + character) | ≤ 5 MB transferred |
| Each phone GLB | ≤ 300 KB (actual: ~14–23 KB with meshopt) |
| Draw calls in store view | ≤ 150 |
| Frame rate | 60 fps desktop, ≥ 30 fps on a mid-range Android |
| Device pixel ratio | capped at 1.5 (dropped to 1 by `PerformanceMonitor` when slow) |
| Textures | ≤ 1K for props, 2K max for floor; WebP/KTX2 |

Sources: [Monitor – 5G & Uganda internet](https://www.monitor.co.ug/uganda/business/prosper/will-5g-solve-uganda-s-internet-crisis--4157584) · [ts2.tech 2025 overview](https://ts2.tech/en/ugandas-internet-access-revolution-from-digital-divide-to-digital-drive-in-2025/) · [Intelpoint – data prices](https://intelpoint.co/?p=5971) · [Pulse UG – price list 2025](https://www.pulse.ug/story/mobile-and-fix-internet-prices-in-uganda-full-list-of-service-provide-comparison-2025072410255986235)

## 3. Tech stack — verified versions (npm, 4 Nov 2026)

| Package | Latest | Notes |
|---|---|---|
| next | 16.4.5 | App Router |
| react / react-dom | 19.3.1 | |
| three | 0.187.0 | |
| @react-three/fiber | 9.8.2 | v9 requires React 19 |
| @react-three/drei | 10.7.9 | peer: fiber ^9, react ^19 |
| @react-three/rapier | 2.2.0 | peer: fiber ^9.0.4, react ^19 |
| ecctrl | 2.0.2 | peers: drei ≥10.7, fiber ≥9.4, rapier ≥2.2, three ≥0.184, react ≥19.2.7, **leva ≥0.10.1** (install it too) |
| zustand | 5.0.16 | |
| @gltf-transform/cli | 4.5.1 | used via `npx` for optimisation |

These all line up, so a fresh `create-next-app` on React 19 works with no version pinning.

Sources: [ecctrl on npm](https://www.npmjs.com/package/ecctrl) · [pmndrs/ecctrl](https://github.com/pmndrs/ecctrl)

## 4. Blender MCP

- The project formerly called `blender-mcp` is now published as **`mcp-for-blender`** (v2.2.6, maintainer ahujasid). Old setups keep working.
- Setup: install `uv` → `uvx mcp-for-blender install-addon` → enable "Interface: MCP for Blender" in Blender → press N → *MCP for Blender* tab → **Start MCP Server** (localhost:9876) → `claude mcp add blender -- uvx mcp-for-blender`.
- On Windows, GUI clients can fail with `spawn uvx ENOENT`. Use the full path to `uvx.exe` or `cmd /c uvx mcp-for-blender`.
- The MCP also exposes Poly Haven / Sketchfab / Hyper3D search tools, which are useful for the environment (HDRIs, textures).
- **Headless fallback** (what generated the current assets): `blender --background --factory-startup --python blender/phones.py`.

Sources: [PyPI mcp-for-blender](https://pypi.org/project/mcp-for-blender/) · [GitHub wiki](https://github.com/ahujasid/mcp-for-blender/wiki) · [PyPI blender-mcp](https://pypi.org/project/blender-mcp)

## 5. Free asset sources (from VIRTU.pdf, re-checked)

| Source | Licence | Use for |
|---|---|---|
| [Kenney](https://kenney.nl/assets) | CC0 | furniture, props, UI |
| [Quaternius](https://quaternius.com/) | CC0 (check each pack) | animated low-poly characters |
| [Poly Haven](https://polyhaven.com/) | CC0 | HDRIs, floor/wall textures |
| [Poly Pizza](https://poly.pizza/) | mixed CC0 / CC-BY | decorations, plants |
| [Mixamo](https://www.mixamo.com/) | Adobe royalty-free (needs an Adobe login) | extra animations |
| [Sketchfab](https://sketchfab.com/) | per model | sneakers later (Aisle 2) |

Search result: there are **no good CC0 phone models** on Poly Pizza or Sketchfab. Most free ones are CC-BY-SA or paid (CGTrader/RenderHub). That confirms building our own.

## 6. Open risks
1. **ecctrl v2 API changes.** Its docs moved to pmndrs, and the animation wrapper API differs from v1 tutorials. Follow the current README, not old YouTube guides.
2. **Character licence.** Prefer Quaternius CC0 over Mixamo so the repo stays redistributable.
3. **Screen content.** Phone screens are a UV-mapped `Screen` material. Mock UIs/wallpapers must be our own artwork, with no real OS UI and no brand logos.
4. **Trademark.** Product names (Nova, Pulse, Zenith) are placeholders. Check for clashes before any commercial launch.
5. **Low-end GPUs.** Keep shadows to one baked/contact shadow; avoid real-time shadow maps on mobile.
