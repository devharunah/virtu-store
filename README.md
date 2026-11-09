# VIRTU.STORE — 3D Phone Showroom

A walk-in 3D phone shop for Ugandan shoppers. Walk a character through a virtual Kampala showroom, inspect any phone in 360°, choose storage and colour, add it to your bag, and finish a simulated MTN MoMo / Airtel Money / cash-on-delivery checkout. Built with Next.js 16, React Three Fiber, Rapier, ecctrl and Blender.

**Repo:** [devharunah/virtu-store](https://github.com/devharunah/virtu-store) · **Hosting:** Vercel (preview per PR, production on `main`)

## The journey
1. `/`: the landing page → **Enter the store**
2. `/store`: **click or tap the floor** to walk there, or walk with **WASD / arrows** (Shift to run, Space to jump) or the on-screen **joystick** on phones; drag to look
3. Walk up to a phone, then press **E**, tap the prompt, or click the phone to open it: spin it, zoom, pick colour and storage, and the price updates
4. **Add to bag** → the bag drawer (change storage or quantity, remove) → **Checkout**
5. `/checkout`: name, Ugandan phone number, Kampala division or outside Kampala, payment method → mock "approve on your phone" step → order number and boda ETA. No real payment is taken.

Add `?debug` to `/store` to draw physics colliders and expose `window.__virtu` (renderer stats), `window.__virtuUI` and `window.__virtuPlayer`.

## Run it
```bash
pnpm install
pnpm dev
```

```bash
pnpm verify
```
`verify` runs lint (ESLint + Biome), typecheck, Jest and Playwright. Playwright boots a production build on port 3100; WebGL runs in software (SwiftShader).

> Next.js 16 differs from older tutorials. Read `AGENTS.md`/`CLAUDE.md`, and the docs that ship in `node_modules/next/dist/docs/`.

## Docs
| Doc | What it covers |
|---|---|
| [CLAUDE.md](CLAUDE.md) | The project contract: stack, layout, strict TypeScript, test split, commits, branches |
| [docs/architecture.html](docs/architecture.html) | **Open in a browser.** How three.js, physics, state and assets fit together |
| [docs/BUILD-PLAN.md](docs/BUILD-PLAN.md) | The phases, what was built in each, the catalogue and types |
| [docs/RESEARCH.md](docs/RESEARCH.md) | Uganda market and network research, package versions, risks |
| [docs/ASSET-PIPELINE.md](docs/ASSET-PIPELINE.md) | Blender MCP, the procedural phone/prop/character scripts, optimisation |
| [docs/ASSETS-CREDITS.md](docs/ASSETS-CREDITS.md) | The licence log for every asset |

## 3D assets
The phones on sale are real models (iPhone 17 Pro Max, iPhone 17, Samsung Galaxy S25 Ultra, A56, A17), built in Blender by `blender/phones.py` with brand logos; the trademarks belong to Apple and Samsung, and every page carries a not-affiliated notice. The shop is a Kampala arcade phone shop (glass counters, shutter, mobile money desk, signboards, baked lighting), generated from `src/data/shop-layout.json` by `blender/shop.py`. The character is Quaternius "Animated Human" (CC0); textures and lighting are Poly Haven (CC0).
```bash
"C:/Program Files/Blender Foundation/Blender 5.2/blender.exe" --background --factory-startup --python blender/phones.py
python -I blender/make_signs.py
"C:/Program Files/Blender Foundation/Blender 5.2/blender.exe" --background --factory-startup --python blender/shop.py -- --bake
```
Then optimise with `gltf-transform` (see the asset pipeline doc; keep `--palette false --prune-attributes false`).

## Status
All six phases (0–5) are built. See [docs/BUILD-PLAN.md](docs/BUILD-PLAN.md) for what remains for a human: testing on a real mid-range Android over 4G, and recording the TikTok / LinkedIn demo videos.
